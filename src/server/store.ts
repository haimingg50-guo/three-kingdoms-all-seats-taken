import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { adoptResolved } from "../engine/adopt";
import { normalizeClimate } from "../engine/climate";
import { shouldResolve } from "../engine/resolve";
import { resolveTurn } from "../engine/resolve";
import { addCitizen, createWorld as buildWorld } from "../engine/scenario";
import { parseOrder } from "../engine/order";
import { cryptoRng } from "../engine/names";
import { toPublic, type PublicWorld } from "../engine/view";
import type { ChronicleEntry, WorldState } from "../engine/types";
import { database, ensureSchema, type Sql } from "./db";

export class GameError extends Error {
  status: number;
  existingId?: string;
  constructor(message: string, status = 400, existingId?: string) {
    super(message);
    this.status = status;
    this.existingId = existingId;
  }
}

export interface WorldSummary {
  id: string;
  name: string;
  profile: string;
  profileTitle: string;
  turn: number;
  status: string;
  seatedCount: number;
  deadline: string;
  kind: string;
  question: string;
}

interface WorldRow {
  id: string;
  kind: string;
  pinned: number;
  owner_hash: string | null;
  state_json: string;
  version: number;
}

interface SeatRow {
  role_id: string;
  token_hash: string;
}

const hits = new Map<string, number[]>();

function limit(key: string, max: number, windowMs: number) {
  if (hits.size > 4000) hits.clear();
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return false;
  recent.push(now);
  hits.set(key, recent);
  return true;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function same(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function newId() {
  return `w_${randomBytes(8).toString("hex")}`;
}

let booted: Promise<void> | null = null;

export function ready() {
  if (!booted) booted = boot();
  return booted;
}

async function boot() {
  await ensureSchema();
  const db = database();
  const existing = await db.sql.get<{ id: string }>("SELECT id FROM worlds WHERE id = ?", ["demo"]);
  if (existing) return;
  const built = buildWorld({
    id: "demo",
    name: "第一号实验局",
    profile: "tabletop_demo",
    kind: "experiment",
    now: new Date().toISOString(),
  });
  if (!built.ok) throw new Error(built.errors.join("；"));
  await insertWorld(db.sql, built.state, null, 1, null);
  const referee = process.env.TIANXIA_REFEREE_TOKEN;
  if (referee) {
    await db.sql.run("INSERT INTO referees (world_id, token_hash) VALUES (?, ?)", [
      "demo",
      hashToken(referee),
    ]);
  }
}

async function insertWorld(q: Sql, state: WorldState, owner: string | null, pinned: number, refereeHash: string | null) {
  await q.run(
    "INSERT INTO worlds (id, kind, pinned, owner_hash, state_json, version, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [state.id, state.kind, pinned, owner, JSON.stringify(state), state.version, new Date().toISOString()],
  );
  for (const event of state.chronicle) {
    await q.run(
      "INSERT INTO events (world_id, seq, body_json, created_at) VALUES (?, ?, ?, ?)",
      [state.id, event.seq, JSON.stringify(event), new Date().toISOString()],
    );
  }
  if (refereeHash) {
    await q.run("INSERT INTO referees (world_id, token_hash) VALUES (?, ?)", [state.id, refereeHash]);
  }
}

async function load(q: Sql, id: string) {
  const row = await q.get<WorldRow>("SELECT id, kind, pinned, owner_hash, state_json, version FROM worlds WHERE id = ?", [id]);
  if (!row) return null;
  const state = JSON.parse(row.state_json) as WorldState;
  normalizeClimate(state);
  const seats = await q.all<SeatRow>("SELECT role_id, token_hash FROM seats WHERE world_id = ?", [id]);
  const bans = await q.all<{ token_hash: string }>("SELECT token_hash FROM bans WHERE world_id = ?", [id]);
  const seated = new Set(seats.map((s) => s.role_id));
  for (const role of state.roles) role.seated = role.alive && seated.has(role.id);
  return { row, state, seats, bans: new Set(bans.map((b) => b.token_hash)) };
}

async function save(q: Sql, previous: number, state: WorldState) {
  for (const role of state.roles) {
    if (!role.alive) {
      await q.run("DELETE FROM seats WHERE world_id = ? AND role_id = ?", [state.id, role.id]);
    }
  }
  state.version = previous + 1;
  const changes = await q.run(
    "UPDATE worlds SET state_json = ?, version = ?, updated_at = ? WHERE id = ? AND version = ?",
    [JSON.stringify(state), state.version, new Date().toISOString(), state.id, previous],
  );
  if (changes !== 1) throw new GameError("这一局刚被别人写过，请再试一次", 409);
  const max = await q.get<{ m: number | null }>("SELECT MAX(seq) AS m FROM events WHERE world_id = ?", [state.id]);
  const ceiling = max?.m ?? 0;
  for (const event of state.chronicle) {
    if (event.seq <= ceiling) continue;
    await q.run(
      "INSERT INTO events (world_id, seq, body_json, created_at) VALUES (?, ?, ?, ?)",
      [state.id, event.seq, JSON.stringify(event), new Date().toISOString()],
    );
  }
}

function assertVisible(row: { kind: string; owner_hash: string | null }, actorHash: string) {
  if (row.kind === "sandbox" && row.owner_hash !== actorHash) {
    throw new GameError("没有这一局", 404);
  }
}

export async function listExperiments(): Promise<WorldSummary[]> {
  await ready();
  const db = database();
  const rows = await db.sql.all<WorldRow>(
    "SELECT id, kind, pinned, owner_hash, state_json, version FROM worlds WHERE kind = ? ORDER BY pinned DESC, updated_at DESC",
    ["experiment"],
  );
  const seats = await db.sql.all<{ world_id: string }>("SELECT world_id FROM seats");
  const counts = new Map<string, number>();
  for (const seat of seats) counts.set(seat.world_id, (counts.get(seat.world_id) ?? 0) + 1);
  return rows.map((row) => {
    const view = toPublic(JSON.parse(row.state_json) as WorldState, null, 0);
    return {
      id: view.id,
      name: view.name,
      profile: view.profile,
      profileTitle: view.profileTitle,
      turn: view.turn,
      status: view.status,
      seatedCount: counts.get(view.id) ?? 0,
      deadline: view.deadline,
      kind: view.kind,
      question: view.question,
    };
  });
}

export async function catchUp(id: string) {
  await ready();
  for (let i = 0; i < 3; i++) {
      const advanced = await database().tx(async (q) => {
      const loaded = await load(q, id);
      if (!loaded) return false;
      const now = new Date().toISOString();
      if (!shouldResolve(loaded.state, now)) return false;
      adoptResolved(loaded.state, resolveTurn(loaded.state, now));
      await save(q, loaded.row.version, loaded.state);
      return true;
    });
    if (!advanced) return;
  }
}

export async function viewWorld(id: string, actorHash: string): Promise<PublicWorld> {
  if (!/^(demo|w_[a-f0-9]{16})$/.test(id)) throw new GameError("没有这一局", 404);
  await catchUp(id);
  const loaded = await database().tx(async (q) => load(q, id));
  if (!loaded) throw new GameError("没有这一局", 404);
  assertVisible(loaded.row, actorHash);
  const mine = loaded.seats.find((s) => s.token_hash === actorHash && loaded.state.roles.some((r) => r.id === s.role_id && r.alive));
  return toPublic(loaded.state, mine?.role_id ?? null);
}

export async function createInstance(input: {
  actorHash: string;
  name: string;
  profile: string;
  kind: "experiment" | "sandbox";
  acknowledgeSeason?: boolean;
}) {
  await ready();
  if (!limit(`create:${input.actorHash}`, 6, 60 * 60 * 1000)) {
    throw new GameError("开局太频繁了", 429);
  }
  const name = input.name.replace(/[<>\u0000-\u001f]/g, "").trim();
  if (!/^[\p{L}\p{N}·\s]{1,24}$/u.test(name)) {
    throw new GameError("局名用 1–24 个字，不要符号", 400);
  }
  return database().tx(async (q) => {
    const rows = await q.all<{ kind: string; owner_hash: string | null; id: string }>(
      "SELECT id, kind, owner_hash FROM worlds",
    );
    if (rows.length >= 40) throw new GameError("这台机器上的局已经太多", 429);
    if (input.kind === "sandbox") {
      const mine = rows.find((r) => r.kind === "sandbox" && r.owner_hash === input.actorHash);
      if (mine) throw new GameError("你已经有一局沙盘", 409, mine.id);
    }
    if (input.kind === "experiment" && rows.filter((r) => r.kind === "experiment").length >= 8) {
      throw new GameError("公开实验局已满。先把现有的一局打完，或开沙盘。", 429);
    }
    const built = buildWorld({
      id: newId(),
      name,
      profile: input.profile,
      kind: input.kind,
      now: new Date().toISOString(),
      acknowledgeSeason: input.acknowledgeSeason,
    });
    if (!built.ok) throw new GameError(built.errors.join("；"), 400);
    const refereeToken = randomBytes(18).toString("base64url");
    await insertWorld(q, built.state, input.kind === "sandbox" ? input.actorHash : null, 0, hashToken(refereeToken));
    return { id: built.state.id, refereeToken, profile: input.profile };
  });
}

export async function claim(
  id: string,
  actorHash: string,
  body: { roleId?: string; citizen?: boolean; cityId?: string; release?: boolean },
) {
  await ready();
  if (!limit(`claim:${actorHash}`, 30, 60 * 1000)) throw new GameError("操作太频繁", 429);
  return database().tx(async (q) => {
    const loaded = await load(q, id);
    if (!loaded) throw new GameError("没有这一局", 404);
    assertVisible(loaded.row, actorHash);
    if (loaded.bans.has(actorHash)) throw new GameError("你已被逐出此局", 403);
    const state = loaded.state;
    if (state.status === "memorial" || state.status === "settled") {
      throw new GameError("这一局已经结束", 400);
    }
    const mine = loaded.seats.find((s) => s.token_hash === actorHash);
    if (body.release) {
      if (state.kind !== "sandbox") throw new GameError("实验局里不能换席", 400);
      if (mine) await q.run("DELETE FROM seats WHERE world_id = ? AND role_id = ?", [id, mine.role_id]);
      return { released: true as const };
    }
    if (mine && state.kind !== "sandbox") throw new GameError("你已经入席。实验局里一人一席。", 400);
    if (mine && state.kind === "sandbox") {
      await q.run("DELETE FROM seats WHERE world_id = ? AND role_id = ?", [id, mine.role_id]);
    }
    if (body.citizen) {
      if (!body.cityId) throw new GameError("市民要先选择落脚的城", 400);
      const minted = addCitizen(state, body.cityId, cryptoRng());
      if (!minted.ok) throw new GameError(minted.error, 400);
      state.roles.push(minted.role);
      await q.run("INSERT INTO seats (world_id, role_id, token_hash) VALUES (?, ?, ?)", [
        id,
        minted.role.id,
        actorHash,
      ]);
      await save(q, loaded.row.version, state);
      return { roleId: minted.role.id, name: minted.role.name };
    }
    const role = state.roles.find((r) => r.id === body.roleId);
    if (!role) throw new GameError("没有这个席位", 404);
    if (!role.alive) throw new GameError("这个人已经退场，不能由别人顶替", 400);
    if (!role.discovered) throw new GameError("这个人还没有被发现", 400);
    if (loaded.seats.some((s) => s.role_id === role.id)) throw new GameError("此席已有人", 400);
    await q.run("INSERT INTO seats (world_id, role_id, token_hash) VALUES (?, ?, ?)", [id, role.id, actorHash]);
    return { roleId: role.id, name: role.name };
  });
}

async function seatOf(q: Sql, id: string, actorHash: string) {
  const loaded = await load(q, id);
  if (!loaded) throw new GameError("没有这一局", 404);
  assertVisible(loaded.row, actorHash);
  const mine = loaded.seats.find((s) => s.token_hash === actorHash);
  return { loaded, mine };
}

export async function submitOrder(id: string, actorHash: string, raw: unknown) {
  await ready();
  if (!limit(`order:${actorHash}`, 40, 60 * 1000)) throw new GameError("指令太频繁", 429);
  return database().tx(async (q) => {
    const { loaded, mine } = await seatOf(q, id, actorHash);
    if (!mine) throw new GameError("先入席，再下令", 400);
    const parsed = parseOrder(raw, loaded.state, mine.role_id);
    if (!parsed.ok) throw new GameError(parsed.error, 400);
    loaded.state.lockedOrders[mine.role_id] = parsed.order;
    const now = new Date().toISOString();
    if (shouldResolve(loaded.state, now)) {
      const next = resolveTurn(loaded.state, now);
      adoptResolved(loaded.state, next);
    }
    await save(q, loaded.row.version, loaded.state);
    return { locked: true, turn: loaded.state.turn, status: loaded.state.status };
  });
}

export async function unlockOrder(id: string, actorHash: string) {
  await ready();
  return database().tx(async (q) => {
    const { loaded, mine } = await seatOf(q, id, actorHash);
    if (!mine) throw new GameError("你没有席位", 400);
    if (loaded.state.status === "memorial" || loaded.state.status === "settled") {
      throw new GameError("这一局已经结束", 400);
    }
    delete loaded.state.lockedOrders[mine.role_id];
    await save(q, loaded.row.version, loaded.state);
    return { locked: false };
  });
}

export async function chronicle(id: string, actorHash: string): Promise<ChronicleEntry[]> {
  const view = await viewWorld(id, actorHash);
  const loaded = await database().tx(async (q) => load(q, id));
  if (!loaded) throw new GameError("没有这一局", 404);
  assertVisible(loaded.row, actorHash);
  void view;
  return loaded.state.chronicle;
}

export async function exportBundle(id: string, actorHash: string) {
  await viewWorld(id, actorHash);
  const loaded = await database().tx(async (q) => load(q, id));
  if (!loaded) throw new GameError("没有这一局", 404);
  const state = loaded.state;
  return {
    license: state.config.data.export_license,
    anonymization: state.config.data.anonymization,
    countsAsExperiment: state.countsAsExperiment,
    experimental: state.experimental,
    profile: state.profile,
    kind: state.kind,
    name: state.name,
    status: state.status,
    closeReason: state.closeReason,
    unifiedByFactionId: state.unifiedByFactionId,
    config: state.config,
    amendments: state.amendments,
    roles: state.roles.filter((r) => r.discovered || !r.alive).map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      office: r.office,
      factionId: r.factionId,
      alive: r.alive,
      historical: r.historical,
      reputation: r.reputation,
      merit: r.merit,
      deathReason: r.deathReason ?? null,
      diedTurn: r.diedTurn ?? null,
    })),
    chronicle: state.chronicle,
    letters: state.letters.map((l) => ({
      turn: l.turn,
      fromRoleId: l.fromRoleId,
      toRoleId: l.toRoleId,
      text: l.text,
    })),
    contracts: state.contracts,
  };
}

export async function refereeAct(id: string, token: string, roleId: string, reason: string) {
  await ready();
  if (reason !== "作弊" && reason !== "骚扰") {
    throw new GameError("裁判只能处理作弊或骚扰", 400);
  }
  return database().tx(async (q) => {
    const loaded = await load(q, id);
    if (!loaded) throw new GameError("没有这一局", 404);
    const referee = await q.get<{ token_hash: string }>("SELECT token_hash FROM referees WHERE world_id = ?", [id]);
    if (!referee || !same(referee.token_hash, hashToken(token))) {
      throw new GameError("裁判令牌不对", 403);
    }
    const seat = loaded.seats.find((s) => s.role_id === roleId);
    const role = loaded.state.roles.find((r) => r.id === roleId);
    if (!role) throw new GameError("没有这个席位", 404);
    if (seat) {
      await q.run("DELETE FROM seats WHERE world_id = ? AND role_id = ?", [id, roleId]);
      await q.run(
        "INSERT INTO bans (world_id, token_hash, reason, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (world_id, token_hash) DO NOTHING",
        [id, seat.token_hash, reason, new Date().toISOString()],
      );
    }
    const last = loaded.state.chronicle.at(-1);
    loaded.state.chronicle.push({
      seq: (last?.seq ?? 0) + 1,
      turn: loaded.state.turn,
      phase: "meta",
      kind: "referee",
      key: "meta.referee",
      params: { actor: roleId, reason: reason === "骚扰" ? "harass" : "cheat" },
    });
    delete loaded.state.lockedOrders[roleId];
    await save(q, loaded.row.version, loaded.state);
    return { ok: true };
  });
}

export async function findOwnSandbox(actorHash: string) {
  await ready();
  const rows = await database().sql.all<{ id: string; owner_hash: string | null; kind: string }>(
    "SELECT id, owner_hash, kind FROM worlds WHERE kind = ?",
    ["sandbox"],
  );
  return rows.find((r) => r.owner_hash === actorHash)?.id ?? null;
}
