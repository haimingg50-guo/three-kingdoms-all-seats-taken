/** 去向的公开代价。离开不需旧主同意，加入必须对方在席君主同意。 */

import type { AllegianceConfig, TianxiaConfig, WorldState } from "./types";

export const ALLEGIANCE_COST = {
  /** 君主臣服，保留封地。 */
  submit: 8,
  /** 投降并可能献城，不带走兵力。 */
  surrender: 12,
  /** 投奔、下野、叛离。 */
  leave: 6,
} as const;

export type AllegianceKind = "submit" | "surrender" | "seek" | "serve";

export function allegianceWord(kind: string): string {
  if (kind === "submit") return "臣服";
  if (kind === "surrender") return "投降";
  if (kind === "seek") return "投奔";
  if (kind === "serve") return "出仕";
  if (kind === "retire") return "下野";
  if (kind === "renounce") return "叛离";
  return kind;
}

export const DEFAULT_ALLEGIANCE: AllegianceConfig = {
  submit_threshold: 2 / 3,
  submit_cooldown: 3,
  vote_named: true,
};

export function allegianceRules(config: TianxiaConfig): AllegianceConfig {
  const raw = config.allegiance;
  return {
    submit_threshold: typeof raw?.submit_threshold === "number" ? raw.submit_threshold : DEFAULT_ALLEGIANCE.submit_threshold,
    submit_cooldown: typeof raw?.submit_cooldown === "number" ? raw.submit_cooldown : DEFAULT_ALLEGIANCE.submit_cooldown,
    vote_named: typeof raw?.vote_named === "boolean" ? raw.vote_named : DEFAULT_ALLEGIANCE.vote_named,
  };
}

/** 旧存档没有表决字段时补上默认值，避免结算读到空表。 */
export function ensureAllegianceState(state: WorldState) {
  state.submitBallots ??= [];
  state.leavePermits ??= [];
  state.submitOpened ??= {};
  if (!state.config.allegiance) state.config.allegiance = { ...DEFAULT_ALLEGIANCE };
}

export function thresholdLabel(value: number): string {
  if (Math.abs(value - 2 / 3) < 1e-12) return "2/3";
  return `${Math.round(value * 1000) / 1000}`;
}
