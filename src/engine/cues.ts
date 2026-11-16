/**
 * 结算后才有的画面线索。提交指令不会产生这些键，因此不能在封存时假装已经获胜。
 * 失败、未找到、未获同意用各自的结局，不借用成功画面。
 * 非法、取消、簿记键保持 null，不能播成完成。
 */
export type CueId =
  | "farm"
  | "recruit"
  | "develop"
  | "build"
  | "transport"
  | "assault"
  | "repulse"
  | "retreat"
  | "relocate"
  | "search"
  | "searchMiss"
  | "gather"
  | "gatherMiss"
  | "drill"
  | "shop"
  | "shopMiss"
  | "study"
  | "studyMiss"
  | "forge"
  | "forgeMiss"
  | "letter"
  | "envoy"
  | "envoyMiss"
  | "court"
  | "courtMiss"
  | "enlist"
  | "enlistMiss"
  | "hold"
  | "tame"
  | "tameMiss";

const CUE_KEYS: Record<string, CueId> = {
  "domestic.farm": "farm",
  "domestic.recruit": "recruit",
  "domestic.develop": "develop",
  "domestic.dike": "build",
  "domestic.clinic": "build",
  "domestic.canal": "build",
  "domestic.road": "build",
  "domestic.granary": "build",
  "domestic.gates": "build",
  "domestic.transport": "transport",
  "domestic.hold": "hold",
  "domestic.drill.prowess": "drill",
  "domestic.drill.command": "drill",
  "domestic.search.found": "search",
  "domestic.intel": "search",
  "domestic.search.grain": "gather",
  "domestic.intel.none": "searchMiss",
  "domestic.enlist": "enlist",
  "domestic.enlist.none": "enlistMiss",
  "war.battle.win": "assault",
  "war.occupy": "assault",
  "war.battle.fail": "repulse",
  "war.retreat": "retreat",
  "war.fallback.retreat": "retreat",
  "war.garrison.retreat": "retreat",
  "war.move": "relocate",
  "gear.buy": "shop",
  "gear.buy.poor": "shopMiss",
  "gear.buy.bad": "shopMiss",
  "gear.learn": "study",
  "gear.learn.poor": "studyMiss",
  "gear.learn.again": "studyMiss",
  "gear.learn.bad": "studyMiss",
  "gear.forge.plain": "forge",
  "gear.forge.first": "forge",
  "gear.forge.short": "forgeMiss",
  "gear.forge.unlearned": "forgeMiss",
  "gear.forge.bad": "forgeMiss",
  "gear.clue.mat": "gather",
  "gear.clue.coin": "gather",
  "gear.clue.full": "gatherMiss",
  "gear.tame": "tame",
  "gear.tame.short": "tameMiss",
  "diplomacy.offer": "letter",
  "allegiance.submit": "letter",
  "diplomacy.alliance": "envoy",
  "diplomacy.truce": "envoy",
  "diplomacy.vassal": "envoy",
  "diplomacy.defect": "envoy",
  "diplomacy.defect.lord": "envoy",
  "diplomacy.condition": "envoy",
  "diplomacy.cede": "envoy",
  "diplomacy.silent": "envoyMiss",
  "diplomacy.delay": "envoyMiss",
  "diplomacy.reject.person": "envoyMiss",
  "diplomacy.reject.faction": "envoyMiss",
  "diplomacy.reject.offer": "envoyMiss",
  "diplomacy.breach": "envoyMiss",
  "court.plea": "court",
  "court.letter": "court",
  "court.recommend": "court",
  "court.regent": "court",
  "court.succeed": "court",
  "court.abdicate": "court",
  "court.regency": "court",
  "court.amend.done": "court",
  "court.recommend.fail": "courtMiss",
  "court.amend.fail": "courtMiss",
  "court.mutiny.fail": "courtMiss",
  "allegiance.accept": "enlist",
  "allegiance.absent": "enlistMiss",
  "allegiance.not_lord": "enlistMiss",
  "allegiance.serve.bound": "enlistMiss",
  "allegiance.changed": "enlistMiss",
};

const WAR = new Set<CueId>(["assault", "repulse", "retreat", "relocate"]);

/** 同一画面只留一条。一轮最多六段，战事优先留下，避免几十次弹窗堵住下令。 */
export const REEL_CAP = 6;

export function cueForKey(key: string | undefined): CueId | null {
  if (!key) return null;
  return CUE_KEYS[key] ?? null;
}

export function cuesFromEntries<T extends { key?: string }>(entries: T[]): { id: CueId; entry: T }[] {
  const cues: { id: CueId; entry: T }[] = [];
  for (const entry of entries) {
    const id = cueForKey(entry.key);
    if (id) cues.push({ id, entry });
  }
  return cues;
}

export function presentCues<T extends { key?: string }>(entries: T[]): { id: CueId; entry: T }[] {
  const seen = new Set<CueId>();
  const unique: { id: CueId; entry: T }[] = [];
  for (const cue of cuesFromEntries(entries)) {
    if (seen.has(cue.id)) continue;
    seen.add(cue.id);
    unique.push(cue);
  }
  if (unique.length <= REEL_CAP) return unique;
  const keep = new Set<CueId>();
  for (const cue of unique) {
    if (WAR.has(cue.id) && keep.size < REEL_CAP) keep.add(cue.id);
  }
  for (const cue of unique) {
    if (keep.size >= REEL_CAP) break;
    keep.add(cue.id);
  }
  return unique.filter((cue) => keep.has(cue.id));
}
