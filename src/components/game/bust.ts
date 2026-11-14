import { createElement, type ReactNode } from "react";

/** 16×24 原创半身像。发型、须、眼罩只用来分人，衣色跟阵营走。 */
export type Mood = "calm" | "angry" | "hurt";

const INK = "#14121a";
const SKIN = "#f0c8a0";
const SKIN2 = "#e0a070";
const HAIR = "#3a2418";
const PALE = "#d8d0c0";
const EYE = "#1a120c";
const BLUSH = "#e89090";
const WOUND = "#d84848";
const CREAMISH = "#f4f0dc";

type Hair = "cap" | "top" | "wild" | "hood" | "crown" | "plume" | "cloth" | "helm";
type Beard = "none" | "short" | "long" | "bush";

interface Look {
  hair: Hair;
  beard: Beard;
  patch?: boolean;
  fan?: boolean;
  old?: boolean;
}

const CAST: Record<string, Look> = {
  "cao-cao": { hair: "crown", beard: "short" },
  "xiahou-dun": { hair: "top", beard: "short", patch: true },
  "xun-yu": { hair: "hood", beard: "none" },
  "guo-jia": { hair: "cloth", beard: "none" },
  "liu-bei": { hair: "crown", beard: "long" },
  "guan-yu": { hair: "cap", beard: "long" },
  "zhang-fei": { hair: "wild", beard: "bush" },
  "zhuge-liang": { hair: "cloth", beard: "none", fan: true },
  "sun-quan": { hair: "crown", beard: "none" },
  "zhou-yu": { hair: "top", beard: "none" },
  "lu-su": { hair: "hood", beard: "short" },
  "lu-xun": { hair: "top", beard: "none" },
  "lv-bu": { hair: "plume", beard: "none" },
  "yuan-shao": { hair: "crown", beard: "long" },
  "sima-yi": { hair: "hood", beard: "short" },
  "pang-tong": { hair: "wild", beard: "none" },
  "zhao-yun": { hair: "top", beard: "none" },
  "dian-wei": { hair: "wild", beard: "bush" },
  "gan-ning": { hair: "plume", beard: "none" },
  "huang-zhong": { hair: "cap", beard: "long", old: true },
  garrison: { hair: "helm", beard: "none" },
};

function lookOf(id: string): Look {
  if (CAST[id]) return CAST[id];
  let hash = 0;
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  const hairs: Hair[] = ["cap", "top", "hood", "helm"];
  const beards: Beard[] = ["none", "short", "none", "long"];
  return { hair: hairs[hash % hairs.length]!, beard: beards[hash % beards.length]! };
}

function shade(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - 40);
  const g = Math.max(0, ((n >> 8) & 255) - 40);
  const b = Math.max(0, (n & 255) - 40);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function bustGrid(id: string, cloth: string, mood: Mood = "calm"): (string | null)[][] {
  const grid: (string | null)[][] = Array.from({ length: 24 }, () => Array.from({ length: 16 }, () => null));
  const put = (x: number, y: number, color: string | null) => {
    if (color && x >= 0 && y >= 0 && x < 16 && y < 24) grid[y]![x] = color;
  };
  const look = lookOf(id);
  const hair = look.old ? PALE : HAIR;
  const skin = mood === "hurt" ? "#d8c0b0" : SKIN;
  for (let y = 4; y <= 14; y += 1) {
    for (let x = 4; x <= 11; x += 1) put(x, y, x > 9 ? SKIN2 : skin);
  }
  for (let x = 4; x <= 11; x += 1) {
    put(x, 3, INK);
    put(x, 15, INK);
  }
  for (let y = 4; y <= 14; y += 1) {
    put(3, y, INK);
    put(12, y, INK);
  }
  for (let y = 3; y <= 7; y += 1) {
    for (let x = 4; x <= 11; x += 1) put(x, y, hair);
  }
  if (look.hair === "wild" || look.hair === "plume") {
    put(2, 4, hair);
    put(13, 4, hair);
    put(2, 6, hair);
    put(13, 6, hair);
  }
  if (look.hair === "crown") {
    for (let x = 5; x <= 10; x += 1) put(x, 2, "#f0c040");
    put(6, 1, "#f0c040");
    put(9, 1, "#f0c040");
  }
  if (look.hair === "plume") {
    put(12, 1, WOUND);
    put(13, 2, WOUND);
    put(13, 3, "#f0c040");
  }
  if (look.hair === "hood" || look.hair === "cloth" || look.hair === "helm") {
    put(4, 8, hair);
    put(11, 8, hair);
  }
  if (look.hair === "helm") {
    for (let x = 5; x <= 10; x += 1) put(x, 5, "#9aa2b4");
  }
  put(6, 9, EYE);
  put(9, 9, EYE);
  put(5, 10, BLUSH);
  put(10, 10, BLUSH);
  if (look.patch) {
    put(5, 9, INK);
    put(6, 9, INK);
    put(6, 8, INK);
    put(4, 9, INK);
  }
  if (mood === "angry") {
    put(5, 8, INK);
    put(6, 8, INK);
    put(9, 8, INK);
    put(10, 8, INK);
    put(7, 12, WOUND);
    put(8, 12, WOUND);
    put(7, 13, INK);
    put(8, 13, INK);
  } else if (mood === "hurt") {
    put(9, 9, INK);
    put(8, 9, INK);
    put(10, 9, INK);
    put(10, 11, WOUND);
    put(11, 12, WOUND);
    put(7, 12, INK);
  } else {
    put(7, 12, INK);
    put(8, 12, INK);
  }
  if (look.beard === "short") {
    put(6, 13, hair);
    put(7, 13, hair);
    put(8, 13, hair);
    put(9, 13, hair);
  }
  if (look.beard === "long" || look.beard === "bush") {
    for (let y = 13; y <= 18; y += 1) {
      put(6, y, hair);
      put(7, y, hair);
      put(8, y, hair);
      put(9, y, hair);
      if (look.beard === "bush") {
        put(5, y, hair);
        put(10, y, hair);
      }
    }
  }
  const dark = shade(cloth);
  for (let y = 16; y <= 22; y += 1) {
    for (let x = 2; x <= 13; x += 1) put(x, y, x > 10 ? dark : cloth);
  }
  for (let x = 2; x <= 13; x += 1) put(x, 16, INK);
  put(5, 18, INK);
  put(10, 18, INK);
  put(4, 23, dark);
  put(11, 23, dark);
  if (look.fan) {
    put(14, 8, "#f0c040");
    put(14, 9, CREAMISH);
    put(14, 10, "#f0c040");
    put(14, 11, "#f4f0dc");
    put(13, 12, "#6a4030");
  }
  return grid;
}

export function blitBust(
  ctx: CanvasRenderingContext2D,
  id: string,
  ox: number,
  oy: number,
  cloth: string,
  mood: Mood = "calm",
) {
  bustGrid(id, cloth, mood).forEach((row, y) => {
    row.forEach((color, x) => {
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    });
  });
}

export function Bust({
  id,
  cloth = "#c4a060",
  scale = 2,
  mood = "calm",
}: {
  id: string;
  cloth?: string;
  scale?: number;
  mood?: Mood;
}) {
  const grid = bustGrid(id, cloth, mood);
  const rects: ReactNode[] = [];
  grid.forEach((row, y) => {
    row.forEach((color, x) => {
      if (!color) return;
      rects.push(createElement("rect", { key: `${x}-${y}`, x, y, width: 1, height: 1, fill: color }));
    });
  });
  return createElement(
    "svg",
    {
      width: 16 * scale,
      height: 24 * scale,
      viewBox: "0 0 16 24",
      shapeRendering: "crispEdges",
      "aria-hidden": true,
      className: "pixel-portrait",
    },
    rects,
  );
}
