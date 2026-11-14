/** 原创五声音阶芯片曲。音级是宫商角徵羽，不是任何商业游戏的旋律。 */

export type Scene = "title" | "spring" | "summer" | "autumn" | "winter" | "battle" | "chronicle" | "memorial";

export const SCALE = [293.66, 329.63, 369.99, 440, 493.88];

export const PHRASES: Record<Scene, number[]> = {
  title: [0, 2, 4, 2, 3, 2, 0, 4],
  spring: [0, 2, 3, 4, 2, 0, 3, 2],
  summer: [2, 4, 3, 4, 2, 0, 2, 4],
  autumn: [4, 3, 2, 0, 2, 3, 1, 0],
  winter: [0, 0, 4, 2, 0, 3, 0, 0],
  battle: [0, 0, 3, 4, 3, 2, 0, 4],
  chronicle: [2, 0, 3, 0, 4, 2, 0, 0],
  memorial: [4, 2, 0, 3, 2, 0, 4, 0],
};

export function sceneTempo(scene: Scene) {
  if (scene === "battle") return 0.17;
  if (scene === "memorial" || scene === "winter") return 0.42;
  if (scene === "chronicle") return 0.36;
  return 0.3;
}

export interface Tone {
  freq: number;
  dur: number;
  wave: "square" | "triangle" | "noise";
  gain: number;
}

/** 把一句旋律展开成相对时间的音符，供浏览器和离线样例共用。 */
export function phraseTones(scene: Scene, bars = 4): { at: number; tone: Tone }[] {
  const phrase = PHRASES[scene];
  const step = sceneTempo(scene);
  const out: { at: number; tone: Tone }[] = [];
  const total = phrase.length * bars;
  for (let i = 0; i < total; i += 1) {
    const degree = phrase[i % phrase.length]!;
    const at = i * step;
    out.push({ at, tone: { freq: SCALE[degree]!, dur: step * 0.86, wave: "square", gain: 0.08 } });
    if (i % 2 === 0) {
      out.push({ at, tone: { freq: SCALE[0]! / 2, dur: step * 1.6, wave: "triangle", gain: 0.05 } });
    }
    if (scene === "battle" && i % 2 === 0) {
      out.push({ at, tone: { freq: 80, dur: 0.05, wave: "noise", gain: 0.06 } });
    }
  }
  return out;
}
