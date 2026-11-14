import type { ChronicleEntry, WorldState } from "./types";

export interface MemorialContribution {
  roleId: string;
  name: string;
  factionId: string | null;
  merit: number;
  acts: number;
}

export interface MemorialFacts {
  factionId: string | null;
  contributions: MemorialContribution[];
  events: ChronicleEntry[];
}

function touched(entry: ChronicleEntry): string[] {
  const params = entry.params ?? {};
  return [entry.roleId, params.actor, params.winner, params.commander, params.maker].filter((id): id is string => Boolean(id));
}

/** 只统计史书里已经写下的人和功。没有的人不补。 */
export function memorialFacts(state: WorldState): MemorialFacts {
  const counts = new Map<string, number>();
  for (const entry of state.chronicle) {
    for (const id of touched(entry)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const contributions = state.roles
    .filter((role) => role.merit > 0 || role.seated || (counts.get(role.id) ?? 0) > 0)
    .map((role) => ({
      roleId: role.id,
      name: role.name,
      factionId: role.factionId,
      merit: role.merit,
      acts: counts.get(role.id) ?? 0,
    }))
    .sort((a, b) => b.merit - a.merit || b.acts - a.acts || a.roleId.localeCompare(b.roleId))
    .slice(0, 8);
  const events = state.chronicle
    .filter((entry) => {
      const key = entry.key ?? "";
      return key.startsWith("end.") || key.startsWith("war.battle") || key.startsWith("allegiance.") || key === "gear.forge.first" || key.startsWith("ballot.");
    })
    .slice(-8);
  return { factionId: state.unifiedByFactionId, contributions, events };
}
