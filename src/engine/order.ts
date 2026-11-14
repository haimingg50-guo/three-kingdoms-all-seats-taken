import { AMENDABLE } from "./config";
import { roleById } from "./assess";
import { FORGE, SHOP, isGearKind } from "./gear";
import type { DomesticKind, MotionType, Order, Role, VoteChoice, WorldState } from "./types";

export const CHARGES = [
  { id: "neglect", label: "玩忽职守" },
  { id: "private_army", label: "拥兵自重" },
  { id: "collusion", label: "交通敌国" },
  { id: "cruelty", label: "残害同僚" },
  { id: "absence", label: "长期缺席" },
] as const;

const DOMESTIC: DomesticKind[] = [
  "develop",
  "farm",
  "recruit",
  "drill_prowess",
  "drill_command",
  "search",
  "transport",
  "enlist",
  "open_gates",
  "hold_line",
  "raise_dike",
  "store_grain",
  "raise_clinic",
  "relieve",
  "watch_sky",
  "mend_road",
  "dig_canal",
  "reward",
  "swear",
  "break_bond",
  "scheme",
  "release",
  "buy",
  "learn",
  "forge",
  "tame",
  "equip",
  "unequip",
  "donate",
  "draw",
];

const MOTIONS: MotionType[] = [
  "impeach",
  "exile",
  "execute",
  "recommend",
  "mutiny",
  "abdicate",
  "regency",
  "amend",
];

export function blankOrder(): Order {
  return { votes: [], domestic: [] };
}

function cleanText(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.replace(/[<>\u0000-\u001f]/g, "").trim();
  if (!text || text.length > max) return null;
  return text;
}

function isOfficer(role: Role): boolean {
  return role.office === "lord" || role.office === "general" || role.office === "advisor";
}

export function chargeLabel(id: string | undefined): string {
  return CHARGES.find((c) => c.id === id)?.label ?? "未列罪名";
}

export function parseOrder(
  raw: unknown,
  state: WorldState,
  roleId: string,
): { ok: true; order: Order } | { ok: false; error: string } {
  const role = roleById(state, roleId);
  if (!role || !role.alive) return { ok: false, error: "这个人物已经不在局里" };
  if (state.status === "memorial" || state.status === "settled") {
    return { ok: false, error: "这一局已经结束，不再接受指令" };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "指令格式无法识读" };
  }
  const src = raw as Record<string, unknown>;
  if (role.captiveOf) {
    const diplomacyType = src.diplomacy && typeof src.diplomacy === "object" ? (src.diplomacy as { type?: string }).type : undefined;
    const blocked =
      src.domestic !== undefined ||
      src.war !== undefined ||
      src.motion !== undefined ||
      (src.diplomacy !== undefined && diplomacyType !== "respond" && diplomacyType !== "surrender" && diplomacyType !== "ballot");
    if (blocked) return { ok: false, error: "被俘期间只能回复劝降、自己提出投降，或参加本势力的臣服表决" };
  }
  const menu = state.config.comm.menu_expressiveness;
  const order: Order = { votes: [], domestic: [] };

  if (src.votes !== undefined) {
    if (!Array.isArray(src.votes) || src.votes.length > 12) {
      return { ok: false, error: "表决太多或格式不对" };
    }
    for (const vote of src.votes) {
      if (!vote || typeof vote !== "object") return { ok: false, error: "表决格式不对" };
      const v = vote as Record<string, unknown>;
      const choice = v.choice;
      if (choice !== "aye" && choice !== "nay" && choice !== "silent") {
        return { ok: false, error: "表决只能是附议、反对或沉默" };
      }
      if (choice === "silent" && menu === "minimal") {
        return { ok: false, error: "当前菜单粒度不允许沉默" };
      }
      if (typeof v.motionId !== "string" || v.motionId.length > 40) {
        return { ok: false, error: "找不到这桩案子" };
      }
      const motion = state.motions.find((m) => m.id === v.motionId);
      if (!motion || motion.status !== "voting") {
        return { ok: false, error: "这桩案子现在不在表决" };
      }
      order.votes.push({ motionId: v.motionId, choice: choice as VoteChoice });
    }
  }

  if (src.plea !== undefined) {
    if (menu === "minimal") return { ok: false, error: "当前菜单粒度没有申辩" };
    if (!src.plea || typeof src.plea !== "object") return { ok: false, error: "申辩格式不对" };
    const plea = src.plea as Record<string, unknown>;
    if (plea.plea !== "admit" && plea.plea !== "deny" && plea.plea !== "silent") {
      return { ok: false, error: "申辩只能从给定条目里选" };
    }
    if (typeof plea.motionId !== "string") return { ok: false, error: "申辩没有对应的案子" };
    const motion = state.motions.find((m) => m.id === plea.motionId);
    if (!motion || motion.status !== "defense" || motion.targetRoleId !== role.id) {
      return { ok: false, error: "现在轮不到你申辩" };
    }
    order.plea = { motionId: plea.motionId, plea: plea.plea };
  }

  if (src.motion !== undefined) {
    if (!src.motion || typeof src.motion !== "object") return { ok: false, error: "动议格式不对" };
    const motion = src.motion as Record<string, unknown>;
    if (typeof motion.type !== "string" || !MOTIONS.includes(motion.type as MotionType)) {
      return { ok: false, error: "没有这种动议" };
    }
    const type = motion.type as MotionType;
    const targetRoleId = typeof motion.targetRoleId === "string" ? motion.targetRoleId : undefined;
    const draft: NonNullable<Order["motion"]> = { type, targetRoleId };
    if (type === "impeach" || type === "exile" || type === "execute") {
      if (!isOfficer(role)) return { ok: false, error: "只有在职人物能发起处置" };
      if (type === "execute" && role.office !== "lord") return { ok: false, error: "处决只能由君主提出" };
      if ((type === "exile" || type === "impeach") && role.office === "advisor" && type === "exile") {
        // advisors may impeach; exile stays with lord and generals
      }
      if (type === "exile" && role.office === "advisor") {
        return { ok: false, error: "流放由君主或武将提出" };
      }
      if (typeof motion.charge !== "string" || !CHARGES.some((c) => c.id === motion.charge)) {
        return { ok: false, error: "罪状只能从固定条目里选，不能手写" };
      }
      draft.charge = motion.charge;
      if (!targetRoleId || targetRoleId === role.id) return { ok: false, error: "要指明另一个人" };
      const target = roleById(state, targetRoleId);
      if (!target?.alive || target.factionId !== role.factionId) {
        return { ok: false, error: "处置对象必须是本阵营仍在世的人" };
      }
    }
    if (type === "recommend") {
      if (role.office !== "lord" && role.office !== "advisor") {
        return { ok: false, error: "举荐由君主或谋臣提出" };
      }
      const target = roleById(state, targetRoleId);
      if (!target?.alive) return { ok: false, error: "举荐对象不在" };
    }
    if (type === "mutiny") {
      if (!state.config.politics.mutiny.enabled || !state.config.politics.usurpation.enabled) {
        return { ok: false, error: "本局没有打开兵变" };
      }
      if (role.office !== "general" && role.office !== "advisor") {
        return { ok: false, error: "兵变由武将或谋臣联署" };
      }
      const target = roleById(state, targetRoleId);
      if (!target || target.office !== "lord" || target.factionId !== role.factionId) {
        return { ok: false, error: "兵变要指向本阵营的君主" };
      }
    }
    if (type === "abdicate" || type === "regency") {
      if (role.office !== "lord") return { ok: false, error: "只有君主能让位或指定摄政" };
      if (type === "regency" && !state.config.politics.regency.enabled) {
        return { ok: false, error: "本局没有打开摄政" };
      }
      if (type === "abdicate" && !state.config.politics.usurpation.enabled) {
        return { ok: false, error: "本局没有打开让位" };
      }
      const target = roleById(state, targetRoleId);
      if (!target?.alive || target.factionId !== role.factionId || !isOfficer(target) || target.id === role.id) {
        return { ok: false, error: "要指定本阵营的另一位在职人物" };
      }
    }
    if (type === "amend") {
      if (!state.config.rules.amendment_via_ingame_politics) {
        return { ok: false, error: "这一局不能改参数" };
      }
      if (menu !== "rich") return { ok: false, error: "修规需要 rich 菜单" };
      if (!isOfficer(role)) return { ok: false, error: "修规由在职人物提出" };
      if (typeof motion.amendKey !== "string" || !AMENDABLE.some((a) => a.key === motion.amendKey)) {
        return { ok: false, error: "这条参数不在白名单里" };
      }
      if (typeof motion.amendValue !== "number") return { ok: false, error: "新数值必须是数字" };
      draft.amendKey = motion.amendKey;
      draft.amendValue = motion.amendValue;
    }
    order.motion = draft;
  }

  if (src.domestic !== undefined) {
    if (!Array.isArray(src.domestic)) return { ok: false, error: "内政指令格式不对" };
    if (src.domestic.length > state.config.eco.action_points_per_turn) {
      return { ok: false, error: `本回合只有 ${state.config.eco.action_points_per_turn} 点行动` };
    }
    for (const item of src.domestic) {
      if (!item || typeof item !== "object") return { ok: false, error: "内政指令格式不对" };
      const action = item as Record<string, unknown>;
      if (typeof action.kind !== "string" || !DOMESTIC.includes(action.kind as DomesticKind)) {
        return { ok: false, error: "没有这种内政行动" };
      }
      const kind = action.kind as DomesticKind;
      if ((kind === "recruit" || kind === "develop") && !isOfficer(role)) {
        return { ok: false, error: "征兵和开发由在职人物执行" };
      }
      if (kind === "enlist" && role.kind !== "citizen") return { ok: false, error: "只有市民能从军" };
      if (kind === "open_gates" && role.kind !== "citizen") return { ok: false, error: "开门献城是市民的集体行动" };
      if (kind === "transport" || kind === "mend_road") {
        if (typeof action.destCityId !== "string") return { ok: false, error: kind === "mend_road" ? "修路要指明邻城" : "运输要指明邻城" };
        const here = state.cities.find((c) => c.id === role.cityId);
        if (!here?.links.includes(action.destCityId)) return { ok: false, error: "只能通往相连的城" };
      }
      if (kind === "relieve") {
        if (typeof action.destCityId !== "string" || !state.cities.some((c) => c.id === action.destCityId)) {
          return { ok: false, error: "赈济要指明一座城" };
        }
      }
      if ((kind === "swear" || kind === "break_bond" || kind === "release") && typeof action.targetRoleId !== "string") {
        return { ok: false, error: "要指明另一个人" };
      }
      if (isGearKind(kind)) {
        const pattern = typeof action.pattern === "string" ? action.pattern : undefined;
        const itemId = typeof action.itemId === "string" ? action.itemId : undefined;
        if ((kind === "buy" && (!pattern || !SHOP[pattern])) || ((kind === "learn" || kind === "forge") && (!pattern || !FORGE[pattern]))) {
          return { ok: false, error: "没有这种形制" };
        }
        if (kind === "unequip" && pattern !== "weapon" && pattern !== "armor" && pattern !== "mount") {
          return { ok: false, error: "没有这种形制" };
        }
        if ((kind === "equip" || kind === "donate") && (!itemId || itemId.length > 40)) {
          return { ok: false, error: "要指明一件器物" };
        }
        let label: string | undefined;
        if (action.label !== undefined && action.label !== "") {
          label = cleanText(action.label, 8) ?? undefined;
          if (!label) return { ok: false, error: "器物名字太长或不能用" };
        }
        order.domestic.push({
          kind,
          pattern,
          itemId,
          label,
        });
        continue;
      }
      if (kind === "scheme") {
        if (action.scheme !== "discord" && action.scheme !== "fire" && action.scheme !== "rumor") {
          return { ok: false, error: "计略只能是离间、火攻或伪报" };
        }
        if (action.scheme === "discord" && typeof action.targetRoleId !== "string") {
          return { ok: false, error: "离间要指明一个人" };
        }
        if (action.scheme === "rumor" && (typeof action.destCityId !== "string" || !state.cities.some((c) => c.id === action.destCityId))) {
          return { ok: false, error: "伪报要指明一座城" };
        }
      }
      order.domestic.push({
        kind,
        destCityId: typeof action.destCityId === "string" ? action.destCityId : undefined,
        targetRoleId: typeof action.targetRoleId === "string" ? action.targetRoleId : undefined,
        scheme: action.scheme === "discord" || action.scheme === "fire" || action.scheme === "rumor" ? action.scheme : undefined,
      });
    }
  }

  if (src.diplomacy !== undefined) {
    if (!src.diplomacy || typeof src.diplomacy !== "object") return { ok: false, error: "外交格式不对" };
    const d = src.diplomacy as Record<string, unknown>;
    const type = d.type;
    if (
      type !== "alliance" && type !== "truce" && type !== "vassal" && type !== "defect" &&
      type !== "break" && type !== "cede" && type !== "respond" &&
      type !== "submit" && type !== "surrender" && type !== "seek" && type !== "serve" &&
      type !== "retire" && type !== "renounce" && type !== "ballot"
    ) {
      return { ok: false, error: "没有这种外交行动" };
    }
    if (type !== "respond" && type !== "defect" && type !== "submit" && type !== "surrender" && type !== "seek" && type !== "serve" && type !== "retire" && type !== "renounce" && type !== "ballot" && role.office !== "lord") {
      return { ok: false, error: "结盟、称臣、背盟和割地由君主发出" };
    }
    if (type === "defect" && role.office !== "lord") {
      return { ok: false, error: "劝降由君主发出" };
    }
    if ((type === "submit" || type === "renounce") && role.office !== "lord") {
      return { ok: false, error: "臣服和叛离由君主提出" };
    }
    if (type === "seek" && role.office !== "general" && role.office !== "advisor") {
      return { ok: false, error: "投奔由部将或军师提出" };
    }
    if (type === "retire" && role.office !== "general" && role.office !== "advisor") {
      return { ok: false, error: "下野由部将或军师提出" };
    }
    if (type === "serve" && (role.office !== "wanderer" || !role.discovered || role.factionId)) {
      return { ok: false, error: "出仕只给已经露面、尚未属主的在野人" };
    }
    if (type === "surrender" && role.office !== "lord" && role.office !== "general" && role.office !== "advisor") {
      return { ok: false, error: "投降由在职人物提出" };
    }
    if ((type === "submit" || type === "surrender" || type === "seek" || type === "serve") && typeof d.targetFactionId !== "string") {
      return { ok: false, error: "去向要指明接收的势力" };
    }
    if ((type === "submit" || type === "surrender" || type === "seek" || type === "serve") && d.targetFactionId === role.factionId) {
      return { ok: false, error: "不能把去向选成自己现在的势力" };
    }
    if (type === "ballot") {
      if (!role.seated) return { ok: false, error: "空席不能参加臣服表决" };
      if (typeof d.voteId !== "string" || !d.voteId) return { ok: false, error: "表决要指明是哪一次" };
      if (d.choice !== "aye" && d.choice !== "nay") return { ok: false, error: "表决只能投赞成或反对" };
      if (d.contingent !== undefined && d.contingent !== "retire" && d.contingent !== "seek") {
        return { ok: false, error: "附带去向只能是下野或投奔" };
      }
      if (d.contingent === "seek" && typeof d.targetFactionId !== "string") {
        return { ok: false, error: "附带投奔要指明接收的势力" };
      }
      if (d.contingent === "retire" && role.office !== "general" && role.office !== "advisor") {
        return { ok: false, error: "附带下野只给部将或军师" };
      }
    }
    const diplomacy: NonNullable<Order["diplomacy"]> = {
      type,
      targetFactionId: typeof d.targetFactionId === "string" ? d.targetFactionId : undefined,
      targetRoleId: typeof d.targetRoleId === "string" ? d.targetRoleId : undefined,
      cityId: typeof d.cityId === "string" ? d.cityId : undefined,
      offerId: typeof d.offerId === "string" ? d.offerId : undefined,
      voteId: typeof d.voteId === "string" ? d.voteId : undefined,
      choice: d.choice === "aye" || d.choice === "nay" ? d.choice : undefined,
      contingent: d.contingent === "retire" || d.contingent === "seek" ? d.contingent : undefined,
    };
    if (type === "respond") {
      const response = d.response;
      if (response !== "accept" && response !== "conditional" && response !== "reject" && response !== "delay" && response !== "silent") {
        return { ok: false, error: "回复只能从菜单里选" };
      }
      if ((response === "silent" || response === "delay") && menu === "minimal") {
        return { ok: false, error: "当前菜单粒度只有同意或拒绝" };
      }
      if (response === "conditional" && menu !== "rich") {
        return { ok: false, error: "附条件同意需要 rich 菜单" };
      }
      if (!state.config.comm.contract_system && response === "conditional") {
        return { ok: false, error: "本局没有契约，不能附条件" };
      }
      diplomacy.response = response;
      if (response === "conditional") {
        if (d.condition !== "cede_city" && d.condition !== "military_aid" && d.condition !== "truce_3") {
          return { ok: false, error: "条件只能从给定条目里选" };
        }
        diplomacy.condition = d.condition;
      }
    }
    order.diplomacy = diplomacy;
  }

  if (src.war !== undefined) {
    if (!src.war || typeof src.war !== "object") return { ok: false, error: "军令格式不对" };
    const w = src.war as Record<string, unknown>;
    const type = w.type;
    if (type !== "march" && type !== "hold" && type !== "confirm" && type !== "delegate" && type !== "leave" && type !== "refuse" && type !== "duel") {
      return { ok: false, error: "没有这种军令" };
    }
    if (type === "march" && role.office !== "lord") return { ok: false, error: "出征由君主下令" };
    if (type === "duel" && role.office !== "lord" && role.office !== "general" && role.office !== "advisor") {
      return { ok: false, error: "单挑由在职人物提出" };
    }
    if (type === "delegate" && menu === "minimal") return { ok: false, error: "当前菜单没有委托" };
    const war: NonNullable<Order["war"]> = { type };
    if (typeof w.targetCityId === "string") war.targetCityId = w.targetCityId;
    if (typeof w.commanderRoleId === "string") war.commanderRoleId = w.commanderRoleId;
    if (w.portion === "half" || w.portion === "most") war.portion = w.portion;
    if (w.personal === true) war.personal = true;
    if (w.preset === "defend" || w.preset === "retreat") {
      if (!state.config.eco.offline_preset) return { ok: false, error: "本局不能预留离线军令" };
      war.preset = w.preset;
    }
    if (type === "march") {
      if (!war.targetCityId) return { ok: false, error: "出征要指明目标城" };
      const origin = role.cityId ? state.cities.find((c) => c.id === role.cityId) : undefined;
      if (!origin || origin.controllerId !== role.factionId) {
        return { ok: false, error: "君主必须身在自己控制的城里才能发兵" };
      }
      if (!origin.links.includes(war.targetCityId)) return { ok: false, error: "只能进攻相连的城" };
      if (war.targetCityId === origin.id) return { ok: false, error: "不能向自己的城出征" };
    }
    order.war = war;
  }

  if (src.remark !== undefined && src.remark !== "") {
    if (!state.config.comm.free_chat) return { ok: false, error: "这一局没有自由发言" };
    const text = cleanText(src.remark, 280);
    if (!text) return { ok: false, error: "发言不能为空，也不能超过 280 字" };
    order.remark = text;
  }
  if (src.letter !== undefined) {
    if (!state.config.comm.private_message) return { ok: false, error: "这一局没有私信" };
    if (!src.letter || typeof src.letter !== "object") return { ok: false, error: "私信格式不对" };
    const letter = src.letter as Record<string, unknown>;
    const text = cleanText(letter.text, 280);
    if (!text || typeof letter.toRoleId !== "string") return { ok: false, error: "私信需要收信人和不超过 280 字的正文" };
    if (!roleById(state, letter.toRoleId)?.alive) return { ok: false, error: "收信人不在" };
    order.letter = { toRoleId: letter.toRoleId, text };
  }

  return { ok: true, order };
}
