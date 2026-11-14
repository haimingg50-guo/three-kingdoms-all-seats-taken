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

function stamp(cells: string[][], x: number, y: number, w: number, h: number, tile: string) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      if (cells[yy]?.[xx] != null) cells[yy]![xx] = tile;
    }
  }
}

function pocketCells(cols: number, rows: number) {
  const cells = blank(cols, rows, "g");
  stamp(cells, 0, 0, cols, 1, "M");
  stamp(cells, 0, rows - 1, cols, 1, "M");
  stamp(cells, 0, 0, 1, rows, "M");
  stamp(cells, cols - 1, 0, 1, rows, "M");
  stamp(cells, 1, 1, 22, 2, "M");
  stamp(cells, 1, 1, 3, 8, "M");
  stamp(cells, 1, 12, 10, 5, "F");
  for (let y = 2; y <= 10; y += 1) stamp(cells, 20, y, 2, 1, "W");
  stamp(cells, 20, 11, cols - 21, rows - 12, "W");
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (cells[y]![x] === "g" && (x * 3 + y * 5) % 9 === 0) cells[y]![x] = "g2";
    }
  }
  return cells;
}

function classicCells(cols: number, rows: number) {
  const cells = blank(cols, rows, "g");
  stamp(cells, 0, 0, cols, 1, "M");
  stamp(cells, 0, rows - 1, cols, 1, "M");
  stamp(cells, 0, 0, 1, rows, "M");
  stamp(cells, cols - 1, 0, 1, rows, "M");
  stamp(cells, 1, 1, 8, 6, "M");
  stamp(cells, 1, 1, cols - 8, 2, "M");
  stamp(cells, 20, 1, 4, 2, "g");
  stamp(cells, 6, 12, 8, 2, "M");
  stamp(cells, 1, 16, 12, 7, "F");
  stamp(cells, 14, 18, 6, 3, "F");
  for (let x = 5; x <= 28; x += 1) cells[8]![x] = "W";
  for (let x = 12; x <= 36; x += 1) if (cells[16]?.[x]) cells[16]![x] = "W";
  stamp(cells, 34, 4, cols - 34, rows - 5, "W");
  stamp(cells, 28, 14, 4, 3, "F");
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (cells[y]![x] === "g" && (x + y * 2) % 11 === 0) cells[y]![x] = "g2";
    }
  }
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
