"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { useI18n } from "@/i18n/provider";
import { renderEntry, skyLine } from "@/i18n/render";
import type { ChronicleEntry } from "@/engine/types";
import { buildAtlas, roadBetween } from "@/components/game/atlas";
import { paintArrow } from "@/components/game/map";
import { GearPanel } from "@/components/game/gear-panel";
import { MemorialHall } from "@/components/game/memorial-hall";
import { Storyboard } from "@/components/game/spectacle";
import { Cutscene } from "@/components/game/stage";
import { TILE, blitCity, blitPass, blitTile, blitWash, cityRank, drawWeather } from "@/components/game/tiles";
import type { SkyReport } from "@/engine/climate";

const CITIES = [
  { id: "xuchang", links: ["luoyang", "chengdu"], isCapital: false, x: 24, y: 48 },
  { id: "luoyang", links: ["xuchang", "jianye", "chengdu"], isCapital: true, x: 50, y: 38 },
  { id: "chengdu", links: ["luoyang", "xuchang"], isCapital: false, x: 42, y: 78 },
  { id: "jianye", links: ["luoyang"], isCapital: false, x: 78, y: 46 },
];

const MARKS = [
  { id: "xuchang", controllerId: "wei", troops: 1500, capital: false },
  { id: "luoyang", controllerId: null, troops: 1000, capital: true },
  { id: "chengdu", controllerId: "shu", troops: 1400, capital: false },
  { id: "jianye", controllerId: "wu", troops: 1500, capital: false },
];

function dye(id: string | null) {
  if (id === "wei") return "#5088d8";
  if (id === "shu") return "#48a848";
  if (id === "wu") return "#d85848";
  return "#c4a060";
}

const SAMPLES: { title: string; sky: SkyReport }[] = [
  { title: "春 · 晴", sky: sky("春", "晴", null) },
  { title: "春 · 雾", sky: sky("春", "雾", null) },
  { title: "夏 · 旱", sky: sky("夏", "旱", "旱") },
  { title: "夏 · 晴 · 瘟疫", sky: sky("夏", "晴", "瘟疫") },
  { title: "秋 · 雨 · 涝", sky: sky("秋", "雨", "涝") },
  { title: "冬 · 雪 · 蝗", sky: sky("冬", "雪", "蝗") },
];

function sky(season: SkyReport["season"], weather: SkyReport["weather"], disaster: SkyReport["disaster"]): SkyReport {
  return {
    turn: 1,
    season,
    weather,
    disaster,
    seed: "look",
    slot: 0,
    label: disaster ? `${season} · ${weather} · ${disaster}` : `${season} · ${weather}`,
    hint: "",
  };
}

function SampleMap({ sky: report, march = false }: { sky: SkyReport; march?: boolean }) {
  const { locale } = useI18n();
  const ref = useRef<HTMLCanvasElement>(null);
  const skyRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const overlay = skyRef.current;
    if (!canvas || !overlay) return;
    const atlas = buildAtlas(CITIES);
    canvas.width = atlas.cols * TILE;
    canvas.height = atlas.rows * TILE;
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    let frame = 0;
    let raf = 0;
    const loop = () => {
      const ctx = canvas.getContext("2d");
      const skyCtx = overlay.getContext("2d");
      if (ctx && skyCtx) {
        ctx.imageSmoothingEnabled = false;
        atlas.cells.forEach((row, y) => {
          row.forEach((kind, x) => {
            const ground = kind === "C" || kind === "K" ? "g" : kind;
            blitTile(ctx, ground, x * TILE, y * TILE, frame, report);
            if ((kind === "R" || kind === "B") && [atlas.cells[y - 1]?.[x], atlas.cells[y + 1]?.[x], atlas.cells[y]?.[x - 1], atlas.cells[y]?.[x + 1]].includes("M")) {
              blitPass(ctx, x * TILE, y * TILE);
            }
          });
        });
        for (const mark of MARKS) {
          const at = atlas.pos.get(mark.id);
          if (!at || !mark.controllerId) continue;
          for (let dy = -2; dy <= 2; dy += 1) {
            for (let dx = -2; dx <= 2; dx += 1) {
              const kind = atlas.cells[at.y + dy]?.[at.x + dx];
              if (kind === "g" || kind === "g2") blitWash(ctx, (at.x + dx) * TILE, (at.y + dy) * TILE, dye(mark.controllerId));
            }
          }
        }
        for (const mark of MARKS) {
          const at = atlas.pos.get(mark.id);
          if (!at) continue;
          blitCity(ctx, at.x * TILE, at.y * TILE, cityRank(mark.troops, mark.capital));
        }
        if (march) {
          const path = roadBetween(atlas, "xuchang", "luoyang");
          if (path.length > 1) paintArrow(ctx, path, frame % path.length);
        }
        skyCtx.clearRect(0, 0, overlay.width, overlay.height);
        drawWeather(skyCtx, overlay.width, overlay.height, report, frame);
      }
      frame += 1;
      raf = window.setTimeout(loop, 180);
    };
    loop();
    return () => window.clearTimeout(raf);
  }, [report, march]);
  return (
    <figure className="pixel-map">
      <canvas ref={ref} />
      <canvas ref={skyRef} className="sky-layer" />
      <figcaption className="map-sky">{skyLine(report, locale)}</figcaption>
    </figure>
  );
}

const SAMPLE_CHRONICLE: ChronicleEntry[] = [
  { seq: 1, turn: 0, phase: "meta", kind: "open", key: "meta.open.experiment", params: { name: "一", profile: "tabletop_demo", seed: "look" } },
  { seq: 2, turn: 1, phase: "meta", kind: "climate", key: "climate.sky", params: { turn: "1", season: "春", weather: "晴", seed: "look", slot: "0" } },
  { seq: 3, turn: 1, phase: "war", kind: "battle", key: "war.battle.win", params: { commander: "cao-cao", mode: "main", origin: "xuchang", target: "luoyang", defender: "liu-bei", defenderMode: "main", owner: "wei", atkLoss: "400", defLoss: "900" } },
  { seq: 4, turn: 2, phase: "diplomacy", kind: "ballot_result", key: "ballot.result.pass.sent", params: { faction: "shu", host: "wei", n: "4", ayes: "3", mark: "2/3" } },
  { seq: 5, turn: 2, phase: "diplomacy", kind: "allegiance_accept", key: "allegiance.submit", params: { actor: "liu-bei", host: "wei", from: "shu", cost: "8" } },
  { seq: 6, turn: 8, phase: "end", kind: "end", key: "end.unify.memorial", params: { faction: "wei" } },
];

export default function LookPage() {
  const { t, locale } = useI18n();
  return (
    <main>
      <SiteHeader mark={t("look.title")} />
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h1 className="font-display text-4xl">{t("look.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("look.note")}</p>
        <div className="look-grid mt-4">
          {SAMPLES.map((sample) => (
            <div key={sample.sky.label} className="nes-window p-2">
              <SampleMap sky={sample.sky} march={sample.sky.season === "春" && sample.sky.weather === "晴" && !sample.sky.disaster} />
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Cutscene
            inline
            title={t("look.duel")}
            lines={[t("look.duelLine")]}
            attackerId="guan-yu"
            defenderId="zhang-fei"
            cloth="#48a848"
            kind="duel"
            onClose={() => undefined}
          />
          <Cutscene
            inline
            title={t("look.swear")}
            lines={[t("look.swearLine")]}
            attackerId="liu-bei"
            defenderId="zhuge-liang"
            cloth="#48a848"
            kind="swear"
            onClose={() => undefined}
          />
          <Cutscene
            inline
            title={t("look.fire")}
            lines={[t("look.fireLine")]}
            attackerId="liu-bei"
            defenderId="garrison"
            cloth="#48a848"
            kind="fire"
            onClose={() => undefined}
          />
          <Cutscene
            inline
            title={t("look.vote")}
            lines={[t("look.voteLine")]}
            attackerId="liu-bei"
            defenderId="cao-cao"
            cloth="#48a848"
            kind="vote"
            onClose={() => undefined}
          />
          <Cutscene
            inline
            title={t("look.submit")}
            lines={[t("look.submitLine")]}
            attackerId="liu-bei"
            defenderId="cao-cao"
            cloth="#48a848"
            kind="allegiance"
            onClose={() => undefined}
          />
          <Cutscene
            inline
            title={t("look.memorial")}
            lines={[t("look.memorialLine")]}
            kind="memorial"
            onClose={() => undefined}
          />
        </div>
        <h2 id="chronicle-sample" className="mt-8 font-display text-3xl">{t("look.chronicle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("look.chronicleNote")}</p>
        <ol className="nes-window mt-3 divide-y divide-border">
          {SAMPLE_CHRONICLE.map((entry) => (
            <li key={entry.seq} className="px-4 py-3">
              <span className="mr-2 text-xs text-muted-foreground">{entry.turn === 0 ? t("chronicle.open") : t("chronicle.at", { turn: entry.turn })}</span>
              {renderEntry(entry, locale)}
            </li>
          ))}
        </ol>
        <h2 className="mt-8 font-display text-3xl">{t("look.gear")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("look.gearLine")}</p>
        <div className="nes-window mt-3 p-4">
          <GearPanel
            kit={{
              purse: 36,
              stock: { iron: 3, wood: 1, leather: 2, fodder: 2 },
              known: ["snake-spear", "crescent"],
              held: [
                { id: "sample-spear", pattern: "snake-spear", slot: "weapon", name: "雨茅", makerId: "zhang-fei", equipped: true, armory: false },
                { id: "sample-armor", pattern: "lamellar", slot: "armor", name: "", makerId: "cao-cao", equipped: false, armory: true },
              ],
            }}
            locked={false}
            full={false}
            onAdd={() => undefined}
          />
        </div>
        <h2 className="mt-8 font-display text-3xl">{t("look.hall")}</h2>
        <MemorialHall
          sample
          facts={{
            factionId: "wei",
            contributions: [
              { roleId: "cao-cao", name: "曹操", factionId: "wei", merit: 4, acts: 6 },
              { roleId: "liu-bei", name: "刘备", factionId: "shu", merit: 2, acts: 3 },
            ],
            events: [
              { seq: 1, turn: 4, phase: "end", kind: "end", key: "end.unify.memorial", params: { faction: "wei" } },
              { seq: 2, turn: 2, phase: "domestic", kind: "gear", key: "gear.forge.first", params: { actor: "zhang-fei", pattern: "snake-spear", label: "雨茅", maker: "zhang-fei" } },
            ],
          }}
        />
        <h2 id="storyboard" className="mt-8 font-display text-3xl">{t("look.story")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("look.storyLine")}</p>
        <p className="mt-1 text-sm">{t("spec.note")}</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          <Storyboard id="blade-rain" outcome="draw" still />
          <Storyboard id="grain-check" still />
          <Storyboard id="hammer" still />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t("spec.blade.win")} / {t("spec.blade.lose")}</p>
        <p className="mt-4">
          <Link href="/world/demo" className="nes-choice is-on">{t("look.back")}</Link>
        </p>
      </section>
    </main>
  );
}
