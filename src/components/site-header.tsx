"use client";

import Link from "next/link";
import { SeatCrest } from "@/components/seat-crest";
import { SoundToggle } from "@/components/sound-toggle";
import { LOCALES } from "@/i18n/locale";
import { useI18n } from "@/i18n/provider";

export function SiteHeader({ mark }: { mark?: string }) {
  const { t, locale, setLocale } = useI18n();
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
      <Link href="/" className="brand-lock" aria-label={t("brand.name")}>
        <SeatCrest size={44} />
        <span>
          <span className="brand-name">
            <span className="block">{t("brand.line1")}</span>
            <span className="block">{t("brand.line2")}</span>
          </span>
          <span className="text-muted-foreground">{t("nav.scriptless")}</span>
        </span>
      </Link>
      <nav className="flex flex-wrap items-center gap-2">
        <Link href="/charter" className="nes-choice">{t("nav.charter")}</Link>
        <Link href="/new" className="nes-choice">{t("nav.new")}</Link>
        <span className="flex flex-wrap gap-2" role="group" aria-label={t("brand.name")}>
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              className={locale === code ? "nes-choice is-on" : "nes-choice"}
              aria-pressed={locale === code}
              onClick={() => setLocale(code)}
            >
              {t(`lang.${code}`)}
            </button>
          ))}
        </span>
        <SoundToggle />
        {mark ? <span className="text-primary">{mark}</span> : null}
      </nav>
    </header>
  );
}
