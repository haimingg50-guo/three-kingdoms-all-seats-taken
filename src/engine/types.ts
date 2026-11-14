export type WorldKind = "experiment" | "sandbox";

export type WorldStatus = "running" | "consolidation" | "memorial" | "settled";

export type Office =
  | "lord"
  | "general"
  | "advisor"
  | "captain"
  | "wanderer"
  | "citizen"
  | "dead";

export type RoleKind = "historical" | "promoted" | "soldier" | "citizen";

export type MenuLevel = "minimal" | "standard" | "rich";

export type MapTopology =
  | "historic_13zhou"
  | "three_kingdoms_pocket"
  | "random_abstract";

export type FallbackBehavior =
  | "execute_preset_then_defend"
  | "execute_preset_then_retreat"
  | "defend"
  | "retreat";

export interface TianxiaConfig {
  world: {
    city_count: number;
    role_pool_size: number;
    reserve_roles: number;
    map_topology: MapTopology;
  };
  turn: {
    duration_hours: number;
    war_phase_mode: "room_tactical" | "turn_tactical";
    laboratory_clock: boolean;
    duration_minutes: number | null;
    early_resolve: boolean;
    /** 参照实现扩展：至少几位在席者锁定后才允许提前结算。 */
    early_resolve_min_seated: number;
  };
  identity: {
    permadeath: true;
    lifespan: "infinite" | "natural_decay";
    death_succession: "power_transfers";
    new_player_entry: "soldier_or_citizen";
    promotion_enabled: boolean;
    promotion_path: string[];
    disposed_destinations: string[];
    citizen_naming: "system_random_3char";
    front_display: "role_name_only";
  };
  comm: {
    free_chat: boolean;
    private_message: boolean;
    menu_expressiveness: MenuLevel;
    contract_system: boolean;
    contract_breach_record: boolean;
    public_notice_hours: number;
    accusation_freeform: false;
    external_collusion_recognized: false;
  };
  politics: {
    impeach: { threshold: number; defense_hours: number };
    exile: { threshold: number; reputation_cost: number };
    execute: { threshold: number; public_notice: true };
    mutiny: { enabled: boolean };
    regency: { enabled: boolean };
    usurpation: { enabled: boolean };
    auto_punishment: false;
  };
  war: {
    muster_notice_turns: number;
    confirm_window_hours: number;
    grace_window_hours: number;
    command_chain: string[];
    fallback_behavior: FallbackBehavior;
    fallback_scope_lord: "troops_only";
    absence_death_risk_kept: true;
    absence_to_reputation: boolean;
    handover_on_return: "immediate" | "next_phase";
  };
  eco: {
    action_points_per_turn: number;
    resource_cap: number;
    diminishing_returns: boolean;
    search_discovers: string[];
    offline_preset: boolean;
    idle_decay: number;
  };
  endgame: {
    unify: {
      capital_required: boolean;
      control_ratio: number;
      major_powers: "eliminated" | "subdued_or_vassal";
      stable_turns: number;
    };
    consolidation_turns: number;
    on_unify: "memorial_then_shutdown";
    season_deadline_days: number | null;
    official_interference: false;
  };
  mod: {
    anti_multiaccount: true;
    behavior_audit: boolean;
    replay_available: true;
    punishment_scope: string[];
  };
  data: {
    event_log: "complete_append_only";
    anonymization: "role_indexed_hash";
    export_format: string[];
    export_license: "CC-BY-4.0" | "ODbL-1.0";
  };
  rules: {
    amendment_via_ingame_politics: boolean;
  };
  /** 臣服表决。旧存档没有这一节时，结算按默认三分之二、冷却 3、记名补上。 */
  allegiance?: AllegianceConfig;
  climate: ClimateConfig;
  relief: ReliefConfig;
  deeds: DeedsConfig;
}

export type SeasonName = "春" | "夏" | "秋" | "冬";
export type WeatherName = "晴" | "雨" | "雪" | "雾" | "旱";
export type DisasterName = "旱" | "涝" | "蝗" | "瘟疫";

export interface ClimateConfig {
  enabled: boolean;
  /** 冬雪行军折损，含冬日本身。 */
  snow_march_loss: number;
  /** 冬日非雪的行军折损。 */
  winter_march_loss: number;
  /** 雨天走渡口或沿河路的额外折损。 */
  rain_ford_loss: number;
  /** 涝灾时渡口的额外折损，可与雨叠加，合计另有上限。 */
  flood_ford_loss: number;
  /** 旱天屯田相对基数的乘数。 */
  drought_farm_factor: number;
  /** 冬季屯田乘数。 */
  winter_farm_factor: number;
  /** 晴天屯田的小加成。不加在战力上。 */
  fair_farm_bonus: number;
  disasters_enabled: boolean;
  /** 每回合出现一种天灾的概率，千分比。 */
  disaster_permille: number;
  disaster_grain_loss: number;
  disaster_troop_loss: number;
}

export interface ReliefConfig {
  enabled: boolean;
  dike_max: number;
  dike_grain_cut: number;
  dike_ford_cut: number;
  dike_decay_turns: number;
  granary_cap: number;
  granary_deposit: number;
  granary_spoil: number;
  clinic_max: number;
  clinic_plague_cut: number;
  plague_turns: number;
  linger_ratio: number;
  relief_grain: number;
  relief_morale: number;
  relief_reputation: number;
  road_cut: number;
  road_decay_turns: number;
  canal_max: number;
  canal_drought_ease: number;
}

export interface City {
  id: string;
  name: string;
  region: string;
  isCapital: boolean;
  hasSeal: boolean;
  controllerId: string | null;
  grain: number;
  gold: number;
  troops: number;
  morale: number;
  links: string[];
  /** 渡河或沿河的邻城。雨、涝只加重这些路，不由结算时临场指定。 */
  fords: string[];
  x: number;
  y: number;
  /** 减灾工程。旧档没有这一栏时，结算前补成零。 */
  works?: CityWorks;
}

export interface AllegianceConfig {
  /** 赞成人数 / 在席人数 必须大于这个数。默认 2/3，刚好三分之二不算通过。 */
  submit_threshold: number;
  /** 发起之后，要再过这么多回合才能再次发起。默认 3：第 5 回合发起，第 8 回合才能再发。 */
  submit_cooldown: number;
  /** 史书是否写下投票人的名字。默认记名。不记名时实验日志仍保留 roleId。 */
  vote_named: boolean;
}

export interface DeedsConfig {
  reward_gold: number;
  reward_morale: number;
  duel_gap: number;
  fire_loss: number;
  discord_reputation: number;
  rumor_morale: number;
  refugee_morale: number;
  refugee_ratio: number;
  bounty_merit: number;
  betray_reputation: number;
}

export interface CityWorks {
  dike: number;
  dikeIdle: number;
  granary: number;
  clinic: number;
  plague: number;
  canal: number;
  canalIdle: number;
  roads: { to: string; idle: number }[];
}

export interface Faction {
  id: string;
  name: string;
  color: string;
  lordRoleId: string | null;
  liegeId: string | null;
  regentRoleId: string | null;
  major: boolean;
  eliminated: boolean;
}

export interface Role {
  id: string;
  name: string;
  kind: RoleKind;
  office: Office;
  factionId: string | null;
  cityId: string | null;
  alive: boolean;
  discovered: boolean;
  historical: boolean;
  prowess: number;
  intellect: number;
  command: number;
  reputation: number;
  merit: number;
  absentStreak: number;
  vacantStreak: number;
  preset: "defend" | "retreat" | null;
  seated: boolean;
  /** 随身钱。旧档没有时当作 0。 */
  purse?: number;
  /** 铁、木、皮、料。单项不超过装备模块里的上限。 */
  stock?: Partial<Record<"iron" | "wood" | "leather" | "fodder", number>>;
  /** 已经学会的打造形制。坐骑不在这里。 */
  known?: string[];
  /** 被哪一方俘虏。空席不会自动投诚。 */
  captiveOf?: string | null;
  diedTurn?: number;
  deathReason?: "battle" | "executed";
}

export type VoteChoice = "aye" | "nay" | "silent";

export type MotionType =
  | "impeach"
  | "exile"
  | "execute"
  | "recommend"
  | "mutiny"
  | "abdicate"
  | "regency"
  | "amend";

export interface Motion {
  id: string;
  turnOpened: number;
  type: MotionType;
  proposerId: string;
  targetRoleId?: string;
  charge?: string;
  amendKey?: string;
  amendValue?: number | string;
  votes: { roleId: string; choice: VoteChoice }[];
  plea?: "admit" | "deny" | "silent";
  status: "defense" | "voting" | "notice" | "passed" | "failed";
  noticeUntilTurn?: number;
}

export type OfferKind = "alliance" | "truce" | "vassal" | "defect" | "submit" | "surrender" | "seek" | "serve";

export interface Offer {
  id: string;
  turn: number;
  fromFactionId: string;
  toFactionId: string;
  targetRoleId?: string;
  cityId?: string;
  kind: OfferKind;
  status: "pending" | "accepted" | "rejected" | "delayed" | "expired";
  condition?: "cede_city" | "military_aid" | "truce_3";
}

export interface Contract {
  id: string;
  kind: "alliance" | "truce" | "vassal" | "conditional";
  parties: string[];
  sinceTurn: number;
  untilTurn?: number;
  status: "active" | "fulfilled" | "breached";
  text: string;
  creditorFactionId?: string;
  debtorFactionId?: string;
  condition?: "cede_city" | "military_aid" | "truce_3";
}

export interface ChronicleEntry {
  seq: number;
  turn: number;
  phase: "court" | "domestic" | "diplomacy" | "war" | "end" | "meta";
  kind: string;
  /** 新事件只存类型与参数。旧存档里已经写成的句子仍可读。 */
  key?: string;
  params?: Record<string, string>;
  text?: string;
  /** 实验日志用的角色。不记名时公开副本去掉这个字段，库里的原文保留。 */
  roleId?: string;
}

export interface Letter {
  id: string;
  turn: number;
  fromRoleId: string;
  toRoleId: string;
  text: string;
}

export type DomesticKind =
  | "develop"
  | "farm"
  | "recruit"
  | "drill_prowess"
  | "drill_command"
  | "search"
  | "transport"
  | "enlist"
  | "open_gates"
  | "hold_line"
  | "raise_dike"
  | "store_grain"
  | "raise_clinic"
  | "relieve"
  | "watch_sky"
  | "mend_road"
  | "dig_canal"
  | "reward"
  | "swear"
  | "break_bond"
  | "scheme"
  | "release"
  | "buy"
  | "learn"
  | "forge"
  | "tame"
  | "equip"
  | "unequip"
  | "donate"
  | "draw";

export interface GearItem {
  id: string;
  pattern: string;
  slot: "weapon" | "armor" | "mount";
  name: string;
  makerId: string;
  ownerId: string;
  equipped: boolean;
}

export interface Order {
  votes: { motionId: string; choice: VoteChoice }[];
  plea?: { motionId: string; plea: "admit" | "deny" | "silent" };
  motion?: {
    type: MotionType;
    targetRoleId?: string;
    charge?: string;
    amendKey?: string;
    amendValue?: number | string;
  };
  domestic: {
    kind: DomesticKind;
    destCityId?: string;
    targetRoleId?: string;
    scheme?: "discord" | "fire" | "rumor";
    pattern?: string;
    itemId?: string;
    label?: string;
  }[];
  diplomacy?: {
    type:
      | "alliance"
      | "truce"
      | "vassal"
      | "defect"
      | "break"
      | "cede"
      | "respond"
      | "submit"
      | "surrender"
      | "seek"
      | "serve"
      | "retire"
      | "renounce"
      | "ballot";
    targetFactionId?: string;
    targetRoleId?: string;
    cityId?: string;
    offerId?: string;
    voteId?: string;
    choice?: "aye" | "nay";
    contingent?: "retire" | "seek";
    response?: "accept" | "conditional" | "reject" | "delay" | "silent";
    condition?: "cede_city" | "military_aid" | "truce_3";
  };
  war?: {
    type: "march" | "hold" | "confirm" | "delegate" | "leave" | "refuse" | "duel";
    targetCityId?: string;
    commanderRoleId?: string;
    portion?: "half" | "most";
    personal?: boolean;
    preset?: "defend" | "retreat";
  };
  remark?: string;
  letter?: { toRoleId: string; text: string };
}

export interface AmendmentRecord {
  turn: number;
  key: string;
  from: number | string | boolean;
  to: number | string;
}

export interface SubmitBallot {
  id: string;
  turn: number;
  factionId: string;
  lordRoleId: string;
  targetFactionId: string;
  status: "open" | "passed" | "failed";
  ballots: { roleId: string; choice: "aye" | "nay"; contingent?: "retire" | "seek"; targetFactionId?: string }[];
}

export interface LeavePermit {
  roleId: string;
  voteId: string;
  untilTurn: number;
  side: "aye" | "nay";
}

export interface WorldState {
  id: string;
  name: string;
  kind: WorldKind;
  profile: string;
  countsAsExperiment: boolean;
  config: TianxiaConfig;
  turn: number;
  status: WorldStatus;
  openedAt: string;
  deadline: string;
  closedAt: string | null;
  closeReason: string | null;
  unifiedByFactionId: string | null;
  stableStreak: number;
  consolidationLeft: number | null;
  experimental: boolean;
  seasonAnnounced: boolean;
  cities: City[];
  factions: Faction[];
  roles: Role[];
  motions: Motion[];
  offers: Offer[];
  submitBallots?: SubmitBallot[];
  leavePermits?: LeavePermit[];
  /** 君主 id → 上次发起臣服的回合。 */
  submitOpened?: Record<string, number>;
  contracts: Contract[];
  alliances: { a: string; b: string; sinceTurn: number }[];
  truces: { a: string; b: string; untilTurn: number }[];
  letters: Letter[];
  chronicle: ChronicleEntry[];
  amendments: AmendmentRecord[];
  lockedOrders: Record<string, Order>;
  /** 开局写入史书。天气只由局号、回合和这颗种子抽出。 */
  climateSeed: string;
  /** 赈济别的阵营之后积累的信任。不自动替对方答应盟约。 */
  trust?: { fromFactionId: string; toFactionId: string; score: number }[];
  bonds?: { a: string; b: string; sinceTurn: number }[];
  /** 打造、驯养和军械。旧档没有时是空的。 */
  items?: GearItem[];
  bounty?: { season: SeasonName; code: "dike" | "granary" | "clinic" | "relief"; claimed: boolean; sinceTurn: number };
  version: number;
}

export interface DoorReport {
  candidateId: string | null;
  candidateName: string | null;
  capitalName: string;
  capitalHeld: boolean;
  heldCities: number;
  totalCities: number;
  ratio: number;
  requiredRatio: number;
  ratioMet: boolean;
  majors: {
    id: string;
    name: string;
    status: "self" | "vassal" | "eliminated" | "resisting";
  }[];
  majorsMet: boolean;
  stableStreak: number;
  stableNeeded: number;
  consolidation: boolean;
  consolidationLeft: number | null;
  /** 领土与势力条件此刻是否同时成立。稳定回合与守成另计。 */
  open: boolean;
}
