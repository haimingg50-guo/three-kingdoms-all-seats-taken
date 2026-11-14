"use client";

import { useEffect, useState } from "react";
import type { SpectacleId } from "@/engine/spectacle";
import { videoUrlAllowed, type SpectacleMode } from "@/engine/spectacle";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";

const SPEC_KEY = "tianxia-spectacle";

export function readSpectacleMode(): SpectacleMode {
  if (typeof window === "undefined") return "on";
  const saved = window.localStorage.getItem(SPEC_KEY);
  return saved === "off" || saved === "low" ? saved : "on";
}

const FRAMES: Record<SpectacleId, string[]> = {
  "blade-rain": ["spec.blade.1", "spec.blade.2", "spec.blade.3"],
  "grain-check": ["spec.grain.1", "spec.grain.2", "spec.grain.3", "spec.grain.4"],
  hammer: ["spec.hammer.1", "spec.hammer.2", "spec.hammer.3", "spec.hammer.4"],
};

const TITLE: Record<SpectacleId, string> = {
  "blade-rain": "spec.blade",
  "grain-check": "spec.grain",
  hammer: "spec.hammer",
};

export function bladeEnding(outcome: string): string {
  if (outcome === "win") return "spec.blade.win";
  if (outcome === "lose") return "spec.blade.lose";
  return "spec.blade.draw";
}

export function Storyboard({ id, outcome, still = false }: { id: SpectacleId; outcome?: string; still?: boolean }) {
  const { t } = useI18n();
  const frames = [...FRAMES[id]];
  if (id === "blade-rain") frames.push(bladeEnding(outcome ?? "war.duel.draw"));
  return (
    <figure id={`story-${id}`} className={`story-board story-${id}`}>
      <figcaption className="font-display text-2xl">{t(TITLE[id])}</figcaption>
      <ol className={still ? "story-still" : "story-reel"}>
        {frames.map((key) => (
          <li key={key} className="story-frame">
            <span>{t(key)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground">{t("spec.pixel")}</p>
    </figure>
  );
}

export function Spectacle({ id, outcome, onClose }: { id: SpectacleId; outcome: string; onClose: () => void }) {
  const { t } = useI18n();
  const mode = readSpectacleMode();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (mode !== "on") return;
    let gone = false;
    void fetch("/spectacle/manifest.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: Record<string, string> | null) => {
        if (gone) return;
        setUrl(videoUrlAllowed("on", body?.[id]));
      })
      .catch(() => {
        if (!gone) setFailed(true);
      });
    return () => {
      gone = true;
    };
  }, [id, mode]);
  if (mode === "off") return null;
  const showVideo = mode === "on" && url && !failed;
  return (
    <div className="spectacle-layer" role="dialog" aria-label={t(TITLE[id])}>
      <div className="spectacle-card">
        {showVideo ? (
          <video className="spectacle-video" src={url} autoPlay playsInline onError={() => setFailed(true)} onEnded={onClose} />
        ) : (
          <Storyboard id={id} outcome={outcome} />
        )}
        {mode === "on" && !showVideo ? <p className="mt-2 text-xs text-muted-foreground">{t("spec.missing")}</p> : null}
        <p className="mt-2 text-xs">{t("spec.note")}</p>
        <Button type="button" size="sm" className="mt-3" onClick={onClose}>
          {t("spec.skip")}
        </Button>
      </div>
    </div>
  );
}
