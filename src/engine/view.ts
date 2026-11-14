import { allegianceRules } from "./allegiance";
import { assess, factionById } from "./assess";
import { forecast, normalizeClimate, plannedBounty, type SkyReport } from "./climate";
import { profileById } from "./config";
import { equippedPatterns } from "./gear";
import { memorialFacts, type MemorialFacts } from "./memorial";
import type {
  DoorReport,
  Letter,
  Order,
  Role,
  TianxiaConfig,
  WorldState,
} from "./types";

export function officeLabel(role: Pick<Role, "alive" | "office" | "kind" | "discovered">): string {
  if (!role.alive) return "已退场";
  if (role.office === "lord") return "君主";
  if (role.office === "advisor") return "谋臣";
  if (role.office === "general") return role.kind === "promoted" || role.kind === "soldier" ? "低级武将" : "武将";
  if (role.office === "captain") return "队长";
  if (role.office === "citizen") return "市民";
  if (role.office === "wanderer") return role.discovered ? "在野" : "未现";
  return "不详";
}

export interface PublicRole {
  id: string;
  name: string;
  kind: Role["kind"];
  office: Role["office"];
  officeLabel: string;
  factionId: string | null;
  cityId: string | null;
  alive: boolean;
  seated: boolean;
  historical: boolean;
  prowess: number;
  intellect: number;
  command: number;
  reputation: number;
  merit: number;
  absentStreak: number;
  vacantStreak: number;
  preset: Role["preset"];
  captiveOf: string | null;
  diedTurn?: number;
  deathReason?: Role["deathReason"];
  weapon?: string;
  armor?: string;
  mount?: string;
  yours: boolean;
}

export interface PublicKitItem {
  id: string;
  pattern: string;
  slot: "weapon" | "armor" | "mount";
  name: string;
  makerId: string;
  equipped: boolean;
  armory: boolean;
}

export interface PublicKit {
  purse: number;
  stock: { iron: number; wood: number; leather: number; fodder: number };
  known: string[];
  held: PublicKitItem[];
}

export interface PublicWorld {
  id: string;
  name: string;
  kind: WorldState["kind"];
  profile: string;
  profileTitle: string;
  question: string;
  turn: number;
  status: WorldState["status"];
  deadline: string;
  openedAt: string;
  closedAt: string | null;
  closeReason: string | null;
  unifiedBy: string | null;
  unifiedByName: string | null;
  experimental: boolean;
  countsAsExperiment: boolean;
  seasonAnnounced: boolean;
  config: TianxiaConfig;
  cities: WorldState["cities"];
  factions: WorldState["factions"];
  roles: PublicRole[];
  hiddenReserves: number;
  motions: WorldState["motions"];
  offers: WorldState["offers"];
  submitBallots: NonNullable<WorldState["submitBallots"]>;
  contracts: WorldState["contracts"];
  alliances: WorldState["alliances"];
  truces: WorldState["truces"];
  chronicle: WorldState["chronicle"];
  chronicleCount: number;
  amendments: WorldState["amendments"];
  door: DoorReport;
  seatedCount: number;
  sky: SkyReport;
  skyNext: SkyReport;
  bonds: { a: string; b: string; sinceTurn: number }[];
  bounty: WorldState["bounty"] | null;
  memorial: MemorialFacts | null;
  you: null | {
    roleId: string;
    roleName: string;
    locked: boolean;
    order: Order | null;
    letters: Letter[];
    kit: PublicKit;
  };
}

export function projectRole(role: Role, yours: boolean, worn: { weapon?: string; armor?: string; mount?: string } = {}): PublicRole {
  return {
    id: role.id,
    name: role.name,
    kind: role.kind,
    office: role.office,
    officeLabel: officeLabel(role),
    factionId: role.factionId,
    cityId: role.cityId,
    alive: role.alive,
    seated: role.seated && role.alive,
    historical: role.historical,
    prowess: role.prowess,
    intellect: role.intellect,
    command: role.command,
    reputation: role.reputation,
    merit: role.merit,
    absentStreak: role.absentStreak,
    vacantStreak: role.vacantStreak,
    preset: role.preset,
    captiveOf: role.captiveOf ?? null,
    diedTurn: role.diedTurn,
    deathReason: role.deathReason,
    weapon: worn.weapon,
    armor: worn.armor,
    mount: worn.mount,
    yours,
  };
}

function kitOf(state: WorldState, role: Role): PublicKit {
  const armory = role.factionId ? `armory:${role.factionId}` : null;
  return {
    purse: role.purse ?? 0,
    stock: {
      iron: role.stock?.iron ?? 0,
      wood: role.stock?.wood ?? 0,
      leather: role.stock?.leather ?? 0,
      fodder: role.stock?.fodder ?? 0,
    },
    known: [...(role.known ?? [])],
    held: (state.items ?? [])
      .filter((item) => item.ownerId === role.id || (armory !== null && item.ownerId === armory))
      .map((item) => ({
        id: item.id,
        pattern: item.pattern,
        slot: item.slot,
        name: item.name,
        makerId: item.makerId,
        equipped: item.equipped && item.ownerId === role.id,
        armory: item.ownerId !== role.id,
      })),
  };
}

function publicChronicle(state: WorldState, limit: number) {
  const named = allegianceRules(state.config).vote_named;
  return state.chronicle.slice(-limit).map((entry) => {
    if (named || !entry.roleId) return entry;
    if (!entry.kind.startsWith("ballot") && entry.params?.anon !== "1") return entry;
    const copy = { ...entry, params: entry.params ? { ...entry.params } : undefined };
    delete copy.roleId;
    if (copy.params) delete copy.params.actor;
    return copy;
  });
}

function publicBallots(state: WorldState, viewerRoleId: string | null) {
  const ballots = state.submitBallots ?? [];
  if (allegianceRules(state.config).vote_named) return ballots;
  return ballots.map((vote) => ({
    ...vote,
    ballots: vote.ballots.map((ballot) => ({
      ...ballot,
      roleId: ballot.roleId === viewerRoleId ? ballot.roleId : "",
    })),
  }));
}

export function toPublic(state: WorldState, viewerRoleId: string | null, chronicleLimit = 40): PublicWorld {
  normalizeClimate(state);
  const sky = forecast(state, state.turn);
  const profile = profileById(state.profile);
  const visible = state.roles.filter((r) => r.discovered || !r.alive);
  const you = viewerRoleId ? state.roles.find((r) => r.id === viewerRoleId && r.alive) : undefined;
  return {
    id: state.id,
    name: state.name,
    kind: state.kind,
    profile: state.profile,
    profileTitle: profile?.title ?? state.profile,
    question: profile?.question ?? "",
    turn: state.turn,
    status: state.status,
    deadline: state.deadline,
    openedAt: state.openedAt,
    closedAt: state.closedAt,
    closeReason: state.closeReason,
    unifiedBy: state.unifiedByFactionId,
    unifiedByName: factionById(state, state.unifiedByFactionId)?.name ?? null,
    experimental: state.experimental,
    countsAsExperiment: state.countsAsExperiment,
    seasonAnnounced: state.seasonAnnounced,
    config: state.config,
    cities: state.cities,
    factions: state.factions,
    roles: visible.map((r) => projectRole(r, r.id === viewerRoleId, equippedPatterns(state, r.id))),
    hiddenReserves: state.roles.filter((r) => r.alive && !r.discovered).length,
    motions: state.motions,
    offers: state.offers,
    submitBallots: publicBallots(state, viewerRoleId),
    contracts: state.contracts,
    alliances: state.alliances,
    truces: state.truces,
    chronicle: publicChronicle(state, chronicleLimit),
    chronicleCount: state.chronicle.length,
    amendments: state.amendments,
    door: assess(state),
    sky,
    skyNext: forecast(state, state.turn + 1),
    bonds: state.bonds ?? [],
    bounty: state.bounty?.season === sky.season ? state.bounty : plannedBounty(state),
    seatedCount: state.roles.filter((r) => r.alive && r.seated).length,
    memorial: state.status === "memorial" || state.status === "settled" ? memorialFacts(state) : null,
    you: you
      ? {
          roleId: you.id,
          roleName: you.name,
          locked: Boolean(state.lockedOrders[you.id]),
          order: state.lockedOrders[you.id] ?? null,
          letters: state.letters.filter((l) => l.fromRoleId === you.id || l.toRoleId === you.id),
          kit: kitOf(state, you),
        }
      : null,
  };
}
