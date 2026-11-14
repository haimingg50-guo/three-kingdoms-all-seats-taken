"use client";

import { useEffect, useState } from "react";
import { Portrait } from "@/components/game/portraits";
import { blip } from "@/components/game/sfx";
import { useI18n } from "@/i18n/provider";
import type { Mood } from "@/components/game/bust";

export type StageKind = "battle" | "duel" | "fire" | "swear" | "memorial" | "death" | "vote" | "allegiance" | "turn";

export function stageFromEntries(entries: { kind: string; key?: string; text?: string }[], status?: string): StageKind {
  if (status === "memorial") return "memorial";
  const keys = entries.map((entry) => entry.key ?? "");
  if (keys.some((key) => key.startsWith("end.unify") || key === "end.memorial")) return "memorial";
  if (keys.some((key) => key.startsWith("war.death") || key.startsWith("court.execute"))) return "death";
  if (keys.some((key) => key.startsWith("war.duel"))) return "duel";
  if (keys.some((key) => key === "war.fire")) return "fire";
  if (keys.some((key) => key === "domestic.bond.sworn")) return "swear";
  if (entries.some((entry) => entry.kind.startsWith("ballot") || (entry.key ?? "").startsWith("ballot."))) return "vote";
  if (entries.some((entry) => entry.kind.startsWith("allegiance") || (entry.key ?? "").startsWith("allegiance."))) return "allegiance";
  if (keys.some((key) => key.startsWith("war.battle") || key === "war.occupy")) return "battle";
  return stageKind(entries.map((entry) => entry.text ?? ""), status);
}

export function stageKind(lines: string[], status?: string): StageKind {
  const text = lines.join("\n");
  if (status === "memorial" || text.includes("统一成立") || text.includes("纪念馆")) return "memorial";
  if (text.includes("战死")) return "death";
  if (text.includes("单挑")) return "duel";
  if (text.includes("火攻")) return "fire";
  if (text.includes("结义")) return "swear";
  if (text.includes("表决")) return "vote";
  if (text.includes("臣服") || text.includes("投降") || text.includes("投奔") || text.includes("下野") || text.includes("出仕") || text.includes("叛离")) return "allegiance";
  if (text.includes("出征") || text.includes("易主") || text.includes("未能破城")) return "battle";
  return "turn";
}

function moodFor(kind: StageKind, side: "left" | "right"): Mood {
  if (kind === "death" || (kind === "duel" && side === "right") || (kind === "battle" && side === "right")) return "hurt";
  if (kind === "allegiance" || kind === "vote") return "calm";
  if (kind === "duel" || kind === "fire" || kind === "battle") return "angry";
  return "calm";
}

export function Cutscene({
  title,
  lines,
  attackerId,
  defenderId,
  cloth,
  kind,
  onClose,
  inline = false,
}: {
  title: string;
  lines: string[];
  attackerId?: string;
  defenderId?: string | null;
  cloth?: string;
  kind: StageKind;
  onClose: () => void;
  inline?: boolean;
}) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(1);
  const text = lines[index] ?? "";
  useEffect(() => {
    if (count >= text.length) return;
    const timer = window.setTimeout(() => setCount((value) => value + 1), 28);
    return () => window.clearTimeout(timer);
  }, [count, text]);

  const advance = () => {
    if (count < text.length) {
      setCount(text.length);
      return;
    }
    if (index < lines.length - 1) {
      setIndex((value) => value + 1);
      setCount(1);
      blip("move");
      return;
    }
    blip("ok");
    onClose();
  };

  const showPair = kind === "battle" || kind === "duel" || kind === "fire" || kind === "swear" || kind === "death" || kind === "allegiance" || kind === "vote";
  const frame = (
      <div className={`nes-window nes-pop stage stage-${kind}`}>
        <h2 className="text-2xl text-primary">{title}</h2>
        {showPair && attackerId ? (
          <div className="clash-row mt-3">
            <span className={kind === "vote" ? "stage-stamp" : kind === "swear" || kind === "allegiance" ? "stage-bow" : "lunge-left"}>
              <Portrait id={attackerId} cloth={cloth} scale={3} mood={moodFor(kind, "left")} />
            </span>
            <span className="text-primary">{kind === "vote" ? t("stage.vote") : kind === "swear" ? t("stage.swear") : kind === "allegiance" ? t("stage.allegiance") : kind === "fire" ? t("stage.fire") : kind === "duel" ? t("stage.duel") : t("stage.clash")}</span>
            <span className={kind === "vote" ? "stage-stamp" : kind === "swear" || kind === "allegiance" ? "stage-bow" : "lunge-right"}>
              <Portrait id={defenderId ?? "garrison"} scale={3} mood={moodFor(kind, "right")} />
            </span>
          </div>
        ) : null}
        {kind === "memorial" ? <p className="stage-banner mt-3">{t("stage.banner")}</p> : null}
        {kind === "fire" ? <div className="stage-flames" aria-hidden="true" /> : null}
        <p className="stage-line mt-3">
          {text.slice(0, count)}
          <i className="nes-caret" />
        </p>
        <button type="button" className="nes-choice is-on mt-4" onClick={advance}>
          {index < lines.length - 1 || count < text.length ? t("stage.more") : t("stage.ok")}
        </button>
      </div>
  );
  if (inline) return frame;
  return (
    <div className="nes-overlay" role="dialog" aria-label={title}>
      {frame}
    </div>
  );
}
