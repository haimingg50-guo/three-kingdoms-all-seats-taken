import type { FallbackBehavior, MapTopology, MenuLevel, TianxiaConfig } from "./types";

const CHAIN = ["主将", "副将/军师", "君主", "系统托管"] as const;
const SEARCH = ["已有在野角色", "物品", "情报"] as const;
const FORMATS = ["json", "csv"] as const;
const FALLBACKS: FallbackBehavior[] = [
  "execute_preset_then_defend",
  "execute_preset_then_retreat",
  "defend",
  "retreat",
];

export const CLASSIC: TianxiaConfig = {
  world: {
    city_count: 12,
    role_pool_size: 20,
    reserve_roles: 8,
    map_topology: "historic_13zhou",
  },
  turn: {
    duration_hours: 24,
    war_phase_mode: "turn_tactical",
    laboratory_clock: false,
    duration_minutes: null,
    early_resolve: false,
    early_resolve_min_seated: 2,
  },
  identity: {
    permadeath: true,
    lifespan: "infinite",
    death_succession: "power_transfers",
    new_player_entry: "soldier_or_citizen",
    promotion_enabled: true,
    promotion_path: ["士兵", "队长", "低级武将", "在野", "正式武将"],
    disposed_destinations: ["在野", "流亡", "小兵", "市民"],
    citizen_naming: "system_random_3char",
    front_display: "role_name_only",
  },
  comm: {
    free_chat: false,
    private_message: false,
    menu_expressiveness: "rich",
    contract_system: true,
    contract_breach_record: true,
    public_notice_hours: 12,
    accusation_freeform: false,
    external_collusion_recognized: false,
  },
  politics: {
    impeach: { threshold: 0.33, defense_hours: 24 },
    exile: { threshold: 0.5, reputation_cost: 20 },
    execute: { threshold: 0.66, public_notice: true },
    mutiny: { enabled: true },
    regency: { enabled: true },
    usurpation: { enabled: true },
    auto_punishment: false,
  },
  war: {
    muster_notice_turns: 1,
    confirm_window_hours: 12,
    grace_window_hours: 2,
    command_chain: [...CHAIN],
    fallback_behavior: "execute_preset_then_defend",
    fallback_scope_lord: "troops_only",
    absence_death_risk_kept: true,
    absence_to_reputation: true,
    handover_on_return: "next_phase",
  },
  eco: {
    action_points_per_turn: 3,
    resource_cap: 10000,
    diminishing_returns: true,
    search_discovers: ["已有在野角色", "物品", "情报"],
    offline_preset: true,
    idle_decay: 0,
  },
  endgame: {
    unify: {
      capital_required: true,
      control_ratio: 0.6,
      major_powers: "subdued_or_vassal",
      stable_turns: 4,
    },
    consolidation_turns: 4,
    on_unify: "memorial_then_shutdown",
    season_deadline_days: null,
    official_interference: false,
  },
  mod: {
    anti_multiaccount: true,
    behavior_audit: true,
    replay_available: true,
    punishment_scope: ["作弊", "骚扰"],
  },
  data: {
    event_log: "complete_append_only",
    anonymization: "role_indexed_hash",
    export_format: ["json", "csv"],
    export_license: "CC-BY-4.0",
  },
  rules: {
    amendment_via_ingame_politics: false,
  },
  climate: {
    enabled: true,
    snow_march_loss: 0.08,
    winter_march_loss: 0.04,
    rain_ford_loss: 0.05,
    flood_ford_loss: 0.08,
    drought_farm_factor: 0.75,
    winter_farm_factor: 0.9,
    fair_farm_bonus: 0.06,
    disasters_enabled: true,
    disaster_permille: 35,
    disaster_grain_loss: 0.08,
    disaster_troop_loss: 0.04,
  },
  relief: {
    enabled: true,
    dike_max: 3,
    dike_grain_cut: 0.2,
    dike_ford_cut: 0.2,
    dike_decay_turns: 3,
    granary_cap: 600,
    granary_deposit: 120,
    granary_spoil: 0.03,
    clinic_max: 3,
    clinic_plague_cut: 0.2,
    plague_turns: 2,
    linger_ratio: 0.5,
    relief_grain: 100,
    relief_morale: 4,
    relief_reputation: 2,
    road_cut: 0.4,
    road_decay_turns: 3,
    canal_max: 2,
    canal_drought_ease: 0.08,
  },
  deeds: {
    reward_gold: 80,
    reward_morale: 3,
    duel_gap: 8,
    fire_loss: 0.08,
    discord_reputation: 4,
    rumor_morale: 6,
    refugee_morale: 36,
    refugee_ratio: 0.03,
    bounty_merit: 2,
    betray_reputation: 10,
  },
  allegiance: {
    submit_threshold: 2 / 3,
    submit_cooldown: 3,
    vote_named: true,
  },
};

export interface ProfileInfo {
  id: string;
  title: string;
  question: string;
  blurb: string;
  patch: unknown;
}

export const DEFAULT_PROFILE = "river_board";

export const PROFILES: ProfileInfo[] = [
  {
    id: "river_board",
    title: "山河试玩",
    question: "山河摆在面前时，路还走得通吗？",
    blurb: "十二座城按三国城址的相对位置摆。成都不连许昌。一条路是一回合，秦岭和三峡也只算一格。八分钟一回合，两位在席者都锁定后提前结算。不是以日计的经典对照。",
    patch: {
      world: {
        city_count: 12,
        role_pool_size: 16,
        reserve_roles: 4,
        map_topology: "historic_13zhou",
      },
      turn: {
        duration_hours: 1,
        laboratory_clock: true,
        duration_minutes: 8,
        early_resolve: true,
        early_resolve_min_seated: 2,
      },
      endgame: {
        unify: { stable_turns: 2 },
        consolidation_turns: 2,
      },
    },
  },
  {
    id: "tianxia_classic",
    title: "经典无剧本",
    question: "在最严格的公理组合下，统一是否可能？",
    blurb: "全部默认值。回合以日计。城与路用山河图。这是其他档案的对照组。参照实现的具名历史人物是 20 席，而不是规范草案里的 60。",
    patch: {},
  },
  {
    id: "free_talk_control",
    title: "自由沟通对照",
    question: "自由语言是统一的粘合剂，还是混乱的来源？",
    blurb: "只打开自由发言和私信。弹劾罪状仍然不能手写。",
    patch: { comm: { free_chat: true, private_message: true } },
  },
  {
    id: "high_pressure",
    title: "高压短局",
    question: "缩小规模、加快节奏之后，统一的难度如何移动？",
    blurb: "五座城，六小时一回合。结果不能外推到大规模匿名社会。",
    patch: {
      world: { city_count: 5, role_pool_size: 20, map_topology: "random_abstract" },
      turn: { duration_hours: 6 },
      endgame: { unify: { control_ratio: 0.6 } },
    },
  },
  {
    id: "season_mode",
    title: "赛季变体",
    question: "有外部截止日期时，末段会不会出现冲刺统一？",
    blurb: "六十日无人统一则按版图结算，不假装有人赢得了天下。",
    patch: { endgame: { season_deadline_days: 60 } },
  },
  {
    id: "nomic_lab",
    title: "诺米克实验室",
    question: "社会会如何改写约束自己的参数？",
    blurb: "朝议可以修改本局的若干数值。不改仓库里的代码。产出单独标注，不进入标准对照。",
    patch: { rules: { amendment_via_ingame_politics: true } },
  },
  {
    id: "tabletop_demo",
    title: "教学沙盘",
    question: "规则走得通吗？这张图不是中国地理。",
    blurb: "只有洛阳、许昌、成都、建业，而且成都紧挨许昌。这是简化教学沙盘，用来看指令，不能拿来认山河。默认试玩不进这一局。",
    patch: {
      world: {
        city_count: 4,
        role_pool_size: 16,
        reserve_roles: 4,
        map_topology: "three_kingdoms_pocket",
      },
      turn: {
        duration_hours: 1,
        laboratory_clock: true,
        duration_minutes: 8,
        early_resolve: true,
        early_resolve_min_seated: 2,
      },
      endgame: {
        unify: { stable_turns: 2 },
        consolidation_turns: 2,
      },
    },
  },
];

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function merge(base: unknown, extra: unknown, path: string, errors: string[]): unknown {
  if (extra === undefined) return base;
  if (Array.isArray(base)) {
    if (!Array.isArray(extra)) {
      errors.push(`${path} 必须是列表`);
      return base;
    }
    return extra;
  }
  if (isObj(base)) {
    if (!isObj(extra)) {
      errors.push(`${path} 必须是对象`);
      return base;
    }
    const out: Record<string, unknown> = { ...base };
    for (const key of Object.keys(extra)) {
      if (!(key in base)) {
        errors.push(`${path}.${key} 不是已知配置项`);
        continue;
      }
      out[key] = merge(base[key], extra[key], `${path}.${key}`, errors);
    }
    return out;
  }
  return extra;
}

function fail(errors: string[], message: string) {
  errors.push(message);
}

export function turnDurationMs(config: TianxiaConfig): number {
  if (config.turn.laboratory_clock && config.turn.duration_minutes) {
    return config.turn.duration_minutes * 60 * 1000;
  }
  return config.turn.duration_hours * 3600 * 1000;
}

export function profileById(id: string): ProfileInfo | undefined {
  return PROFILES.find((p) => p.id === id);
}

export function buildConfig(
  profileId: string,
  overrides?: unknown,
  options?: { acknowledgeSeason?: boolean },
): { ok: true; config: TianxiaConfig } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const profile = profileById(profileId);
  if (!profile) {
    return { ok: false, errors: [`未知档案「${profileId}」`] };
  }
  let merged = merge(structuredClone(CLASSIC), profile.patch, "档案", errors);
  if (overrides !== undefined) {
    merged = merge(merged, overrides, "覆盖", errors);
  }
  if (errors.length) return { ok: false, errors };
  const config = merged as TianxiaConfig;
  validate(config, errors, options);
  if (errors.length) return { ok: false, errors };
  return { ok: true, config };
}

function validate(
  c: TianxiaConfig,
  errors: string[],
  options?: { acknowledgeSeason?: boolean },
) {
  const int = (path: string, v: number, min: number, max: number) => {
    if (!Number.isInteger(v) || v < min || v > max) {
      fail(errors, `${path} 必须是 ${min}–${max} 的整数`);
    }
  };
  const num = (path: string, v: number, min: number, max: number) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) {
      fail(errors, `${path} 必须是 ${min}–${max} 的数`);
    }
  };
  const lock = (path: string, v: unknown, expected: unknown) => {
    if (v !== expected) fail(errors, `${path} 是红线，不能改成 ${JSON.stringify(v)}`);
  };

  int("world.city_count", c.world.city_count, 3, 24);
  int("world.role_pool_size", c.world.role_pool_size, 12, 80);
  int("world.reserve_roles", c.world.reserve_roles, 0, 8);
  const topologies: MapTopology[] = [
    "historic_13zhou",
    "three_kingdoms_pocket",
    "random_abstract",
  ];
  if (!topologies.includes(c.world.map_topology)) {
    fail(errors, "world.map_topology 不是已知地图");
  }
  if (c.world.map_topology === "three_kingdoms_pocket" && c.world.city_count !== 4) {
    fail(errors, "三城窄门地图固定为 4 座城");
  }
  if (c.world.map_topology === "historic_13zhou" && (c.world.city_count < 8 || c.world.city_count > 12)) {
    fail(errors, "山河图在参照实现里使用 8–12 座城");
  }
  if (c.world.role_pool_size < 12 + c.world.reserve_roles) {
    fail(errors, "角色池装不下 12 名在职人物加上声明的在野席");
  }

  int("turn.duration_hours", c.turn.duration_hours, 1, 168);
  if (c.turn.war_phase_mode !== "room_tactical" && c.turn.war_phase_mode !== "turn_tactical") {
    fail(errors, "turn.war_phase_mode 非法");
  }
  if (c.turn.laboratory_clock) {
    if (c.turn.duration_minutes == null) fail(errors, "实验室时钟必须声明 duration_minutes");
    else int("turn.duration_minutes", c.turn.duration_minutes, 5, 180);
  } else if (c.turn.duration_minutes != null) {
    fail(errors, "未打开实验室时钟时不能用分钟计时");
  }
  if (typeof c.turn.early_resolve !== "boolean") fail(errors, "turn.early_resolve 必须是布尔值");
  int("turn.early_resolve_min_seated", c.turn.early_resolve_min_seated, 1, 12);

  lock("identity.permadeath", c.identity.permadeath, true);
  if (c.identity.lifespan !== "infinite" && c.identity.lifespan !== "natural_decay") {
    fail(errors, "identity.lifespan 非法");
  }
  lock("identity.death_succession", c.identity.death_succession, "power_transfers");
  lock("identity.new_player_entry", c.identity.new_player_entry, "soldier_or_citizen");
  if (typeof c.identity.promotion_enabled !== "boolean") fail(errors, "identity.promotion_enabled 非法");
  if (!Array.isArray(c.identity.promotion_path) || c.identity.promotion_path.length < 2) {
    fail(errors, "identity.promotion_path 过短");
  }
  lock("identity.citizen_naming", c.identity.citizen_naming, "system_random_3char");
  lock("identity.front_display", c.identity.front_display, "role_name_only");

  const menus: MenuLevel[] = ["minimal", "standard", "rich"];
  if (!menus.includes(c.comm.menu_expressiveness)) fail(errors, "comm.menu_expressiveness 非法");
  int("comm.public_notice_hours", c.comm.public_notice_hours, 0, 72);
  lock("comm.accusation_freeform", c.comm.accusation_freeform, false);
  lock("comm.external_collusion_recognized", c.comm.external_collusion_recognized, false);
  if (c.comm.free_chat === false && c.comm.menu_expressiveness === "minimal") {
    fail(errors, "C1：禁用自由聊天时，菜单粒度至少是 standard");
  }

  num("politics.impeach.threshold", c.politics.impeach.threshold, 0.1, 0.9);
  int("politics.impeach.defense_hours", c.politics.impeach.defense_hours, 0, 72);
  num("politics.exile.threshold", c.politics.exile.threshold, 0.3, 1);
  int("politics.exile.reputation_cost", c.politics.exile.reputation_cost, 0, 100);
  num("politics.execute.threshold", c.politics.execute.threshold, 0.5, 1);
  lock("politics.execute.public_notice", c.politics.execute.public_notice, true);
  lock("politics.auto_punishment", c.politics.auto_punishment, false);

  int("war.muster_notice_turns", c.war.muster_notice_turns, 1, 3);
  int("war.confirm_window_hours", c.war.confirm_window_hours, 1, 48);
  int("war.grace_window_hours", c.war.grace_window_hours, 0, 12);
  if (!Array.isArray(c.war.command_chain) || c.war.command_chain.at(-1) !== "系统托管") {
    fail(errors, "指挥顺位必须以系统托管收尾");
  } else if (c.war.command_chain.some((x) => !CHAIN.includes(x as (typeof CHAIN)[number]))) {
    fail(errors, "C4：指挥顺位里出现了会临场决策的档位");
  }
  if (!FALLBACKS.includes(c.war.fallback_behavior)) {
    fail(errors, "C4：托管行为只能是预设或保守保底，不能临场决策");
  }
  lock("war.fallback_scope_lord", c.war.fallback_scope_lord, "troops_only");
  lock("war.absence_death_risk_kept", c.war.absence_death_risk_kept, true);
  if (c.war.handover_on_return !== "immediate" && c.war.handover_on_return !== "next_phase") {
    fail(errors, "war.handover_on_return 非法");
  }

  int("eco.action_points_per_turn", c.eco.action_points_per_turn, 1, 10);
  if (typeof c.eco.resource_cap !== "number" || c.eco.resource_cap < 1000) {
    fail(errors, "eco.resource_cap 至少为 1000");
  }
  num("eco.idle_decay", c.eco.idle_decay, 0, 0.2);
  if (!Array.isArray(c.eco.search_discovers) || c.eco.search_discovers.length < 1) {
    fail(errors, "eco.search_discovers 不能为空");
  } else {
    for (const item of c.eco.search_discovers) {
      if (!SEARCH.includes(item as (typeof SEARCH)[number])) {
        fail(errors, `C5：搜索不能包含「${item}」。只发现存量，不新增历史人物`);
      }
    }
  }

  num("endgame.unify.control_ratio", c.endgame.unify.control_ratio, 0.5, 0.9);
  if (c.endgame.unify.control_ratio > 0.9) {
    fail(errors, "C7：统一控制比例不得超过 0.9");
  }
  int("endgame.unify.stable_turns", c.endgame.unify.stable_turns, 1, 20);
  int("endgame.consolidation_turns", c.endgame.consolidation_turns, 0, 20);
  if (
    c.endgame.unify.major_powers !== "eliminated" &&
    c.endgame.unify.major_powers !== "subdued_or_vassal"
  ) {
    fail(errors, "endgame.unify.major_powers 非法");
  }
  lock("endgame.on_unify", c.endgame.on_unify, "memorial_then_shutdown");
  lock("endgame.official_interference", c.endgame.official_interference, false);
  if (c.endgame.season_deadline_days != null) {
    int("endgame.season_deadline_days", c.endgame.season_deadline_days, 30, 365);
    if (!options?.acknowledgeSeason) {
      fail(errors, "C3：赛季截止日期必须在开局时被明确确认");
    }
  }

  lock("mod.anti_multiaccount", c.mod.anti_multiaccount, true);
  lock("mod.replay_available", c.mod.replay_available, true);
  const scope = [...c.mod.punishment_scope].sort().join("|");
  if (scope !== "作弊|骚扰") {
    fail(errors, "裁判范围只能是作弊与骚扰，不能把规则内的政治行为算作违规");
  }
  lock("data.event_log", c.data.event_log, "complete_append_only");
  lock("data.anonymization", c.data.anonymization, "role_indexed_hash");
  if (c.data.export_license !== "CC-BY-4.0" && c.data.export_license !== "ODbL-1.0") {
    fail(errors, "data.export_license 非法");
  }
  if (
    !Array.isArray(c.data.export_format) ||
    c.data.export_format.some((f) => !FORMATS.includes(f as (typeof FORMATS)[number]))
  ) {
    fail(errors, "data.export_format 含有未知格式");
  }
  if (typeof c.rules.amendment_via_ingame_politics !== "boolean") {
    fail(errors, "rules.amendment_via_ingame_politics 非法");
  }

  if (!c.climate || typeof c.climate !== "object") {
    fail(errors, "climate 缺失");
    return;
  }
  if (typeof c.climate.enabled !== "boolean") fail(errors, "climate.enabled 必须是布尔值");
  if (typeof c.climate.disasters_enabled !== "boolean") fail(errors, "climate.disasters_enabled 必须是布尔值");
  num("climate.snow_march_loss", c.climate.snow_march_loss, 0, 0.12);
  num("climate.winter_march_loss", c.climate.winter_march_loss, 0, 0.1);
  num("climate.rain_ford_loss", c.climate.rain_ford_loss, 0, 0.12);
  num("climate.flood_ford_loss", c.climate.flood_ford_loss, 0, 0.15);
  num("climate.drought_farm_factor", c.climate.drought_farm_factor, 0.5, 1);
  num("climate.winter_farm_factor", c.climate.winter_farm_factor, 0.7, 1);
  num("climate.fair_farm_bonus", c.climate.fair_farm_bonus, 0, 0.15);
  int("climate.disaster_permille", c.climate.disaster_permille, 0, 80);
  num("climate.disaster_grain_loss", c.climate.disaster_grain_loss, 0.02, 0.15);
  num("climate.disaster_troop_loss", c.climate.disaster_troop_loss, 0, 0.08);
  if (c.climate.snow_march_loss < c.climate.winter_march_loss) {
    fail(errors, "climate.snow_march_loss 不能低于冬日普通行军折损");
  }

  if (!c.relief || typeof c.relief !== "object") {
    fail(errors, "relief 缺失");
    return;
  }
  if (typeof c.relief.enabled !== "boolean") fail(errors, "relief.enabled 必须是布尔值");
  int("relief.dike_max", c.relief.dike_max, 1, 4);
  num("relief.dike_grain_cut", c.relief.dike_grain_cut, 0.1, 0.3);
  num("relief.dike_ford_cut", c.relief.dike_ford_cut, 0.1, 0.3);
  int("relief.dike_decay_turns", c.relief.dike_decay_turns, 2, 6);
  int("relief.granary_cap", c.relief.granary_cap, 200, 2000);
  int("relief.granary_deposit", c.relief.granary_deposit, 50, 300);
  num("relief.granary_spoil", c.relief.granary_spoil, 0.01, 0.1);
  int("relief.clinic_max", c.relief.clinic_max, 1, 4);
  num("relief.clinic_plague_cut", c.relief.clinic_plague_cut, 0.1, 0.3);
  int("relief.plague_turns", c.relief.plague_turns, 1, 4);
  num("relief.linger_ratio", c.relief.linger_ratio, 0.2, 0.8);
  int("relief.relief_grain", c.relief.relief_grain, 50, 200);
  int("relief.relief_morale", c.relief.relief_morale, 2, 10);
  int("relief.relief_reputation", c.relief.relief_reputation, 1, 5);
  num("relief.road_cut", c.relief.road_cut, 0.2, 0.6);
  int("relief.road_decay_turns", c.relief.road_decay_turns, 2, 6);
  int("relief.canal_max", c.relief.canal_max, 1, 3);
  num("relief.canal_drought_ease", c.relief.canal_drought_ease, 0.05, 0.15);
  if (c.relief.dike_max * c.relief.dike_grain_cut >= 1) {
    fail(errors, "堤防叠满也不能把涝灾减粮免成零");
  }
  if (c.relief.clinic_max * c.relief.clinic_plague_cut >= 1) {
    fail(errors, "医营叠满也不能把瘟疫减兵免成零");
  }

  if (!c.deeds || typeof c.deeds !== "object") {
    fail(errors, "deeds 缺失");
    return;
  }
  int("deeds.reward_gold", c.deeds.reward_gold, 40, 200);
  int("deeds.reward_morale", c.deeds.reward_morale, 1, 6);
  int("deeds.duel_gap", c.deeds.duel_gap, 6, 20);
  num("deeds.fire_loss", c.deeds.fire_loss, 0.04, 0.12);
  int("deeds.discord_reputation", c.deeds.discord_reputation, 2, 8);
  int("deeds.rumor_morale", c.deeds.rumor_morale, 2, 10);
  int("deeds.refugee_morale", c.deeds.refugee_morale, 20, 45);
  num("deeds.refugee_ratio", c.deeds.refugee_ratio, 0.02, 0.08);
  int("deeds.bounty_merit", c.deeds.bounty_merit, 1, 3);
  int("deeds.betray_reputation", c.deeds.betray_reputation, 5, 20);

  if (!c.allegiance || typeof c.allegiance !== "object") {
    fail(errors, "allegiance 缺失");
    return;
  }
  num("allegiance.submit_threshold", c.allegiance.submit_threshold, 0.5, 0.9);
  int("allegiance.submit_cooldown", c.allegiance.submit_cooldown, 1, 8);
  if (typeof c.allegiance.vote_named !== "boolean") {
    fail(errors, "allegiance.vote_named 必须是布尔");
  }
}

export const AMENDABLE: {
  key: string;
  label: string;
  min: number;
  max: number;
  integer: boolean;
}[] = [
  { key: "politics.impeach.threshold", label: "弹劾门槛", min: 0.1, max: 0.9, integer: false },
  { key: "politics.exile.threshold", label: "流放门槛", min: 0.3, max: 1, integer: false },
  { key: "politics.execute.threshold", label: "处决门槛", min: 0.5, max: 1, integer: false },
  { key: "eco.action_points_per_turn", label: "每回合行动点", min: 1, max: 10, integer: true },
  { key: "endgame.unify.control_ratio", label: "统一控制比例", min: 0.5, max: 0.9, integer: false },
  { key: "endgame.unify.stable_turns", label: "稳定回合", min: 1, max: 20, integer: true },
];

export function readPath(config: TianxiaConfig, path: string): number | undefined {
  const parts = path.split(".");
  let cur: unknown = config;
  for (const p of parts) {
    if (!isObj(cur) || !(p in cur)) return undefined;
    cur = cur[p];
  }
  return typeof cur === "number" ? cur : undefined;
}

export function applyAmendment(
  config: TianxiaConfig,
  key: string,
  value: number,
): { ok: true; config: TianxiaConfig } | { ok: false; error: string } {
  const spec = AMENDABLE.find((a) => a.key === key);
  if (!spec) return { ok: false, error: "这条参数不在可修规的白名单里" };
  if (typeof value !== "number" || !Number.isFinite(value) || value < spec.min || value > spec.max) {
    return { ok: false, error: `${spec.label} 超出允许范围` };
  }
  const nextValue = spec.integer ? Math.round(value) : Math.round(value * 100) / 100;
  const next = structuredClone(config);
  const parts = key.split(".");
  let cur: Record<string, unknown> = next as unknown as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur[parts[i]!] as Record<string, unknown>;
  }
  cur[parts.at(-1)!] = nextValue;
  const errors: string[] = [];
  validate(next, errors, { acknowledgeSeason: true });
  if (errors.length) return { ok: false, error: errors[0]! };
  return { ok: true, config: next };
}
