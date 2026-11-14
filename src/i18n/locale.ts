export const LOCALES = ["zh", "en", "ja", "ko"] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALE_KEY = "tianxia-locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "zh" || value === "en" || value === "ja" || value === "ko";
}

/** 没有记住的选择时，按浏览器语言。中文一律简体界面。其余落到英文。 */
export function localeFromNavigator(language: string | null | undefined): Locale {
  const tag = (language ?? "").toLowerCase();
  if (tag.startsWith("ja")) return "ja";
  if (tag.startsWith("ko")) return "ko";
  if (tag.startsWith("zh")) return "zh";
  if (!tag) return "zh";
  return "en";
}

export function htmlLang(locale: Locale): string {
  if (locale === "zh") return "zh-CN";
  if (locale === "ja") return "ja";
  if (locale === "ko") return "ko";
  return "en";
}

export function dateLocale(locale: Locale): string {
  if (locale === "zh") return "zh-CN";
  if (locale === "ja") return "ja-JP";
  if (locale === "ko") return "ko-KR";
  return "en-GB";
}
