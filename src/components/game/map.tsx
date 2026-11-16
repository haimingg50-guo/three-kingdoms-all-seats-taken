"use client";

import { useEffect, useState } from "react";
import { mapBoard, namedRoad, readRoad, type RoadKind, type RoadRead } from "@/engine/land";
import type { PublicWorld } from "@/engine/view";
import { FordMark, PassGate, RiverBackdrop, Town } from "@/components/game/land-art";
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

const LABEL_DY: Record<string, number> = {
  jinyang: -3.6,
  ye: -3.6,
  changan: 4.2,
  luoyang: -3.8,
  xuchang: 4.2,
  xiapi: -3.6,
  nanzheng: 4.2,
  xiangyang: -3.8,
  chengdu: -4.2,
  jiangzhou: -4.2,
  jiangling: -4.2,
  jianye: -3.8,
};

function townRank(troops: number, capital: boolean): 1 | 2 | 3 {
  if (capital) return 3;
  if (troops >= 1200) return 2;
  return 1;
}

export function paintArrow(ctx: CanvasRenderingContext2D, path: { x: number; y: number }[], index: number) {
  const TILE = 32;
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

export function WorldMap({ world, flash, parade, selectedId, onSelect }: { world: PublicWorld; flash?: boolean; parade?: Parade | null; selectedId?: string; onSelect?: (id: string) => void }) {
  const { t, locale } = useI18n();
  const board = mapBoard(world.cities);
  const you = world.roles.find((role) => role.yours && role.alive);
  const [now, setNow] = useState(0);
  const [still, setStill] = useState(false);
  const [frame, setFrame] = useState<"all" | "you" | "pick">("all");

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setStill(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!parade || still) return;
    let raf = 0;
    const loop = () => {
      setNow(performance.now());
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [parade, still]);

  function moveCity(delta: number) {
    if (!onSelect) return;
    const index = world.cities.findIndex((city) => city.id === selectedId);
    const count = world.cities.length;
    const next = world.cities[(index < 0 ? (delta > 0 ? 0 : count - 1) : (index + delta + count) % count)];
    if (next) onSelect(next.id);
  }

  const seen = new Set<string>();
  const roads: { key: string; x1: number; y1: number; x2: number; y2: number; kind: RoadKind; note: string; read: RoadRead }[] = [];
  for (const city of world.cities) {
    for (const link of city.links) {
      const key = [city.id, link].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);
      const other = world.cities.find((item) => item.id === link);
      if (!other) continue;
      const named = board === "rivers" ? namedRoad(city.id, other.id) : null;
      const friend = Boolean(
        you?.cityId &&
        you.factionId &&
        ((city.id === you.cityId && other.controllerId === you.factionId) || (other.id === you.cityId && city.controllerId === you.factionId)),
      );
      roads.push({
        key,
        x1: city.x,
        y1: city.y,
        x2: other.x,
        y2: other.y,
        kind: named?.kind ?? "road",
        note: named?.note ?? "",
        read: readRoad({
          a: city.id,
          b: other.id,
          friend,
          stationId: you?.cityId ?? null,
          selectedId: selectedId ?? null,
        }),
      });
    }
  }

  const from = parade ? world.cities.find((city) => city.id === parade.fromId) : undefined;
  const to = parade ? world.cities.find((city) => city.id === parade.toId) : undefined;
  let token: { x: number; y: number; clash: boolean } | null = null;
  if (parade && from && to) {
    const elapsed = still ? parade.marchMs : Math.max(0, (now || performance.now()) - parade.startedAt);
    const clash = elapsed >= parade.marchMs;
    const t = clash ? 1 : Math.min(1, elapsed / Math.max(1, parade.marchMs));
    token = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, clash };
  }

  const base = board === "rivers" ? t("map.hop") : board === "teaching" ? t("map.teaching") : t("map.saved");
  const home = you?.cityId ? world.cities.find((city) => city.id === you.cityId) : undefined;
  const looking = selectedId && you?.cityId && selectedId !== you.cityId ? world.cities.find((city) => city.id === selectedId) : undefined;
  const moveCount = roads.filter((road) => road.read === "move").length;
  const extra = board !== "rivers" || !you?.cityId
    ? ""
    : looking
      ? t("map.looking", {
          city: cityName(looking.id, locale, looking.name),
          home: home ? cityName(home.id, locale, home.name) : you.cityId,
        })
      : moveCount
        ? t("map.moveYes")
        : t("map.moveNo");

  function frameOf(id: string | null | undefined) {
    const city = id ? world.cities.find((item) => item.id === id) : undefined;
    if (!city) return "0 0 100 84";
    const width = 38;
    const height = 32;
    const x = Math.max(0, Math.min(100 - width, city.x - width / 2));
    const y = Math.max(0, Math.min(84 - height, city.y - height / 2));
    return `${x} ${y} ${width} ${height}`;
  }
  const view = frame === "you" ? frameOf(you?.cityId) : frame === "pick" ? frameOf(selectedId) : "0 0 100 84";
  const ink = { move: "#f0c040", look: "#f7f3e4", plain: "#9a8668" } as const;
  const weight = { move: 1.15, look: 0.78, plain: 0.4 } as const;

  return (
    <div>
      <div className="land-bar">
        <div className="land-tools">
          <button type="button" className="nes-choice" data-map="all" aria-pressed={frame === "all"} onClick={() => setFrame("all")}>{t("map.fit")}</button>
          <button type="button" className="nes-choice" data-map="you" aria-pressed={frame === "you"} disabled={!you?.cityId} onClick={() => { setFrame("you"); if (you?.cityId) onSelect?.(you.cityId); }}>{t("map.station")}</button>
          <button type="button" className="nes-choice" data-map="pick" aria-pressed={frame === "pick"} disabled={!selectedId} onClick={() => setFrame("pick")}>{t("map.detail")}</button>
        </div>
        <p className="land-note">
          <span>{base}</span>
          {extra ? <span data-map-note="1">{extra}</span> : null}
        </p>
      </div>
      <div
        className={`pixel-map land-map${flash ? " nes-flash" : ""}`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            event.preventDefault();
            moveCity(1);
          }
          if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            event.preventDefault();
            moveCity(-1);
          }
        }}
      >
        <div className="land-stage">
          <svg viewBox={view} data-frame={frame} role="img" aria-label={t("map.aria")}>
            {board === "rivers" ? <RiverBackdrop /> : <rect width="100" height="84" fill="#1b2820" />}
            {(["plain", "look", "move"] as const).map((read) =>
              roads.filter((road) => road.read === read).map((road) => (
                <g key={road.key}>
                  <line
                    x1={road.x1}
                    y1={road.y1}
                    x2={road.x2}
                    y2={road.y2}
                    stroke={read === "move" ? "#6a5018" : "#3a342c"}
                    strokeWidth={weight[read] + 0.55}
                    strokeLinecap="round"
                  />
                  <line
                    data-road={road.key}
                    data-read={road.read}
                    x1={road.x1}
                    y1={road.y1}
                    x2={road.x2}
                    y2={road.y2}
                    stroke={ink[read]}
                    strokeWidth={weight[read]}
                    strokeLinecap="round"
                  />
                </g>
              )),
            )}
            {roads.filter((road) => road.kind === "ford").map((road) => (
              <FordMark key={`${road.key}-ford`} x1={road.x1} y1={road.y1} x2={road.x2} y2={road.y2} />
            ))}
            {roads.filter((road) => road.kind === "pass").map((road) => (
              <PassGate key={`${road.key}-pass`} x={(road.x1 + road.x2) / 2} y={(road.y1 + road.y2) / 2} />
            ))}
            {roads.filter((road) => road.read !== "plain" && road.note).map((road) => {
              const dx = road.x2 - road.x1;
              const dy = road.y2 - road.y1;
              const len = Math.hypot(dx, dy) || 1;
              return (
                <text
                  key={`${road.key}-note`}
                  data-road-note={road.note}
                  x={(road.x1 + road.x2) / 2 + (-dy / len) * 2.6}
                  y={(road.y1 + road.y2) / 2 + (dx / len) * 2.6}
                  textAnchor="middle"
                  fill={ink[road.read]}
                  fontSize="2.05"
                  stroke="#14121a"
                  strokeWidth="0.45"
                  style={{ paintOrder: "stroke" }}
                  pointerEvents="none"
                >
                  {road.note}
                </text>
              );
            })}
            {world.cities.map((city) => {
              const rank = townRank(city.troops, city.isCapital);
              const selected = city.id === selectedId;
              const mine = you?.cityId === city.id;
              const held = world.factions.find((faction) => faction.id === city.controllerId);
              const above = (LABEL_DY[city.id] ?? 1) < 0;
              const gap = rank === 3 ? 4.15 : rank === 2 ? 3.55 : 2.95;
              const nameY = above ? city.y - gap : city.y + gap;
              const youY = above ? nameY - 2.35 : city.y - gap - 0.15;
              return (
                <g key={city.id} data-city={city.id} onClick={() => onSelect?.(city.id)} style={{ cursor: onSelect ? "pointer" : undefined }}>
                  <rect x={city.x - 4.2} y={city.y - 3.6} width="8.4" height="7.2" fill="transparent" />
                  <g transform={`translate(${city.x} ${city.y})`}>
                    <Town rank={rank} fill={dye(city.controllerId)} selected={selected} mine={mine} />
                  </g>
                  <text
                    x={city.x}
                    y={nameY}
                    textAnchor="middle"
                    fill={selected ? "#f0c040" : "#f7f1e2"}
                    fontSize="2.2"
                    stroke="#1a1814"
                    strokeWidth="0.45"
                    dominantBaseline={above ? "text-after-edge" : "text-before-edge"}
                    style={{ paintOrder: "stroke" }}
                  >
                    {cityName(city.id, locale, city.name)}
                  </text>
                  {mine ? (
                    <text x={city.x} y={youY} textAnchor="middle" fill="#f0c040" fontSize="1.9" stroke="#1a1814" strokeWidth="0.4" dominantBaseline={above ? "text-after-edge" : "text-before-edge"} style={{ paintOrder: "stroke" }}>
                      {t("map.you")}
                    </text>
                  ) : null}
                  {selected ? (
                    <title>{`${cityName(city.id, locale, city.name)} · ${held ? factionName(held.id, locale, held.name) : t("map.noneHeld")} · ${t("map.troops", { n: city.troops })}`}</title>
                  ) : null}
                </g>
              );
            })}
            {token ? (
              <g aria-hidden="true">
                <circle cx={token.x} cy={token.y} r={token.clash ? 1.7 : 1.35} fill={dye(parade?.factionId ?? null)} stroke="#f4f0dc" strokeWidth="0.35" />
              </g>
            ) : null}
          </svg>
          {world.sky ? <span className="map-sky">{skyLine(world.sky, locale)}</span> : null}
        </div>
      </div>
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

export function CitySheet({ world, selectedId, onSelect }: { world: PublicWorld; selectedId?: string; onSelect?: (id: string) => void }) {
  const { t, locale } = useI18n();
  const [localId, setLocalId] = useState(world.cities[0]?.id ?? "");
  const id = selectedId || localId;
  const setId = (next: string) => {
    setLocalId(next);
    onSelect?.(next);
  };
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
