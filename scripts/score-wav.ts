/**
 * 把原创五声芯片曲写成短 WAV，方便离线试听。不进游戏包。
 * 用法：npx tsx scripts/score-wav.ts /opt/cursor/artifacts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { phraseTones, type Scene, type Tone } from "../src/components/game/score";

const RATE = 22050;

function mix(tones: { at: number; tone: Tone }[]) {
  const end = tones.reduce((max, item) => Math.max(max, item.at + item.tone.dur), 0) + 0.05;
  const pcm = new Float64Array(Math.ceil(end * RATE));
  let noise = 1;
  for (const item of tones) {
    const start = Math.floor(item.at * RATE);
    const len = Math.max(1, Math.floor(item.tone.dur * RATE));
    for (let i = 0; i < len; i += 1) {
      const t = i / RATE;
      noise = (noise * 16807) % 2147483647;
      let sample = 0;
      if (item.tone.wave === "square") sample = Math.sin(2 * Math.PI * item.tone.freq * t) >= 0 ? 1 : -1;
      else if (item.tone.wave === "triangle") {
        const phase = (item.tone.freq * t) % 1;
        sample = phase < 0.5 ? phase * 4 - 1 : 3 - phase * 4;
      } else sample = (noise / 2147483647) * 2 - 1;
      const env = 1 - i / len;
      const index = start + i;
      if (index < pcm.length) pcm[index] = (pcm[index] ?? 0) + sample * item.tone.gain * env;
    }
  }
  let peak = 0.001;
  for (const value of pcm) peak = Math.max(peak, Math.abs(value));
  const data = Buffer.alloc(pcm.length * 2);
  for (let i = 0; i < pcm.length; i += 1) {
    const clipped = Math.max(-1, Math.min(1, (pcm[i] ?? 0) / peak * 0.9));
    data.writeInt16LE(Math.round(clipped * 32767), i * 2);
  }
  return data;
}

function wav(data: Buffer) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const SCENES: Scene[] = ["title", "spring", "summer", "autumn", "winter", "battle", "chronicle", "memorial"];

const EFFECTS: { name: string; tones: { at: number; tone: Tone }[] }[] = [
  { name: "menu", tones: [{ at: 0, tone: { freq: 493.88, dur: 0.06, wave: "square", gain: 0.2 } }, { at: 0.2, tone: { freq: 392, dur: 0.07, wave: "square", gain: 0.2 } }, { at: 0.28, tone: { freq: 493.88, dur: 0.08, wave: "square", gain: 0.2 } }] },
  { name: "march", tones: [{ at: 0, tone: { freq: 90, dur: 0.08, wave: "noise", gain: 0.3 } }, { at: 0.1, tone: { freq: 110, dur: 0.08, wave: "triangle", gain: 0.25 } }] },
  { name: "duel", tones: [{ at: 0, tone: { freq: 880, dur: 0.04, wave: "square", gain: 0.2 } }, { at: 0.08, tone: { freq: 660, dur: 0.05, wave: "square", gain: 0.2 } }] },
  { name: "rain", tones: [{ at: 0, tone: { freq: 400, dur: 0.4, wave: "noise", gain: 0.25 } }] },
  { name: "death", tones: [{ at: 0, tone: { freq: 146.83, dur: 0.4, wave: "triangle", gain: 0.25 } }] },
  { name: "yield", tones: [{ at: 0, tone: { freq: 220, dur: 0.12, wave: "triangle", gain: 0.22 } }, { at: 0.14, tone: { freq: 293.66, dur: 0.18, wave: "triangle", gain: 0.22 } }] },
  { name: "depart", tones: [{ at: 0, tone: { freq: 440, dur: 0.1, wave: "square", gain: 0.18 } }, { at: 0.12, tone: { freq: 293.66, dur: 0.16, wave: "triangle", gain: 0.22 } }] },
  { name: "ballot", tones: [{ at: 0, tone: { freq: 293.66, dur: 0.06, wave: "square", gain: 0.2 } }, { at: 0.08, tone: { freq: 369.99, dur: 0.06, wave: "square", gain: 0.2 } }, { at: 0.16, tone: { freq: 440, dur: 0.12, wave: "square", gain: 0.2 } }] },
];

const dir = process.argv[2] ?? "/opt/cursor/artifacts";
mkdirSync(dir, { recursive: true });
for (const scene of SCENES) {
  const file = join(dir, `tianxia-${scene}.wav`);
  writeFileSync(file, wav(mix(phraseTones(scene, 2))));
  process.stdout.write(`${file}\n`);
}
for (const effect of EFFECTS) {
  const file = join(dir, `tianxia-sfx-${effect.name}.wav`);
  writeFileSync(file, wav(mix(effect.tones)));
  process.stdout.write(`${file}\n`);
}
