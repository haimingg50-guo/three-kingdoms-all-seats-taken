"use client";

import { useEffect, useRef, useState } from "react";
import type { CueId } from "@/engine/cues";
import type { MotionMode } from "@/components/game/motion";
import { SCENE_FRAMES, SCENE_H, SCENE_W, paintScene } from "@/components/game/reel-scene";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";

const TITLE: Record<CueId, string> = {
  farm: "motion.farm",
  recruit: "motion.recruit",
  develop: "motion.develop",
  build: "motion.build",
  transport: "motion.transport",
  assault: "motion.assault",
  repulse: "motion.repulse",
  retreat: "motion.retreat",
  relocate: "motion.relocate",
  search: "motion.search",
  searchMiss: "motion.searchMiss",
  gather: "motion.gather",
  gatherMiss: "motion.gatherMiss",
  drill: "motion.drill",
  shop: "motion.shop",
  shopMiss: "motion.shopMiss",
  study: "motion.study",
  studyMiss: "motion.studyMiss",
  forge: "motion.forge",
  forgeMiss: "motion.forgeMiss",
  letter: "motion.letter",
  envoy: "motion.envoy",
  envoyMiss: "motion.envoyMiss",
  court: "motion.court",
  courtMiss: "motion.courtMiss",
  enlist: "motion.enlist",
  enlistMiss: "motion.enlistMiss",
  hold: "motion.hold",
  tame: "motion.tame",
  tameMiss: "motion.tameMiss",
};

export function Reel({
  cues,
  mode,
  onDone,
}: {
  cues: { id: CueId; line: string }[];
  mode: MotionMode;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [frame, setFrame] = useState(0);
  const ref = useRef<HTMLCanvasElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  const cue = cues[index];
  const reduced = mode !== "on";
  const wait = reduced ? 700 : 160 * SCENE_FRAMES;

  useEffect(() => {
    setFrame(0);
    skipRef.current?.focus();
  }, [index]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") done.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!cue) {
      done.current();
      return;
    }
    const tick = reduced ? 0 : window.setInterval(() => setFrame((value) => value + 1), 160);
    const next = window.setTimeout(() => setIndex((value) => value + 1), wait);
    return () => {
      if (tick) window.clearInterval(tick);
      window.clearTimeout(next);
    };
  }, [cue, index, reduced, wait]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !cue) return;
    paintScene(ctx, cue.id, frame, reduced);
  }, [cue, frame, reduced]);

  if (!cue) return null;
  return (
    <div className="nes-overlay" role="dialog" aria-label={t(TITLE[cue.id])}>
      <div className="nes-inset max-w-lg bg-card p-4">
        <p className="font-display text-2xl">{t(TITLE[cue.id])}</p>
        <canvas ref={ref} width={SCENE_W} height={SCENE_H} className="mt-2 w-full bg-[#8aa4c4]" />
        <p className="mt-2 text-sm">{cue.line}</p>
        <div className="mt-3 flex gap-2">
          <Button type="button" size="sm" ref={skipRef} onClick={onDone}>{t("motion.skip")}</Button>
          <Button type="button" size="sm" variant="outline" onClick={onDone}>{t("motion.close")}</Button>
        </div>
      </div>
    </div>
  );
}
