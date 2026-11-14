import type { GearItem, Role, WorldState } from "./types";

/** 材料上限、钱袋上限、随身器物上限。多出来的行动不再增加，避免空点刷取。 */
export const STOCK_CAP = 6;
export const PURSE_CAP = 80;
export const BAG_CAP = 4;
export const LEARN_COST = 24;
export const DUEL_CAP = 4;
export const CLUE_COIN = 15;

export type Mat = "iron" | "wood" | "leather" | "fodder";
export type GearSlot = "weapon" | "armor" | "mount";

export interface GearAction {
  kind: string;
  pattern?: string;
  itemId?: string;
  label?: string;
}

export interface GearNote {
  key: string;
  ok: boolean;
  params: Record<string, string>;
}

const MATS: Mat[] = ["iron", "wood", "leather", "fodder"];

export const SHOP: Record<string, { price: number; mat: Mat }> = {
  iron: { price: 12, mat: "iron" },
  wood: { price: 8, mat: "wood" },
  leather: { price: 10, mat: "leather" },
  fodder: { price: 8, mat: "fodder" },
};

export const FORGE: Record<string, { slot: GearSlot; cost: Partial<Record<Mat, number>>; duel: number; famous: boolean }> = {
  "snake-spear": { slot: "weapon", cost: { iron: 2, wood: 1 }, duel: 2, famous: true },
  crescent: { slot: "weapon", cost: { iron: 3, wood: 1 }, duel: 2, famous: true },
  halberd: { slot: "weapon", cost: { iron: 3, wood: 2 }, duel: 2, famous: true },
  lamellar: { slot: "armor", cost: { iron: 1, leather: 2 }, duel: 1, famous: false },
};

export const TAME_COST: Partial<Record<Mat, number>> = { fodder: 2, leather: 1 };
export const MOUNT_PATTERN = "war-horse";
export const POLEARMS = new Set(["snake-spear", "crescent", "halberd"]);

export const GEAR_KINDS = ["buy", "learn", "forge", "tame", "equip", "unequip", "donate", "draw"] as const;

export function isGearKind(kind: string): boolean {
  return (GEAR_KINDS as readonly string[]).includes(kind);
}

export function ensureGear(state: WorldState) {
  if (!state.items) state.items = [];
  for (const role of state.roles) {
    if (!role.stock) role.stock = {};
    if (typeof role.purse !== "number" || Number.isNaN(role.purse)) role.purse = 0;
    if (!role.known) role.known = [];
  }
}

function stockOf(role: Role, mat: Mat): number {
  return role.stock?.[mat] ?? 0;
}

function setStock(role: Role, mat: Mat, value: number) {
  role.stock = { ...role.stock, [mat]: value };
}

function canPay(role: Role, cost: Partial<Record<Mat, number>>): boolean {
  return MATS.every((mat) => stockOf(role, mat) >= (cost[mat] ?? 0));
}

function pay(role: Role, cost: Partial<Record<Mat, number>>) {
  for (const mat of MATS) {
    const need = cost[mat] ?? 0;
    if (need) setStock(role, mat, stockOf(role, mat) - need);
  }
}

function bagCount(state: WorldState, roleId: string): number {
  return (state.items ?? []).filter((item) => item.ownerId === roleId).length;
}

function fail(key: string, role: Role, extra: Record<string, string | number> = {}): GearNote {
  const params: Record<string, string> = { actor: role.id };
  for (const [name, value] of Object.entries(extra)) params[name] = String(value);
  return { key, ok: false, params };
}

function note(key: string, params: Record<string, string>): GearNote {
  return { key, ok: true, params };
}

export function grantSearchClue(state: WorldState, role: Role, cityId: string): GearNote {
  ensureGear(state);
  const kinds = [...MATS, "coin"] as const;
  let n = state.turn * 17 + cityId.length;
  for (const ch of role.id) n = (n + ch.charCodeAt(0) * 13) % 997;
  const kind = kinds[n % kinds.length]!;
  if (kind === "coin") {
    const before = role.purse ?? 0;
    if (before >= PURSE_CAP) return fail("gear.clue.full", role, { mat: "coin" });
    role.purse = Math.min(PURSE_CAP, before + CLUE_COIN);
    return note("gear.clue.coin", { actor: role.id, city: cityId, before: String(before), after: String(role.purse) });
  }
  const before = stockOf(role, kind);
  if (before >= STOCK_CAP) return fail("gear.clue.full", role, { mat: kind });
  setStock(role, kind, before + 1);
  return note("gear.clue.mat", { actor: role.id, city: cityId, mat: kind, n: String(before + 1) });
}

function mint(state: WorldState, role: Role, pattern: string, slot: GearSlot, name: string): GearItem {
  const item: GearItem = {
    id: `g${state.turn}-${role.id}-${(state.items ?? []).length}`,
    pattern,
    slot,
    name,
    makerId: role.id,
    ownerId: role.id,
    equipped: false,
  };
  state.items = [...(state.items ?? []), item];
  return item;
}

export function applyGearAction(state: WorldState, role: Role, action: GearAction): GearNote {
  ensureGear(state);
  if (!role.cityId && action.kind !== "learn" && action.kind !== "unequip") {
    return fail("gear.need.city", role);
  }
  if (action.kind === "buy") {
    const shop = action.pattern ? SHOP[action.pattern] : undefined;
    if (!shop) return fail("gear.buy.bad", role);
    const purse = role.purse ?? 0;
    if (purse < shop.price) return fail("gear.buy.poor", role, { need: shop.price, purse });
    if (stockOf(role, shop.mat) >= STOCK_CAP) return fail("gear.clue.full", role, { mat: shop.mat });
    role.purse = purse - shop.price;
    setStock(role, shop.mat, stockOf(role, shop.mat) + 1);
    return note("gear.buy", { actor: role.id, mat: shop.mat, purse: String(role.purse), n: String(stockOf(role, shop.mat)) });
  }
  if (action.kind === "learn") {
    if (!action.pattern || !FORGE[action.pattern]) return fail("gear.learn.bad", role);
    if (role.known?.includes(action.pattern)) return fail("gear.learn.again", role, { pattern: action.pattern });
    const purse = role.purse ?? 0;
    if (purse < LEARN_COST) return fail("gear.learn.poor", role, { need: LEARN_COST, purse });
    role.purse = purse - LEARN_COST;
    role.known = [...(role.known ?? []), action.pattern];
    return note("gear.learn", { actor: role.id, pattern: action.pattern, purse: String(role.purse) });
  }
  if (action.kind === "forge") {
    const spec = action.pattern ? FORGE[action.pattern] : undefined;
    if (!spec) return fail("gear.forge.bad", role);
    if (!role.known?.includes(action.pattern!)) return fail("gear.forge.unlearned", role, { pattern: action.pattern! });
    if (!canPay(role, spec.cost)) return fail("gear.forge.short", role, { pattern: action.pattern! });
    if (bagCount(state, role.id) >= BAG_CAP) return fail("gear.bag.full", role);
    pay(role, spec.cost);
    const label = action.label ?? "";
    const first = spec.famous && !(state.items ?? []).some((item) => item.makerId === role.id && item.pattern === action.pattern);
    mint(state, role, action.pattern!, spec.slot, label);
    return note(first ? "gear.forge.first" : "gear.forge.plain", { actor: role.id, pattern: action.pattern!, label: label || "—", maker: role.id });
  }
  if (action.kind === "tame") {
    if (!canPay(role, TAME_COST)) return fail("gear.tame.short", role);
    if (bagCount(state, role.id) >= BAG_CAP) return fail("gear.bag.full", role);
    pay(role, TAME_COST);
    const label = action.label ?? "";
    mint(state, role, MOUNT_PATTERN, "mount", label);
    return note("gear.tame", { actor: role.id, pattern: MOUNT_PATTERN, label: label || "—", maker: role.id });
  }
  if (action.kind === "equip") {
    const item = (state.items ?? []).find((entry) => entry.id === action.itemId && entry.ownerId === role.id);
    if (!item) return fail("gear.equip.missing", role);
    for (const other of state.items ?? []) {
      if (other.ownerId === role.id && other.slot === item.slot) other.equipped = false;
    }
    item.equipped = true;
    return note("gear.equip", { actor: role.id, pattern: item.pattern, item: item.id });
  }
  if (action.kind === "unequip") {
    const slot = action.pattern;
    if (slot !== "weapon" && slot !== "armor" && slot !== "mount") return fail("gear.unequip.bad", role);
    const item = (state.items ?? []).find((entry) => entry.ownerId === role.id && entry.equipped && entry.slot === slot);
    if (!item) return fail("gear.unequip.missing", role);
    item.equipped = false;
    return note("gear.unequip", { actor: role.id, pattern: item.pattern, slot });
  }
  if (action.kind === "donate") {
    if (!role.factionId) return fail("gear.donate.none", role);
    const item = (state.items ?? []).find((entry) => entry.id === action.itemId && entry.ownerId === role.id);
    if (!item || item.equipped) return fail("gear.donate.missing", role);
    item.ownerId = `armory:${role.factionId}`;
    item.equipped = false;
    return note("gear.donate", { actor: role.id, pattern: item.pattern, faction: role.factionId, item: item.id });
  }
  if (action.kind === "draw") {
    if (!role.factionId) return fail("gear.draw.none", role);
    if (bagCount(state, role.id) >= BAG_CAP) return fail("gear.bag.full", role);
    const item = (state.items ?? [])
      .filter((entry) => entry.ownerId === `armory:${role.factionId}`)
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    if (!item) return fail("gear.draw.empty", role, { faction: role.factionId ?? "" });
    item.ownerId = role.id;
    item.equipped = false;
    return note("gear.draw", { actor: role.id, pattern: item.pattern, faction: role.factionId, item: item.id });
  }
  return fail("gear.forge.bad", role);
}

export function duelGearBonus(state: WorldState, roleId: string): { bonus: number; patterns: string } {
  const worn = (state.items ?? []).filter((item) => item.ownerId === roleId && item.equipped);
  let bonus = 0;
  const patterns: string[] = [];
  for (const item of worn.sort((a, b) => a.slot.localeCompare(b.slot))) {
    if (item.slot === "mount") bonus += 1;
    else bonus += FORGE[item.pattern]?.duel ?? 0;
    patterns.push(item.pattern);
  }
  return { bonus: Math.min(DUEL_CAP, bonus), patterns: patterns.join(",") || "-" };
}

export function equippedPatterns(state: WorldState, roleId: string): Partial<Record<GearSlot, string>> {
  const out: Partial<Record<GearSlot, string>> = {};
  for (const item of state.items ?? []) {
    if (item.ownerId === roleId && item.equipped) out[item.slot] = item.pattern;
  }
  return out;
}
