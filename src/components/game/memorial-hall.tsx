"use client";

import type { MemorialFacts } from "@/engine/memorial";
import { factionName, personName, renderEntry } from "@/i18n/render";
import { useI18n } from "@/i18n/provider";

export function MemorialHall({ facts, sample = false }: { facts: MemorialFacts; sample?: boolean }) {
  const { t, locale } = useI18n();
  return (
    <section id="memorial" className="nes-window mt-4 p-4">
      <h2 className="font-display text-3xl">{t("hall.title")}</h2>
      {sample ? <p className="mt-1 text-sm text-primary">{t("hall.sample")}</p> : null}
      <p className="mt-2 text-sm">
        {facts.factionId ? `${t("hall.by")} ${factionName(facts.factionId, locale, facts.factionId)}` : t("hall.none")}
      </p>
      <h3 className="mt-3 text-sm">{t("hall.people")}</h3>
      <ul>
        {facts.contributions.map((row) => (
          <li key={row.roleId} className="flex flex-wrap justify-between gap-2 border-b border-border/70 py-1 text-sm">
            <span>
              {personName(row.roleId, locale, row.name)}
              {row.factionId ? ` · ${factionName(row.factionId, locale, row.factionId)}` : ""}
            </span>
            <span className="text-muted-foreground">
              {t("roster.merit", { n: row.merit })} · {t("hall.acts", { n: row.acts })}
            </span>
          </li>
        ))}
      </ul>
      <h3 className="mt-3 text-sm">{t("hall.events")}</h3>
      {facts.events.length === 0 ? <p className="text-sm text-muted-foreground">{t("hall.empty")}</p> : null}
      <ol>
        {facts.events.map((entry) => (
          <li key={entry.seq} className="py-1 text-sm">
            {renderEntry(entry, locale)}
          </li>
        ))}
      </ol>
    </section>
  );
}
