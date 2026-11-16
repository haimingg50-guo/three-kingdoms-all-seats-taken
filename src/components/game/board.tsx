"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { CitySheet, DoorPanel, WorldMap, type Parade } from "@/components/game/map";
import { Portrait } from "@/components/game/portraits";
import { MemorialHall } from "@/components/game/memorial-hall";
import { Slip } from "@/components/game/slip";
import { Spectacle, readSpectacleMode } from "@/components/game/spectacle";
import { Reel } from "@/components/game/reel";
import { readMotion, seenTurnKey, writeMotion, type MotionMode } from "@/components/game/motion";
import { Cutscene, stageFromEntries } from "@/components/game/stage";
import { blip, cueForEntry, setScene } from "@/components/game/sfx";
import { dateLocale, type Locale } from "@/i18n/locale";
import { explain, useI18n } from "@/i18n/provider";
import { cityName, factionName, officeDisplay, personName, profileTitle, renderEntry, skyLine, worldName } from "@/i18n/render";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { presentCues } from "@/engine/cues";
import type { CueId } from "@/engine/cues";
import { pickSpectacle, spectacleOutcome } from "@/engine/spectacle";
import type { SpectacleId } from "@/engine/spectacle";
import type { PublicWorld } from "@/engine/view";

function shanghai(iso: string, locale: Locale, zone: string) {
  return `${new Intl.DateTimeFormat(dateLocale(locale), {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))}${zone}`;
}

const MARCH_MS = 1500;
const CLASH_MS = 900;

function dye(id: string | null) {
  if (id === "wei") return "#5088d8";
  if (id === "shu") return "#48a848";
  if (id === "wu") return "#d85848";
  return "#c4a060";
}

function readParade(world: PublicWorld, turn: number) {
  const entry = [...world.chronicle].reverse().find((item) => item.turn === turn && (item.kind === "battle" || item.kind === "occupy"));
  if (!entry) return null;
  const params = entry.params;
  if (params?.origin && params.target) {
    const commander = params.commander && params.commander !== "garrison" ? params.commander : "";
    const defender = params.defender && params.defender !== "garrison" ? params.defender : null;
    return {
      fromId: params.origin,
      toId: params.target,
      roleId: commander || "garrison",
      defenderId: defender,
      factionId: world.roles.find((role) => role.id === commander)?.factionId ?? null,
      clash: entry.kind === "battle",
    };
  }
  const text = entry.text ?? "";
  const cities = [...world.cities].sort((a, b) => b.name.length - a.name.length);
  const cityId = (fragment: string) => cities.find((city) => fragment.startsWith(city.name))?.id;
  let fromId: string | undefined;
  let toId: string | undefined;
  const march = text.match(/自(.+?)出征(.+?)，/);
  if (march) {
    fromId = cityId(march[1] ?? "");
    toId = cityId(march[2] ?? "");
  }
  const back = text.match(/进攻(.+?)，未能破城。[\s\S]*退回(.+)。/);
  if (back) {
    toId = cityId(back[1] ?? "");
    fromId = cityId(back[2] ?? "");
  }
  if (!fromId || !toId) return null;
  const role = [...world.roles].sort((a, b) => b.name.length - a.name.length).find((item) => text.startsWith(item.name));
  const versus = text.match(/对阵(.+?)。/);
  const defender = versus ? world.roles.find((item) => item.name === versus[1]) : undefined;
  return {
    fromId,
    toId,
    roleId: role?.id ?? "garrison",
    defenderId: defender?.id ?? null,
    factionId: role?.factionId ?? null,
    clash: entry.kind === "battle",
  };
}

function remain(deadline: string, now: number, t: (key: string, vars?: Record<string, string | number>) => string) {
  const ms = Date.parse(deadline) - now;
  if (ms <= 0) return t("time.due");
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return t("time.remain", { m: minutes, s: String(seconds).padStart(2, "0") });
}

function closeText(reason: string | null, locale: Locale, t: (key: string, vars?: Record<string, string | number>) => string) {
  if (!reason) return t("status.settled");
  if (reason === "season") return t("status.seasonClose");
  if (reason.startsWith("unify:")) return t("status.unified", { faction: factionName(reason.slice(6), locale) });
  return reason;
}

export function Board({ worldId }: { worldId: string }) {
  const { t, locale } = useI18n();
  const [world, setWorld] = useState<PublicWorld | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [flash, setFlash] = useState(false);
  const [notice, setNotice] = useState<{ title: string; lines: string[]; entries: { kind: string; key?: string; text?: string }[]; attackerId?: string; defenderId?: string | null; cloth?: string } | null>(null);
  const [egg, setEgg] = useState<{ id: SpectacleId; outcome: string } | null>(null);
  const [parade, setParade] = useState<Parade | null>(null);
  const [cityId, setCityId] = useState<string | undefined>(undefined);
  const [motion, setMotion] = useState<MotionMode>("on");
  const [reel, setReel] = useState<{ id: CueId; line: string }[] | null>(null);
  const seenTurn = useRef<number | null>(null);
  const finishReel = useRef<() => void>(() => {});
  const worldRef = useRef(world);
  worldRef.current = world;

  const load = useCallback(async () => {
    const response = await fetch(`/api/worlds/${worldId}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setError(explain(String(data.error ?? t("board.unopen")), locale));
      setLoading(false);
      return;
    }
    setWorld(data as PublicWorld);
    setError(null);
    setLoading(false);
  }, [worldId, t, locale]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    const poll = window.setInterval(() => void load(), 4000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [load]);

  useEffect(() => {
    setMotion(readMotion());
  }, []);

  useEffect(() => {
    if (cityId || !world?.you) return;
    const mine = world.roles.find((role) => role.id === world.you?.roleId);
    if (mine?.cityId) setCityId(mine.cityId);
  }, [world, cityId]);

  const turnNow = world?.turn;
  useEffect(() => {
    const world = worldRef.current;
    if (!world || world.turn !== turnNow) return;
    const previous = seenTurn.current;
    if (previous === world.turn) return;
    const seenKey = seenTurnKey(world.id);
    if (previous == null) {
      seenTurn.current = world.turn;
      const saved = window.sessionStorage.getItem(seenKey);
      if (saved == null) window.sessionStorage.setItem(seenKey, String(world.turn));
      return;
    }
    if (window.sessionStorage.getItem(seenKey) === String(world.turn)) {
      seenTurn.current = world.turn;
      return;
    }
    seenTurn.current = world.turn;
    window.sessionStorage.setItem(seenKey, String(world.turn));
    const ofTurn = world.chronicle.filter((entry) => entry.turn === previous);
    const pinnedKinds = new Set(["climate", "disaster", "relief", "mitigate", "highlight", "allegiance_offer", "allegiance_accept", "allegiance_reject", "allegiance_expire", "allegiance_leave", "ballot_open", "ballot_cast", "ballot_result", "ballot_leave", "move"]);
    const pinned = ofTurn.filter((entry) => pinnedKinds.has(entry.kind));
    const rest = ofTurn.filter((entry) => !pinnedKinds.has(entry.kind)).slice(-3);
    const shown = [...pinned, ...rest];
    const lines = shown.map((entry) => renderEntry(entry, locale));
    const weather = ofTurn.find((entry) => entry.key === "climate.sky")?.params?.weather ?? null;
    const picked = pickSpectacle(ofTurn, weather);
    if (picked && readSpectacleMode() !== "off") setEgg({ id: picked, outcome: spectacleOutcome(picked, ofTurn) });
    const move = readParade(world, previous);
    const battle = Boolean(move?.clash);
    const cues = presentCues(ofTurn).map(({ id, entry }) => ({ id, line: renderEntry(entry, locale) }));
    const open = () => {
      setParade(null);
      setReel(null);
      setNotice({
        title: world.status === "memorial" ? t("status.memorial") : battle ? t("board.noticeBattle") : t("board.noticeTurn", { turn: previous }),
        lines: lines.length > 0 ? lines : [closeText(world.closeReason, locale, t)],
        entries: shown,
        attackerId: ofTurn.find((entry) => entry.roleId)?.roleId ?? move?.roleId,
        defenderId: battle ? move?.defenderId : undefined,
        cloth: dye(move?.factionId ?? null),
      });
      const cue = shown.map((entry) => cueForEntry(entry)).find(Boolean);
      blip(cue ?? (battle ? "turn" : "ok"));
    };
    const mode = readMotion();
    setFlash(true);
    const flashTimer = window.setTimeout(() => setFlash(false), 400);
    if (mode === "off" || (!move && cues.length === 0)) {
      open();
      return () => window.clearTimeout(flashTimer);
    }
    finishReel.current = open;
    const afterMap = () => {
      setParade(null);
      if (cues.length > 0) setReel(cues);
      else open();
    };
    if (move) {
      const marchMs = mode === "low" ? 700 : MARCH_MS;
      const clashMs = move.clash ? (mode === "low" ? 400 : CLASH_MS) : 0;
      setParade({
        fromId: move.fromId,
        toId: move.toId,
        roleId: move.roleId,
        defenderId: move.defenderId,
        factionId: move.factionId,
        startedAt: performance.now(),
        marchMs,
        clashMs,
      });
      blip("move");
      const wait = window.setTimeout(afterMap, marchMs + clashMs);
      return () => {
        window.clearTimeout(flashTimer);
        window.clearTimeout(wait);
      };
    }
    afterMap();
    return () => window.clearTimeout(flashTimer);
  }, [turnNow, locale, t]);

  useEffect(() => {
    if (!world) return;
    if (world.status === "memorial") setScene("memorial");
    else if (parade) setScene("battle");
    else if (notice) setScene("chronicle");
    else if (world.sky.season === "春") setScene("spring");
    else if (world.sky.season === "夏") setScene("summer");
    else if (world.sky.season === "秋") setScene("autumn");
    else setScene("winter");
  }, [world, parade, notice]);

  return (
    <main>
      <SiteHeader compact />
      {loading && !world ? <p className="px-4 py-10 text-sm">{t("board.loading")}</p> : null}
      {error && !world ? (
        <div className="mx-auto max-w-xl px-4 py-10">
          <p>{error}</p>
          <Link href="/" className="mt-4 inline-block text-sm text-primary">{t("board.home")}</Link>
        </div>
      ) : null}
      {reel && motion !== "off" ? <Reel cues={reel} mode={motion} onDone={() => finishReel.current()} /> : null}
      {egg && !notice && !reel ? <Spectacle id={egg.id} outcome={egg.outcome} onClose={() => setEgg(null)} /> : null}
      {notice ? (
        <Cutscene
          title={notice.title}
          lines={[...notice.lines, t("board.noticeNow", { turn: world?.turn ?? "" })]}
          attackerId={notice.attackerId}
          defenderId={notice.defenderId}
          cloth={notice.cloth}
          kind={stageFromEntries(notice.entries, world?.status)}
          onClose={() => setNotice(null)}
        />
      ) : null}
      {world ? (
        <div className="play-shell">
          <div className="play-bar">
            <strong>{worldName(world.name, locale)}</strong>
            <span>{t("board.turn", { turn: world.turn })}</span>
            <span>{skyLine(world.sky, locale)}</span>
            <span>{world.status === "running" ? remain(world.deadline, now, t) : world.status === "memorial" ? t("status.memorial") : t("status.settled")}</span>
            <span>{world.you ? personName(world.you.roleId, locale, world.you.roleName) : t("status.unseated")}</span>
          </div>
          {world.memorial ? <MemorialHall facts={world.memorial} /> : null}
          {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
          <div className="play-stage">
            <section className="play-map sheet">
              <WorldMap world={world} flash={flash} parade={parade} selectedId={cityId} onSelect={setCityId} />
              <div className="play-cities" role="tablist" aria-label={t("play.cities")}>
                {world.cities.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    role="tab"
                    aria-selected={city.id === cityId}
                    className={city.id === cityId ? "nes-choice is-on" : "nes-choice"}
                    onClick={() => setCityId(city.id)}
                  >
                    {cityName(city.id, locale, city.name)}
                  </button>
                ))}
              </div>
            </section>
            <aside className="play-dock sheet">
              <FocusCard world={world} cityId={cityId} />
              <Slip
                world={world}
                reviewing={Boolean(notice)}
                onDone={() => void load()}
                onFocusMine={() => {
                  const mine = world.roles.find((role) => role.yours);
                  if (mine?.cityId) setCityId(mine.cityId);
                }}
              />
            </aside>
          </div>
          <details className="play-tools">
            <summary>{t("play.tools")}</summary>
            <div>
              <div className="play-tools-row">
                {(["on", "low", "off"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={motion === mode ? "nes-choice is-on" : "nes-choice"}
                    onClick={() => {
                      writeMotion(mode);
                      setMotion(mode);
                    }}
                  >
                    {t(`motion.${mode}`)}
                  </button>
                ))}
                <ConfigDialog world={world} />
                <a className="nes-choice" href={`/api/worlds/${world.id}/export`}>{t("board.export")}</a>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {t("board.deadline", { when: shanghai(world.deadline, locale, t("time.zone")) })}
                {" · "}
                {t("board.nextSky", { sky: skyLine(world.skyNext, locale) })}
                {" · "}
                {profileTitle(world.profile, locale, world.profileTitle)}
              </p>
              <details className="play-more">
                <summary>{t("play.about")}</summary>
                <div>
                  <p>{world.kind === "sandbox" ? t("board.sandboxNote") : t("board.emptyNote")}</p>
                  {world.kind === "sandbox" ? <Badge>{t("status.sandbox")}</Badge> : null}
                  {world.experimental ? <Badge variant="secondary">{t("status.experimental")}</Badge> : null}
                </div>
              </details>
            </div>
          </details>
          <details className="play-fold" key={world.status} {...(world.status !== "running" ? { open: true } : {})}>
            <summary>{t("play.folds")}</summary>
            <div>
              <CitySheet world={world} selectedId={cityId} onSelect={setCityId} />
              <DoorPanel world={world} />
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Roster world={world} />
                <Chronicle world={world} />
              </div>
            </div>
          </details>
        </div>
      ) : null}
    </main>
  );
}

function FocusCard({ world, cityId }: { world: PublicWorld; cityId?: string }) {
  const { t, locale } = useI18n();
  const city = world.cities.find((item) => item.id === cityId);
  if (!city) return <p className="play-city">{t("play.pickCity")}</p>;
  const owner = world.factions.find((faction) => faction.id === city.controllerId);
  const garrison = world.roles.filter((role) => role.alive && role.cityId === city.id && (role.office === "lord" || role.office === "general" || role.office === "advisor"));
  const mine = world.roles.find((role) => role.yours);
  const join = locale === "en" ? ", " : "、";
  return (
    <div className="play-city" data-focus-city={city.id}>
      <h2 className="font-display text-3xl">{cityName(city.id, locale, city.name)}</h2>
      <p>{owner ? t("map.held", { name: factionName(owner.id, locale, owner.name) }) : t("map.noneHeld")} · {t("city.stats", { morale: city.morale, grain: city.grain, troops: city.troops })}</p>
      <p>{garrison.length ? t("map.garrison", { names: garrison.map((role) => personName(role.id, locale, role.name)).join(join) }) : t("map.noGarrison")}</p>
      {mine?.cityId === city.id ? <p className="text-primary">{t("play.youHere")}</p> : null}
      {mine?.cityId && mine.cityId !== city.id ? (
        <p data-looking="1">{t("map.looking", {
          city: cityName(city.id, locale, city.name),
          home: cityName(mine.cityId, locale, world.cities.find((item) => item.id === mine.cityId)?.name ?? mine.cityId),
        })}</p>
      ) : null}
    </div>
  );
}

function Roster({ world }: { world: PublicWorld }) {
  const { t, locale } = useI18n();
  const groups = [
    ...world.factions.map((faction) => ({
      title: factionName(faction.id, locale, faction.name),
      roles: world.roles.filter((role) => role.factionId === faction.id && role.alive),
    })),
    { title: t("roster.wanderers"), roles: world.roles.filter((role) => role.alive && !role.factionId) },
    { title: t("roster.fallen"), roles: world.roles.filter((role) => !role.alive) },
  ];
  return (
    <section className="border border-border bg-card/70 p-4">
      <h2 className="font-display text-2xl">{t("roster.title")}</h2>
      {groups.map((group) => (
        <div key={group.title} className="mt-3">
          <h3 className="text-xs tracking-[0.16em] text-muted-foreground">{group.title}</h3>
          {group.roles.length === 0 ? <p className="text-sm text-muted-foreground">{t("status.empty")}</p> : null}
          <ul>
            {group.roles.map((role) => (
              <li key={role.id} className="flex items-baseline justify-between gap-2 border-b border-border/70 py-1 text-sm">
                <span className={`flex items-center gap-2 ${role.alive ? "" : "line-through"}`}>
                  <Portrait id={role.id} cloth={dye(role.factionId)} scale={2} />
                  {personName(role.id, locale, role.name)}
                  <span className="ml-2 text-muted-foreground">
                    {officeDisplay(role, locale)}
                    {role.yours ? ` · ${t("status.you")}` : ""}
                    {role.seated ? "" : role.alive ? ` · ${t("status.vacant")}` : ""}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("roster.rep", { n: role.reputation })}
                  {role.absentStreak ? ` · ${t("roster.absent", { n: role.absentStreak })}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Chronicle({ world }: { world: PublicWorld }) {
  const { t, locale } = useI18n();
  const lines = [...world.chronicle].reverse();
  return (
    <section className="border border-border bg-card/70 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl">{t("chronicle.title")}</h2>
        <span className="text-xs text-muted-foreground">{t("chronicle.count", { n: world.chronicleCount })}</span>
      </div>
      {lines.length === 0 ? <p className="mt-3 text-sm">{t("chronicle.empty")}</p> : null}
      <ol className="mt-3 space-y-3">
        {lines.map((entry) => (
          <li key={entry.seq} className="text-sm leading-relaxed">
            <span className="mr-2 text-xs text-muted-foreground">{entry.turn === 0 ? t("chronicle.open") : t("chronicle.at", { turn: entry.turn })}</span>
            {renderEntry(entry, locale)}
          </li>
        ))}
      </ol>
    </section>
  );
}

function ConfigDialog({ world }: { world: PublicWorld }) {
  const { t } = useI18n();
  const onOff = (value: boolean) => (value ? t("cfg.on") : t("cfg.off"));
  const rows: [string, string][] = [
    [t("cfg.chat"), onOff(world.config.comm.free_chat)],
    [t("cfg.menu"), world.config.comm.menu_expressiveness],
    [t("cfg.death"), t("cfg.deathOn")],
    [t("cfg.impeach"), String(world.config.politics.impeach.threshold)],
    [t("cfg.execute"), String(world.config.politics.execute.threshold)],
    [t("cfg.ratio"), String(world.config.endgame.unify.control_ratio)],
    [t("cfg.stable"), String(world.config.endgame.unify.stable_turns)],
    [t("cfg.consolidation"), String(world.config.endgame.consolidation_turns)],
    [t("cfg.actions"), String(world.config.eco.action_points_per_turn)],
    [t("cfg.sky"), onOff(world.config.climate.enabled)],
    [t("cfg.snow"), String(world.config.climate.snow_march_loss)],
    [t("cfg.rain"), String(world.config.climate.rain_ford_loss)],
    [t("cfg.farm"), String(world.config.climate.fair_farm_bonus)],
    [t("cfg.disaster"), String(world.config.climate.disaster_permille)],
    [t("cfg.relief"), onOff(world.config.relief.enabled)],
    [t("cfg.dike"), String(world.config.relief.dike_max)],
    [t("cfg.granary"), String(world.config.relief.granary_cap)],
    [t("cfg.fallback"), world.config.war.fallback_behavior],
    [t("cfg.official"), t("cfg.none")],
  ];
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="lg" />}>{t("board.config")}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t("cfg.title")}</DialogTitle>
        </DialogHeader>
        <ul className="max-h-80 space-y-1 overflow-auto text-sm">
          {rows.map(([key, value]) => (
            <li key={key} className="flex justify-between gap-4 border-b border-border/70 py-1">
              <span>{key}</span>
              <span className="text-muted-foreground">{value}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("cfg.note", { license: world.config.data.export_license })}
        </p>
      </DialogContent>
    </Dialog>
  );
}
