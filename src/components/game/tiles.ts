import type { SkyReport } from "@/engine/climate";

/** 限定调色。地形、天气和城都只用这些色，缩放时按像素对齐。 */
export const INK = "#14121a";
export const CREAM = "#f4f0dc";
export const GOLD = "#f0c040";
export const RED = "#d84848";
export const TILE = 16;

const PAL: Record<string, string> = {
  "1": CREAM,
  "2": INK,
  "3": "#3c9448",
  "4": "#2c7038",
  "5": "#1c5428",
  "6": "#9aa2b4",
  "7": "#5c6478",
  "8": "#3a68c8",
  "9": "#284888",
  a: "#c4a060",
  b: "#8c6840",
  c: "#e6d6b0",
  d: GOLD,
  e: RED,
  f: "#6a4030",
  w: "#d6ecff",
  g: "#246838",
};

const MOUNT = [
  "................",
  "......6666......",
  "....66777766....",
  "...6776667776...",
  "..677766667776..",
  ".67777666677776.",
  "6777776666777776",
  ".66666666666666.",
  "..6666....6666..",
  "...66......66...",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
];

const FOREST = [
  "................",
  "...555....555...",
  "..55555..55555..",
  ".55355555355555.",
  "..55555..55555..",
  "...555....555...",
  "....f......f....",
  "....f......f....",
  "...fff....fff...",
  "................",
  "..555...........",
  ".55555..........",
  "..555...........",
  "...f............",
  "..fff...........",
  "................",
];

const WATER = [
  "8899889988998899",
  "9988998899889988",
  "8899w88988998899",
  "9988998899889988",
  "8899889988998899",
  "9988998899889988",
  "8899889988998899",
  "99w8998899889988",
  "8899889988998899",
  "9988998899889988",
  "8899889988998899",
  "9988998899889988",
  "8899889w88998899",
  "9988998899889988",
  "8899889988998899",
  "9988998899889988",
];

const ROAD = [
  "3333333333333333",
  "33bbbbbbbbbbbb33",
  "33aaaaaaaaaaaa33",
  "33aabbaabbaabb33",
  "33aaaaaaaaaaaa33",
  "33bbbbbbbbbbbb33",
  "3333333333333333",
  "3333333333333333",
  "3333333333333333",
  "33bbbbbbbbbbbb33",
  "33aaaaaaaaaaaa33",
  "33aabbaabbaabb33",
  "33aaaaaaaaaaaa33",
  "33bbbbbbbbbbbb33",
  "3333333333333333",
  "3333333333333333",
];

const BRIDGE = [
  "8888888888888888",
  "9999999999999999",
  "bbbbbbbbbbbbbbbb",
  "aabbaabbaabbaabb",
  "aaaaaaaaaaaaaaaa",
  "aabbaabbaabbaabb",
  "bbbbbbbbbbbbbbbb",
  "9999999999999999",
  "8888888888888888",
  "9999999999999999",
  "bbbbbbbbbbbbbbbb",
  "aabbaabbaabbaabb",
  "aaaaaaaaaaaaaaaa",
  "bbbbbbbbbbbbbbbb",
  "9999999999999999",
  "8888888888888888",
];

const HAMLET = [
  "................",
  "......cccc......",
  ".....cccccc.....",
  "....cc2222cc....",
  "...cccccccccc...",
  "...ccceeeecc....",
  "...cc222222c....",
  "...ccccccccc....",
  "....cc....cc....",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
];

const TOWN = [
  "................",
  "....cc....cc....",
  "...cccc..cccc...",
  "..cc2222cc222cc.",
  ".cccccccccccccc.",
  ".ccceeeecceeeec.",
  ".ccc2222cc2222c.",
  ".cccccccccccccc.",
  ".ccc..c22c..ccc.",
  ".ccc..cccc..ccc.",
  "..cc........cc..",
  "................",
  "................",
  "................",
  "................",
  "................",
];

const FORT = [
  "c..............c",
  "cc....dddd....cc",
  "ccc..dddddd..ccc",
  ".cc.dd2222dd.cc.",
  "..ccddddddddcc..",
  "..cceeeeeeeecc..",
  "..cc22222222cc..",
  "..cccccccccccc..",
  "..cc..c22c..cc..",
  "..cc..cccc..cc..",
  "..cc........cc..",
  "...c........c...",
  "................",
  "................",
  "................",
  "................",
];

const CAPITAL = [
  "..dddddddddddd..",
  ".dccccccccccccd.",
  "dccc..dddd..cccd",
  "ccc..dd222dd.ccc",
  "cc..dddddddd..cc",
  "cc.dddeeeeddd.cc",
  "cc.ddd2222ddd.cc",
  "cc.dddddddddd.cc",
  "cc.ddd.c22c.ddcc",
  "cc.ddd.cccc.ddcc",
  "cc.ddd......ddcc",
  ".c.ddd......ddc.",
  "...ddd......ddd.",
  "....dd......dd..",
  "................",
  "................",
];

const PASS = [
  "................",
  "..77........77..",
  ".6776......6776.",
  ".6776......6776.",
  ".6776......6776.",
  "..77........77..",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
];

function grassRows(salt: number) {
  const rows: string[] = [];
  for (let y = 0; y < 16; y += 1) {
    let line = "";
    for (let x = 0; x < 16; x += 1) {
      const n = (x * 5 + y * 7 + salt) % 19;
      line += n === 0 ? "4" : n === 1 ? "5" : n === 4 ? "g" : n === 11 ? "d" : "3";
    }
    rows.push(line);
  }
  return rows;
}

const GRASS = grassRows(1);
const GRASS2 = grassRows(4);

function tint(ch: string, sky?: SkyReport): string | null {
  const base = PAL[ch];
  if (!base) return null;
  if (!sky || sky.weather === "不计") return base;
  const dry = sky.weather === "旱" || sky.disaster === "旱";
  if (ch === "3" || ch === "4" || ch === "5" || ch === "g") {
    if (sky.season === "冬") return ch === "5" ? "#b7c3d1" : ch === "4" || ch === "g" ? "#d5dee8" : "#f4f7fb";
    if (sky.season === "秋" || dry) return ch === "5" ? "#6a5030" : ch === "4" || ch === "g" ? "#8c6840" : "#c4a060";
    if (sky.season === "夏") return ch === "5" ? "#143c1c" : ch === "4" || ch === "g" ? "#1c5428" : "#246838";
  }
  if (sky.season === "冬" && (ch === "8" || ch === "9")) return ch === "8" ? "#8aa4c4" : "#4a6888";
  return base;
}

function pattern(kind: string, frame: number) {
  if (kind === "M") return MOUNT;
  if (kind === "F") return FOREST;
  if (kind === "W") return frame % 2 ? WATER.map((row) => row.slice(1) + row[0]) : WATER;
  if (kind === "R") return ROAD;
  if (kind === "B") return BRIDGE;
  if (kind === "g2") return GRASS2;
  return GRASS;
}

export function blitTile(ctx: CanvasRenderingContext2D, kind: string, ox: number, oy: number, frame: number, sky?: SkyReport) {
  const rows = pattern(kind, frame).slice(0, TILE);
  rows.forEach((line, y) => {
    [...line].slice(0, TILE).forEach((ch, x) => {
      const color = tint(ch, sky);
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    });
  });
}

export function blitSprite(ctx: CanvasRenderingContext2D, rows: string[], ox: number, oy: number) {
  rows.slice(0, TILE).forEach((line, y) => {
    [...line].slice(0, TILE).forEach((ch, x) => {
      const color = PAL[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    });
  });
}

export type CityRank = "hamlet" | "town" | "fort" | "capital";

export function cityRank(troops: number, capital: boolean): CityRank {
  if (capital) return "capital";
  if (troops >= 1400) return "fort";
  if (troops >= 700) return "town";
  return "hamlet";
}

export function blitCity(ctx: CanvasRenderingContext2D, ox: number, oy: number, rank: CityRank) {
  const art = rank === "capital" ? CAPITAL : rank === "fort" ? FORT : rank === "town" ? TOWN : HAMLET;
  blitSprite(ctx, art, ox, oy);
}

export function blitPass(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  blitSprite(ctx, PASS, ox, oy);
}

/** 势力色只用已有的魏蓝、蜀绿、吴红，以点阵铺在草地上，不用渐变。 */
export function blitWash(ctx: CanvasRenderingContext2D, ox: number, oy: number, color: string) {
  ctx.fillStyle = color;
  for (let y = 0; y < TILE; y += 2) {
    for (let x = (y / 2) % 2; x < TILE; x += 4) {
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
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
      ctx.fillStyle = "#d6ecff";
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
    ctx.fillStyle = "#284888";
    for (let x = 0; x < width; x += 3) ctx.fillRect(x, height - 6 - (phase % 3), 2, 2);
  }
  if (sky.disaster === "蝗") {
    for (let i = 0; i < 36; i += 1) {
      const x = Math.abs((i * 53 + phase * 3) % width);
      const y = Math.abs((i * 17 + Math.floor(phase / 2) * 5) % height);
      ctx.fillStyle = "#8c6840";
      ctx.fillRect(x, y, 3, 1);
      ctx.fillStyle = GOLD;
      ctx.fillRect(x, y, 1, 1);
      ctx.fillRect(x + 2, y, 1, 1);
    }
  }
  if (sky.disaster === "瘟疫") {
    ctx.fillStyle = "#3c9448";
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
