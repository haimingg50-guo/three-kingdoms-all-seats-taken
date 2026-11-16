export interface AtlasCity {
  id: string;
  links: string[];
  isCapital: boolean;
  x: number;
  y: number;
}

export interface Atlas {
  cols: number;
  rows: number;
  cells: string[][];
  pos: Map<string, { x: number; y: number }>;
}

const POCKET: Record<string, { x: number; y: number }> = {
  xuchang: { x: 6, y: 8 },
  luoyang: { x: 15, y: 6 },
  jianye: { x: 25, y: 8 },
  chengdu: { x: 11, y: 14 },
};

/** 十二城的格子是按地理关系手摆的，不是把坐标撒到噪声地形上。 */
const CLASSIC: Record<string, { x: number; y: number }> = {
  wuwei: { x: 4, y: 6 },
  jinyang: { x: 11, y: 4 },
  beiping: { x: 22, y: 3 },
  ye: { x: 17, y: 6 },
  changan: { x: 8, y: 10 },
  luoyang: { x: 17, y: 11 },
  xiapi: { x: 30, y: 9 },
  xuchang: { x: 24, y: 13 },
  xiangyang: { x: 17, y: 16 },
  chengdu: { x: 7, y: 19 },
  jiangling: { x: 22, y: 19 },
  jianye: { x: 32, y: 17 },
  kuaiji: { x: 36, y: 20 },
};

function blank(cols: number, rows: number, fill: string) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
}

function clump(cells: string[][], cx: number, cy: number, rx: number, ry: number, tile: string) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      if (!cells[y]?.[x]) continue;
      const nx = rx === 0 ? 0 : (x - cx) / rx;
      const ny = ry === 0 ? 0 : (y - cy) / ry;
      if (nx * nx + ny * ny <= 1) cells[y]![x] = tile;
    }
  }
}

function speckle(cells: string[][]) {
  for (let y = 0; y < cells.length; y += 1) {
    for (let x = 0; x < (cells[0]?.length ?? 0); x += 1) {
      if (cells[y]![x] !== "g") continue;
      const n = Math.imul(x * 17 + y * 13, 374761393) >>> 0;
      if ((n ^ (n >>> 13)) % 17 === 0) cells[y]![x] = "g2";
    }
  }
}

function pocketCells(cols: number, rows: number) {
  const cells = blank(cols, rows, "g");
  clump(cells, 5, 1, 4, 1.6, "M");
  clump(cells, 14, 1, 3, 1.4, "M");
  clump(cells, 2, 8, 1.6, 3, "M");
  clump(cells, 7, 11.2, 4, 1.2, "M");
  clump(cells, 16, 12, 3, 1.3, "M");
  clump(cells, 4, 14.5, 2.4, 1.6, "F");
  clump(cells, 8, 15, 2, 1.2, "F");
  clump(cells, 18, 4, 1.4, 1.2, "F");
  const river = [[21, 3], [21, 4], [22, 5], [22, 6], [21, 7], [22, 8], [23, 9], [24, 10], [25, 11]];
  for (const [x, y] of river) if (cells[y]?.[x]) cells[y]![x] = "W";
  for (let y = 2; y < rows - 1; y += 1) {
    const coast = 27 + ((y * 3) % 5 === 0 ? -1 : (y % 4 === 0 ? 1 : 0));
    for (let x = coast; x < cols; x += 1) if (cells[y]?.[x]) cells[y]![x] = "W";
  }
  speckle(cells);
  return cells;
}

function classicCells(cols: number, rows: number) {
  const cells = blank(cols, rows, "g");
  clump(cells, 4, 3, 3.2, 2.4, "M");
  clump(cells, 8, 2, 2.2, 1.6, "M");
  clump(cells, 14, 1.5, 3, 1.3, "M");
  clump(cells, 28, 2, 2.5, 1.4, "M");
  clump(cells, 6, 13, 3, 1.3, "M");
  clump(cells, 10, 14, 2, 1.2, "M");
  clump(cells, 3, 19, 2.6, 2.2, "F");
  clump(cells, 8, 20, 2.2, 1.6, "F");
  clump(cells, 16, 21, 2, 1.4, "F");
  clump(cells, 30, 15, 1.8, 1.4, "F");
  for (let x = 4; x <= 30; x += 1) {
    const y = 8 + (x % 6 === 0 ? 1 : x % 6 === 3 ? -1 : 0);
    if (cells[y]?.[x]) cells[y]![x] = "W";
  }
  for (let x = 12; x <= 34; x += 1) {
    const y = 17 + (x % 5 === 0 ? -1 : 0);
    if (cells[y]?.[x] && cells[y]![x] !== "M") cells[y]![x] = "W";
  }
  for (let y = 4; y < rows - 1; y += 1) {
    const coast = 34 + (y % 3 === 0 ? -1 : 0);
    for (let x = coast; x < cols; x += 1) if (cells[y]?.[x]) cells[y]![x] = "W";
  }
  speckle(cells);
  return cells;
}

function fieldCells(cols: number, rows: number, seed: number) {
  const cells = blank(cols, rows, "g");
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) cells[y]![x] = "M";
      else if (x > cols - 6 && y > 3) cells[y]![x] = "W";
      else {
        const n = (x * 13 + y * 7 + seed) % 11;
        cells[y]![x] = n === 0 ? "F" : n === 1 && x < 5 ? "M" : n === 2 ? "g2" : "g";
      }
    }
  }
  return cells;
}

function lineRoad(cells: string[][], x0: number, y0: number, x1: number, y1: number) {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (let guard = 0; guard < 90; guard += 1) {
    const cell = cells[y]?.[x];
    if (cell && cell !== "C" && cell !== "K") cells[y]![x] = cell === "W" || cell === "B" ? "B" : "R";
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function place(cities: AtlasCity[], table: Record<string, { x: number; y: number }>, cols: number, rows: number) {
  const pos = new Map<string, { x: number; y: number }>();
  const used = new Set<string>();
  for (const city of cities) {
    const hand = table[city.id];
    let x = hand ? hand.x : Math.max(1, Math.min(cols - 2, Math.round((city.x / 100) * (cols - 1))));
    const y = hand ? hand.y : Math.max(1, Math.min(rows - 2, Math.round((city.y / 100) * (rows - 1))));
    while (used.has(`${x},${y}`)) x = Math.min(cols - 2, x + 1);
    used.add(`${x},${y}`);
    pos.set(city.id, { x, y });
  }
  return pos;
}

export function roadBetween(atlas: Atlas, fromId: string, toId: string) {
  const from = atlas.pos.get(fromId);
  const to = atlas.pos.get(toId);
  if (!from || !to) return [] as { x: number; y: number }[];
  const points: { x: number; y: number }[] = [];
  let x = from.x;
  let y = from.y;
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const sx = from.x < to.x ? 1 : -1;
  const sy = from.y < to.y ? 1 : -1;
  let err = dx - dy;
  for (let guard = 0; guard < 90; guard += 1) {
    points.push({ x, y });
    if (x === to.x && y === to.y) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return points;
}

export function buildAtlas(cities: AtlasCity[]): Atlas {
  const ids = new Set(cities.map((city) => city.id));
  const pocket = ids.size <= 4 && ["luoyang", "xuchang", "chengdu", "jianye"].every((id) => ids.has(id));
  const classic = !pocket && ["luoyang", "changan", "xuchang", "chengdu", "jianye"].every((id) => ids.has(id));
  const cols = pocket ? 32 : classic ? 40 : 24;
  const rows = pocket ? 18 : classic ? 24 : 16;
  const cells = pocket ? pocketCells(cols, rows) : classic ? classicCells(cols, rows) : fieldCells(cols, rows, cities.length * 3);
  const pos = place(cities, pocket ? POCKET : classic ? CLASSIC : {}, cols, rows);
  const seen = new Set<string>();
  for (const city of cities) {
    const from = pos.get(city.id);
    if (!from) continue;
    for (const link of city.links) {
      const key = [city.id, link].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);
      const to = pos.get(link);
      if (!to) continue;
      lineRoad(cells, from.x, from.y, to.x, to.y);
    }
  }
  for (const city of cities) {
    const at = pos.get(city.id);
    if (!at) continue;
    cells[at.y]![at.x] = city.isCapital ? "K" : "C";
  }
  return { cols, rows, cells, pos };
}
