export type MotionMode = "on" | "low" | "off";

const KEY = "tianxia-motion";

export function readMotion(): MotionMode {
  if (typeof window === "undefined") return "on";
  const saved = window.localStorage.getItem(KEY);
  if (saved === "on" || saved === "low" || saved === "off") return saved;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "low";
  return "on";
}

export function writeMotion(mode: MotionMode) {
  window.localStorage.setItem(KEY, mode);
}

export function seenTurnKey(worldId: string) {
  return `tianxia-seen:${worldId}`;
}
