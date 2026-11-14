"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PROFILES } from "@/engine/config";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { explain, useI18n } from "@/i18n/provider";
import { profileBlurb, profileQuestion, profileTitle } from "@/i18n/render";

export default function NewWorldPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [name, setName] = useState("");
  const [named, setNamed] = useState(false);
  useEffect(() => {
    if (!named) setName(t("new.defaultName"));
  }, [named, t]);
  const [profile, setProfile] = useState("tabletop_demo");
  const [kind, setKind] = useState<"sandbox" | "experiment">("sandbox");
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const selected = PROFILES.find((item) => item.id === profile);

  async function create() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/worlds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        profile,
        kind,
        acknowledgeSeason: ack,
      }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      if (data.existingId) {
        router.push(`/world/${data.existingId}`);
        return;
      }
      setError(explain(data.error ?? t("new.fail"), locale));
      return;
    }
    setToken(data.refereeToken);
    setCreatedId(data.id);
  }

  return (
    <main>
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-4 pb-20">
        <h1 className="font-display text-5xl">{t("new.title")}</h1>
        <p className="mt-3 max-w-xl leading-relaxed text-foreground/80">{t("new.lead")}</p>
        {token && createdId ? (
          <div className="sheet mt-8 border border-border p-5">
            <h2 className="font-display text-3xl">{t("new.opened")}</h2>
            <p className="mt-2 text-sm leading-relaxed">{t("new.token")}</p>
            <p className="mt-4 break-all border border-border bg-muted px-3 py-2 font-mono text-sm">{token}</p>
            <Button className="mt-4" size="lg" onClick={() => router.push(`/world/${createdId}`)}>
              {t("new.enter")}
            </Button>
          </div>
        ) : (
          <form
            className="nes-window mt-8 space-y-6 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <label className="block text-sm">
              {t("new.name")}
              <Input className="mt-1 h-10" value={name} placeholder={t("new.defaultName")} maxLength={24} onChange={(event) => { setNamed(true); setName(event.target.value); }} />
            </label>
            <fieldset>
              <legend className="text-sm">{t("new.kind")}</legend>
              <div className="mt-2 flex gap-2">
                {(["sandbox", "experiment"] as const).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="lg"
                    variant={kind === value ? "default" : "outline"}
                    onClick={() => setKind(value)}
                  >
                    {value === "sandbox" ? t("new.sandbox") : t("new.experiment")}
                  </Button>
                ))}
              </div>
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-sm">{t("new.profile")}</legend>
              {PROFILES.map((item) => (
                <label key={item.id} className={`block border p-3 ${profile === item.id ? "border-primary bg-card" : "border-border"}`}>
                  <input
                    className="mr-2"
                    type="radio"
                    name="profile"
                    checked={profile === item.id}
                    onChange={() => setProfile(item.id)}
                  />
                  <span className="font-display text-xl">{profileTitle(item.id, locale, item.title)}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{profileQuestion(item.id, locale, item.question)}</span>
                  <span className="mt-1 block text-sm">{profileBlurb(item.id, locale, item.blurb)}</span>
                </label>
              ))}
            </fieldset>
            {selected?.id === "season_mode" ? (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} />
                {t("new.ack")}
              </label>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? t("new.pending") : t("new.freeze")}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
