"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { TitleScore } from "@/components/sound-toggle";
import { TitleWordmark } from "@/components/title-wordmark";
import { useI18n } from "@/i18n/provider";
import { profileTitle, worldName } from "@/i18n/render";

export interface HomeWorld {
  id: string;
  name: string;
  profile: string;
  profileTitle: string;
  turn: number;
  status: string;
  seatedCount: number;
}

export function HomeView({ worlds, failed }: { worlds: HomeWorld[]; failed: boolean }) {
  const { t, locale } = useI18n();
  const demo = worlds.find((world) => world.id === "demo");
  const status = (value: string) => {
    if (value === "memorial") return t("status.memorial");
    if (value === "settled") return t("status.settled");
    if (value === "consolidation") return t("status.consolidation");
    return t("status.running");
  };

  return (
    <main>
      <SiteHeader />
      <TitleScore />
      <section className="mx-auto max-w-xl px-4 pb-16 text-center">
        <p className="text-primary">{t("home.kicker")}</p>
        <TitleWordmark />
        <p className="mt-4">{t("home.tagline")}</p>
        <div className="nes-menu mx-auto mt-6 max-w-sm text-left">
          <Link href="/world/demo" className="nes-choice is-on">{t("home.start")}</Link>
          <Link href="/look" className="nes-choice">{t("home.look")}</Link>
          <Link href="/new" className="nes-choice">{t("home.sandbox")}</Link>
          <Link href="/charter" className="nes-choice">{t("home.charter")}</Link>
        </div>
        <div className="nes-window mt-6 p-4 text-left">
          <p>{t("home.blurb")}</p>
          {failed ? <p className="mt-3">{t("home.failed")}</p> : null}
          {demo ? (
            <p className="mt-3">
              {t("home.demoLine", { name: worldName(demo.name, locale), turn: demo.turn, status: status(demo.status), seated: demo.seatedCount })}
            </p>
          ) : null}
          <ul className="mt-3 space-y-2">
            <li>{t("home.q1")}</li>
            <li>{t("home.q2")}</li>
            <li>{t("home.q3")}</li>
          </ul>
        </div>
        {worlds.length > 0 ? (
          <ul className="nes-window mt-4 divide-y divide-border text-left">
            {worlds.map((world) => (
              <li key={world.id}>
                <Link href={`/world/${world.id}`} className="block px-4 py-3 hover:text-primary">
                  {worldName(world.name, locale)}
                  <span className="mt-1 block text-muted-foreground">
                    {t("home.worldLine", {
                      profile: profileTitle(world.profile, locale, world.profileTitle),
                      turn: world.turn,
                      status: status(world.status),
                      seated: world.seatedCount,
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-6 text-left text-muted-foreground">{t("home.legal")}</p>
      </section>
    </main>
  );
}
