"use client";

import { useEffect, useState } from "react";
import { GUIDE_STORAGE_KEY, readGuide, type GuideSave } from "@/components/game/play";
import { useI18n } from "@/i18n/provider";

export function useGuide() {
  const [saved, setSaved] = useState<GuideSave>({ cursor: "seat", skipped: false });
  useEffect(() => {
    setSaved(readGuide(window.localStorage.getItem(GUIDE_STORAGE_KEY)));
  }, []);
  function write(next: GuideSave) {
    setSaved(next);
    window.localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(next));
  }
  return { saved, write };
}

export function GuideBar({
  id,
  text,
  canNext,
  onNext,
  onSkip,
}: {
  id: string;
  text: string;
  canNext: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { t } = useI18n();
  if (id === "done") return null;
  return (
    <div className="play-guide" data-guide={id} role="note">
      <p>{text}</p>
      <div className="play-guide-actions">
        {canNext ? (
          <button type="button" className="nes-choice is-on" onClick={onNext}>
            {t("play.guideNext")}
          </button>
        ) : null}
        <button type="button" className="nes-choice" onClick={onSkip}>
          {t("play.guideSkip")}
        </button>
      </div>
    </div>
  );
}
