import { PHRASES, SCALE, sceneTempo, type Scene, type Tone } from "@/components/game/score";

let ctx: AudioContext | undefined;
let master: GainNode | undefined;
let volume = 0.7;
let muted = true;
let scene: Scene = "title";
let cursor = 0;
let timer = 0;

const KEY = "tianxia-audio";

function context() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (!master) {
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  master.gain.value = muted ? 0 : volume;
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function remember() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify({ volume, muted }));
}

export function loadAudioPrefs() {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw) as { volume?: number; muted?: boolean };
    if (typeof saved.volume === "number") volume = Math.min(1, Math.max(0, saved.volume));
    if (typeof saved.muted === "boolean") muted = saved.muted;
  } catch {
    /* 坏掉的本地设置就当没开过声。 */
  }
}

export function audioState() {
  return { volume, muted, scene };
}

export function soundEnabled() {
  return !muted && volume > 0;
}

export function setVolume(next: number) {
  volume = Math.min(1, Math.max(0, next));
  if (volume > 0) muted = false;
  remember();
  const audio = context();
  if (audio && master) master.gain.value = muted ? 0 : volume;
  if (!muted) startLoop();
  return volume;
}

export function setMuted(next: boolean) {
  muted = next;
  remember();
  const audio = context();
  if (audio && master) master.gain.value = muted ? 0 : volume;
  if (!muted) startLoop();
  else window.clearInterval(timer);
  return muted;
}

export function setSound(next: boolean) {
  setMuted(!next);
  return soundEnabled();
}

function tone(audio: AudioContext, item: Tone, at: number) {
  if (!master) return;
  const gain = audio.createGain();
  gain.connect(master);
  const peak = item.gain * (muted ? 0 : 1);
  gain.gain.setValueAtTime(peak, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + item.dur);
  if (item.wave === "noise") {
    const length = Math.max(1, Math.floor(audio.sampleRate * item.dur));
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = audio.createBufferSource();
    src.buffer = buffer;
    src.connect(gain);
    src.start(at);
    src.stop(at + item.dur);
    return;
  }
  const osc = audio.createOscillator();
  osc.type = item.wave;
  osc.frequency.setValueAtTime(item.freq, at);
  osc.connect(gain);
  osc.start(at);
  osc.stop(at + item.dur + 0.02);
}

function startLoop() {
  window.clearInterval(timer);
  const audio = context();
  if (!audio || muted) return;
  const step = sceneTempo(scene);
  timer = window.setInterval(() => {
    const phrase = PHRASES[scene];
    const degree = phrase[cursor % phrase.length]!;
    tone(audio, { freq: SCALE[degree]!, dur: step * 0.85, wave: "square", gain: 0.07 }, audio.currentTime);
    if (cursor % 2 === 0) {
      tone(audio, { freq: SCALE[0]! / 2, dur: step * 1.4, wave: "triangle", gain: 0.04 }, audio.currentTime);
    }
    if (scene === "battle" && cursor % 2 === 0) {
      tone(audio, { freq: 80, dur: 0.05, wave: "noise", gain: 0.05 }, audio.currentTime);
    }
    cursor += 1;
  }, step * 1000);
}

export function setScene(next: Scene) {
  if (scene === next) return;
  scene = next;
  cursor = 0;
  if (!muted) startLoop();
}

/** 界面短音。旋律是为本界面新写的五声进行，不是任何游戏的曲调。 */
export function blip(kind: "move" | "ok" | "no" | "turn" | "march" | "take" | "duel" | "fire" | "rain" | "disaster" | "death" | "swear" | "yield" | "depart" | "ballot") {
  if (!soundEnabled()) return;
  const audio = context();
  if (!audio) return;
  const bank: Record<typeof kind, Tone[]> = {
    move: [{ freq: 493.88, dur: 0.06, wave: "square", gain: 0.05 }],
    ok: [
      { freq: 392, dur: 0.07, wave: "square", gain: 0.05 },
      { freq: 493.88, dur: 0.08, wave: "square", gain: 0.05 },
    ],
    no: [
      { freq: 196, dur: 0.08, wave: "square", gain: 0.05 },
      { freq: 147, dur: 0.1, wave: "square", gain: 0.05 },
    ],
    turn: [293.66, 369.99, 493.88, 440].map((freq) => ({
      freq,
      dur: 0.1,
      wave: "square" as const,
      gain: 0.05,
    })),
    march: [
      { freq: 90, dur: 0.08, wave: "noise", gain: 0.08 },
      { freq: 110, dur: 0.08, wave: "triangle", gain: 0.06 },
    ],
    take: [
      { freq: 329.63, dur: 0.1, wave: "square", gain: 0.06 },
      { freq: 493.88, dur: 0.16, wave: "square", gain: 0.06 },
    ],
    duel: [
      { freq: 880, dur: 0.04, wave: "square", gain: 0.04 },
      { freq: 660, dur: 0.05, wave: "square", gain: 0.04 },
    ],
    fire: [{ freq: 180, dur: 0.2, wave: "noise", gain: 0.07 }],
    rain: [{ freq: 400, dur: 0.25, wave: "noise", gain: 0.04 }],
    disaster: [
      { freq: 110, dur: 0.2, wave: "triangle", gain: 0.07 },
      { freq: 90, dur: 0.12, wave: "noise", gain: 0.06 },
    ],
    death: [{ freq: 146.83, dur: 0.35, wave: "triangle", gain: 0.07 }],
    swear: [
      { freq: 293.66, dur: 0.12, wave: "triangle", gain: 0.05 },
      { freq: 369.99, dur: 0.16, wave: "triangle", gain: 0.05 },
    ],
    yield: [
      { freq: 220, dur: 0.12, wave: "triangle", gain: 0.05 },
      { freq: 293.66, dur: 0.18, wave: "triangle", gain: 0.05 },
    ],
    depart: [
      { freq: 440, dur: 0.1, wave: "square", gain: 0.04 },
      { freq: 293.66, dur: 0.16, wave: "triangle", gain: 0.05 },
    ],
    ballot: [
      { freq: 293.66, dur: 0.06, wave: "square", gain: 0.05 },
      { freq: 369.99, dur: 0.06, wave: "square", gain: 0.05 },
      { freq: 440, dur: 0.1, wave: "square", gain: 0.05 },
    ],
  };
  bank[kind].forEach((item, index) => tone(audio, item, audio.currentTime + index * 0.08));
}

export function cueForEntry(entry: { key?: string; text?: string; params?: Record<string, string> }) {
  const key = entry.key ?? "";
  if (key.startsWith("war.death") || key === "war.duel.death" || key.startsWith("court.execute")) return "death" as const;
  if (key.startsWith("war.duel")) return "duel" as const;
  if (key === "war.fire") return "fire" as const;
  if (key === "domestic.bond.sworn") return "swear" as const;
  if (key.startsWith("ballot.")) return "ballot" as const;
  if (key.startsWith("allegiance.retire") || key === "allegiance.renounce") return "depart" as const;
  if (key.startsWith("allegiance.")) return "yield" as const;
  if (key === "war.battle.win" || key === "war.occupy") return "take" as const;
  if (key.startsWith("war.battle") || key === "war.occupy") return "march" as const;
  if (key === "climate.disaster" || key === "climate.linger") return "disaster" as const;
  if (key === "climate.sky" && (entry.params?.weather === "雨" || entry.params?.disaster === "涝")) return "rain" as const;
  if (entry.text) return cueForLine(entry.text);
  return null;
}

export function cueForLine(text: string) {
  if (text.includes("战死") || text.includes("退场")) return "death" as const;
  if (text.includes("单挑")) return "duel" as const;
  if (text.includes("火攻")) return "fire" as const;
  if (text.includes("结义")) return "swear" as const;
  if (text.includes("表决")) return "ballot" as const;
  if (text.includes("下野") || text.includes("叛离")) return "depart" as const;
  if (text.includes("臣服") || text.includes("投降") || text.includes("投奔") || text.includes("出仕")) return "yield" as const;
  if (text.includes("易主")) return "take" as const;
  if (text.includes("出征") || text.includes("未能破城")) return "march" as const;
  if (text.includes("天灾")) return "disaster" as const;
  if (text.includes("雨") || text.includes("涝")) return "rain" as const;
  return null;
}
