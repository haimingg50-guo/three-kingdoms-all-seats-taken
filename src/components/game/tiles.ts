import type { SkyReport } from "@/engine/climate";

/** 一格 32 像素，分层画，不是把 16 像素格子放大。调色仍只用这一套。 */
export const INK = "#14121a";
export const CREAM = "#f4f0dc";
export const GOLD = "#f0c040";
export const RED = "#d84848";
export const TILE = 32;

const GREEN = "#3c9448";
const GREEN_D = "#2c7038";
const GREEN_S = "#1c5428";
const ROCK = "#9aa2b4";
const ROCK_D = "#5c6478";
const WATER = "#3a68c8";
const WATER_D = "#284888";
const SAND = "#c4a060";
const SAND_D = "#8c6840";
const WOOD = "#6a4030";
const FOAM = "#d6ecff";

export interface TerrainTone {
  grass: string;
  grassDark: string;
  grassDeep: string;
  water: string;
  waterDeep: string;
  sand: string;
}

export function terrainTone(sky?: SkyReport): TerrainTone {
  const dry = sky?.weather === "旱" || sky?.disaster === "旱";
  if (sky && sky.weather !== "不计" && sky.season === "冬") {
    return { grass: "#f4f7fb", grassDark: "#d5dee8", grassDeep: "#b7c3d1", water: "#8aa4c4", waterDeep: "#4a6888", sand: "#d5dee8" };
  }
  if (sky && (sky.season === "秋" || dry)) {
    return { grass: SAND, grassDark: SAND_D, grassDeep: "#6a5030", water: WATER, waterDeep: WATER_D, sand: "#e6d6b0" };
  }
  if (sky?.season === "夏") {
    return { grass: "#246838", grassDark: GREEN_S, grassDeep: "#143c1c", water: WATER, waterDeep: WATER_D, sand: SAND };
  }
  return { grass: GREEN, grassDark: GREEN_D, grassDeep: GREEN_S, water: WATER, waterDeep: WATER_D, sand: SAND };
}

function dot(n: number) {
  const x = Math.imul(n, 1103515245) + 12345;
  return (x >>> 16) & 255;
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function grass(ctx: CanvasRenderingContext2D, ox: number, oy: number, sky: SkyReport | undefined, salt: number) {
  const tone = terrainTone(sky);
  rect(ctx, ox, oy, TILE, TILE, tone.grass);
  rect(ctx, ox + (dot(salt) % 10), oy + (dot(salt + 1) % 8), 14 + (dot(salt + 2) % 10), 8 + (dot(salt + 3) % 6), tone.grassDark);
  if (dot(salt + 4) % 3 === 0) {
    const x = 6 + (dot(salt + 5) % 12);
    rect(ctx, ox + x, oy + 14, 6, 8, tone.grassDeep);
    rect(ctx, ox + x + 2, oy + 12, 3, 4, GREEN_S);
  }
  if (dot(salt + 6) % 9 === 0) {
    rect(ctx, ox + 18, oy + 8, 4, 4, GOLD);
    rect(ctx, ox + 17, oy + 9, 6, 2, CREAM);
  }
  if (dot(salt + 7) % 8 === 0) rect(ctx, ox + 6, oy + 24, 7, 4, ROCK);
}

function trees(ctx: CanvasRenderingContext2D, ox: number, oy: number, sky: SkyReport | undefined, neighbors: TileNeighbors | undefined, salt: number) {
  const tone = terrainTone(sky);
  grass(ctx, ox, oy, sky, salt);
  const near = neighbors ? [neighbors.n, neighbors.e, neighbors.s, neighbors.w].filter((kind) => kind === "F").length : 2;
  const count = near >= 3 ? 5 : near === 0 ? 2 : 3;
  for (let i = 0; i < count; i += 1) {
    const x = 2 + (dot(salt + i * 9) % 18);
    const y = 2 + (dot(salt + i * 5) % 12);
    rect(ctx, ox + x + 3, oy + y + 8, 2, 7, WOOD);
    rect(ctx, ox + x, oy + y, 8 + (i % 2) * 3, 8, i % 2 === 0 ? tone.grassDeep : GREEN_S);
    rect(ctx, ox + x + 2, oy + y + 2, 4, 3, tone.grassDark);
  }
}

function rock(ctx: CanvasRenderingContext2D, ox: number, oy: number, neighbors: TileNeighbors | undefined, salt: number) {
  const tone = terrainTone();
  rect(ctx, ox, oy, TILE, TILE, tone.grassDark);
  const north = neighbors?.n === "M";
  const crowned = !north && dot(salt + 5) % 3 === 0;
  const shoulder = !north && !crowned;
  const top = crowned ? 2 + (dot(salt) % 6) : shoulder ? 12 + (dot(salt) % 6) : 16;
  const wide = crowned ? 10 + (dot(salt + 1) % 14) : 18 + (dot(salt + 1) % 8);
  const left = Math.max(0, Math.min(TILE - wide, 4 + (dot(salt + 3) % 10)));
  rect(ctx, ox + (neighbors?.w === "M" ? 0 : left), oy + top + 8, neighbors?.e === "M" ? TILE : wide, TILE - top, ROCK_D);
  rect(ctx, ox + left, oy + top, wide, 12, ROCK);
  if (crowned) rect(ctx, ox + left + 4, oy + top - 3, Math.max(4, wide - 8), 5, CREAM);
  rect(ctx, ox, oy + 27, TILE, 5, "#3a4254");
}

export function blitCrest(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const shift = ((ox / 32) % 5) - 2;
  const tall = (ox + oy) % 96 < 32;
  rect(ctx, ox + 8 + shift, oy - (tall ? 14 : 8), tall ? 12 : 16, 6, ROCK);
  rect(ctx, ox + 11 + shift, oy - (tall ? 20 : 12), 8, 6, "#c5cedb");
  if (tall) rect(ctx, ox + 13 + shift, oy - 24, 4, 4, CREAM);
  rect(ctx, ox + 10, oy - 2, 12, 3, ROCK_D);
}

function water(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number, sky?: SkyReport) {
  const tone = terrainTone(sky);
  rect(ctx, ox, oy, TILE, TILE, tone.waterDeep);
  const shift = frame % 4;
  for (let y = 2; y < TILE; y += 6) {
    rect(ctx, ox, oy + y, TILE, 2, tone.water);
    rect(ctx, ox + ((y + shift) % 8), oy + y, 6, 1, FOAM);
  }
}

function shore(ctx: CanvasRenderingContext2D, ox: number, oy: number, edge: "n" | "e" | "s" | "w", salt: number) {
  const band = edge === "n" || edge === "w" ? FOAM : SAND;
  if (edge === "n") rect(ctx, ox, oy, TILE, 6, SAND);
  if (edge === "s") rect(ctx, ox, oy + TILE - 6, TILE, 6, SAND);
  if (edge === "w") rect(ctx, ox, oy, 6, TILE, SAND);
  if (edge === "e") rect(ctx, ox + TILE - 6, oy, 6, TILE, SAND);
  for (let i = 0; i < 3; i += 1) {
    const along = 4 + ((salt + i * 9) % 20);
    if (edge === "n") {
      rect(ctx, ox + along, oy, 4, 2, band);
      rect(ctx, ox + along, oy + 4, 1, 5, GREEN_D);
    } else if (edge === "s") {
      rect(ctx, ox + along, oy + TILE - 3, 4, 2, FOAM);
      rect(ctx, ox + along, oy + TILE - 10, 1, 5, GREEN_D);
    } else if (edge === "w") {
      rect(ctx, ox, oy + along, 2, 4, band);
      rect(ctx, ox + 4, oy + along, 4, 1, GREEN_D);
    } else {
      rect(ctx, ox + TILE - 3, oy + along, 2, 4, FOAM);
      rect(ctx, ox + TILE - 8, oy + along, 4, 1, GREEN_D);
    }
  }
}

function roadish(kind: string) {
  return kind === "R" || kind === "B" || kind === "C" || kind === "K";
}

function road(ctx: CanvasRenderingContext2D, ox: number, oy: number, sky?: SkyReport, neighbors?: TileNeighbors) {
  grass(ctx, ox, oy, sky, 2);
  const h = !neighbors || roadish(neighbors.e) || roadish(neighbors.w);
  const v = !neighbors || roadish(neighbors.n) || roadish(neighbors.s);
  if (h) {
    rect(ctx, ox, oy + 9, TILE, 14, SAND_D);
    rect(ctx, ox, oy + 11, TILE, 10, SAND);
    for (let x = 2; x < TILE; x += 7) rect(ctx, ox + x, oy + 13, 2, 6, "#e6d6b0");
    rect(ctx, ox, oy + 11, TILE, 1, SAND_D);
    rect(ctx, ox, oy + 20, TILE, 1, SAND_D);
  }
  if (v) {
    rect(ctx, ox + 9, oy, 14, TILE, SAND_D);
    rect(ctx, ox + 11, oy, 10, TILE, SAND);
    for (let y = 2; y < TILE; y += 7) rect(ctx, ox + 13, oy + y, 6, 2, "#e6d6b0");
    rect(ctx, ox + 11, oy, 1, TILE, SAND_D);
    rect(ctx, ox + 20, oy, 1, TILE, SAND_D);
  }
}

function bridge(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number, sky?: SkyReport, neighbors?: TileNeighbors) {
  water(ctx, ox, oy, frame, sky);
  const h = !neighbors || roadish(neighbors.e) || roadish(neighbors.w);
  const v = neighbors ? roadish(neighbors.n) || roadish(neighbors.s) : false;
  if (h) {
    rect(ctx, ox, oy + 8, TILE, 16, WOOD);
    for (let x = 0; x < TILE; x += 4) rect(ctx, ox + x, oy + 8, 1, 16, INK);
    rect(ctx, ox, oy + 8, TILE, 2, SAND_D);
    rect(ctx, ox, oy + 22, TILE, 2, SAND_D);
  }
  if (v) {
    rect(ctx, ox + 8, oy, 16, TILE, WOOD);
    for (let y = 0; y < TILE; y += 4) rect(ctx, ox + 8, oy + y, 16, 1, INK);
    rect(ctx, ox + 8, oy, 2, TILE, SAND_D);
    rect(ctx, ox + 22, oy, 2, TILE, SAND_D);
  }
}

export interface TileNeighbors {
  n: string;
  e: string;
  s: string;
  w: string;
}

function wet(kind: string) {
  return kind === "W" || kind === "B";
}

export function blitTile(
  ctx: CanvasRenderingContext2D,
  kind: string,
  ox: number,
  oy: number,
  frame: number,
  sky?: SkyReport,
  neighbors?: TileNeighbors,
) {
  const salt = (ox * 13 + oy * 29 + (kind === "g2" ? 40 : 0)) >>> 0;
  if (kind === "M") rock(ctx, ox, oy, neighbors, salt);
  else if (kind === "F") trees(ctx, ox, oy, sky, neighbors, salt);
  else if (kind === "W") {
    water(ctx, ox, oy, frame, sky);
    if (neighbors && !wet(neighbors.w)) rect(ctx, ox, oy, 5, TILE, "#7aa0d4");
    if (neighbors && !wet(neighbors.n)) rect(ctx, ox, oy, TILE, 5, "#7aa0d4");
  } else if (kind === "R") road(ctx, ox, oy, sky, neighbors);
  else if (kind === "B") bridge(ctx, ox, oy, frame, sky, neighbors);
  else grass(ctx, ox, oy, sky, salt);
  if (!neighbors || wet(kind)) return;
  if (wet(neighbors.n)) shore(ctx, ox, oy, "n", salt);
  if (wet(neighbors.s)) shore(ctx, ox, oy, "s", salt);
  if (wet(neighbors.w)) shore(ctx, ox, oy, "w", salt);
  if (wet(neighbors.e)) shore(ctx, ox, oy, "e", salt);
}

export function blitField(ctx: CanvasRenderingContext2D, ox: number, oy: number, sky?: SkyReport) {
  const tone = terrainTone(sky);
  for (let y = 6; y < TILE; y += 8) {
    rect(ctx, ox + 1, oy + y, TILE - 2, 2, tone.grassDeep);
    rect(ctx, ox + 1, oy + y + 3, TILE - 2, 2, SAND_D);
  }
  for (let x = 3; x < TILE; x += 8) {
    rect(ctx, ox + x, oy + 2, 2, 14, GOLD);
    rect(ctx, ox + x - 2, oy + 1, 6, 3, tone.grassDark);
  }
}

export function blitPass(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  rect(ctx, ox + 6, oy + 12, 4, 12, ROCK_D);
  rect(ctx, ox + 22, oy + 12, 4, 12, ROCK_D);
  rect(ctx, ox + 6, oy + 10, 20, 3, ROCK);
}

export type CityRank = "hamlet" | "town" | "fort" | "capital";

export function cityRank(troops: number, capital: boolean): CityRank {
  if (capital) return "capital";
  if (troops >= 1400) return "fort";
  if (troops >= 700) return "town";
  return "hamlet";
}

function roof(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string) {
  rect(ctx, x, y + 4, w, 6, CREAM);
  rect(ctx, x - 1, y + 3, w + 2, 2, color);
  rect(ctx, x + 1, y + 1, w - 2, 2, color);
  rect(ctx, x + Math.floor(w / 2) - 1, y, 2, 2, GOLD);
}

export function blitCity(ctx: CanvasRenderingContext2D, ox: number, oy: number, rank: CityRank, banner = GOLD) {
  const tone = terrainTone();
  rect(ctx, ox, oy, TILE, TILE, tone.grassDark);
  rect(ctx, ox + 1, oy + 1, TILE - 2, TILE - 2, banner);
  rect(ctx, ox + 3, oy + 3, TILE - 6, TILE - 6, tone.grass);
  if (rank === "hamlet") {
    rect(ctx, ox + 4, oy + 18, 24, 8, WOOD);
    roof(ctx, ox + 8, oy + 8, 16, RED);
    rect(ctx, ox + 14, oy + 20, 4, 6, INK);
    return;
  }
  rect(ctx, ox + 3, oy + 8, TILE - 6, TILE - 11, ROCK_D);
  rect(ctx, ox + 5, oy + 10, TILE - 10, TILE - 15, SAND);
  if (rank === "town") {
    roof(ctx, ox + 6, oy + 6, 12, RED);
    roof(ctx, ox + 16, oy + 12, 10, WOOD);
  } else {
    rect(ctx, ox + 4, oy + 4, TILE - 8, 4, ROCK);
    roof(ctx, ox + 7, oy + 6, 18, rank === "capital" ? GOLD : RED);
    rect(ctx, ox + 6, oy + 2, 4, 8, ROCK_D);
    if (rank === "capital") {
      rect(ctx, ox + 22, oy + 1, 3, 12, WOOD);
      rect(ctx, ox + 22, oy + 1, 8, 5, banner);
      rect(ctx, ox + 22, oy + 1, 8, 1, INK);
    }
  }
  rect(ctx, ox + 13, oy + 20, 6, 8, INK);
  rect(ctx, ox + 14, oy + 22, 4, 6, WOOD);
}

/** 势力只铺在城周草地的边，不再用整片疏点盖住地形。 */
export function blitWash(ctx: CanvasRenderingContext2D, ox: number, oy: number, color: string) {
  ctx.fillStyle = color;
  for (let i = 2; i < TILE; i += 4) {
    ctx.fillRect(ox + i, oy + 1, 2, 2);
    ctx.fillRect(ox + i, oy + TILE - 3, 2, 2);
    ctx.fillRect(ox + 1, oy + i, 2, 2);
    ctx.fillRect(ox + TILE - 3, oy + i, 2, 2);
  }
}

export function paintTerrain(
  ctx: CanvasRenderingContext2D,
  cells: string[][],
  frame: number,
  sky: SkyReport | undefined,
  cities: { x: number; y: number }[],
) {
  const near = new Set<string>();
  for (const city of cities) {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        if (Math.abs(dx) + Math.abs(dy) > 3) continue;
        near.add(`${city.x + dx},${city.y + dy}`);
      }
    }
  }
  cells.forEach((row, y) => {
    row.forEach((kind, x) => {
      const ground = kind === "C" || kind === "K" ? "g" : kind;
      const neighbors = {
        n: cells[y - 1]?.[x] ?? "",
        s: cells[y + 1]?.[x] ?? "",
        w: cells[y]?.[x - 1] ?? "",
        e: cells[y]?.[x + 1] ?? "",
      };
      blitTile(ctx, ground, x * TILE, y * TILE, frame, sky, neighbors);
      if ((ground === "g" || ground === "g2") && near.has(`${x},${y}`)) blitField(ctx, x * TILE, y * TILE, sky);
      if ((kind === "R" || kind === "B") && [neighbors.n, neighbors.s, neighbors.w, neighbors.e].includes("M")) {
        blitPass(ctx, x * TILE, y * TILE);
      }
    });
  });
  cells.forEach((row, y) => {
    row.forEach((kind, x) => {
      if (kind !== "M") return;
      if (cells[y - 1]?.[x] === "M") return;
      if ((x * 7 + y) % 5 !== 0) return;
      blitCrest(ctx, x * TILE, y * TILE);
    });
  });
}

export function drawWeather(ctx: CanvasRenderingContext2D, width: number, height: number, sky: SkyReport, phase: number) {
  if (sky.weather === "不计") return;
  const wet = sky.weather === "雨" || sky.disaster === "涝";
  const count = sky.weather === "雾" || wet ? 140 : sky.disaster === "蝗" ? 70 : 80;
  for (let i = 0; i < count; i += 1) {
    const speed = sky.weather === "雪" ? 1 : wet ? 6 : 3;
    const x = Math.abs((i * 47 + phase * speed) % width);
    const y = Math.abs((i * 29 + phase * (sky.weather === "雪" ? 1 : 9)) % height);
    if (wet) {
      ctx.fillStyle = INK;
      ctx.fillRect(x, y, 1, 5);
      ctx.fillStyle = FOAM;
      ctx.fillRect(x, y, 1, 4);
    } else if (sky.weather === "雪") {
      ctx.fillStyle = "#3a4a66";
      ctx.fillRect(x, y, 3, 3);
      ctx.fillStyle = CREAM;
      ctx.fillRect(x, y, 2, 2);
    } else if (sky.weather === "雾") {
      if ((x + y) % 2 !== 0) continue;
      ctx.fillStyle = "#d5deea";
      ctx.fillRect(x, y, 4, 1);
    } else if (sky.weather === "旱" || sky.disaster === "旱") {
      if (i % 3 !== 0) continue;
      ctx.fillStyle = "#6a4020";
      ctx.fillRect(x, y, 6, 1);
      ctx.fillStyle = GOLD;
      ctx.fillRect(x, y, 4, 1);
    }
  }
  if (sky.disaster === "涝") {
    ctx.fillStyle = WATER_D;
    for (let x = 0; x < width; x += 3) ctx.fillRect(x, height - 6 - (phase % 3), 2, 2);
  }
  if (sky.disaster === "蝗") {
    for (let i = 0; i < 36; i += 1) {
      const x = Math.abs((i * 53 + phase * 3) % width);
      const y = Math.abs((i * 17 + Math.floor(phase / 2) * 5) % height);
      ctx.fillStyle = SAND_D;
      ctx.fillRect(x, y, 3, 1);
      ctx.fillStyle = GOLD;
      ctx.fillRect(x, y, 1, 1);
      ctx.fillRect(x + 2, y, 1, 1);
    }
  }
  if (sky.disaster === "瘟疫") {
    ctx.fillStyle = GREEN;
    for (let i = 0; i < 24; i += 1) {
      const x = (i * 61) % width;
      const y = (i * 37 + phase) % height;
      ctx.fillRect(x, y, 1, 3);
      ctx.fillRect(x - 1, y + 1, 3, 1);
    }
  }
  if (sky.disaster === "旱") {
    ctx.fillStyle = "#6a4020";
    for (let i = 0; i < 18; i += 1) {
      const x = (i * 43) % Math.max(1, width - 8);
      const y = (i * 29) % Math.max(1, height - 4);
      ctx.fillRect(x, y, 8, 1);
      ctx.fillRect(x + 3, y - 2, 1, 5);
    }
  }
}
