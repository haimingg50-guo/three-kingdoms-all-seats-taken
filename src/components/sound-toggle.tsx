"use client";

import { useEffect, useState } from "react";
import { audioState, loadAudioPrefs, setMuted, setScene, setVolume } from "@/components/game/sfx";
import { useI18n } from "@/i18n/provider";

export function TitleScore() {
  useEffect(() => {
    setScene("title");
  }, []);
  return null;
}

export function SoundToggle() {
  const { t } = useI18n();
  const [muted, setMutedState] = useState(true);
  const [volume, setVolumeState] = useState(70);

  useEffect(() => {
    loadAudioPrefs();
    const saved = audioState();
    setMutedState(saved.muted);
    setVolumeState(Math.round(saved.volume * 100));
  }, []);

  return (
    <span className="sound-box">
      <button
        type="button"
        className={muted ? "nes-choice" : "nes-choice is-on"}
        onClick={() => setMutedState(setMuted(!muted))}
      >
        {muted ? t("nav.mute") : t("nav.sound")}
      </button>
      <label className="sound-volume">
        {t("nav.volume")}
        <input
          type="range"
          min={0}
          max={100}
          value={muted ? 0 : volume}
          aria-label={t("nav.volume")}
          onChange={(event) => {
            const next = Number(event.target.value);
            setVolumeState(next);
            setVolume(next / 100);
            setMutedState(next === 0);
          }}
        />
      </label>
    </span>
  );
}
