import type { DoorReport, Faction, WorldState } from "./types";

export function factionById(state: WorldState, id: string | null | undefined): Faction | undefined {
  if (!id) return undefined;
  return state.factions.find((f) => f.id === id);
}

export function roleById(state: WorldState, id: string | null | undefined) {
  if (!id) return undefined;
  return state.roles.find((r) => r.id === id);
}

export function cityById(state: WorldState, id: string | null | undefined) {
  if (!id) return undefined;
  return state.cities.find((c) => c.id === id);
}

function liegeChain(state: WorldState, factionId: string): string[] {
  const chain = [factionId];
  let cursor = factionById(state, factionId);
  let guard = 0;
  while (cursor?.liegeId && guard++ < 6) {
    chain.push(cursor.liegeId);
    cursor = factionById(state, cursor.liegeId);
  }
  return chain;
}

export function isVassalOf(state: WorldState, factionId: string, liegeId: string): boolean {
  return liegeChain(state, factionId).slice(1).includes(liegeId);
}

export function controls(state: WorldState, factionId: string, cityController: string | null): boolean {
  if (!cityController) return false;
  if (cityController === factionId) return true;
  return isVassalOf(state, cityController, factionId);
}

export function assess(state: WorldState): DoorReport {
  const capital = state.cities.find((c) => c.isCapital) ?? state.cities[0];
  const candidateId = capital?.controllerId ?? null;
  const candidate = factionById(state, candidateId);
  const total = state.cities.length || 1;
  const held = candidate
    ? state.cities.filter((c) => controls(state, candidate.id, c.controllerId)).length
    : 0;
  const ratio = held / total;
  const required = state.config.endgame.unify.control_ratio;
  const capitalHeld = Boolean(
    candidate && (!state.config.endgame.unify.capital_required || capital?.controllerId === candidate.id),
  );
  const majors = state.factions
    .filter((f) => f.major)
    .map((f) => {
      let status: DoorReport["majors"][number]["status"] = "resisting";
      if (candidate && f.id === candidate.id) status = "self";
      else if (f.eliminated) status = "eliminated";
      else if (candidate && isVassalOf(state, f.id, candidate.id)) status = "vassal";
      return { id: f.id, name: f.name, status };
    });
  const mode = state.config.endgame.unify.major_powers;
  const majorsMet = majors.every((m) => {
    if (m.status === "self") return true;
    if (m.status === "eliminated") return true;
    return mode === "subdued_or_vassal" && m.status === "vassal";
  });
  const ratioMet = ratio + 1e-9 >= required;
  return {
    candidateId: candidate?.id ?? null,
    candidateName: candidate?.name ?? null,
    capitalName: capital?.name ?? "都城",
    capitalHeld,
    heldCities: held,
    totalCities: state.cities.length,
    ratio,
    requiredRatio: required,
    ratioMet,
    majors,
    majorsMet,
    stableStreak: state.stableStreak,
    stableNeeded: state.config.endgame.unify.stable_turns,
    consolidation: state.status === "consolidation",
    consolidationLeft: state.consolidationLeft,
    open: Boolean(candidate) && capitalHeld && ratioMet && majorsMet && !candidate?.eliminated,
  };
}
