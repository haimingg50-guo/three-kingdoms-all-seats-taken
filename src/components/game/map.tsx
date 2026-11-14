"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildAtlas, roadBetween, type Atlas } from "@/components/game/atlas";
import { blitBust } from "@/components/game/bust";
import { TILE, blitCity, blitPass, blitTile, blitWash, cityRank, drawWeather } from "@/components/game/tiles";
import type { CityWorks } from "@/engine/types";
import type { PublicWorld } from "@/engine/view";
import { useI18n } from "@/i18n/provider";
import { cityName, factionName, personName, regionName, skyLine } from "@/i18n/render";

export interface Parade {
  fromId: string;
  toId: string;
  roleId: string;
  defenderId: string | null;
  factionId: string | null;
  startedAt: number;
  marchMs: number;
  clashMs: number;
}

function dye(id: string | null) {
  if (id === "wei") return "#5088d8";
  if (id === "shu") return "#48a848";
  if (id === "wu") return "#d85848";
  return "#c4a060";
}

function besideMountain(atlas: Atlas, x: number, y: number) {
  return [
    atlas.cells[y - 1]?.[x],
    atlas.cells[y + 1]?.[x],
    atlas.cells[y]?.[x - 1],
    atlas.cells[y]?.[x + 1],
  ].includes("M");
}

function drawScene(ctx: CanvasRenderingContext2D, world: PublicWorld, atlas: Atlas, frame: number, hideId?: string) {
  ctx.imageSmoothingEnabled = false;
  atlas.cells.forEach((row, y) => {
    row.forEach((kind, x) => {
      const ground = kind === "C" || kind === "K" ? "g" : kind;
      blitTile(ctx, ground, x * TILE, y * TILE, frame, world.sky);
      if ((kind === "R" || kind === "B") && besideMountain(atlas, x, y)) blitPass(ctx, x * TILE, y * TILE);
    });
  });
  for (const city of world.cities) {
    const at = atlas.pos.get(city.id);
    if (!at || !city.controllerId) continue;
    const color = dye(city.controllerId);
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const kind = atlas.cells[at.y + dy]?.[at.x + dx];
        if (kind === "g" || kind === "g2") blitWash(ctx, (at.x + dx) * TILE, (at.y + dy) * TILE, color);
      }
    }
  }
  for (const city of world.cities) {
    const at = atlas.pos.get(city.id);
    if (!at) continue;
    blitCity(ctx, at.x * TILE, at.y * TILE, cityRank(city.troops, city.isCapital));
    const people = world.roles.filter((role) => role.alive && role.cityId === city.id && role.id !== hideId);
    const ordered = [...people.filter((role) => role.office === "lord"), ...people.filter((role) => role.office !== "lord")].slice(0, 2);
    ordered.forEach((role, index) => {
      const ox = Math.round(at.x * TILE + (index - (ordered.length - 1) / 2) * 16 - 8);
      const oy = at.y * TILE - 24;
      const hurt = !role.alive || (role.reputation ?? 100) < 30;
      blitBust(ctx, role.id, ox, oy, dye(role.factionId ?? city.controllerId), hurt ? "hurt" : "calm");
    });
    paintWorks(ctx, at.x, at.y, city.works);
    if ((city.works?.plague ?? 0) > 0) {
      ctx.fillStyle = "#3c9448";
      ctx.fillRect(at.x * TILE + 12, at.y * TILE, 1, 3);
      ctx.fillRect(at.x * TILE + 11, at.y * TILE + 1, 3, 1);
    }
  }
}

function paintWorks(ctx: CanvasRenderingContext2D, x: number, y: number, works?: CityWorks) {
  if (!works) return;
  const ox = x * TILE;
  const oy = y * TILE;
  if (works.dike > 0) {
    ctx.fillStyle = "#3a68c8";
    ctx.fillRect(ox, oy + 13, Math.min(16, 4 + works.dike * 4), 3);
  }
  if (works.granary > 0) {
    ctx.fillStyle = "#f0c040";
    ctx.fillRect(ox + 11, oy, 5, 4);
  }
  if (works.clinic > 0) {
    ctx.fillStyle = "#f4f0dc";
    ctx.fillRect(ox + 11, oy + 5, 5, 5);
    ctx.fillStyle = "#d84848";
    ctx.fillRect(ox + 13, oy + 6, 1, 3);
    ctx.fillRect(ox + 12, oy + 7, 3, 1);
  }
  if (works.canal > 0) {
    ctx.fillStyle = "#284888";
    ctx.fillRect(ox, oy + 6, 8, 3);
  }
}

export function paintArrow(ctx: CanvasRenderingContext2D, path: { x: number; y: number }[], index: number) {
  ctx.fillStyle = "#f0c040";
  for (let i = 0; i <= index; i += 2) {
    const point = path[i];
    if (!point) continue;
    ctx.fillRect(point.x * TILE + 7, point.y * TILE + 7, 2, 2);
  }
  const at = path[index];
  const prev = path[Math.max(0, index - 1)];
  if (!at || !prev) return;
  const dx = Math.sign(at.x - prev.x);
  const dy = Math.sign(at.y - prev.y);
  const ox = at.x * TILE + 6 + dx * 4;
  const oy = at.y * TILE + 6 + dy * 4;
  ctx.fillStyle = "#14121a";
  ctx.fillRect(ox - 1, oy - 1, 5, 5);
  ctx.fillStyle = "#f0c040";
  ctx.fillRect(ox, oy, 3, 3);
  ctx.fillStyle = "#d84848";
  ctx.fillRect(ox + dx, oy + dy, 1, 1);
}

export function WorldMap({ world, flash, parade }: { world: PublicWorld; flash?: boolean; parade?: Parade | null }) {
  const { t, locale } = useI18n();
  const ref = useRef<HTMLCanvasElement>(null);
  const base = useRef<HTMLCanvasElement | null>(null);
  const [frame, setFrame] = useState(0);
  const atlas = useMemo(() => buildAtlas(world.cities), [world]);

  useEffect(() => {
    const timer = window.setInterval(() => setFrame((value) => value + 1), 480);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = atlas.cols * TILE;
    canvas.height = atlas.rows * TILE;
    if (!base.current) base.current = document.createElement("canvas");
    base.current.width = canvas.width;
    base.current.height = canvas.height;
    const ctx = base.current.getContext("2d");
    if (!ctx) return;
    drawScene(ctx, world, atlas, frame, parade ? parade.roleId : undefined);
    const view = canvas.getContext("2d");
    if (!view || parade) return;
    view.imageSmoothingEnabled = false;
    view.drawImage(base.current, 0, 0);
  }, [atlas, frame, parade, world]);

  useEffect(() => {
    if (!parade) return;
    const canvas = ref.current;
    let raf = 0;
    const loop = () => {
      const view = canvas?.getContext("2d");
      const still = base.current;
      if (!view || !still || !canvas) return;
      view.imageSmoothingEnabled = false;
      view.drawImage(still, 0, 0);
      const elapsed = performance.now() - parade.startedAt;
      const cloth = dye(parade.factionId);
      const path = roadBetween(atlas, parade.fromId, parade.toId);
      if (elapsed < parade.marchMs && path.length > 1) {
        const t = elapsed / parade.marchMs;
        const index = Math.min(path.length - 1, Math.floor(t * (path.length - 1)));
        const at = path[index]!;
        blitBust(view, parade.roleId, at.x * TILE - 8, at.y * TILE - 24, cloth);
        paintArrow(view, path, index);
        const behind = path[Math.max(0, index - 1)];
        if (behind) blitBust(view, "garrison", behind.x * TILE - 4, behind.y * TILE - 20, cloth);
      } else {
        const at = atlas.pos.get(parade.toId);
        if (at) {
          const swing = Math.sin((elapsed / 120) * Math.PI) * 6;
          blitBust(view, parade.roleId, at.x * TILE - 20 - swing, at.y * TILE - 24, cloth, "angry");
          const defender = world.roles.find((role) => role.id === parade.defenderId);
          blitBust(view, parade.defenderId ?? "garrison", at.x * TILE + 8 + swing, at.y * TILE - 24, dye(defender?.factionId ?? null), "hurt");
          paintArrow(view, path, path.length - 1);
          if (Math.floor(elapsed / 80) % 2 === 0) {
            view.fillStyle = "#f0c040";
            view.fillRect(at.x * TILE + 6, at.y * TILE - 4, 3, 3);
            view.fillStyle = "#d84848";
            view.fillRect(at.x * TILE + 10, at.y * TILE - 8, 3, 3);
          }
        }
      }
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [atlas, parade, world.roles]);

  const skyRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = skyRef.current;
    const terrain = ref.current;
    if (!canvas || !terrain || !world.sky) return;
    let raf = 0;
    const loop = () => {
      if (canvas.width !== terrain.width || canvas.height !== terrain.height) {
        canvas.width = terrain.width;
        canvas.height = terrain.height;
      }
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawWeather(ctx, canvas.width, canvas.height, world.sky, Math.floor(performance.now() / 90));
      }
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [world.sky, atlas.cols, atlas.rows]);

  return (
    <div className={`pixel-map${flash ? " nes-flash" : ""}`}>
      <canvas ref={ref} role="img" aria-label={t("map.aria")} />
      <canvas ref={skyRef} className="sky-layer" aria-hidden="true" />
      {world.sky ? <span className="map-sky">{skyLine(world.sky, locale)}</span> : null}
      {world.cities.map((city) => {
        const at = atlas.pos.get(city.id);
        if (!at) return null;
        const owner = world.factions.find((faction) => faction.id === city.controllerId);
        return (
          <span
            key={city.id}
            className="map-label"
            style={{ left: `${((at.x + 0.5) / atlas.cols) * 100}%`, top: `${((at.y + 1.2) / atlas.rows) * 100}%` }}
          >
            {cityName(city.id, locale, city.name)}
            <small>{owner ? factionName(owner.id, locale, owner.name) : t("status.empty")} · {t("map.troops", { n: city.troops })}</small>
          </span>
        );
      })}
    </div>
  );
}

export function DoorPanel({ world }: { world: PublicWorld }) {
  const { t, locale } = useI18n();
  const door = world.door;
  const statusWord = {
    self: t("door.self"),
    vassal: t("door.vassal"),
    eliminated: t("door.gone"),
    resisting: t("door.resist"),
  } as const;
  const capitalCity = world.cities.find((city) => city.isCapital);
  const capital = capitalCity ? cityName(capitalCity.id, locale, capitalCity.name) : door.capitalName;
  return (
    <div className="nes-inset">
      <div className="flex items-baseline justify-between gap-3">
        <h2>{t("map.door")}</h2>
        <span>{door.open ? t("map.doorOpen") : t("map.doorShut")}</span>
      </div>
      <ul className="mt-2 space-y-1">
        <li>{t("map.capital", { name: capital, who: door.capitalHeld ? factionName(door.candidateId ?? "", locale, door.candidateName ?? "") : t("map.capitalNone") })}</li>
        <li>
          {t("map.control", {
            held: door.heldCities,
            total: door.totalCities,
            have: Math.round(door.ratio * 100),
            need: Math.round(door.requiredRatio * 100),
          })}
        </li>
        {door.majors.map((major) => (
          <li key={major.id}>{factionName(major.id, locale, major.name)}：{statusWord[major.status]}</li>
        ))}
        <li>
          {t("map.stable", { streak: door.stableStreak, need: door.stableNeeded })}
          {door.consolidation ? ` · ${t("map.consolLeft", { n: door.consolidationLeft ?? 0 })}` : ""}
        </li>
      </ul>
    </div>
  );
}

export function CitySheet({ world }: { world: PublicWorld }) {
  const { t, locale } = useI18n();
  const [id, setId] = useState(world.cities[0]?.id ?? "");
  const city = world.cities.find((item) => item.id === id) ?? world.cities[0];
  const works = city?.works;
  const join = locale === "en" ? ", " : "、";
  const roads = works?.roads.map((road) => {
    const other = world.cities.find((item) => item.id === road.to);
    return other ? cityName(other.id, locale, other.name) : road.to;
  }).join(join);
  const bountyWhat = world.bounty ? t(`bounty.${world.bounty.code}`) : "";
  return (
    <div className="nes-inset">
      <h2>{t("city.title")}{city ? ` · ${regionName(city.region, locale)}` : ""}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("city.legend")}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {world.cities.map((item) => (
          <button key={item.id} type="button" className={item.id === city?.id ? "nes-choice is-on" : "nes-choice"} onClick={() => setId(item.id)}>
            {cityName(item.id, locale, item.name)}
          </button>
        ))}
      </div>
      {city ? (
        <ul className="mt-2 space-y-1">
          <li>{t("city.stats", { morale: city.morale, grain: city.grain, troops: city.troops })}</li>
          <li>{t("city.dike", { n: works?.dike ?? 0, idle: works?.dikeIdle ?? 0 })}</li>
          <li>{t("city.granary", { n: works?.granary ?? 0 })}</li>
          <li>
            {t("city.clinic", { n: works?.clinic ?? 0 })}
            {works?.plague ? ` · ${t("city.plague", { n: works.plague })}` : ` · ${t("city.noPlague")}`}
          </li>
          <li>{t("city.canal", { n: works?.canal ?? 0 })}</li>
          <li>{t("city.roads", { roads: roads || t("city.noRoads") })}</li>
          <li>
            {t("city.people", {
              names: world.roles.filter((role) => role.alive && role.cityId === city.id).map((role) => `${personName(role.id, locale, role.name)}${role.captiveOf ? `（${t("status.captive")}）` : ""}`).join(join) || t("city.none"),
            })}
          </li>
          <li>
            {world.bounty
              ? t("bounty.line", {
                season: skyLine({ season: world.bounty.season, weather: "不计" }, locale),
                what: bountyWhat,
                done: world.bounty.claimed ? t("bounty.done") : t("bounty.open"),
              })
              : t("bounty.none")}
          </li>
        </ul>
      ) : null}
    </div>
  );
}
