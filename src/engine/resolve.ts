import { ensureWorks, farmFactor, forecast, grainShock, isFord, marchLossRate, normalizeClimate, plannedBounty, roadOpen, troopShock, type SkyReport } from "./climate";
import { applyGearAction, duelGearBonus, ensureGear, grantSearchClue, isGearKind } from "./gear";
import { applyAmendment, readPath } from "./config";
import { ALLEGIANCE_COST, allegianceRules, ensureAllegianceState, thresholdLabel } from "./allegiance";
import { assess, cityById, factionById, isVassalOf, roleById } from "./assess";
import { fight } from "./battle";
import type {
  ChronicleEntry,
  City,
  Faction,
  Motion,
  Offer,
  Order,
  Role,
  WorldState,
} from "./types";

let seqCursor = 0;

function push(
  state: WorldState,
  entry: {
    turn: number;
    phase: ChronicleEntry["phase"];
    kind: string;
    key: string;
    params?: Record<string, string | number | boolean | null | undefined>;
    roleId?: string;
  },
): void {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(entry.params ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    params[key] = String(value);
  }
  seqCursor += 1;
  state.chronicle.push({
    seq: seqCursor,
    turn: entry.turn,
    phase: entry.phase,
    kind: entry.kind,
    key: entry.key,
    params,
    roleId: entry.roleId,
  });
}

function voteAnon(state: WorldState): "1" | undefined {
  return allegianceRules(state.config).vote_named ? undefined : "1";
}

function living(state: WorldState): Role[] {
  return state.roles.filter((r) => r.alive);
}

function officersOf(state: WorldState, factionId: string | null): Role[] {
  return living(state).filter(
    (r) =>
      r.factionId === factionId &&
      (r.office === "lord" || r.office === "general" || r.office === "advisor"),
  );
}

function gain(current: number, base: number, cap: number, diminishing: boolean): number {
  if (!diminishing) return Math.min(cap, current + base);
  const room = Math.max(0, cap - current);
  const factor = 0.35 + 0.65 * (room / cap);
  return Math.min(cap, current + Math.round(base * factor));
}

function depose(state: WorldState, role: Role, succession = true) {
  const faction = factionById(state, role.factionId);
  const wasLord = faction?.lordRoleId === role.id;
  role.office = "wanderer";
  role.factionId = null;
  if (wasLord && faction) {
    faction.lordRoleId = null;
    if (faction.regentRoleId === role.id) faction.regentRoleId = null;
    if (succession) succeed(state, faction);
  }
}

function kill(state: WorldState, role: Role, reason: "battle" | "executed", turn: number) {
  if (!role.alive) return;
  const faction = factionById(state, role.factionId);
  const wasLord = faction?.lordRoleId === role.id;
  role.alive = false;
  role.office = "dead";
  role.deathReason = reason;
  role.diedTurn = turn;
  role.seated = false;
  if (wasLord && faction) {
    faction.lordRoleId = null;
    succeed(state, faction);
  }
  if (faction?.regentRoleId === role.id) faction.regentRoleId = null;
}

function succeed(state: WorldState, faction: Faction) {
  if (faction.eliminated) return;
  const regent = roleById(state, faction.regentRoleId);
  if (
    state.config.politics.regency.enabled &&
    regent?.alive &&
    regent.factionId === faction.id &&
    (regent.office === "general" || regent.office === "advisor")
  ) {
    regent.office = "lord";
    faction.lordRoleId = regent.id;
    faction.regentRoleId = null;
    push(state, {
      turn: state.turn,
      phase: "court",
      kind: "succession",
      key: "court.regent", params: { actor: regent.id, faction: faction.id },
    });
    return;
  }
  const candidates = officersOf(state, faction.id)
    .filter((r) => r.office !== "lord")
    .sort((a, b) => b.command - a.command || b.intellect - a.intellect || a.name.localeCompare(b.name, "zh"));
  const next = candidates[0];
  if (!next) return;
  next.office = "lord";
  faction.lordRoleId = next.id;
  push(state, {
    turn: state.turn,
    phase: "court",
    kind: "succession",
    key: "court.succeed", params: { faction: faction.id, actor: next.id },
  });
}

function allied(state: WorldState, a: string, b: string): boolean {
  return state.alliances.some((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
}

function truce(state: WorldState, a: string, b: string): boolean {
  return state.truces.some(
    (t) => t.untilTurn >= state.turn && ((t.a === a && t.b === b) || (t.a === b && t.b === a)),
  );
}

function pair(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

interface Scratch {
  holding: Set<string>;
  gates: Map<string, number>;
  marched: Set<string>;
  submitted: Set<string>;
  clinics: Map<string, number>;
  swears: { roleId: string; targetId: string }[];
  fires: Set<string>;
}

function tally(state: WorldState, motion: Motion) {
  const proposer = roleById(state, motion.proposerId);
  const factionId = proposer?.factionId ?? null;
  const eligible =
    motion.type === "amend"
      ? living(state).filter((r) => r.office === "lord" || r.office === "general" || r.office === "advisor")
      : officersOf(state, factionId);
  const eligibleIds = new Set(eligible.map((r) => r.id));
  const counted = motion.votes.filter((v) => eligibleIds.has(v.roleId) && v.choice !== "silent");
  const aye = counted.filter((v) => v.choice === "aye").length;
  const nay = counted.filter((v) => v.choice === "nay").length;
  const threshold =
    motion.type === "execute"
      ? state.config.politics.execute.threshold
      : motion.type === "exile"
        ? state.config.politics.exile.threshold
        : state.config.politics.impeach.threshold;
  const ratio = aye + nay === 0 ? 0 : aye / (aye + nay);
  const pass = aye >= 2 && ratio + 1e-9 >= threshold;
  return { pass, aye, nay, threshold };
}

function openMotion(state: WorldState, role: Role, order: Order, scratch: Scratch) {
  const motion = order.motion;
  if (!motion) return;
  if (motion.type === "mutiny") {
    return;
  }
  if (motion.type === "recommend") {
    const target = roleById(state, motion.targetRoleId);
    if (!target?.alive) return;
    const promotable =
      state.config.identity.promotion_enabled &&
      target.office === "captain" &&
      target.merit >= 3 &&
      target.factionId === role.factionId;
    const recruitable = target.office === "wanderer" && target.discovered && !target.factionId;
    if (!promotable && !recruitable) {
      push(state, {
        turn: state.turn,
        phase: "court",
        kind: "reject",
        key: "court.recommend.fail", params: { actor: role.id, target: target.id },
      });
      return;
    }
    target.factionId = role.factionId;
    target.office = "general";
    if (!target.cityId) target.cityId = role.cityId;
    if (!target.historical) target.kind = "promoted";
    push(state, {
      turn: state.turn,
      phase: "court",
      kind: "recommend",
      key: "court.recommend",
      params: { actor: role.id, target: target.id, faction: role.factionId, rank: target.historical ? "historical" : "low" },
    });
    return;
  }
  if (motion.type === "abdicate") {
    const target = roleById(state, motion.targetRoleId);
    const faction = factionById(state, role.factionId);
    if (!target || !faction || role.office !== "lord") return;
    role.office = "advisor";
    target.office = "lord";
    faction.lordRoleId = target.id;
    push(state, {
      turn: state.turn,
      phase: "court",
      kind: "abdicate",
      key: "court.abdicate", params: { actor: role.id, target: target.id, faction: faction.id },
    });
    return;
  }
  if (motion.type === "regency") {
    const target = roleById(state, motion.targetRoleId);
    const faction = factionById(state, role.factionId);
    if (!target || !faction) return;
    faction.regentRoleId = target.id;
    push(state, {
      turn: state.turn,
      phase: "court",
      kind: "regency",
      key: "court.regency", params: { actor: role.id, target: target.id },
    });
    return;
  }
  if (motion.type === "amend") {
    const key = motion.amendKey;
    const value = motion.amendValue;
    if (!key || typeof value !== "number") return;
    const from = readPath(state.config, key);
    const record: Motion = {
      id: `m_${state.turn}_${role.id}_${key}`,
      turnOpened: state.turn,
      type: "amend",
      proposerId: role.id,
      amendKey: key,
      amendValue: value,
      votes: [{ roleId: role.id, choice: "aye" }],
      status: state.config.politics.impeach.defense_hours > 0 ? "defense" : "voting",
    };
    state.motions.push(record);
    push(state, {
      turn: state.turn,
      phase: "court",
      kind: "amend_open",
      key: record.status === "defense" ? "court.amend.defense" : "court.amend.vote",
      params: { actor: role.id, amend: key, from: from ?? "?", value },
    });
    return;
  }
  const target = roleById(state, motion.targetRoleId);
  if (!target) return;
  const record: Motion = {
    id: `m_${state.turn}_${role.id}_${motion.type}_${target.id}`,
    turnOpened: state.turn,
    type: motion.type,
    proposerId: role.id,
    targetRoleId: target.id,
    charge: motion.charge,
    votes: [{ roleId: role.id, choice: "aye" }],
    status: state.config.politics.impeach.defense_hours > 0 ? "defense" : "voting",
  };
  state.motions.push(record);
  const motionKey = motion.type === "exile" ? "court.motion.exile" : motion.type === "execute" ? "court.motion.execute" : "court.motion.impeach";
  push(state, {
    turn: state.turn,
    phase: "court",
    kind: "motion",
    key: record.status === "defense" ? `${motionKey}.defense` : `${motionKey}.vote`,
    params: { actor: role.id, target: target.id, charge: motion.charge ?? "unknown" },
  });
  void scratch;
}

function carrySentences(state: WorldState) {
  for (const motion of state.motions) {
    if (motion.status !== "notice" || motion.noticeUntilTurn == null) continue;
    if (state.turn < motion.noticeUntilTurn) continue;
    const target = roleById(state, motion.targetRoleId);
    motion.status = "passed";
    if (!target?.alive) {
      push(state, {
        turn: state.turn,
        phase: "court",
        kind: "execute_void",
        key: "court.execute.gone",
        params: { target: target?.id, targetName: target?.name ?? "此人" },
      });
      continue;
    }
    kill(state, target, "executed", state.turn);
    push(state, {
      turn: state.turn,
      phase: "court",
      kind: "execute",
      key: "court.execute.done", params: { target: target.id },
    });
  }
}

function resolveCourt(state: WorldState, orders: Record<string, Order>, scratch: Scratch) {
  for (const role of living(state)) {
    const order = orders[role.id];
    if (!order) continue;
    for (const vote of order.votes) {
      const motion = state.motions.find((m) => m.id === vote.motionId && m.status === "voting");
      if (!motion) continue;
      if (motion.votes.some((v) => v.roleId === role.id)) continue;
      motion.votes.push({ roleId: role.id, choice: vote.choice });
    }
  }

  for (const motion of state.motions) {
    if (motion.status !== "voting") continue;
    const result = tally(state, motion);
    if (!result.pass) {
      motion.status = "failed";
      push(state, {
        turn: state.turn,
        phase: "court",
        kind: "motion_fail",
        key: roleById(state, motion.targetRoleId) ? "court.fail.person" : "court.fail.topic",
        params: {
          target: motion.targetRoleId,
          topic: motion.amendKey ?? "动议",
          motion: motion.type,
          aye: result.aye,
          nay: result.nay,
          threshold: Math.round(result.threshold * 100),
        },
      });
      continue;
    }
    if (motion.type === "impeach") {
      motion.status = "passed";
      push(state, {
        turn: state.turn,
        phase: "court",
        kind: "impeach",
        key: "court.impeach",
        params: { target: motion.targetRoleId, charge: motion.charge ?? "unknown" },
      });
    } else if (motion.type === "exile") {
      motion.status = "passed";
      const target = roleById(state, motion.targetRoleId);
      if (target?.alive) {
        const cost = state.config.politics.exile.reputation_cost;
        target.reputation = Math.max(0, target.reputation - cost);
        const name = target.name;
        depose(state, target);
        push(state, {
          turn: state.turn,
          phase: "court",
          kind: "exile",
          key: "court.exile", params: { target: target.id, cost },
        });
      }
    } else if (motion.type === "execute") {
      motion.status = "notice";
      motion.noticeUntilTurn = state.turn + 1;
      push(state, {
        turn: state.turn,
        phase: "court",
        kind: "execute_notice",
        key: "court.execute.notice",
        params: { target: motion.targetRoleId },
      });
    } else if (motion.type === "amend" && motion.amendKey && typeof motion.amendValue === "number") {
      const from = readPath(state.config, motion.amendKey);
      const applied = applyAmendment(state.config, motion.amendKey, motion.amendValue);
      if (!applied.ok) {
        motion.status = "failed";
        push(state, {
          turn: state.turn,
          phase: "court",
          kind: "amend_fail",
          key: "court.amend.fail", params: { error: applied.error },
        });
      } else {
        motion.status = "passed";
        state.config = applied.config;
        state.experimental = true;
        state.countsAsExperiment = false;
        state.amendments.push({
          turn: state.turn,
          key: motion.amendKey,
          from: from ?? 0,
          to: readPath(applied.config, motion.amendKey) ?? motion.amendValue,
        });
        push(state, {
          turn: state.turn,
          phase: "court",
          kind: "amend",
          key: "court.amend.done",
          params: { amend: motion.amendKey, from, value: readPath(applied.config, motion.amendKey) },
        });
      }
    }
  }

  for (const motion of state.motions) {
    if (motion.status === "defense") motion.status = "voting";
  }

  const mutinyGroups = new Map<string, Role[]>();
  for (const role of living(state)) {
    const order = orders[role.id];
    if (order?.motion?.type !== "mutiny") continue;
    const key = `${role.factionId}:${order.motion.targetRoleId}`;
    const list = mutinyGroups.get(key) ?? [];
    list.push(role);
    mutinyGroups.set(key, list);
  }
  for (const [key, signers] of mutinyGroups) {
    const targetId = key.split(":")[1];
    const target = roleById(state, targetId);
    if (!target || target.office !== "lord") continue;
    const pool = officersOf(state, target.factionId).filter((r) => r.office !== "lord");
    if (signers.length >= 2 && signers.length * 2 >= pool.length) {
      const winner = [...signers].sort((a, b) => b.command - a.command || a.name.localeCompare(b.name, "zh"))[0]!;
      const faction = factionById(state, target.factionId);
      depose(state, target, false);
      if (faction && !faction.eliminated) {
        winner.factionId = faction.id;
        winner.office = "lord";
        faction.lordRoleId = winner.id;
      }
      push(state, {
        turn: state.turn,
        phase: "court",
        kind: "mutiny",
        key: "court.mutiny",
        params: { signers: signers.map((s) => s.id).join("|"), target: target.id, winner: winner.id },
      });
    } else {
      push(state, {
        turn: state.turn,
        phase: "court",
        kind: "mutiny_fail",
        key: "court.mutiny.fail", params: { target: target.id, n: signers.length },
      });
    }
  }

  for (const role of living(state)) {
    const order = orders[role.id];
    if (!order) continue;
    if (order.plea) {
      const motion = state.motions.find((m) => m.id === order.plea!.motionId);
      if (motion) motion.plea = order.plea.plea;
      const word = order.plea.plea === "admit" ? "认罪" : order.plea.plea === "deny" ? "辩无" : "沉默";
      push(state, {
        turn: state.turn,
        phase: "court",
        kind: "plea",
        key: "court.plea", params: { actor: role.id, plea: order.plea.plea },
      });
    }
    if (order.remark && state.config.comm.free_chat) {
      push(state, {
        turn: state.turn,
        phase: "court",
        kind: "remark",
        key: "court.remark", params: { actor: role.id, remark: order.remark },
      });
    }
    if (order.letter && state.config.comm.private_message) {
      state.letters.push({
        id: `letter_${state.turn}_${role.id}`,
        turn: state.turn,
        fromRoleId: role.id,
        toRoleId: order.letter.toRoleId,
        text: order.letter.text,
      });
      push(state, {
        turn: state.turn,
        phase: "court",
        kind: "letter",
        key: "court.letter",
        params: { actor: role.id, target: order.letter.toRoleId, targetName: roleById(state, order.letter.toRoleId)?.name ?? "某人" },
      });
    }
    openMotion(state, role, order, scratch);
  }
}

function isRelief(kind: string) {
  return kind === "raise_dike" || kind === "store_grain" || kind === "raise_clinic" || kind === "dig_canal" || kind === "mend_road" || kind === "watch_sky" || kind === "relieve";
}

function relieve(state: WorldState, role: Role, city: City, destId: string | undefined, sky: SkyReport) {
  const dest = cityById(state, destId);
  if (!dest || dest.id === city.id) {
    push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "relief.need_city", params: { actor: role.id } });
    return;
  }
  const hurt = Boolean(sky.disaster || sky.weather === "旱" || ensureWorks(dest).plague > 0);
  if (!hurt) {
    push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "relief.no_disaster", params: { city: dest.id, actor: role.id } });
    return;
  }
  if (dest.controllerId && dest.controllerId !== role.factionId && !allied(state, role.factionId ?? "", dest.controllerId)) {
    push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "relief.enemy", params: { actor: role.id, city: dest.id } });
    return;
  }
  const moved = Math.min(state.config.relief.relief_grain, city.grain);
  if (moved <= 0) {
    push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "relief.no_grain", params: { city: city.id, actor: role.id } });
    return;
  }
  city.grain -= moved;
  dest.grain = Math.min(state.config.eco.resource_cap, dest.grain + moved);
  const before = dest.morale;
  dest.morale = Math.min(90, dest.morale + state.config.relief.relief_morale);
  role.merit += 1;
  role.reputation = Math.min(100, role.reputation + state.config.relief.relief_reputation);
  let trust: number | undefined;
  if (dest.controllerId && role.factionId && dest.controllerId !== role.factionId) {
    const list = state.trust ?? [];
    state.trust = list;
    const row = list.find((item) => item.fromFactionId === role.factionId && item.toFactionId === dest.controllerId);
    if (row) row.score += 1;
    else list.push({ fromFactionId: role.factionId, toFactionId: dest.controllerId, score: 1 });
    trust = list.find((item) => item.fromFactionId === role.factionId && item.toFactionId === dest.controllerId)?.score ?? 1;
  }
  push(state, {
    turn: state.turn,
    phase: "domestic",
    kind: "relief",
    roleId: role.id,
    key: "relief.done",
    params: {
      actor: role.id,
      origin: city.id,
      city: dest.id,
      moved,
      before,
      after: dest.morale,
      rep: state.config.relief.relief_reputation,
      trust,
      theirs: dest.controllerId,
      ours: role.factionId,
    },
  });
}

function reward(state: WorldState, role: Role, city: City) {
  if (role.office !== "lord" && role.office !== "general" && role.office !== "advisor") {
    push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "domestic.reward.cannot", params: { actor: role.id } });
    return;
  }
  const cost = state.config.deeds.reward_gold;
  if (city.gold < cost) {
    push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "domestic.reward.poor", params: { city: city.id, cost, actor: role.id } });
    return;
  }
  city.gold -= cost;
  const before = city.morale;
  city.morale = Math.min(90, city.morale + state.config.deeds.reward_morale);
  push(state, { turn: state.turn, phase: "domestic", kind: "reward", key: "domestic.reward", params: { actor: role.id, city: city.id, cost, before, after: city.morale } });
}

function breakBond(state: WorldState, role: Role, targetId: string | undefined) {
  const bonds = state.bonds ?? [];
  state.bonds = bonds;
  const index = bonds.findIndex((bond) => (bond.a === role.id && bond.b === targetId) || (bond.b === role.id && bond.a === targetId));
  if (index < 0) {
    push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "domestic.bond.missing", params: { actor: role.id } });
    return;
  }
  const other = roleById(state, targetId);
  bonds.splice(index, 1);
  role.reputation = Math.max(0, role.reputation - state.config.deeds.betray_reputation);
  push(state, { turn: state.turn, phase: "domestic", kind: "highlight", key: "domestic.bond.break", params: { actor: role.id, other: other?.id, otherName: other?.name ?? "故人", cost: state.config.deeds.betray_reputation } });
}

function pairSwears(state: WorldState, scratch: Scratch) {
  const used = new Set<string>();
  for (const row of scratch.swears) {
    const back = scratch.swears.find((item) => item.roleId === row.targetId && item.targetId === row.roleId);
    const key = [row.roleId, row.targetId].sort().join(":");
    if (!back || used.has(key)) continue;
    used.add(key);
    const a = roleById(state, row.roleId);
    const b = roleById(state, row.targetId);
    if (!a?.alive || !b?.alive || !a.seated || !b.seated || a.factionId !== b.factionId || a.captiveOf || b.captiveOf) {
      push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "domestic.bond.fail", params: { actor: a?.id, actorName: a?.name ?? "某人", other: b?.id, otherName: b?.name ?? "某人" } });
      continue;
    }
    const bonds = state.bonds ?? [];
    state.bonds = bonds;
    if (bonds.some((bond) => (bond.a === a.id && bond.b === b.id) || (bond.a === b.id && bond.b === a.id))) {
      push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "domestic.bond.already", params: { actor: a.id, other: b.id } });
      continue;
    }
    bonds.push({ a: a.id, b: b.id, sinceTurn: state.turn });
    push(state, { turn: state.turn, phase: "domestic", kind: "highlight", key: "domestic.bond.sworn", params: { actor: a.id, other: b.id } });
  }
  for (const row of scratch.swears) {
    const key = [row.roleId, row.targetId].sort().join(":");
    if (used.has(key)) continue;
    const a = roleById(state, row.roleId);
    const b = roleById(state, row.targetId);
    push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "domestic.bond.silence", params: { actor: a?.id, actorName: a?.name ?? "某人", other: b?.id, otherName: b?.name ?? "某人" } });
  }
}

function scheme(state: WorldState, role: Role, city: City, action: Order["domestic"][number], sky: SkyReport, scratch: Scratch) {
  if (action.scheme === "fire") {
    const dry = sky.weather === "旱" || (sky.season === "秋" && sky.weather === "晴");
    if (!dry) {
      push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "domestic.fire.weather", params: { actor: role.id } });
      return;
    }
    scratch.fires.add(city.id);
    const percent = Math.round(state.config.deeds.fire_loss * 100);
    push(state, { turn: state.turn, phase: "domestic", kind: "highlight", key: "domestic.fire.ready", params: { actor: role.id, city: city.id, percent } });
    return;
  }
  if (action.scheme === "discord") {
    const target = roleById(state, action.targetRoleId);
    if (!target?.alive || !target.factionId || target.factionId === role.factionId) {
      push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "domestic.discord.none", params: { actor: role.id } });
      return;
    }
    if (role.intellect < target.intellect) {
      push(state, { turn: state.turn, phase: "domestic", kind: "scheme", key: "domestic.discord.fail", params: { actor: role.id, target: target.id } });
      return;
    }
    target.reputation = Math.max(0, target.reputation - state.config.deeds.discord_reputation);
    const home = cityById(state, target.cityId);
    if (home) home.morale = Math.max(0, home.morale - 4);
    push(state, { turn: state.turn, phase: "domestic", kind: "highlight", key: "domestic.discord", params: { actor: role.id, target: target.id, cost: state.config.deeds.discord_reputation, home: home?.id, morale: home?.morale } });
    return;
  }
  const dest = cityById(state, action.destCityId);
  if (!dest || !city.links.includes(dest.id) || !dest.controllerId || dest.controllerId === role.factionId) {
    push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "domestic.rumor.range", params: { actor: role.id } });
    return;
  }
  if (role.intellect < 12) {
    push(state, { turn: state.turn, phase: "domestic", kind: "scheme", key: "domestic.rumor.fail", params: { actor: role.id, city: dest.id } });
    return;
  }
  dest.morale = Math.max(0, dest.morale - state.config.deeds.rumor_morale);
  push(state, { turn: state.turn, phase: "domestic", kind: "highlight", key: "domestic.rumor", params: { actor: role.id, city: dest.id, morale: dest.morale } });
}

function releaseCaptive(state: WorldState, role: Role, targetId: string | undefined) {
  const target = roleById(state, targetId);
  if (role.office !== "lord" || !target?.alive || target.captiveOf !== role.factionId) {
    push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "domestic.release.fail", params: { actor: role.id } });
    return;
  }
  target.captiveOf = null;
  const home = state.cities
    .filter((city) => city.controllerId === target.factionId)
    .sort((a, b) => b.troops - a.troops || a.id.localeCompare(b.id))[0];
  if (home) target.cityId = home.id;
  push(state, { turn: state.turn, phase: "domestic", kind: "highlight", key: "domestic.release", params: { actor: role.id, target: target.id, home: home?.id } });
}

function resolveDomestic(state: WorldState, orders: Record<string, Order>, scratch: Scratch, sky: SkyReport) {
  const roles = living(state).slice().sort((a, b) => a.id.localeCompare(b.id));
  let any = false;
  for (const role of roles) {
    const actions = orders[role.id]?.domestic ?? [];
    if (actions.length) any = true;
    for (const action of actions) {
      const city = cityById(state, role.cityId);
      if (!city && action.kind !== "search" && action.kind !== "learn" && action.kind !== "unequip") {
        push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "domestic.no_city", params: { actor: role.id, action: action.kind } });
        continue;
      }
      if (action.kind === "develop" && city) {
        const before = city.gold;
        city.gold = gain(city.gold, 90, state.config.eco.resource_cap, state.config.eco.diminishing_returns);
        push(state, { turn: state.turn, phase: "domestic", kind: "develop", key: "domestic.develop", params: { actor: role.id, city: city.id, before, after: city.gold } });
      } else if (action.kind === "farm" && city) {
        const grown = farmFactor(
          state.config.climate,
          sky,
          state.config.relief.enabled ? ensureWorks(city).canal : 0,
          state.config.relief.canal_drought_ease,
        );
        const before = city.grain;
        city.grain = gain(
          city.grain,
          Math.max(1, Math.round(110 * grown.factor)),
          state.config.eco.resource_cap,
          state.config.eco.diminishing_returns,
        );
        push(state, {
          turn: state.turn,
          phase: "domestic",
          kind: "farm",
          key: "domestic.farm",
          params: { actor: role.id, city: city.id, note: grown.note, before, after: city.grain },
        });
      } else if (action.kind === "recruit" && city) {
        if (city.controllerId !== role.factionId) {
          push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "domestic.recruit.foreign", params: { actor: role.id, city: city.id } });
        } else if (city.grain < 120) {
          push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "domestic.recruit.grain", params: { city: city.id, actor: role.id } });
        } else {
          city.grain -= 120;
          const before = city.troops;
          city.troops = Math.min(state.config.eco.resource_cap, city.troops + 100);
          push(state, { turn: state.turn, phase: "domestic", kind: "recruit", key: "domestic.recruit", params: { actor: role.id, city: city.id, before, after: city.troops } });
        }
      } else if (action.kind === "drill_prowess") {
        role.prowess = Math.min(20, role.prowess + 1);
        push(state, { turn: state.turn, phase: "domestic", kind: "drill", key: "domestic.drill.prowess", params: { actor: role.id, value: role.prowess } });
      } else if (action.kind === "drill_command") {
        role.command = Math.min(20, role.command + 1);
        push(state, { turn: state.turn, phase: "domestic", kind: "drill", key: "domestic.drill.command", params: { actor: role.id, value: role.command } });
      } else if (action.kind === "search") {
        const hidden = state.roles
          .filter((r) => r.historical && r.alive && !r.discovered)
          .sort((a, b) => a.id.localeCompare(b.id));
        const canPeople = state.config.eco.search_discovers.includes("已有在野角色");
        if (canPeople && hidden[0] && city) {
          const found = hidden[0];
          found.discovered = true;
          found.cityId = city.id;
          push(state, { turn: state.turn, phase: "domestic", kind: "search", key: "domestic.search.found", params: { actor: role.id, city: city.id, found: found.id, foundName: found.name } });
        } else if (city && state.config.eco.search_discovers.includes("物品")) {
          const before = city.grain;
          city.grain = gain(city.grain, 80, state.config.eco.resource_cap, state.config.eco.diminishing_returns);
          push(state, { turn: state.turn, phase: "domestic", kind: "search", key: "domestic.search.grain", params: { actor: role.id, city: city.id, before, after: city.grain } });
          const clue = grantSearchClue(state, role, city.id);
          push(state, { turn: state.turn, phase: "domestic", kind: "gear", key: clue.key, params: clue.params, roleId: role.id });
        } else if (city && state.config.eco.search_discovers.includes("情报")) {
          const neighbor = state.cities.find((c) => city.links.includes(c.id));
          push(state, {
            turn: state.turn,
            phase: "domestic",
            kind: "intel",
            key: neighbor ? "domestic.intel" : "domestic.intel.none",
            params: neighbor ? { actor: role.id, city: neighbor.id, troops: neighbor.troops, grain: neighbor.grain } : { actor: role.id },
          });
          if (city) {
            const clue = grantSearchClue(state, role, city.id);
            push(state, { turn: state.turn, phase: "domestic", kind: "gear", key: clue.key, params: clue.params, roleId: role.id });
          }
        } else if (city) {
          const clue = grantSearchClue(state, role, city.id);
          push(state, { turn: state.turn, phase: "domestic", kind: "gear", key: clue.key, params: clue.params, roleId: role.id });
        }
      } else if (isGearKind(action.kind)) {
        const gearNote = applyGearAction(state, role, action);
        push(state, { turn: state.turn, phase: "domestic", kind: gearNote.ok ? "gear" : "reject", key: gearNote.key, params: gearNote.params, roleId: role.id });
      } else if (action.kind === "transport" && city && action.destCityId) {
        const dest = cityById(state, action.destCityId);
        const moved = Math.min(200, Math.floor(city.grain / 2));
        if (dest && moved > 0) {
          city.grain -= moved;
          dest.grain = Math.min(state.config.eco.resource_cap, dest.grain + moved);
          push(state, { turn: state.turn, phase: "domestic", kind: "transport", key: "domestic.transport", params: { actor: role.id, moved, origin: city.id, city: dest.id } });
        }
      } else if (action.kind === "enlist" && city) {
        if (!city.controllerId) {
          push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "domestic.enlist.none", params: { actor: role.id, city: city.id } });
        } else {
          role.kind = "soldier";
          role.office = "captain";
          role.factionId = city.controllerId;
          push(state, { turn: state.turn, phase: "domestic", kind: "enlist", key: "domestic.enlist", params: { actor: role.id, city: city.id } });
        }
      } else if (action.kind === "open_gates" && city) {
        const n = (scratch.gates.get(city.id) ?? 0) + 1;
        scratch.gates.set(city.id, n);
        city.morale = Math.max(0, city.morale - (n >= 2 ? 25 : 8));
        push(state, { turn: state.turn, phase: "domestic", kind: "gates", key: "domestic.gates", params: { actor: role.id, city: city.id, n, morale: city.morale } });
      } else if (action.kind === "hold_line") {
        scratch.holding.add(role.id);
        push(state, { turn: state.turn, phase: "domestic", kind: "hold", key: "domestic.hold", params: { actor: role.id } });
      } else if (!state.config.relief.enabled && isRelief(action.kind)) {
        push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "domestic.relief.off", params: { actor: role.id } });
      } else if (action.kind === "raise_dike" && city) {
        const works = ensureWorks(city);
        const before = works.dike;
        works.dike = Math.min(state.config.relief.dike_max, works.dike + 1);
        works.dikeIdle = 0;
        push(state, { turn: state.turn, phase: "domestic", kind: "mitigate", key: "domestic.dike", params: { actor: role.id, city: city.id, before, after: works.dike } });
      } else if (action.kind === "store_grain" && city) {
        const works = ensureWorks(city);
        const room = state.config.relief.granary_cap - works.granary;
        const moved = Math.min(state.config.relief.granary_deposit, room, Math.max(0, city.grain - 40));
        if (moved <= 0) {
          push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "domestic.granary.full", params: { city: city.id } });
        } else {
          city.grain -= moved;
          works.granary += moved;
          push(state, { turn: state.turn, phase: "domestic", kind: "mitigate", key: "domestic.granary", params: { actor: role.id, city: city.id, moved, granary: works.granary, grain: city.grain } });
        }
      } else if (action.kind === "raise_clinic" && city) {
        const works = ensureWorks(city);
        const before = works.clinic;
        works.clinic = Math.min(state.config.relief.clinic_max, works.clinic + 1);
        if (works.plague > 0) works.plague -= 1;
        scratch.clinics.set(city.id, (scratch.clinics.get(city.id) ?? 0) + 1);
        push(state, { turn: state.turn, phase: "domestic", kind: "mitigate", key: "domestic.clinic", params: { actor: role.id, city: city.id, before, after: works.clinic, plague: works.plague || undefined } });
      } else if (action.kind === "dig_canal" && city) {
        const works = ensureWorks(city);
        const before = works.canal;
        works.canal = Math.min(state.config.relief.canal_max, works.canal + 1);
        works.canalIdle = 0;
        push(state, { turn: state.turn, phase: "domestic", kind: "mitigate", key: "domestic.canal", params: { actor: role.id, city: city.id, before, after: works.canal } });
      } else if (action.kind === "mend_road" && city) {
        const dest = cityById(state, action.destCityId);
        if (!dest || !city.links.includes(dest.id)) {
          push(state, { turn: state.turn, phase: "domestic", kind: "reject", key: "domestic.road.none", params: { actor: role.id } });
        } else {
          const works = ensureWorks(city);
          const road = works.roads.find((item) => item.to === dest.id);
          if (road) road.idle = 0;
          else works.roads.push({ to: dest.id, idle: 0 });
          push(state, { turn: state.turn, phase: "domestic", kind: "mitigate", key: "domestic.road", params: { actor: role.id, origin: city.id, city: dest.id } });
        }
      } else if (action.kind === "watch_sky") {
        const next = forecast(state, state.turn + 1);
        push(state, { turn: state.turn, phase: "domestic", kind: "mitigate", key: "domestic.sky", params: { actor: role.id, season: next.season, weather: next.weather, disaster: next.disaster ?? undefined } });
      } else if (action.kind === "relieve" && city) {
        relieve(state, role, city, action.destCityId, sky);
      } else if (action.kind === "reward" && city) {
        reward(state, role, city);
      } else if (action.kind === "swear") {
        scratch.swears.push({ roleId: role.id, targetId: action.targetRoleId ?? "" });
      } else if (action.kind === "break_bond") {
        breakBond(state, role, action.targetRoleId);
      } else if (action.kind === "scheme" && city) {
        scheme(state, role, city, action, sky, scratch);
      } else if (action.kind === "release") {
        releaseCaptive(state, role, action.targetRoleId);
      }
    }
    if (orders[role.id]?.war?.preset && state.config.eco.offline_preset) {
      role.preset = orders[role.id]!.war!.preset!;
    }
  }
  pairSwears(state, scratch);
  if (state.config.eco.idle_decay > 0 && !any) {
    for (const city of state.cities) {
      if (!city.controllerId) continue;
      const loss = Math.floor(city.grain * state.config.eco.idle_decay);
      city.grain -= loss;
    }
  }
}

function respond(state: WorldState, role: Role, order: Order) {
  const d = order.diplomacy;
  if (!d || d.type !== "respond" || !d.offerId) return;
  const offer = state.offers.find((o) => o.id === d.offerId);
  if (!offer || offer.status !== "pending" && offer.status !== "delayed") return;
  const targetRole = roleById(state, offer.targetRoleId);
  const allowed =
    role.seated &&
    ((offer.kind === "defect" && targetRole?.id === role.id) ||
      (offer.kind !== "defect" && role.office === "lord" && role.factionId === offer.toFactionId));
  if (!allowed) return;
  const response = d.response ?? "silent";
  if (response === "silent") {
    push(state, { turn: state.turn, phase: "diplomacy", kind: "silent", key: "diplomacy.silent", params: { actor: role.id, from: offer.fromFactionId } });
    return;
  }
  if (response === "delay") {
    offer.status = "delayed";
    push(state, { turn: state.turn, phase: "diplomacy", kind: "delay", key: "diplomacy.delay", params: { actor: role.id, from: offer.fromFactionId } });
    return;
  }
  if (response === "reject") {
    offer.status = "rejected";
    const named = offer.kind === "submit" || offer.kind === "surrender" || offer.kind === "seek" || offer.kind === "serve";
    push(state, {
      turn: state.turn,
      phase: "diplomacy",
      kind: named ? "allegiance_reject" : "reject_offer",
      key: named
        ? (roleById(state, offer.targetRoleId) ? "diplomacy.reject.person" : "diplomacy.reject.faction")
        : "diplomacy.reject.offer",
      params: { actor: role.id, who: offer.targetRoleId, from: offer.fromFactionId, kind: offer.kind },
    });
    return;
  }
  offer.status = "accepted";
  offer.condition = response === "conditional" ? d.condition : undefined;
  acceptOffer(state, offer, role);
}

function acceptOffer(state: WorldState, offer: Offer, responder: Role) {
  const from = factionById(state, offer.fromFactionId);
  const to = factionById(state, offer.toFactionId);
  if (!from || !to) return;
  if (offer.kind === "alliance") {
    if (!allied(state, from.id, to.id)) {
      state.alliances.push({ a: from.id, b: to.id, sinceTurn: state.turn });
    }
    if (state.config.comm.contract_system) {
      state.contracts.push({
        id: `k_${offer.id}`,
        kind: "alliance",
        parties: [from.id, to.id],
        sinceTurn: state.turn,
        status: "active",
        text: "alliance",
      });
    }
    push(state, { turn: state.turn, phase: "diplomacy", kind: "alliance", key: "diplomacy.alliance", params: { host: to.id, from: from.id } });
  } else if (offer.kind === "truce") {
    const [a, b] = pair(from.id, to.id);
    state.truces = state.truces.filter((t) => !((t.a === a && t.b === b)));
    state.truces.push({ a: a!, b: b!, untilTurn: state.turn + 3 });
    push(state, { turn: state.turn, phase: "diplomacy", kind: "truce", key: "diplomacy.truce", params: { from: from.id, host: to.id } });
  } else if (offer.kind === "vassal") {
    to.liegeId = from.id;
    if (state.config.comm.contract_system) {
      state.contracts.push({
        id: `k_${offer.id}`,
        kind: "vassal",
        parties: [from.id, to.id],
        sinceTurn: state.turn,
        status: "active",
        text: "vassal",
      });
    }
    push(state, { turn: state.turn, phase: "diplomacy", kind: "vassal", key: "diplomacy.vassal", params: { actor: responder.id, host: to.id, from: from.id } });
  } else if (offer.kind === "defect") {
    const person = roleById(state, offer.targetRoleId);
    if (!person?.alive) return;
    if (person.office === "lord") {
      const faction = factionById(state, person.factionId);
      if (faction) {
        faction.liegeId = from.id;
        push(state, { turn: state.turn, phase: "diplomacy", kind: "vassal", key: "diplomacy.defect.lord", params: { actor: person.id, faction: faction.id, from: from.id } });
      }
    } else {
      const old = person.factionId;
      person.factionId = from.id;
      person.office = "general";
      push(state, { turn: state.turn, phase: "diplomacy", kind: "defect", key: "diplomacy.defect", params: { actor: person.id, old, from: from.id } });
    }
  } else if (offer.kind === "submit" || offer.kind === "surrender" || offer.kind === "seek" || offer.kind === "serve") {
    acceptAllegiance(state, offer, from, to);
  }
  if (offer.condition && state.config.comm.contract_system) {
    state.contracts.push({
      id: `c_${offer.id}`,
      kind: "conditional",
      parties: [from.id, to.id],
      sinceTurn: state.turn,
      untilTurn: state.turn + 3,
      status: "active",
      text: offer.condition,
      creditorFactionId: from.id,
      debtorFactionId: to.id,
      condition: offer.condition,
    });
    if (offer.condition === "truce_3") {
      const [a, b] = pair(from.id, to.id);
      state.truces.push({ a: a!, b: b!, untilTurn: state.turn + 3 });
      const contract = state.contracts.find((c) => c.id === `c_${offer.id}`);
      if (contract) contract.status = "fulfilled";
    }
    push(state, { turn: state.turn, phase: "diplomacy", kind: "condition", key: "diplomacy.condition", params: { condition: offer.condition, from: from.id, to: to.id } });
  }
}

function acceptAllegiance(state: WorldState, offer: Offer, from: Faction, to: Faction) {
  const person = roleById(state, offer.targetRoleId);
  const kind = offer.kind;
  if (!person?.alive || !person.seated) {
    offer.status = "rejected";
    push(state, { turn: state.turn, phase: "diplomacy", kind: "allegiance_reject", key: "allegiance.absent", params: { kind } });
    return;
  }
  if (kind === "submit" && (person.office !== "lord" || person.factionId !== from.id)) {
    offer.status = "rejected";
    push(state, { turn: state.turn, phase: "diplomacy", kind: "allegiance_reject", key: "allegiance.not_lord", params: { actor: person.id, from: from.id } });
    return;
  }
  if (kind === "submit") {
    if (to.liegeId === from.id) to.liegeId = null;
    from.liegeId = to.id;
    person.reputation = Math.max(0, person.reputation - ALLEGIANCE_COST.submit);
    push(state, {
      turn: state.turn,
      phase: "diplomacy",
      kind: "allegiance_accept",
      key: "allegiance.submit", params: { actor: person.id, host: to.id, from: from.id, cost: ALLEGIANCE_COST.submit },
    });
    return;
  }
  if (kind === "serve" && (person.office !== "wanderer" || person.factionId)) {
    offer.status = "rejected";
    push(state, { turn: state.turn, phase: "diplomacy", kind: "allegiance_reject", key: "allegiance.serve.bound", params: { actor: person.id } });
    return;
  }
  if ((kind === "seek" || kind === "surrender") && person.factionId && person.factionId !== from.id && !person.captiveOf) {
    offer.status = "rejected";
    push(state, { turn: state.turn, phase: "diplomacy", kind: "allegiance_reject", key: "allegiance.changed", params: { actor: person.id, kind } });
    return;
  }
  const old = factionById(state, person.factionId);
  const wasLord = old?.lordRoleId === person.id;
  let gifted: string | null = null;
  if (kind === "surrender" && offer.cityId) {
    const city = cityById(state, offer.cityId);
    if (city && person.cityId === city.id && city.controllerId && city.controllerId === person.factionId) {
      city.controllerId = to.id;
      gifted = city.id;
      for (const other of officersOf(state, old?.id ?? null)) {
        if (other.id === person.id || other.cityId !== city.id) continue;
        const stay = state.cities.find((item) => item.controllerId === old?.id && item.id !== city.id);
        if (stay) other.cityId = stay.id;
      }
    }
  }
  person.factionId = to.id;
  person.office = kind === "seek" && person.office === "advisor" ? "advisor" : "general";
  person.captiveOf = null;
  const home = state.cities.find((city) => city.controllerId === to.id);
  if (home && (kind !== "surrender" || !gifted)) person.cityId = home.id;
  if (kind === "surrender" || kind === "seek") {
    person.reputation = Math.max(0, person.reputation - (kind === "surrender" ? ALLEGIANCE_COST.surrender : ALLEGIANCE_COST.leave));
  }
  if (old && (wasLord || gifted)) {
    if (wasLord) {
      old.lordRoleId = null;
      if (old.regentRoleId === person.id) old.regentRoleId = null;
    }
    const still = state.cities.some((city) => city.controllerId === old.id);
    if (!still) dissolveFaction(state, old, person.id);
    else if (wasLord) succeed(state, old);
  }
  const cost = kind === "surrender" ? ALLEGIANCE_COST.surrender : kind === "seek" ? ALLEGIANCE_COST.leave : 0;
  push(state, {
    turn: state.turn,
    phase: "diplomacy",
    kind: "allegiance_accept",
    key: "allegiance.accept",
    params: {
      actor: person.id,
      host: to.id,
      kind,
      gift: gifted ?? undefined,
      bare: gifted ? undefined : kind,
      old: old?.id,
      office: person.office,
      cost: cost || undefined,
    },
  });
}

function dissolveFaction(state: WorldState, faction: Faction, exceptId: string) {
  faction.eliminated = true;
  faction.lordRoleId = null;
  faction.liegeId = null;
  for (const role of state.roles) {
    if (role.id === exceptId || role.factionId !== faction.id || !role.alive) continue;
    role.factionId = null;
    role.office = role.kind === "citizen" ? "citizen" : "wanderer";
    role.discovered = true;
  }
  push(state, {
    turn: state.turn,
    phase: "diplomacy",
    kind: "eliminated",
    key: "allegiance.dissolve", params: { faction: faction.id },
  });
}

function factionVoters(state: WorldState, factionId: string): Role[] {
  return living(state).filter((role) => role.seated && role.factionId === factionId);
}

function matchingPermit(state: WorldState, roleId: string, sides: ("aye" | "nay")[]) {
  return (state.leavePermits ?? []).find((permit) => permit.roleId === roleId && permit.untilTurn >= state.turn && sides.includes(permit.side));
}

function dropPermit(state: WorldState, roleId: string) {
  state.leavePermits = (state.leavePermits ?? []).filter((permit) => permit.roleId !== roleId);
}

function retirePerson(state: WorldState, role: Role, key: string, oldId?: string) {
  role.reputation = Math.max(0, role.reputation - ALLEGIANCE_COST.leave);
  role.factionId = null;
  role.office = "wanderer";
  role.discovered = true;
  push(state, {
    turn: state.turn,
    phase: "diplomacy",
    kind: "allegiance_leave",
    roleId: role.id,
    key,
    params: { actor: role.id, old: oldId, cost: ALLEGIANCE_COST.leave, anon: voteAnon(state) },
  });
}

function enqueueAllegiance(
  state: WorldState,
  role: Role,
  kind: "submit" | "surrender" | "seek" | "serve",
  target: Faction,
  cityId: string | undefined,
  key: string,
  extra?: Record<string, string | number | undefined>,
): boolean {
  const duplicate = state.offers.some((offer) => {
    if (offer.status !== "pending" && offer.status !== "delayed") return false;
    if (offer.kind !== kind || offer.toFactionId !== target.id) return false;
    return kind === "submit" ? offer.fromFactionId === role.factionId : offer.targetRoleId === role.id;
  });
  if (duplicate) {
    push(state, { turn: state.turn, phase: "diplomacy", kind: "reject", key: "allegiance.duplicate", params: { actor: role.id, host: target.id, kind } });
    return false;
  }
  state.offers.push({
    id: `o_${state.turn}_${role.id}_${kind}_${target.id}`,
    turn: state.turn,
    fromFactionId: role.factionId ?? target.id,
    toFactionId: target.id,
    targetRoleId: role.id,
    cityId,
    kind,
    status: "pending",
  });
  push(state, {
    turn: state.turn,
    phase: "diplomacy",
    kind: "allegiance_offer",
    roleId: role.id,
    key,
    params: { actor: role.id, host: target.id, kind, city: cityId, mine: role.factionId, ...extra },
  });
  return true;
}

function castBallots(state: WorldState, orders: Record<string, Order>) {
  for (const role of living(state).slice().sort((a, b) => a.id.localeCompare(b.id))) {
    const d = orders[role.id]?.diplomacy;
    if (!d || d.type !== "ballot") continue;
    const vote = (state.submitBallots ?? []).find((item) => item.id === d.voteId);
    if (!vote || vote.status !== "open" || vote.turn >= state.turn) {
      push(state, { turn: state.turn, phase: "diplomacy", kind: "ballot_cast", roleId: role.id, key: "ballot.mismatch", params: { actor: role.id, anon: voteAnon(state) } });
      continue;
    }
    if (!role.seated || role.factionId !== vote.factionId) {
      push(state, { turn: state.turn, phase: "diplomacy", kind: "ballot_cast", roleId: role.id, key: "ballot.not_seat", params: { actor: role.id, anon: voteAnon(state) } });
      continue;
    }
    if (vote.ballots.some((ballot) => ballot.roleId === role.id)) {
      push(state, { turn: state.turn, phase: "diplomacy", kind: "ballot_cast", roleId: role.id, key: "ballot.already", params: { actor: role.id, anon: voteAnon(state) } });
      continue;
    }
    if (d.choice !== "aye" && d.choice !== "nay") continue;
    vote.ballots.push({
      roleId: role.id,
      choice: d.choice,
      contingent: d.contingent,
      targetFactionId: d.targetFactionId,
    });
    push(state, {
      turn: state.turn,
      phase: "diplomacy",
      kind: "ballot_cast",
      roleId: role.id,
      key: "ballot.cast",
      params: { actor: role.id, anon: voteAnon(state), choice: d.choice },
    });
  }
}

function settleLeave(
  state: WorldState,
  voteId: string,
  person: Role,
  choice: "aye" | "nay",
  passed: boolean,
  contingent?: "retire" | "seek",
  targetFactionId?: string,
) {
  const allowed = (passed && choice === "nay") || (!passed && choice === "aye");
  if (!allowed || !person.alive || !person.seated) return;
  const target = contingent === "seek" ? factionById(state, targetFactionId) : undefined;
  if (passed && contingent === "retire" && (person.office === "general" || person.office === "advisor")) {
    const old = factionById(state, person.factionId);
    retirePerson(state, person, "allegiance.retire.dissent", old?.id);
    return;
  }
  if (contingent === "seek" && target && !target.eliminated && target.id !== person.factionId) {
    const queued = enqueueAllegiance(
      state,
      person,
      "seek",
      target,
      undefined,
      passed ? "allegiance.offer.nay" : "allegiance.offer.aye",
      { anon: voteAnon(state) },
    );
    if (queued) return;
  }
  state.leavePermits ??= [];
  state.leavePermits.push({ roleId: person.id, voteId, untilTurn: state.turn + 1, side: choice });
  push(state, {
    turn: state.turn,
    phase: "diplomacy",
    kind: "ballot_leave",
    roleId: person.id,
    key: passed ? "ballot.permit.pass" : "ballot.permit.fail",
    params: { actor: person.id, anon: voteAnon(state) },
  });
}

function closeBallots(state: WorldState) {
  const rules = allegianceRules(state.config);
  for (const vote of state.submitBallots ?? []) {
    if (vote.status !== "open" || vote.turn >= state.turn) continue;
    const eligible = factionVoters(state, vote.factionId);
    const eligibleIds = new Set(eligible.map((role) => role.id));
    const ayes = vote.ballots.filter((ballot) => ballot.choice === "aye" && eligibleIds.has(ballot.roleId));
    const passed = eligible.length > 0 && ayes.length / eligible.length > rules.submit_threshold;
    vote.status = passed ? "passed" : "failed";
    const faction = factionById(state, vote.factionId);
    const target = factionById(state, vote.targetFactionId);
    const lord = roleById(state, vote.lordRoleId);
    const mark = thresholdLabel(rules.submit_threshold);
    const send = Boolean(
      passed && lord?.alive && lord.seated && lord.office === "lord" && lord.factionId === vote.factionId && target && !target.eliminated,
    );
    push(state, {
      turn: state.turn,
      phase: "diplomacy",
      kind: "ballot_result",
      roleId: vote.lordRoleId,
      key: !passed ? "ballot.result.fail" : send ? "ballot.result.pass.sent" : "ballot.result.pass.hold",
      params: { faction: faction?.id ?? vote.factionId, n: eligible.length, ayes: ayes.length, mark, host: target?.id },
    });
    if (send && lord && target) {
      enqueueAllegiance(state, lord, "submit", target, undefined, "allegiance.offer.voted");
    }
    for (const ballot of vote.ballots) {
      if (!eligibleIds.has(ballot.roleId)) continue;
      const person = roleById(state, ballot.roleId);
      if (!person) continue;
      settleLeave(state, vote.id, person, ballot.choice, passed, ballot.contingent, ballot.targetFactionId);
    }
  }
}

function proposeAllegiance(state: WorldState, role: Role, order: Order) {
  const d = order.diplomacy;
  if (!d || !role.seated) return;
  if (d.type === "retire") {
    if (role.office !== "general" && role.office !== "advisor") return;
    const old = factionById(state, role.factionId);
    const dissent = matchingPermit(state, role.id, ["nay"]);
    retirePerson(state, role, dissent ? "allegiance.retire.dissent" : "allegiance.retire", old?.id);
    if (dissent) dropPermit(state, role.id);
    return;
  }
  if (d.type === "renounce") {
    const faction = factionById(state, role.factionId);
    if (role.office !== "lord" || !faction?.liegeId) return;
    const liege = factionById(state, faction.liegeId);
    faction.liegeId = null;
    role.reputation = Math.max(0, role.reputation - ALLEGIANCE_COST.leave);
    push(state, {
      turn: state.turn,
      phase: "diplomacy",
      kind: "allegiance_leave",
      key: "allegiance.renounce", params: { actor: role.id, faction: faction.id, liege: liege?.id },
    });
    return;
  }
  if (d.type !== "submit" && d.type !== "surrender" && d.type !== "seek" && d.type !== "serve") return;
  const kind = d.type;
  const target = factionById(state, d.targetFactionId);
  if (!target || target.eliminated || target.id === role.factionId) {
    push(state, { turn: state.turn, phase: "diplomacy", kind: "allegiance_reject", key: "allegiance.no_host", params: { actor: role.id, kind } });
    return;
  }
  let solo = false;
  if (kind === "submit") {
    const mine = factionById(state, role.factionId);
    if (role.office !== "lord" || !mine) return;
    if (mine.liegeId === target.id) {
      push(state, { turn: state.turn, phase: "diplomacy", kind: "allegiance_reject", key: "allegiance.already", params: { actor: role.id, host: target.id } });
      return;
    }
    if (isVassalOf(state, target.id, mine.id)) {
      push(state, { turn: state.turn, phase: "diplomacy", kind: "allegiance_reject", key: "allegiance.own_vassal", params: { actor: role.id, host: target.id } });
      return;
    }
    const rules = allegianceRules(state.config);
    const opened = state.submitOpened?.[role.id];
    if (opened != null && state.turn < opened + rules.submit_cooldown) {
      push(state, {
        turn: state.turn,
        phase: "diplomacy",
        kind: "allegiance_reject",
        roleId: role.id,
        key: "allegiance.cooldown", params: { actor: role.id, opened, until: opened + rules.submit_cooldown },
      });
      return;
    }
    if ((state.submitBallots ?? []).some((vote) => vote.status === "open" && vote.factionId === mine.id)) {
      push(state, { turn: state.turn, phase: "diplomacy", kind: "allegiance_reject", key: "allegiance.vote_open", params: { mine: mine.id } });
      return;
    }
    const voters = factionVoters(state, mine.id);
    state.submitOpened ??= {};
    state.submitOpened[role.id] = state.turn;
    if (voters.length > 1) {
      state.submitBallots ??= [];
      state.submitBallots.push({
        id: `b_${state.turn}_${role.id}`,
        turn: state.turn,
        factionId: mine.id,
        lordRoleId: role.id,
        targetFactionId: target.id,
        status: "open",
        ballots: [{ roleId: role.id, choice: "aye" }],
      });
      push(state, {
        turn: state.turn,
        phase: "diplomacy",
        kind: "ballot_open",
        roleId: role.id,
        key: "ballot.open",
        params: { mine: mine.id, host: target.id, actor: role.id, anon: voteAnon(state), n: voters.length, mark: thresholdLabel(rules.submit_threshold) },
      });
      return;
    }
    solo = true;
  }
  const ayePermit = kind === "seek" ? matchingPermit(state, role.id, ["aye"]) : undefined;
  if (kind === "seek" && role.office !== "general" && role.office !== "advisor") {
    if (role.office !== "lord" || !ayePermit) return;
  }
  if (kind === "serve" && (role.office !== "wanderer" || role.factionId)) return;
  if (kind === "surrender" && role.office !== "lord" && role.office !== "general" && role.office !== "advisor") return;
  let cityId: string | undefined;
  if (kind === "surrender" && role.cityId) {
    const city = cityById(state, role.cityId);
    if (city && city.controllerId && city.controllerId === role.factionId) cityId = city.id;
  }
  const permit = kind === "seek" ? matchingPermit(state, role.id, ["aye", "nay"]) : undefined;
  const offerKey = solo
    ? "allegiance.offer.solo"
    : permit?.side === "nay"
      ? "allegiance.offer.nay"
      : permit?.side === "aye"
        ? "allegiance.offer.aye"
        : "allegiance.offer.plain";
  if (enqueueAllegiance(state, role, kind, target, cityId, offerKey) && permit) dropPermit(state, role.id);
}

function resolveDiplomacy(state: WorldState, orders: Record<string, Order>) {
  const roles = living(state).slice().sort((a, b) => a.id.localeCompare(b.id));
  for (const role of roles) {
    const order = orders[role.id];
    if (order) respond(state, role, order);
  }
  for (const offer of state.offers) {
    if ((offer.status === "pending" || offer.status === "delayed") && offer.turn < state.turn) {
      offer.status = "expired";
      const named = offer.kind === "submit" || offer.kind === "surrender" || offer.kind === "seek" || offer.kind === "serve";
      push(state, {
        turn: state.turn,
        phase: "diplomacy",
        kind: named ? "allegiance_expire" : "expire",
        key: named ? "diplomacy.expire.named" : "diplomacy.expire",
        params: { who: offer.targetRoleId, host: offer.toFactionId, from: offer.fromFactionId, kind: offer.kind },
      });
    }
  }
  castBallots(state, orders);
  closeBallots(state);
  for (const role of roles) {
    const order = orders[role.id];
    if (order) proposeAllegiance(state, role, order);
  }
  for (const role of roles) {
    const d = orders[role.id]?.diplomacy;
    if (!d || d.type === "respond") continue;
    const faction = factionById(state, role.factionId);
    if (!faction || role.office !== "lord") continue;
    if (d.type === "break" && d.targetFactionId) {
      const other = d.targetFactionId;
      const had = allied(state, faction.id, other);
      state.alliances = state.alliances.filter(
        (a) => !((a.a === faction.id && a.b === other) || (a.b === faction.id && a.a === other)),
      );
      if (had) {
        for (const contract of state.contracts) {
          if (contract.kind === "alliance" && contract.status === "active" && contract.parties.includes(faction.id) && contract.parties.includes(other)) {
            contract.status = "breached";
          }
        }
        if (state.config.comm.contract_breach_record) role.reputation = Math.max(0, role.reputation - 15);
        push(state, { turn: state.turn, phase: "diplomacy", kind: "breach", key: "diplomacy.breach", params: { actor: role.id, other } });
      }
      continue;
    }
    if (d.type === "cede" && d.cityId && d.targetFactionId) {
      const city = cityById(state, d.cityId);
      if (!city || city.controllerId !== faction.id) continue;
      city.controllerId = d.targetFactionId;
      const creditor = d.targetFactionId;
      for (const contract of state.contracts) {
        if (
          contract.status === "active" &&
          contract.condition === "cede_city" &&
          contract.debtorFactionId === faction.id &&
          contract.creditorFactionId === creditor
        ) {
          contract.status = "fulfilled";
        }
      }
      push(state, { turn: state.turn, phase: "diplomacy", kind: "cede", key: "diplomacy.cede", params: { actor: role.id, city: city.id, host: d.targetFactionId } });
      continue;
    }
    if (!d.targetFactionId || d.targetFactionId === faction.id) continue;
    const other = factionById(state, d.targetFactionId);
    if (!other || other.eliminated) continue;
    const kind = d.type === "alliance" || d.type === "truce" || d.type === "vassal" || d.type === "defect" ? d.type : null;
    if (!kind) continue;
    let targetRoleId: string | undefined;
    if (kind === "defect") {
      const target = roleById(state, d.targetRoleId);
      if (!target?.alive) continue;
      targetRoleId = target.id;
    }
    if (state.offers.some((offer) => (offer.status === "pending" || offer.status === "delayed") && offer.fromFactionId === faction.id && offer.toFactionId === d.targetFactionId && offer.kind === kind)) {
      push(state, { turn: state.turn, phase: "diplomacy", kind: "reject", key: "diplomacy.duplicate", params: { actor: role.id, host: other.id, kind } });
      continue;
    }
    const offer: Offer = {
      id: `o_${state.turn}_${role.id}_${kind}_${d.targetFactionId}`,
      turn: state.turn,
      fromFactionId: faction.id,
      toFactionId: kind === "defect" ? (roleById(state, targetRoleId)?.factionId ?? d.targetFactionId) : d.targetFactionId,
      targetRoleId,
      kind,
      status: "pending",
    };
    state.offers.push(offer);
    push(state, { turn: state.turn, phase: "diplomacy", kind: "offer", key: "diplomacy.offer", params: { actor: role.id, host: other.id, kind, who: targetRoleId } });
  }
}

function expireContracts(state: WorldState, scratch: Scratch) {
  for (const contract of state.contracts) {
    if (contract.status !== "active" || !contract.condition) continue;
    if (contract.condition === "military_aid" && contract.debtorFactionId && scratch.marched.has(contract.debtorFactionId)) {
      contract.status = "fulfilled";
      push(state, { turn: state.turn, phase: "war", kind: "fulfill", key: "contract.fulfill", params: { condition: contract.condition ?? contract.kind, from: contract.parties[0], to: contract.parties[1] } });
      continue;
    }
    if (contract.untilTurn == null || state.turn < contract.untilTurn) continue;
    if (contract.condition === "truce_3") continue;
    contract.status = "breached";
    const lord = roleById(state, factionById(state, contract.debtorFactionId)?.lordRoleId);
    if (lord && state.config.comm.contract_breach_record) lord.reputation = Math.max(0, lord.reputation - 15);
    push(state, { turn: state.turn, phase: "diplomacy", kind: "breach", key: "contract.breach", params: { condition: contract.condition ?? contract.kind, from: contract.parties[0], to: contract.parties[1] } });
  }
}

function wantedPreset(state: WorldState, role: Role): "defend" | "retreat" {
  const preset = role.preset;
  const mode = state.config.war.fallback_behavior;
  if (mode === "defend") return "defend";
  if (mode === "retreat") return "retreat";
  if (mode === "execute_preset_then_retreat") return preset === "defend" ? "defend" : "retreat";
  return preset === "retreat" ? "retreat" : "defend";
}

function evacuate(state: WorldState, city: City): boolean {
  const dest = state.cities.find(
    (c) => c.id !== city.id && c.controllerId === city.controllerId && city.links.includes(c.id),
  );
  if (!dest || !city.controllerId) return false;
  dest.troops = Math.min(state.config.eco.resource_cap, dest.troops + city.troops);
  push(state, {
    turn: state.turn,
    phase: "war",
    kind: "retreat",
    key: "war.garrison.retreat", params: { city: city.id, dest: dest.id },
  });
  city.troops = 0;
  return true;
}

function applyDisaster(state: WorldState, sky: SkyReport, scratch: Scratch) {
  if (!state.config.climate.enabled || !state.config.climate.disasters_enabled) return;
  if (sky.disaster) {
    let grain = 0;
    let troops = 0;
    let dikeSaved = 0;
    let covered = 0;
    let clinicSaved = 0;
    for (const city of state.cities) {
      if (sky.disaster === "瘟疫") {
        const hit = troopShock(city, state.config.relief, state.config.climate);
        city.troops -= hit.net;
        troops += hit.net;
        clinicSaved += hit.clinicSaved;
        ensureWorks(city).plague = Math.max(0, state.config.relief.plague_turns - (scratch.clinics.get(city.id) ?? 0));
      } else {
        const hit = grainShock(city, state.config.relief, state.config.climate, sky);
        const works = ensureWorks(city);
        works.granary -= hit.covered;
        city.grain -= hit.net;
        grain += hit.net;
        dikeSaved += hit.dikeSaved;
        covered += hit.covered;
      }
    }
    push(state, {
      turn: state.turn,
      phase: "domestic",
      kind: "disaster",
      key: "climate.disaster",
      params: { disaster: sky.disaster, grain, troops, dike: dikeSaved, granary: covered, clinic: clinicSaved },
    });
    return;
  }
  let troops = 0;
  let clinicSaved = 0;
  for (const city of state.cities) {
    const works = ensureWorks(city);
    if (works.plague <= 0) continue;
    const hit = troopShock(city, state.config.relief, state.config.climate, state.config.relief.linger_ratio);
    city.troops -= hit.net;
    troops += hit.net;
    clinicSaved += hit.clinicSaved;
    works.plague -= 1;
  }
  if (troops > 0 || clinicSaved > 0) {
    push(state, {
      turn: state.turn,
      phase: "domestic",
      kind: "disaster",
      key: "climate.linger",
      params: { troops, clinic: clinicSaved },
    });
  }
}

function ageWorks(state: WorldState) {
  if (!state.config.relief.enabled) return;
  const notes: string[] = [];
  let spoiled = 0;
  for (const city of state.cities) {
    const works = ensureWorks(city);
    works.dikeIdle += 1;
    if (works.dike > 0 && works.dikeIdle >= state.config.relief.dike_decay_turns) {
      works.dike -= 1;
      works.dikeIdle = 0;
      notes.push(`dike:${city.id}:${works.dike}`);
    }
    works.canalIdle += 1;
    if (works.canal > 0 && works.canalIdle >= state.config.relief.dike_decay_turns) {
      works.canal -= 1;
      works.canalIdle = 0;
      notes.push(`canal:${city.id}:${works.canal}`);
    }
    works.roads = works.roads.flatMap((road) => {
      const idle = road.idle + 1;
      if (idle >= state.config.relief.road_decay_turns) return [];
      return [{ to: road.to, idle }];
    });
    if (works.granary > 0) {
      const loss = Math.floor(works.granary * state.config.relief.granary_spoil);
      works.granary -= loss;
      spoiled += loss;
    }
  }
  if (notes.length || spoiled > 0) {
    push(state, {
      turn: state.turn,
      phase: "domestic",
      kind: "mitigate",
      key: "climate.decay",
      params: { notes: notes.join("|"), spoiled },
    });
  }
}

function resolveWar(state: WorldState, orders: Record<string, Order>, scratch: Scratch, sky: SkyReport) {
  const marches: { lord: Role; order: NonNullable<Order["war"]> }[] = [];
  for (const role of living(state).sort((a, b) => a.id.localeCompare(b.id))) {
    const war = orders[role.id]?.war;
    if (war?.type === "march" && role.office === "lord") marches.push({ lord: role, order: war });
  }
  for (const march of marches) {
    const origin = cityById(state, march.lord.cityId);
    const target = cityById(state, march.order.targetCityId);
    if (!origin || !target || origin.controllerId !== march.lord.factionId) continue;
    if (!origin.links.includes(target.id)) continue;
    if (target.controllerId && allied(state, march.lord.factionId!, target.controllerId)) {
      push(state, { turn: state.turn, phase: "war", kind: "reject", key: "war.ally", params: { actor: march.lord.id, city: target.id } });
      continue;
    }
    if (target.controllerId && truce(state, march.lord.factionId!, target.controllerId)) {
      push(state, { turn: state.turn, phase: "war", kind: "reject", key: "war.truce", params: { actor: march.lord.id, city: target.id } });
      continue;
    }
    const desired = march.order.personal
      ? march.lord
      : roleById(state, march.order.commanderRoleId) ?? march.lord;
    if (!desired.alive || (desired.id !== march.lord.id && desired.factionId !== march.lord.factionId)) {
      push(state, { turn: state.turn, phase: "war", kind: "reject", key: "war.commander", params: { actor: march.lord.id } });
      continue;
    }
    const desiredOrder = orders[desired.id]?.war;
    const present = desired.seated && scratch.submitted.has(desired.id);
    let commander: Role | null = null;
    let mode = "";
    let risk = false;
    if (present && desiredOrder?.type === "refuse") {
      push(state, { turn: state.turn, phase: "war", kind: "refuse", key: "war.refuse", params: { actor: desired.id, origin: origin.id } });
      continue;
    }
    if (present && desiredOrder?.type === "leave") {
      push(state, { turn: state.turn, phase: "war", kind: "leave", key: "war.leave", params: { actor: desired.id } });
      continue;
    }
    if (present && desiredOrder?.type !== "delegate") {
      commander = desired;
      mode = "main";
      risk = Boolean(march.order.personal || desiredOrder?.personal);
    } else {
      const deputy = living(state).find(
        (r) =>
          r.id !== desired.id &&
          r.cityId === origin.id &&
          r.factionId === march.lord.factionId &&
          (r.office === "general" || r.office === "advisor") &&
          r.seated &&
          scratch.submitted.has(r.id) &&
          orders[r.id]?.war?.type === "confirm",
      );
      if (deputy) {
        commander = deputy;
        mode = "deputy";
        risk = false;
      } else if (march.lord.seated && scratch.submitted.has(march.lord.id) && march.lord.id !== desired.id) {
        commander = march.lord;
        mode = "regent";
        risk = false;
      } else if (wantedPreset(state, desired) === "retreat") {
        push(state, { turn: state.turn, phase: "war", kind: "fallback", key: "war.fallback.retreat", params: { actor: desired.id } });
        continue;
      } else {
        push(state, { turn: state.turn, phase: "war", kind: "fallback", key: "war.fallback.hold", params: { actor: desired.id } });
        continue;
      }
    }
    const portion = march.order.portion === "most" ? 0.8 : 0.5;
    const sent = Math.floor(origin.troops * portion);
    if (sent < 80) {
      push(state, { turn: state.turn, phase: "war", kind: "reject", key: "war.troops", params: { origin: origin.id, actor: march.lord.id } });
      continue;
    }
    origin.troops -= sent;
    const ford = isFord(origin, target.id) || isFord(target, origin.id);
    const originWorks = ensureWorks(origin);
    const targetWorks = ensureWorks(target);
    const weatherLoss = Math.min(
      Math.max(0, sent - 1),
      Math.floor(sent * marchLossRate(state.config.climate, sky, ford, state.config.relief.enabled ? {
        dike: Math.max(originWorks.dike, targetWorks.dike),
        dikeCut: state.config.relief.dike_ford_cut,
        road: roadOpen(origin, target.id) || roadOpen(target, origin.id),
        roadCut: state.config.relief.road_cut,
      } : undefined)),
    );
    const arrived = sent - weatherLoss;
    const defense = defender(state, target, scratch);
    const wet = ford && (sky.weather === "雨" || sky.disaster === "涝");
    const step = {
      commander: commander!.id,
      mode,
      origin: origin.id,
      target: target.id,
      loss: weatherLoss || undefined,
      season: sky.season,
      weather: sky.weather,
      ford: wet ? "1" : undefined,
      defender: defense.role?.id ?? "garrison",
      defenderMode: defense.role ? (defense.passive ? "passive" : "named") : "garrison",
      owner: march.lord.factionId,
    };
    maybeDuel(state, origin, target, march.lord.factionId!);
    if (scratch.fires.has(origin.id) && target.troops > 1) {
      const burned = Math.min(target.troops - 1, Math.floor(target.troops * state.config.deeds.fire_loss));
      if (burned > 0) {
        target.troops -= burned;
        push(state, { turn: state.turn, phase: "war", kind: "highlight", key: "war.fire", params: { origin: origin.id, city: target.id, burned } });
      }
    }
    if (defense.retreat && defense.role) {
      const moved = evacuate(state, target);
      if (moved) {
        const previous = target.controllerId;
        target.controllerId = march.lord.factionId;
        target.troops = arrived;
        target.morale = 60;
        scatter(state, target, previous, march.lord.factionId);
        scratch.marched.add(march.lord.factionId!);
        push(state, { turn: state.turn, phase: "war", kind: "occupy", key: "war.occupy", params: step });
        continue;
      }
    }
    const gate = scratch.gates.get(target.id) ?? 0;
    const result = fight({
      atkTroops: arrived,
      atkCommand: commander!.command,
      atkMorale: origin.morale,
      defTroops: target.troops,
      defCommand: defense.command,
      defMorale: target.morale,
      walled: true,
      defMod: gate >= 2 || (gate >= 1 && target.morale <= 35) ? 0.6 : 1,
    });
    target.troops = result.defLeft;
    if (result.takes) {
      const previous = target.controllerId;
      target.controllerId = march.lord.factionId;
      target.troops = result.atkLeft;
      target.morale = 62;
      scatter(state, target, previous, march.lord.factionId);
      if (target.isCapital) target.hasSeal = true;
      push(state, {
        turn: state.turn,
        phase: "war",
        kind: "battle",
        key: "war.battle.win",
        params: { ...step, atkLoss: result.atkLoss, defLoss: result.defLoss },
      });
    } else {
      origin.troops = Math.min(state.config.eco.resource_cap, origin.troops + result.atkLeft);
      target.morale = Math.max(0, target.morale - 8);
      push(state, {
        turn: state.turn,
        phase: "war",
        kind: "battle",
        key: "war.battle.fail",
        params: { ...step, atkLoss: result.atkLoss, defLoss: result.defLoss },
      });
    }
    scratch.marched.add(march.lord.factionId!);
    const atkRatio = arrived === 0 ? 0 : result.atkLoss / arrived;
    const defRatio = defense.role ? result.defLoss / Math.max(1, result.defLoss + result.defLeft) : 0;
    if (risk && atkRatio >= 0.45) {
      push(state, { turn: state.turn, phase: "war", kind: "death", key: "war.death.attack", params: { commander: commander!.id } });
      kill(state, commander!, "battle", state.turn);
    }
    if (defense.role && defense.risk && defRatio >= 0.45) {
      push(state, { turn: state.turn, phase: "war", kind: "death", key: "war.death.defense", params: { actor: defense.role.id, city: target.id } });
      kill(state, defense.role, "battle", state.turn);
    }
    if (scratch.holding.size) {
      for (const id of scratch.holding) {
        const holder = roleById(state, id);
        if (holder?.alive && holder.cityId === target.id) holder.merit += 1;
      }
    }
  }
}

/**
 * 移驻在内政、外交、天灾、流民、出征和城破遣散之后。
 * 人只走一格，兵留在原城。出发城或目标城若已不是本人当前势力，或人已不在下单时的城里，这一步失败，不穿越。
 */
function resolveMoves(state: WorldState, orders: Record<string, Order>) {
  const movers = state.roles
    .filter((role) => orders[role.id]?.war?.type === "move")
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const role of movers) {
    const war = orders[role.id]?.war;
    const fromId = war?.fromCityId;
    const toId = war?.targetCityId;
    if (!role.alive) {
      push(state, { turn: state.turn, phase: "war", kind: "reject", key: "war.move.dead", params: { actor: role.id } });
      continue;
    }
    if (role.captiveOf) {
      push(state, { turn: state.turn, phase: "war", kind: "reject", key: "war.move.captive", params: { actor: role.id, city: role.cityId ?? "" } });
      continue;
    }
    if (!fromId || role.cityId !== fromId) {
      push(state, { turn: state.turn, phase: "war", kind: "reject", key: "war.move.displaced", params: { actor: role.id, origin: fromId ?? "", city: role.cityId ?? "" } });
      continue;
    }
    const origin = cityById(state, fromId);
    const dest = cityById(state, toId);
    if (!origin || !dest || !origin.links.includes(dest.id)) {
      push(state, { turn: state.turn, phase: "war", kind: "reject", key: "war.move.road", params: { actor: role.id, origin: fromId, city: toId ?? "" } });
      continue;
    }
    if (origin.controllerId !== role.factionId) {
      push(state, { turn: state.turn, phase: "war", kind: "reject", key: "war.move.origin", params: { actor: role.id, origin: origin.id } });
      continue;
    }
    if (dest.controllerId !== role.factionId) {
      push(state, { turn: state.turn, phase: "war", kind: "reject", key: "war.move.enemy", params: { actor: role.id, origin: origin.id, city: dest.id } });
      continue;
    }
    const left = origin.troops;
    const arrived = dest.troops;
    role.cityId = dest.id;
    origin.troops = left;
    dest.troops = arrived;
    push(state, {
      turn: state.turn,
      phase: "war",
      kind: "move",
      key: "war.move",
      params: { actor: role.id, origin: origin.id, city: dest.id, troops: left },
      roleId: role.id,
    });
  }
}

function defender(state: WorldState, city: City, scratch: Scratch): {
  role: Role | null;
  command: number;
  risk: boolean;
  retreat: boolean;
  passive: boolean;
} {
  const inCity = living(state).filter(
    (r) =>
      r.cityId === city.id &&
      (r.office === "lord" || r.office === "general" || r.office === "advisor") &&
      !r.captiveOf,
  );
  const present = inCity
    .filter((r) => r.seated && scratch.submitted.has(r.id))
    .sort((a, b) => b.command - a.command);
  if (present[0]) {
    const personal = Boolean(state.lockedOrders[present[0].id]?.war?.personal);
    const bond = bondedCommand(state, present[0], inCity);
    return { role: present[0], command: present[0].command + bond, risk: personal, retreat: false, passive: false };
  }
  const absent = inCity
    .filter((r) => r.seated && !scratch.submitted.has(r.id))
    .sort((a, b) => b.command - a.command);
  if (absent[0]) {
    return {
      role: absent[0],
      command: absent[0].command,
      risk: state.config.war.absence_death_risk_kept,
      retreat: wantedPreset(state, absent[0]) === "retreat",
      passive: false,
    };
  }
  const garrison = inCity.filter((r) => !r.seated).sort((a, b) => b.command - a.command || a.id.localeCompare(b.id));
  if (garrison[0]) {
    return { role: garrison[0], command: garrison[0].command, risk: false, retreat: false, passive: true };
  }
  return { role: null, command: 8, risk: false, retreat: false, passive: false };
}

function bondedCommand(state: WorldState, commander: Role, inCity: Role[]) {
  const bonds = state.bonds ?? [];
  const mate = inCity.some((role) => role.id !== commander.id && bonds.some((bond) => (bond.a === commander.id && bond.b === role.id) || (bond.b === commander.id && bond.a === role.id)));
  return mate ? 1 : 0;
}

function scatter(state: WorldState, city: City, previousId: string | null, winnerId: string | null) {
  if (!previousId || !winnerId || previousId === winnerId) return;
  const people = living(state).filter((role) => role.cityId === city.id && role.factionId === previousId);
  const homes = state.cities
    .filter((item) => item.controllerId === previousId && item.id !== city.id)
    .sort((a, b) => b.troops - a.troops || a.id.localeCompare(b.id));
  for (const person of people) {
    const home = homes[0];
    if (home) {
      person.cityId = home.id;
      person.captiveOf = null;
      push(state, { turn: state.turn, phase: "war", kind: "retreat", key: "war.retreat", params: { actor: person.id, origin: city.id, home: home.id } });
    } else {
      person.captiveOf = winnerId;
      push(state, { turn: state.turn, phase: "war", kind: "highlight", key: "war.captive", params: { actor: person.id, city: city.id } });
    }
  }
}

function maybeDuel(state: WorldState, origin: City, target: City, attackerFaction: string) {
  const willing = (cityId: string, factionId: string | null) =>
    living(state)
      .filter((role) => role.cityId === cityId && role.factionId === factionId && role.seated && state.lockedOrders[role.id]?.war?.type === "duel")
      .sort((a, b) => b.prowess - a.prowess || a.id.localeCompare(b.id))[0];
  const atk = willing(origin.id, attackerFaction);
  const def = willing(target.id, target.controllerId);
  if (!atk && !def) return;
  if (!atk || !def) {
    const who = atk ?? def;
    push(state, { turn: state.turn, phase: "war", kind: "duel", key: "war.duel.none", params: { actor: who?.id, actorName: who?.name } });
    return;
  }
  const ag = duelGearBonus(state, atk.id);
  const dg = duelGearBonus(state, def.id);
  const baseAs = atk.prowess * 2 + atk.command;
  const baseDs = def.prowess * 2 + def.command;
  const as = baseAs + ag.bonus;
  const ds = baseDs + dg.bonus;
  const gearParams = { gearAtk: ag.patterns, gearDef: dg.patterns, atkGear: ag.bonus, defGear: dg.bonus, atk: atk.id, def: def.id };
  if (baseAs !== baseDs) {
    const baseLoser = baseAs > baseDs ? def : atk;
    const loserCity = cityById(state, baseLoser.cityId);
    if (loserCity) loserCity.morale = Math.max(0, loserCity.morale - 6);
  }
  if (as === ds) {
    push(state, { turn: state.turn, phase: "war", kind: "highlight", key: "war.duel.draw", params: { actor: atk.id, other: def.id, ...gearParams } });
    return;
  }
  const winner = as > ds ? atk : def;
  const loser = as > ds ? def : atk;
  const gap = Math.abs(as - ds);
  winner.merit += 1;
  const personal = Boolean(state.lockedOrders[loser.id]?.war?.personal);
  if (personal && gap >= state.config.deeds.duel_gap) {
    push(state, { turn: state.turn, phase: "war", kind: "highlight", key: "war.duel.death", params: { winner: winner.id, loser: loser.id, ...gearParams } });
    kill(state, loser, "battle", state.turn);
  } else {
    push(state, { turn: state.turn, phase: "war", kind: "highlight", key: "war.duel.live", params: { winner: winner.id, loser: loser.id, ...gearParams } });
  }
}

function applyRefugees(state: WorldState) {
  const cap = state.config.eco.resource_cap;
  for (const city of [...state.cities].sort((a, b) => a.id.localeCompare(b.id))) {
    if (city.morale >= state.config.deeds.refugee_morale || city.troops < 80) continue;
    const dest = state.cities
      .filter((item) => city.links.includes(item.id) && item.morale > city.morale)
      .sort((a, b) => b.morale - a.morale || a.id.localeCompare(b.id))[0];
    if (!dest) continue;
    const people = Math.floor(city.troops * state.config.deeds.refugee_ratio);
    const food = Math.floor(city.grain * state.config.deeds.refugee_ratio);
    if (people <= 0 && food <= 0) continue;
    city.troops -= people;
    city.grain -= food;
    dest.troops = Math.min(cap, dest.troops + people);
    dest.grain = Math.min(cap, dest.grain + food);
    push(state, { turn: state.turn, phase: "domestic", kind: "highlight", key: "domestic.refugees", params: { city: city.id, morale: city.morale, troops: people, grain: food, dest: dest.id } });
  }
}

function openBounty(state: WorldState, sky: SkyReport) {
  if (state.bounty?.season === sky.season) return;
  const bounty = plannedBounty(state, state.turn);
  state.bounty = bounty;
  push(state, {
    turn: state.turn,
    phase: "meta",
    kind: "highlight",
    key: bounty.claimed ? "meta.bounty.claimed" : "meta.bounty",
    params: { season: bounty.season, code: bounty.code, merit: state.config.deeds.bounty_merit },
  });
}

function claimBounty(state: WorldState) {
  const bounty = state.bounty;
  if (!bounty || bounty.claimed) return;
  if (bounty.code === "relief") {
    const line = state.chronicle.find((entry) => entry.turn === state.turn && entry.kind === "relief");
    if (!line?.roleId) return;
    const actor = roleById(state, line.roleId);
    bounty.claimed = true;
    if (actor?.alive && actor.seated) {
      actor.merit += state.config.deeds.bounty_merit;
      push(state, { turn: state.turn, phase: "end", kind: "highlight", key: "bounty.relief", params: { actor: actor.id, merit: state.config.deeds.bounty_merit } });
    } else {
      push(state, { turn: state.turn, phase: "end", kind: "highlight", key: "bounty.relief.absent" });
    }
    return;
  }
  const city = state.cities
    .filter((item) => {
      const works = item.works;
      if (bounty.code === "dike") return (works?.dike ?? 0) >= 2;
      if (bounty.code === "granary") return (works?.granary ?? 0) >= 200;
      return (works?.clinic ?? 0) >= 2;
    })
    .sort((a, b) => Number(Boolean(b.controllerId)) - Number(Boolean(a.controllerId)) || a.id.localeCompare(b.id))[0];
  if (!city?.controllerId) return;
  bounty.claimed = true;
  const lord = roleById(state, factionById(state, city.controllerId)?.lordRoleId);
  if (lord?.alive && lord.seated) {
    lord.merit += state.config.deeds.bounty_merit;
    push(state, { turn: state.turn, phase: "end", kind: "highlight", key: "bounty.city", params: { city: city.id, season: bounty.season, actor: lord.id, merit: state.config.deeds.bounty_merit } });
  } else {
    push(state, { turn: state.turn, phase: "end", kind: "highlight", key: "bounty.city.vacant", params: { city: city.id, season: bounty.season } });
  }
}

function eliminate(state: WorldState) {
  for (const faction of state.factions) {
    if (faction.eliminated) continue;
    const hasCity = state.cities.some((c) => c.controllerId === faction.id);
    const officers = officersOf(state, faction.id);
    if (!hasCity && officers.length === 0) {
      faction.eliminated = true;
      faction.lordRoleId = null;
      for (const role of state.roles) {
        if (role.factionId === faction.id && role.alive) {
          role.factionId = null;
          role.office = role.kind === "citizen" ? "citizen" : "wanderer";
        }
      }
      push(state, {
        turn: state.turn,
        phase: "end",
        kind: "eliminated",
        key: "end.eliminated", params: { faction: faction.id },
      });
    }
  }
}

function closeWorld(state: WorldState, reason: string, unifiedBy: string | null, nowIso: string) {
  state.status = unifiedBy ? "memorial" : "settled";
  state.closedAt = nowIso;
  state.closeReason = reason;
  state.unifiedByFactionId = unifiedBy;
  state.lockedOrders = {};
}

function updateUnification(state: WorldState, nowIso: string) {
  const door = assess(state);
  if (state.status === "consolidation") {
    if (!door.open) {
      state.status = "running";
      state.consolidationLeft = null;
      state.stableStreak = 0;
      push(state, { turn: state.turn, phase: "end", kind: "window_fail", key: "end.window_fail" });
      return;
    }
    state.consolidationLeft = (state.consolidationLeft ?? 1) - 1;
    if (state.consolidationLeft <= 0) {
      push(state, {
        turn: state.turn,
        phase: "end",
        kind: "unify",
        key: "end.unify.memorial", params: { faction: door.candidateId },
      });
      closeWorld(state, `unify:${door.candidateId ?? ""}`, door.candidateId, nowIso);
      return;
    }
    push(state, { turn: state.turn, phase: "end", kind: "window", key: "end.window", params: { left: state.consolidationLeft } });
    return;
  }
  if (door.open) {
    state.stableStreak += 1;
    if (state.stableStreak >= state.config.endgame.unify.stable_turns) {
      if (state.config.endgame.consolidation_turns <= 0) {
        push(state, { turn: state.turn, phase: "end", kind: "unify", key: "end.unify", params: { faction: door.candidateId } });
        closeWorld(state, `unify:${door.candidateId ?? ""}`, door.candidateId, nowIso);
      } else {
        state.status = "consolidation";
        state.consolidationLeft = state.config.endgame.consolidation_turns;
        push(state, {
          turn: state.turn,
          phase: "end",
          kind: "window",
          key: "end.window_open", params: { faction: door.candidateId, left: state.consolidationLeft },
        });
      }
    } else {
      push(state, {
        turn: state.turn,
        phase: "end",
        kind: "stable",
        key: "end.stable",
        params: { faction: door.candidateId, held: door.heldCities, total: door.totalCities, streak: state.stableStreak, need: door.stableNeeded },
      });
    }
  } else if (state.stableStreak !== 0) {
    state.stableStreak = 0;
    push(state, { turn: state.turn, phase: "end", kind: "stable_break", key: "end.stable_break" });
  }
}

function settleSeason(state: WorldState, nowIso: string) {
  const counts = state.factions
    .filter((f) => f.major)
    .map((f) => {
      const n = state.cities.filter((c) => c.controllerId === f.id).length;
      return `${f.id}:${n}`;
    })
    .join("|");
  push(state, {
    turn: state.turn,
    phase: "end",
    kind: "season",
    key: "end.season",
    params: { counts },
  });
  closeWorld(state, "season", null, nowIso);
}

export function resolveTurn(input: WorldState, nowIso: string): WorldState {
  const state = structuredClone(input);
  ensureAllegianceState(state);
  ensureGear(state);
  seqCursor = state.chronicle.reduce((m, e) => Math.max(m, e.seq), 0);
  if (state.status === "memorial" || state.status === "settled") return state;

  if (state.config.endgame.season_deadline_days != null) {
    const end = Date.parse(state.openedAt) + state.config.endgame.season_deadline_days * 86400000;
    if (Date.parse(nowIso) >= end) {
      settleSeason(state, nowIso);
      state.version += 1;
      return state;
    }
  }

  const orders = state.lockedOrders;
  const scratch: Scratch = {
    holding: new Set(),
    gates: new Map(),
    marched: new Set(),
    submitted: new Set(Object.keys(orders)),
    clinics: new Map(),
    swears: [],
    fires: new Set(),
  };

  for (const role of living(state)) {
    if (role.seated && !orders[role.id]) {
      role.absentStreak += 1;
      if (state.config.war.absence_to_reputation) {
        role.reputation = Math.max(0, role.reputation - 2);
      }
      push(state, {
        turn: state.turn,
        phase: "meta",
        kind: "absence",
        key: "meta.absence", params: { actor: role.id, streak: role.absentStreak },
      });
    } else if (orders[role.id]) {
      role.absentStreak = 0;
    } else {
      role.vacantStreak += 1;
    }
  }

  normalizeClimate(state);
  const sky = forecast(state, state.turn);
  push(state, {
    turn: state.turn,
    phase: "meta",
    kind: "climate",
    key: sky.weather === "不计" ? "climate.sky.off" : "climate.sky",
    params: { turn: state.turn, season: sky.season, weather: sky.weather, disaster: sky.disaster ?? undefined, seed: sky.seed, slot: sky.slot },
  });

  openBounty(state, sky);
  resolveCourt(state, orders, scratch);
  resolveDomestic(state, orders, scratch, sky);
  resolveDiplomacy(state, orders);
  applyDisaster(state, sky, scratch);
  applyRefugees(state);
  resolveWar(state, orders, scratch, sky);
  resolveMoves(state, orders);
  ageWorks(state);
  claimBounty(state);
  expireContracts(state, scratch);
  carrySentences(state);
  eliminate(state);
  updateUnification(state, nowIso);
  state.version += 1;
  if (state.status !== "running" && state.status !== "consolidation") {
    return state;
  }
  state.turn += 1;
  state.lockedOrders = {};
  state.deadline = new Date(Date.parse(nowIso) + duration(state)).toISOString();
  const coming = forecast(state, state.turn);
  openBounty(state, coming);
  return state;
}

function duration(state: WorldState): number {
  if (state.config.turn.laboratory_clock && state.config.turn.duration_minutes) {
    return state.config.turn.duration_minutes * 60 * 1000;
  }
  return state.config.turn.duration_hours * 3600 * 1000;
}

export function shouldResolve(state: WorldState, nowIso: string): boolean {
  if (state.status === "memorial" || state.status === "settled") return false;
  if (Date.parse(nowIso) >= Date.parse(state.deadline)) return true;
  if (!state.config.turn.early_resolve) return false;
  const seated = state.roles.filter((r) => r.alive && r.seated);
  if (seated.length < state.config.turn.early_resolve_min_seated) return false;
  return seated.every((r) => Boolean(state.lockedOrders[r.id]));
}
