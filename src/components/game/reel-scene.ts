import type { CueId } from "@/engine/cues";

/** 过场画布。正常模式走 8 帧；减少动态时姿势钉在第 0 帧。 */
export const SCENE_W = 360;
export const SCENE_H = 200;
export const SCENE_FRAMES = 8;

const INK = "#14121a";
const CREAM = "#f4f0dc";
const GOLD = "#f0c040";
const RED = "#d84848";
const GREEN = "#3c9448";
const GREEN_D = "#2c7038";
const GREEN_S = "#1c5428";
const ROCK = "#9aa2b4";
const ROCK_D = "#5c6478";
const SAND = "#c4a060";
const SAND_D = "#8c6840";
const WOOD = "#6a4030";
const SKIN = "#f0c8a0";
const HAIR = "#3a2418";
const SKY = "#8aa4c4";

export interface Pose {
  arm: number;
  step: number;
  grow: number;
  strike: boolean;
}

const SWING = [18, 8, -6, -16, 4, 16, 10, -8];

export function poseAt(id: CueId, frame: number, reduced: boolean): Pose {
  const f = reduced ? 0 : ((frame % SCENE_FRAMES) + SCENE_FRAMES) % SCENE_FRAMES;
  return {
    arm: reduced ? 4 : SWING[f]!,
    step: reduced ? 0 : f % 2 === 0 ? 0 : 8,
    grow: reduced ? 0 : f,
    strike: !reduced && (f === 2 || f === 5),
  };
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

type Hat = "straw" | "helm" | "cloth" | "crown";
type Tool = "hoe" | "spear" | "hammer" | "none";

function limb(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function person(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pose: Pose,
  cloth: string,
  hat: Hat,
  tool: Tool,
) {
  const lift = pose.step > 0 ? -3 : 0;
  const stride = pose.step > 0 ? 7 : 0;
  ctx.fillStyle = "rgba(20,18,26,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  limb(ctx, x - 2, y - 26 + lift, x - 7 - stride, y, SAND_D, 5);
  limb(ctx, x + 2, y - 26 + lift, x + 7 + stride, y, WOOD, 5);
  ctx.fillStyle = cloth;
  ctx.beginPath();
  ctx.moveTo(x, y - 56 + lift);
  ctx.lineTo(x + 15, y - 48 + lift);
  ctx.lineTo(x + 11, y - 20 + lift);
  ctx.lineTo(x - 11, y - 20 + lift);
  ctx.lineTo(x - 15, y - 48 + lift);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.stroke();
  const hx = x + 16;
  const hy = y - 44 - pose.arm * 0.45 + lift;
  limb(ctx, x + 6, y - 48 + lift, hx, hy, cloth, 5);
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y - 66 + lift, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.arc(x, y - 68 + lift, 10, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.fillRect(x - 4, y - 68 + lift, 2, 2);
  ctx.fillRect(x + 3, y - 68 + lift, 2, 2);
  if (hat === "straw") {
    ctx.fillStyle = SAND;
    ctx.beginPath();
    ctx.ellipse(x, y - 74 + lift, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, x - 4, y - 84 + lift, 8, 8, SAND_D);
  } else if (hat === "helm") {
    ctx.fillStyle = ROCK;
    ctx.beginPath();
    ctx.arc(x, y - 72 + lift, 11, Math.PI, Math.PI * 2);
    ctx.fill();
    rect(ctx, x + 6, y - 86 + lift, 3, 10, RED);
  } else if (hat === "crown") {
    rect(ctx, x - 8, y - 80 + lift, 16, 5, GOLD);
    rect(ctx, x - 6, y - 88 + lift, 4, 8, GOLD);
    rect(ctx, x + 3, y - 88 + lift, 4, 8, GOLD);
  } else {
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.ellipse(x, y - 76 + lift, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, x - 5, y - 84 + lift, 10, 6, CREAM);
  }
  if (tool === "hoe") {
    limb(ctx, hx, hy, hx + 4, hy - 28, WOOD, 3);
    rect(ctx, hx - 6, hy - 30, 16, 4, ROCK_D);
  } else if (tool === "spear") {
    limb(ctx, x + 8, y - 92 + lift, x + 8, y - 18 + lift, WOOD, 3);
    ctx.fillStyle = ROCK;
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 102 + lift);
    ctx.lineTo(x + 14, y - 90 + lift);
    ctx.lineTo(x + 2, y - 90 + lift);
    ctx.closePath();
    ctx.fill();
  } else if (tool === "hammer") {
    limb(ctx, hx, hy, hx + 2, hy - 16, WOOD, 3);
    rect(ctx, hx - 7, hy - 20, 16, 6, ROCK_D);
  }
}

function sky(ctx: CanvasRenderingContext2D) {
  rect(ctx, 0, 0, SCENE_W, 78, SKY);
  rect(ctx, 0, 78, SCENE_W, 8, "#6a8aaa");
  rect(ctx, 40, 18, 28, 8, CREAM);
  rect(ctx, 220, 12, 36, 6, CREAM);
}

function ground(ctx: CanvasRenderingContext2D, dirt = false) {
  rect(ctx, 0, 86, SCENE_W, SCENE_H - 86, dirt ? SAND : GREEN);
  rect(ctx, 0, 86, SCENE_W, 6, dirt ? SAND_D : GREEN_D);
  for (let x = 8; x < SCENE_W; x += 22) rect(ctx, x, 150, 8, 3, dirt ? "#6a5030" : GREEN_S);
}

function field(ctx: CanvasRenderingContext2D, grow: number) {
  ground(ctx);
  for (let y = 100; y < 190; y += 14) {
    rect(ctx, 16, y, 328, 3, GREEN_S);
    rect(ctx, 16, y + 4, 328, 2, SAND_D);
  }
  const h = 10 + grow * 8;
  for (let x = 28; x < 340; x += 16) {
    rect(ctx, x, 176 - h, 3, h, GOLD);
    rect(ctx, x - 3, 174 - h, 9, 4, GREEN_D);
    rect(ctx, x - 1, 170 - h, 5, 3, GOLD);
  }
}

function wall(ctx: CanvasRenderingContext2D, x: number, stones: number) {
  rect(ctx, x, 78, 86, 110, ROCK_D);
  rect(ctx, x + 4, 82, 78, 100, ROCK);
  for (let i = 0; i < stones; i += 1) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    rect(ctx, x + 8 + col * 18, 150 - row * 16, 14, 10, i % 2 === 0 ? ROCK : "#b7c0d0");
  }
  for (let i = 0; i < 4; i += 1) rect(ctx, x + 6 + i * 20, 70, 12, 14, ROCK_D);
}

function gate(ctx: CanvasRenderingContext2D, x: number) {
  wall(ctx, x, 12);
  rect(ctx, x + 28, 130, 28, 58, INK);
  rect(ctx, x + 32, 136, 20, 46, "#3a4254");
  rect(ctx, x + 54, 48, 3, 36, WOOD);
  rect(ctx, x + 54, 48, 16, 10, RED);
}

function oxCart(ctx: CanvasRenderingContext2D, x: number, pose: Pose) {
  const bob = pose.step > 0 ? -2 : 0;
  rect(ctx, x + 36, 128 + bob, 46, 22, WOOD);
  rect(ctx, x + 40, 118 + bob, 28, 12, GOLD);
  rect(ctx, x + 70, 120 + bob, 16, 10, SAND);
  rect(ctx, x + 8, 124 + bob, 28, 16, SAND_D);
  rect(ctx, x + 2, 118 + bob, 12, 10, SAND);
  rect(ctx, x + 4, 114 + bob, 4, 6, CREAM);
  rect(ctx, x + 14, 140, 4, 10 + (pose.step > 0 ? 0 : 3), INK);
  rect(ctx, x + 24, 140, 4, 10 + (pose.step > 0 ? 3 : 0), INK);
  rect(ctx, x + 40, 146, 14, 14, INK);
  rect(ctx, x + 44, 150, 6, 6, SAND);
  rect(ctx, x + 64, 146, 14, 14, INK);
  rect(ctx, x + 68, 150, 6, 6, SAND);
  person(ctx, x + 48, 126 + bob, pose, RED, "cloth", "none");
}

function dust(ctx: CanvasRenderingContext2D, x: number, y: number, n: number) {
  for (let i = 0; i < 4; i += 1) rect(ctx, x + ((n + i) % 5) * 6, y - i * 3, 4, 3, i % 2 ? CREAM : SAND);
}

function still(): Pose {
  return { arm: 2, step: 0, grow: 0, strike: false };
}

function searchScene(ctx: CanvasRenderingContext2D, pose: Pose, miss: boolean) {
  sky(ctx);
  ground(ctx, true);
  gate(ctx, 4);
  rect(ctx, 96, 158, 240, 10, SAND);
  rect(ctx, 96, 168, 240, 4, SAND_D);
  person(ctx, 108 + pose.grow * 20, 172, pose, CREAM, "cloth", "none");
  if (!miss && pose.grow >= 4) {
    person(ctx, 312, 168, still(), "#6a7a4a", "cloth", "none");
    rect(ctx, 292, 132, 12, 16, CREAM);
  }
  if (miss && pose.grow >= 4) {
    rect(ctx, 300, 140, 18, 28, ROCK);
    rect(ctx, 304, 132, 10, 8, SAND);
  }
}

function gatherScene(ctx: CanvasRenderingContext2D, pose: Pose, miss: boolean) {
  sky(ctx);
  ground(ctx);
  rect(ctx, 36, 118, 54, 28, GREEN_D);
  rect(ctx, 248, 108, 46, 34, GREEN_S);
  person(ctx, 150, 172, pose, "#5c8a3a", "straw", "none");
  if (!miss) {
    const lift = Math.min(pose.grow, 5);
    rect(ctx, 176, 158 - lift * 3, 20, 16, SAND);
    rect(ctx, 180, 152 - lift * 3, 12, 6, GOLD);
  } else {
    rect(ctx, 196, 164, 16, 6, SAND_D);
  }
}

function drillScene(ctx: CanvasRenderingContext2D, pose: Pose) {
  sky(ctx);
  ground(ctx, true);
  rect(ctx, 24, 96, 6, 72, WOOD);
  rect(ctx, 24, 96, 30, 16, RED);
  for (let i = 0; i < 4; i += 1) {
    const bob = i % 2 === 0 ? 0 : pose.step > 0 ? -6 : 0;
    person(ctx, 96 + i * 58, 176 + bob, pose, RED, "helm", "spear");
  }
}

function shopScene(ctx: CanvasRenderingContext2D, pose: Pose, miss: boolean) {
  sky(ctx);
  ground(ctx);
  rect(ctx, 196, 96, 128, 72, WOOD);
  rect(ctx, 184, 86, 152, 14, RED);
  rect(ctx, 220, 112, 36, 20, SAND);
  person(ctx, 268, 156, still(), "#8a5a3a", "cloth", "none");
  person(ctx, 96 + pose.step, 176, pose, CREAM, "cloth", "none");
  if (!miss && pose.grow >= 2 && pose.grow < 6) {
    rect(ctx, 150, 150 - pose.grow * 8, 8, 8, GOLD);
  }
  if (!miss && pose.grow >= 5) rect(ctx, 78, 148, 18, 12, SAND);
  if (miss && pose.grow >= 3) {
    limb(ctx, 168, 128, 186, 146, INK, 3);
    limb(ctx, 186, 128, 168, 146, INK, 3);
  }
}

function studyScene(ctx: CanvasRenderingContext2D, pose: Pose, miss: boolean) {
  rect(ctx, 0, 0, SCENE_W, SCENE_H, "#3a342c");
  rect(ctx, 0, 156, SCENE_W, 44, WOOD);
  rect(ctx, 78, 124, 210, 16, SAND_D);
  const open = miss ? 24 : 24 + pose.grow * 16;
  rect(ctx, 110, 110, open, 14, CREAM);
  rect(ctx, 110, 110, 8, 14, "#c45a48");
  if (!miss) limb(ctx, 110 + open, 108, 110 + open, 128, WOOD, 2);
  person(ctx, 64, 168, pose, CREAM, "cloth", "none");
  person(ctx, 310, 160, { ...still(), arm: miss ? -10 : 10 }, "#6a5040", "cloth", "none");
}

function forgeScene(ctx: CanvasRenderingContext2D, pose: Pose, miss: boolean) {
  rect(ctx, 0, 0, SCENE_W, 96, miss ? "#2c2628" : "#5a3024");
  rect(ctx, 0, 96, SCENE_W, 104, "#3a322c");
  rect(ctx, 28, 64, 86, 100, "#241c18");
  const flame = miss ? 10 : 16 + (pose.grow % 2 === 0 ? 10 : 26);
  rect(ctx, 48, 118 - flame, 46, flame, miss ? "#5a4038" : pose.grow % 2 === 0 ? "#e07030" : "#ffb048");
  rect(ctx, 150, 140, 70, 16, ROCK_D);
  rect(ctx, 146, 136, 78, 6, "#6a6e78");
  person(ctx, 250, 172, pose, "#8a4030", "cloth", "none");
  const headY = miss ? 118 : pose.strike ? 132 : 78;
  limb(ctx, 210, 150, 186, headY, WOOD, 4);
  rect(ctx, 168, headY - 8, 36, 12, ROCK_D);
  if (!miss && pose.strike) dust(ctx, 168, 124, pose.grow);
  if (!miss && pose.grow >= 3) {
    const len = 8 + (pose.grow - 3) * 8;
    rect(ctx, 176, 132 - len, 6, len, "#d8dce4");
    rect(ctx, 170, 126 - len, 18, 6, GOLD);
  }
}

function letterX(pose: Pose, back: boolean) {
  if (!back) return 48 + pose.grow * 32;
  return pose.grow <= 4 ? 48 + pose.grow * 32 : 48 + (8 - pose.grow) * 32;
}

function camps(ctx: CanvasRenderingContext2D) {
  sky(ctx);
  ground(ctx);
  rect(ctx, 28, 108, 70, 40, "#6a3030");
  rect(ctx, 24, 100, 78, 10, SAND);
  rect(ctx, 262, 108, 70, 40, "#30486a");
  rect(ctx, 258, 100, 78, 10, SAND);
}

function letterScene(ctx: CanvasRenderingContext2D, pose: Pose) {
  camps(ctx);
  person(ctx, 62, 168, still(), RED, "cloth", "none");
  person(ctx, 300, 168, still(), "#5088d8", "cloth", "none");
  const x = letterX(pose, false);
  rect(ctx, x, 118, 22, 14, CREAM);
  rect(ctx, x, 118, 22, 3, RED);
}

function envoyScene(ctx: CanvasRenderingContext2D, pose: Pose, miss: boolean) {
  camps(ctx);
  const left = miss && pose.grow >= 5 ? 48 : 70;
  const right = miss && pose.grow >= 5 ? 314 : 292;
  person(ctx, left, 172, pose, RED, "cloth", "none");
  person(ctx, right, 172, pose, "#5088d8", "cloth", "none");
  const x = letterX(pose, miss);
  rect(ctx, x, 120, 22, 14, CREAM);
  rect(ctx, x, 120, 22, 3, miss ? INK : RED);
  if (!miss && pose.grow >= 6) {
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(180, 132, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function courtScene(ctx: CanvasRenderingContext2D, pose: Pose, miss: boolean) {
  rect(ctx, 0, 0, SCENE_W, SCENE_H, "#4a4038");
  rect(ctx, 0, 150, SCENE_W, 50, "#6a5848");
  rect(ctx, 36, 40, 16, 120, WOOD);
  rect(ctx, 308, 40, 16, 120, WOOD);
  rect(ctx, 110, 118, 140, 18, SAND_D);
  person(ctx, 180, 168, pose, CREAM, "crown", "none");
  person(ctx, 78, 172, still(), "#8a6848", "cloth", "none");
  person(ctx, 282, 172, still(), "#8a6848", "cloth", "none");
  if (!miss) rect(ctx, 168, 108 - Math.min(pose.grow, 4) * 2, 24, 14, CREAM);
  else {
    rect(ctx, 150, 124, 28, 8, CREAM);
    limb(ctx, 148, 120, 180, 136, INK, 2);
  }
}

function enlistScene(ctx: CanvasRenderingContext2D, pose: Pose, miss: boolean) {
  sky(ctx);
  ground(ctx, true);
  rect(ctx, 250, 88, 6, 80, WOOD);
  rect(ctx, 250, 88, 36, 18, GREEN);
  const x = miss ? Math.min(90 + pose.grow * 10, 150) : 80 + pose.grow * 16;
  person(ctx, x, 176, pose, CREAM, "cloth", !miss && pose.grow >= 6 ? "spear" : "none");
  person(ctx, 230, 168, still(), GREEN, "helm", "spear");
}

function holdScene(ctx: CanvasRenderingContext2D, pose: Pose) {
  sky(ctx);
  ground(ctx, true);
  wall(ctx, 120, 16);
  const flicker = pose.grow % 2 === 0 ? "#e09040" : "#ffd080";
  rect(ctx, 168, 78, 6, 16, WOOD);
  rect(ctx, 164, 70, 14, 10, flicker);
  person(ctx, 156, 108, { ...pose, step: 0 }, "#5088d8", "helm", "spear");
}

function tameScene(ctx: CanvasRenderingContext2D, pose: Pose, miss: boolean) {
  sky(ctx);
  ground(ctx);
  const hx = miss ? 250 + pose.grow * 6 : 250 - pose.grow * 8;
  rect(ctx, hx, 124, 46, 22, "#6a4030");
  rect(ctx, hx + 36, 110, 22, 16, "#5a3428");
  rect(ctx, hx + 46, 116, 8, 4, INK);
  limb(ctx, hx + 8, 146, hx + 4, 168, "#4a3028", 4);
  limb(ctx, hx + 28, 146, hx + 34, 168, "#4a3028", 4);
  person(ctx, 90, 172, pose, CREAM, "cloth", "none");
  if (!miss && pose.grow >= 3) rect(ctx, 120, 150, 14, 10, GOLD);
}

export function paintScene(ctx: CanvasRenderingContext2D, id: CueId, frame: number, reduced: boolean) {
  const pose = poseAt(id, frame, reduced);
  ctx.imageSmoothingEnabled = true;
  rect(ctx, 0, 0, SCENE_W, SCENE_H, INK);
  if (id === "farm") {
    sky(ctx);
    rect(ctx, 0, 70, 120, 20, GREEN_S);
    rect(ctx, 200, 64, 80, 24, GREEN_D);
    field(ctx, pose.grow);
    person(ctx, 78 + pose.step, 168, pose, "#5c8a3a", "straw", "hoe");
  } else if (id === "recruit") {
    sky(ctx);
    ground(ctx, true);
    gate(ctx, 8);
    for (let i = 0; i < 4; i += 1) {
      person(ctx, 150 + i * 42 + pose.step, 168, pose, RED, "helm", "spear");
    }
  } else if (id === "develop") {
    sky(ctx);
    ground(ctx, true);
    rect(ctx, 40, 150, 280, 18, SAND_D);
    for (let i = 0; i <= pose.grow; i += 1) rect(ctx, 48 + i * 32, 154, 22, 10, SAND);
    person(ctx, 70 + pose.grow * 18, 172, pose, CREAM, "cloth", "none");
  } else if (id === "build") {
    sky(ctx);
    ground(ctx, true);
    wall(ctx, 180, 4 + pose.grow);
    rect(ctx, 40, 124, 78, 36, WOOD);
    rect(ctx, 36, 116, 86, 8, RED);
    person(ctx, 130, 168, pose, CREAM, "cloth", "hammer");
  } else if (id === "transport") {
    sky(ctx);
    ground(ctx);
    rect(ctx, 0, 148, SCENE_W, 16, SAND_D);
    rect(ctx, 0, 152, SCENE_W, 8, SAND);
    oxCart(ctx, 30 + pose.grow * 28, pose);
    rect(ctx, 300, 108, 40, 48, ROCK);
    rect(ctx, 306, 100, 18, 8, GOLD);
  } else if (id === "assault" || id === "repulse") {
    sky(ctx);
    ground(ctx, true);
    wall(ctx, 230, 16);
    rect(ctx, 286, 52 + (pose.grow % 2) * 3, 3, 28, WOOD);
    rect(ctx, 286, 52 + (pose.grow % 2) * 3, 22, 12, id === "assault" ? RED : "#5088d8");
    rect(ctx, 248, 150, 8, 40, WOOD);
    for (let i = 0; i < 4; i += 1) rect(ctx, 244, 154 + i * 10, 16, 3, SAND);
    const back = id === "repulse" ? pose.grow * 10 : 0;
    const climb = id === "assault" ? pose.grow * 6 : 0;
    person(ctx, 180 - back, 168 - climb, pose, RED, "helm", "spear");
    person(ctx, 130 - back, 172, pose, RED, "helm", "spear");
    person(ctx, 250, 118, { ...pose, arm: 1, step: 0 }, "#5088d8", "helm", "spear");
    dust(ctx, 150, 180, pose.grow);
  } else if (id === "retreat") {
    sky(ctx);
    ground(ctx, true);
    rect(ctx, 0, 150, SCENE_W, 14, SAND_D);
    person(ctx, 250 - pose.grow * 16, 168, pose, CREAM, "helm", "spear");
    person(ctx, 200 - pose.grow * 16, 176, pose, RED, "helm", "none");
    person(ctx, 150 - pose.grow * 16, 168, pose, "#5088d8", "helm", "spear");
    rect(ctx, 300, 160, 14, 16, ROCK);
    dust(ctx, 260, 184, pose.grow);
  } else if (id === "relocate") {
    sky(ctx);
    ground(ctx);
    rect(ctx, 0, 154, SCENE_W, 12, SAND);
    gate(ctx, 250);
    person(ctx, 40, 168, { ...pose, step: 0, arm: 0 }, RED, "helm", "spear");
    person(ctx, 78, 176, { ...pose, step: 0, arm: 0 }, RED, "helm", "spear");
    person(ctx, 120 + pose.grow * 12, 168, pose, GREEN, "crown", "none");
  } else if (id === "search" || id === "searchMiss") {
    searchScene(ctx, pose, id === "searchMiss");
  } else if (id === "gather" || id === "gatherMiss") {
    gatherScene(ctx, pose, id === "gatherMiss");
  } else if (id === "drill") {
    drillScene(ctx, pose);
  } else if (id === "shop" || id === "shopMiss") {
    shopScene(ctx, pose, id === "shopMiss");
  } else if (id === "study" || id === "studyMiss") {
    studyScene(ctx, pose, id === "studyMiss");
  } else if (id === "forge" || id === "forgeMiss") {
    forgeScene(ctx, pose, id === "forgeMiss");
  } else if (id === "letter") {
    letterScene(ctx, pose);
  } else if (id === "envoy" || id === "envoyMiss") {
    envoyScene(ctx, pose, id === "envoyMiss");
  } else if (id === "court" || id === "courtMiss") {
    courtScene(ctx, pose, id === "courtMiss");
  } else if (id === "enlist" || id === "enlistMiss") {
    enlistScene(ctx, pose, id === "enlistMiss");
  } else if (id === "hold") {
    holdScene(ctx, pose);
  } else if (id === "tame" || id === "tameMiss") {
    tameScene(ctx, pose, id === "tameMiss");
  }
}
