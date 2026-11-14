import { CHRONICLE, PHRASE } from "./chronicle";
import { translateKnown } from "./errors";
import {
  ACTIONS,
  ALLEGIANCE,
  BOUNTIES,
  CHARGES,
  CHOICES,
  CITIES,
  CONDITIONS,
  DIPLOMACY,
  DISASTERS,
  FACTIONS,
  GEAR,
  FARM_NOTES,
  MODES,
  OFFICES,
  PEOPLE,
  PLEAS,
  PROFILES,
  RANKS,
  REASONS,
  REGIONS,
  SEASONS,
  WEATHERS,
  WORLD_NAMES,
  type NameRow,
} from "./glossary";
import type { Locale } from "./locale";

export interface ChronicleLike {
  key?: string;
  params?: Record<string, string>;
  text?: string;
}

const TABLES: Record<string, Record<string, NameRow>> = {
  r: PEOPLE,
  c: CITIES,
  f: FACTIONS,
  o: OFFICES,
  s: SEASONS,
  w: WEATHERS,
  z: DISASTERS,
  m: MODES,
  k: ALLEGIANCE,
  v: CHOICES,
  n: FARM_NOTES,
  g: CHARGES,
  a: ACTIONS,
  q: DIPLOMACY,
  u: RANKS,
  b: BOUNTIES,
  e: REASONS,
  l: PLEAS,
  h: REGIONS,
  i: GEAR,
};

function lookup(table: Record<string, NameRow> | undefined, id: string, locale: Locale): string | undefined {
  return table?.[id]?.[locale];
}

function person(id: string, slot: string, params: Record<string, string>, locale: Locale): string {
  if ((slot === "actor" || slot === "label") && params.anon === "1") return PHRASE.anon[locale];
  const known = PEOPLE[id]?.[locale];
  if (known) return known;
  if (params[`${slot}Name`]) return params[`${slot}Name`];
  if (slot === "found" && params.foundName) return params.foundName;
  return id || PHRASE.someone[locale];
}

function slot(kind: string | undefined, key: string, raw: string, params: Record<string, string>, locale: Locale): string {
  if (!kind) return key === "name" ? (WORLD_NAMES[raw]?.[locale] ?? raw) : raw;
  if (kind === "r") return person(raw, key, params, locale);
  if (kind === "p") return PROFILES[raw]?.title[locale] ?? raw;
  if (kind === "x") return translateKnown(raw, locale);
  if (kind === "d") {
    if (raw === "garrison" || !raw) return PHRASE.garrison[locale];
    if (raw.startsWith("passive:")) {
      const id = raw.slice("passive:".length);
      return fill(PHRASE.passive[locale], { ...params, actor: id }, locale);
    }
    return person(raw, "defender", params, locale);
  }
  return lookup(TABLES[kind], raw, locale) ?? raw;
}

export function fill(template: string, params: Record<string, string>, locale: Locale): string {
  return template.replace(/\{([A-Za-z0-9]+)(?:\|([a-z]))?\}/g, (_, key: string, kind: string | undefined) => {
    const raw = params[key] ?? "";
    return slot(kind, key, raw, params, locale);
  });
}

function trail(params: Record<string, string>, locale: Locale): string {
  if (!params.loss || params.loss === "0") return "";
  const phrase = params.ford === "1" ? PHRASE.trailFord[locale] : PHRASE.trail[locale];
  return fill(phrase, params, locale);
}

function who(params: Record<string, string>, locale: Locale): string {
  if (!params.defender || params.defender === "garrison") return PHRASE.garrison[locale];
  if (params.defenderMode === "passive") return fill(PHRASE.passive[locale], { ...params, actor: params.defender }, locale);
  return person(params.defender, "defender", params, locale);
}

function disasterSentence(params: Record<string, string>, locale: Locale): string {
  const loss = params.disaster === "瘟疫"
    ? fill(PHRASE.lossTroops[locale], params, locale)
    : fill(PHRASE.lossGrain[locale], params, locale);
  const bits = [
    Number(params.dike ?? "0") > 0 ? fill(PHRASE.savedDike[locale], params, locale) : "",
    Number(params.granary ?? "0") > 0 ? fill(PHRASE.savedGranary[locale], params, locale) : "",
    Number(params.clinic ?? "0") > 0 ? fill(PHRASE.savedClinic[locale], params, locale) : "",
  ].filter(Boolean);
  const saved = bits.length ? `。${bits.join(PHRASE.join[locale])}` : "";
  return fill(PHRASE.disaster[locale], { ...params, loss, saved }, locale);
}

function lingerSentence(params: Record<string, string>, locale: Locale): string {
  const clinic = Number(params.clinic ?? "0") > 0 ? fill(PHRASE.lingerClinic[locale], params, locale) : "";
  return fill(PHRASE.linger[locale], { ...params, clinic }, locale);
}

function decaySentence(params: Record<string, string>, locale: Locale): string {
  const notes = (params.notes ?? "")
    .split("|")
    .filter(Boolean)
    .map((part) => {
      const [kind, city, n] = part.split(":");
      const phrase = kind === "canal" ? PHRASE.decayCanal[locale] : PHRASE.decayDike[locale];
      return fill(phrase, { city: city ?? "", n: n ?? "" }, locale);
    });
  const spoiled = Number(params.spoiled ?? "0") > 0 ? fill(PHRASE.decayGranary[locale], params, locale) : "";
  if (notes.length && spoiled) return `${notes.join(PHRASE.join[locale])}。${spoiled}。`;
  if (notes.length) return `${notes.join(PHRASE.join[locale])}。`;
  return `${spoiled}。`;
}

function tally(params: Record<string, string>, locale: Locale): string {
  return (params.counts ?? "")
    .split("|")
    .filter(Boolean)
    .map((part) => {
      const [id, n] = part.split(":");
      return fill(PHRASE.tallyCity[locale], { faction: id ?? "", n: n ?? "0" }, locale);
    })
    .join(PHRASE.join[locale]);
}

function contractLine(params: Record<string, string>, locale: Locale): string {
  const code = params.condition || params.contract || "";
  const phrase = CONDITIONS[code]?.[locale];
  if (!phrase) return code;
  return fill(phrase, params, locale);
}

function prepare(key: string, template: string, params: Record<string, string>, locale: Locale): string {
  if (key === "climate.disaster") return disasterSentence(params, locale);
  if (key === "climate.linger") return lingerSentence(params, locale);
  if (key === "climate.decay") return decaySentence(params, locale);
  let text = template;
  if (text.includes("{trail}")) text = text.replaceAll("{trail}", trail(params, locale));
  if (text.includes("{who}")) text = text.replaceAll("{who}", who(params, locale));
  if (text.includes("{tally}")) text = text.replaceAll("{tally}", tally(params, locale));
  if (text.includes("{contract}")) text = text.replaceAll("{contract}", contractLine(params, locale));
  if (text.includes("{place}")) {
    const place = params.city ? fill(PHRASE.placeCity[locale], params, locale) : "";
    text = text.replaceAll("{place}", place);
  }
  if (text.includes("{cityNote}")) {
    const cityNote = params.gift
      ? fill(PHRASE.giftCity[locale], { ...params, city: params.gift }, locale)
      : params.bare === "surrender"
        ? PHRASE.noGift[locale]
        : PHRASE.noTroops[locale];
    text = text.replaceAll("{cityNote}", cityNote);
  }
  if (text.includes("{signers}")) {
    const names = (params.signers ?? "")
      .split("|")
      .filter(Boolean)
      .map((id) => person(id, "signer", params, locale));
    text = text.replaceAll("{signers}", names.join(PHRASE.nameJoin[locale]));
  }
  if (text.includes("{oldBit}")) {
    const oldBit = params.old ? fill(PHRASE.leftLord[locale], params, locale) : "";
    text = text.replaceAll("{oldBit}", oldBit);
  }
  if (text.includes("{costBit}")) {
    const costBit = params.cost && params.cost !== "0" ? fill(PHRASE.costBit[locale], params, locale) : "";
    text = text.replaceAll("{costBit}", costBit);
  }
  if (text.includes("{homeBit}")) {
    const homeBit = params.home ? fill(PHRASE.homeBit[locale], params, locale) : "";
    text = text.replaceAll("{homeBit}", homeBit);
  }
  if (text.includes("{moraleBit}")) {
    const moraleBit = params.home ? fill(PHRASE.moraleBit[locale], params, locale) : "";
    text = text.replaceAll("{moraleBit}", moraleBit);
  }
  if (text.includes("{trustBit}")) {
    const trustBit = params.trust ? fill(PHRASE.trust[locale], params, locale) : "";
    text = text.replaceAll("{trustBit}", trustBit);
  }
  if (text.includes("{noteBit}")) {
    const noteBit = params.note ? `${fill("{note|n}", params, locale)}。` : "";
    text = text.replaceAll("{noteBit}", noteBit);
  }
  if (text.includes("{plagueBit}")) {
    const plagueBit = params.plague ? fill(PHRASE.plagueLeft[locale], params, locale) : "";
    text = text.replaceAll("{plagueBit}", plagueBit);
  }
  if (text.includes("{skyBit}")) {
    const skyBit = params.disaster ? fill(PHRASE.skyDisaster[locale], params, locale) : "";
    text = text.replaceAll("{skyBit}", skyBit);
  }
  return fill(text, params, locale);
}

export function renderEntry(entry: ChronicleLike, locale: Locale): string {
  if (!entry.key) return entry.text ?? "";
  const row = CHRONICLE[entry.key];
  if (!row) return entry.text || entry.key;
  return prepare(entry.key, row[locale], entry.params ?? {}, locale);
}

export function chronicleBlob(entries: ChronicleLike[], locale: Locale = "zh"): string {
  return entries.map((entry) => renderEntry(entry, locale)).join("\n");
}

export function personName(id: string, locale: Locale, fallback = ""): string {
  return PEOPLE[id]?.[locale] ?? (fallback || id);
}

export function cityName(id: string, locale: Locale, fallback = ""): string {
  return CITIES[id]?.[locale] ?? (fallback || id);
}

export function factionName(id: string | null | undefined, locale: Locale, fallback = ""): string {
  if (!id) return fallback;
  return FACTIONS[id]?.[locale] ?? (fallback || id);
}

export function regionName(name: string, locale: Locale): string {
  return REGIONS[name]?.[locale] ?? name;
}

export function officeName(id: string, locale: Locale): string {
  return OFFICES[id]?.[locale] ?? id;
}

export function officeDisplay(
  role: { alive: boolean; office: string; kind: string; discovered?: boolean },
  locale: Locale,
): string {
  if (!role.alive) return officeName("dead", locale);
  if (role.office === "general" && (role.kind === "promoted" || role.kind === "soldier")) return officeName("junior", locale);
  if (role.office === "wanderer" && !role.discovered) return officeName("hidden", locale);
  return officeName(role.office, locale);
}

export function skyLine(sky: { season: string; weather: string; disaster?: string | null }, locale: Locale): string {
  const season = SEASONS[sky.season]?.[locale] ?? sky.season;
  const weather = WEATHERS[sky.weather]?.[locale] ?? sky.weather;
  if (sky.disaster) {
    const disaster = DISASTERS[sky.disaster]?.[locale] ?? sky.disaster;
    return `${season} · ${weather} · ${disaster}`;
  }
  if (sky.weather === "不计") return season;
  return `${season} · ${weather}`;
}

export function worldName(name: string, locale: Locale): string {
  return WORLD_NAMES[name]?.[locale] ?? name;
}

export function profileTitle(id: string, locale: Locale, fallback = ""): string {
  return PROFILES[id]?.title[locale] ?? (fallback || id);
}

export function profileQuestion(id: string, locale: Locale, fallback = ""): string {
  return PROFILES[id]?.question[locale] ?? fallback;
}

export function profileBlurb(id: string, locale: Locale, fallback = ""): string {
  return PROFILES[id]?.blurb[locale] ?? fallback;
}
