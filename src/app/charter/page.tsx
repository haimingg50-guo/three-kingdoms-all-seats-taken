"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { useI18n } from "@/i18n/provider";

const QUESTIONS = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;
const AXIOMS = ["a1", "a2", "a3", "a4", "a5", "a6", "a7"] as const;

export default function CharterPage() {
  const { t } = useI18n();
  return (
    <main>
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-4 pb-20">
        <p className="text-sm tracking-[0.2em] text-primary">{t("charter.kicker")}</p>
        <h1 className="mt-3 font-display text-5xl leading-tight">{t("charter.title")}</h1>
        <p className="mt-6 text-lg leading-relaxed">{t("charter.lead")}</p>
        <h2 className="mt-12 font-display text-3xl">{t("charter.questions")}</h2>
        <ol className="mt-4 space-y-5">
          {QUESTIONS.map((id, index) => (
            <li key={id}>
              <h3 className="font-display text-2xl">{index + 1}. {t(`charter.${id}.t`)}</h3>
              <p className="mt-1 leading-relaxed text-foreground/80">{t(`charter.${id}.b`)}</p>
            </li>
          ))}
        </ol>
        <h2 className="mt-12 font-display text-3xl">{t("charter.axioms")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("charter.axiomNote")}</p>
        <ol className="mt-4 space-y-4">
          {AXIOMS.map((id) => (
            <li key={id} className="nes-window p-4">
              <h3 className="font-display text-xl">{t("charter.axiomN", { n: t(`charter.n${id.slice(1)}`), title: t(`charter.${id}.t`) })}</h3>
              <p className="mt-1 leading-relaxed text-foreground/80">{t(`charter.${id}.b`)}</p>
            </li>
          ))}
        </ol>
        <h2 className="mt-12 font-display text-3xl">{t("charter.lineage")}</h2>
        <p className="mt-3 leading-relaxed">{t("charter.lineageBody")}</p>
        <h2 className="mt-12 font-display text-3xl">{t("charter.far")}</h2>
        <p className="mt-3 leading-relaxed">{t("charter.farBody")}</p>
        <p className="mt-10">
          <Link href="/world/demo" className="text-primary">{t("charter.back")}</Link>
        </p>
      </article>
    </main>
  );
}
