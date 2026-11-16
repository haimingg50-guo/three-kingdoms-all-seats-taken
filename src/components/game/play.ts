import type { DomesticKind, Order } from "@/engine/types";

/** 玩家此刻处在哪一步。草稿和封存都不是结算结果。 */
export type TurnPhase = "draft" | "sealed" | "waiting" | "review" | "watch";

export type GuideId = "seat" | "who" | "act" | "draft" | "wait";

export interface GuideSave {
  cursor: GuideId | "done";
  skipped: boolean;
}

const GUIDE_IDS: readonly GuideId[] = ["seat", "who", "act", "draft", "wait"];

export function turnPhase(input: {
  seated: boolean;
  locked: boolean;
  sealOpen: boolean;
  reviewing: boolean;
  closed: boolean;
}): TurnPhase {
  if (input.closed || !input.seated) return "watch";
  if (input.reviewing) return "review";
  if (!input.locked) return "draft";
  if (input.sealOpen) return "sealed";
  return "waiting";
}

export function isOfficer(role: { office: string; kind: string }): boolean {
  return role.office === "lord" || role.office === "general" || role.office === "advisor";
}

export function canUseDomestic(role: { office: string; kind: string }, who: "officer" | "citizen" | "any"): boolean {
  if (who === "any") return true;
  if (who === "citizen") return role.kind === "citizen";
  return isOfficer(role) && role.kind !== "citizen";
}

/** 主画面上的常用内政。装备、外交、军务不在这里。 */
export const PRIMARY: { kind: DomesticKind; who: "officer" | "citizen" | "any" }[] = [
  { kind: "develop", who: "officer" },
  { kind: "farm", who: "any" },
  { kind: "recruit", who: "officer" },
  { kind: "drill_prowess", who: "any" },
  { kind: "drill_command", who: "any" },
  { kind: "search", who: "any" },
  { kind: "transport", who: "any" },
  { kind: "hold_line", who: "any" },
  { kind: "enlist", who: "citizen" },
  { kind: "open_gates", who: "citizen" },
];

export const STARTER_KINDS = ["farm", "search"] as const;
export type StarterKind = (typeof STARTER_KINDS)[number];

export function primaryFor(role: { office: string; kind: string } | null): DomesticKind[] {
  if (!role) return [];
  return PRIMARY.filter((item) => canUseDomestic(role, item.who)).map((item) => item.kind);
}

/** 引导建议的简单内政。不代填。没有席位时为空。 */
export function starterKinds(role: { office: string; kind: string } | null): StarterKind[] {
  if (!role) return [];
  const open = new Set(primaryFor(role));
  return STARTER_KINDS.filter((kind) => open.has(kind));
}

export function seatMeta(parts: { faction?: string | null; office: string; where: string }): string {
  return [parts.faction, parts.office, parts.where].filter((part) => Boolean(part && part.trim())).join(" · ");
}

export function orderLines(order: Order): { labelKey: string }[] {
  const lines: { labelKey: string }[] = [];
  for (const action of order.domestic) {
    if (action.kind === "scheme") {
      lines.push({
        labelKey: action.scheme === "fire" ? "act.fire" : action.scheme === "discord" ? "act.discord" : "act.rumor",
      });
      continue;
    }
    lines.push({ labelKey: `act.${action.kind}` });
  }
  if (order.war?.type === "move") lines.push({ labelKey: "slip.move" });
  else if (order.war?.type === "march") lines.push({ labelKey: "slip.personal" });
  else if (order.war?.type === "duel") lines.push({ labelKey: "slip.duel" });
  else if (order.war?.type === "confirm") lines.push({ labelKey: "war.confirm" });
  else if (order.war?.type === "refuse") lines.push({ labelKey: "war.refuse" });
  else if (order.war?.type === "leave") lines.push({ labelKey: "war.leave" });
  else if (order.war?.type === "hold") lines.push({ labelKey: "war.hold" });
  else if (order.war?.type === "delegate") lines.push({ labelKey: "slip.war" });
  if (order.diplomacy?.type === "submit") lines.push({ labelKey: "kind.submit" });
  else if (order.diplomacy?.type === "surrender") lines.push({ labelKey: "kind.surrender" });
  else if (order.diplomacy?.type === "seek") lines.push({ labelKey: "kind.seek" });
  else if (order.diplomacy?.type === "serve") lines.push({ labelKey: "kind.serve" });
  else if (order.diplomacy?.type === "retire") lines.push({ labelKey: "kind.retire" });
  else if (order.diplomacy?.type === "renounce") lines.push({ labelKey: "kind.renounce" });
  else if (order.diplomacy?.type === "alliance") lines.push({ labelKey: "dip.proposeAlliance" });
  else if (order.diplomacy?.type === "truce") lines.push({ labelKey: "dip.proposeTruce" });
  else if (order.diplomacy?.type === "vassal") lines.push({ labelKey: "dip.proposeVassal" });
  else if (order.diplomacy?.type === "break") lines.push({ labelKey: "dip.break" });
  else if (order.diplomacy?.type === "respond") lines.push({ labelKey: "play.lineRespond" });
  else if (order.diplomacy?.type === "ballot") lines.push({ labelKey: "slip.ballot" });
  if (order.motion?.type) lines.push({ labelKey: "motion.title" });
  if (order.votes.length > 0) lines.push({ labelKey: "slip.pendingVote" });
  if (order.plea) lines.push({ labelKey: "slip.pleaTitle" });
  return lines;
}

export function draftHasStarter(order: Order): boolean {
  return order.domestic.some((action) => action.kind === "farm" || action.kind === "search");
}

export function draftStorageKey(worldId: string, turn: number, roleId: string): string {
  return `tianxia-draft:${worldId}:${turn}:${roleId}`;
}

export function readStoredDraft(raw: string | null): Order | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Order>;
    if (!parsed || !Array.isArray(parsed.domestic) || !Array.isArray(parsed.votes)) return null;
    return {
      votes: parsed.votes,
      domestic: parsed.domestic,
      ...(parsed.motion ? { motion: parsed.motion } : {}),
      ...(parsed.diplomacy ? { diplomacy: parsed.diplomacy } : {}),
      ...(parsed.war ? { war: parsed.war } : {}),
      ...(parsed.plea ? { plea: parsed.plea } : {}),
      ...(parsed.remark ? { remark: parsed.remark } : {}),
      ...(parsed.letter ? { letter: parsed.letter } : {}),
    };
  } catch {
    return null;
  }
}

export const GUIDE_STORAGE_KEY = "tianxia-guide";

export function readGuide(raw: string | null): GuideSave {
  if (!raw) return { cursor: "seat", skipped: false };
  try {
    const parsed = JSON.parse(raw) as Partial<GuideSave>;
    const cursor = parsed.cursor;
    const known = cursor === "done" || (typeof cursor === "string" && GUIDE_IDS.includes(cursor as GuideId));
    if (!known) return { cursor: "seat", skipped: false };
    return { cursor: cursor as GuideSave["cursor"], skipped: Boolean(parsed.skipped) };
  } catch {
    return { cursor: "seat", skipped: false };
  }
}

export function guideFocus(input: {
  skipped: boolean;
  closed: boolean;
  seated: boolean;
  canStart: boolean;
  started: boolean;
  locked: boolean;
  cursor: GuideId | "done";
}): GuideId | "done" {
  if (input.skipped || input.closed) return "done";
  if (!input.seated) return "seat";
  if (input.locked) return input.cursor === "done" ? "done" : "wait";
  if (input.cursor === "done") return "done";
  if (input.cursor === "seat") return "who";
  if (input.cursor === "act" || input.cursor === "wait") {
    if (!input.canStart) return "who";
    return input.started ? "draft" : "act";
  }
  if (input.cursor === "draft") {
    if (input.canStart && !input.started) return "act";
    return "draft";
  }
  return "who";
}

export function nextGuide(id: GuideId): GuideId | "done" {
  if (id === "seat") return "who";
  if (id === "who") return "act";
  if (id === "act") return "draft";
  if (id === "draft") return "wait";
  return "done";
}
