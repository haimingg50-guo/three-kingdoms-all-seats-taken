"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DISASTERS } from "./glossary";
import { htmlLang, isLocale, LOCALE_KEY, localeFromNavigator, type Locale } from "./locale";
import { translateKnown } from "./errors";
import { translate } from "./messages";

function applyDocument(locale: Locale) {
  document.title = translate(locale, "brand.name");
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", translate(locale, "brand.description"));
}

interface LocaleValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleValue | null>(null);

function applyLocale(locale: Locale) {
  document.documentElement.lang = htmlLang(locale);
  document.documentElement.dataset.locale = locale;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");

  useEffect(() => {
    const saved = window.localStorage.getItem(LOCALE_KEY);
    const next = isLocale(saved) ? saved : localeFromNavigator(window.navigator.language);
    setLocaleState(next);
    applyLocale(next);
    applyDocument(next);
    const late = window.setTimeout(() => {
      const current = window.localStorage.getItem(LOCALE_KEY);
      applyDocument(isLocale(current) ? current : next);
    }, 400);
    return () => window.clearTimeout(late);
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(LOCALE_KEY, next);
    applyLocale(next);
    applyDocument(next);
  };

  const value = useMemo<LocaleValue>(() => ({
    locale,
    setLocale,
    t: (key, vars) => translate(locale, key, vars),
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("locale");
  return value;
}

export function skyHint(
  sky: { season: string; weather: string; disaster?: string | null },
  t: LocaleValue["t"],
  locale: Locale,
): string {
  if (sky.weather === "不计") return t("sky.off");
  const parts: string[] = [];
  if (sky.season === "冬") parts.push(t(sky.weather === "雪" ? "sky.winter.snow" : "sky.winter"));
  else if (sky.weather === "晴") parts.push(t("sky.fair"));
  else if (sky.weather === "雨") parts.push(t("sky.rain"));
  else if (sky.weather === "旱") parts.push(t("sky.drought"));
  else parts.push(t("sky.fog"));
  if (sky.disaster === "瘟疫") parts.push(t("sky.plague"));
  else if (sky.disaster === "涝") parts.push(t("sky.flood"));
  else if (sky.disaster) parts.push(t("sky.grain", { name: disasterWord(sky.disaster, locale) }));
  return parts.join("");
}

export function disasterWord(id: string | null | undefined, locale: Locale): string {
  if (!id) return "";
  return DISASTERS[id]?.[locale] ?? id;
}

export function explain(message: string, locale: Locale): string {
  return translateKnown(message, locale);
}
