import type { WorldState } from "./types";

/** 把结算结果写回原对象。新字段也要带上，否则旧存档会丢掉悬赏这类后加的状态。 */
export function adoptResolved(target: WorldState, next: WorldState) {
  const host = target as unknown as Record<string, unknown>;
  const incoming = next as unknown as Record<string, unknown>;
  for (const key of Object.keys(host)) {
    if (!(key in incoming)) delete host[key];
  }
  Object.assign(host, incoming);
}
