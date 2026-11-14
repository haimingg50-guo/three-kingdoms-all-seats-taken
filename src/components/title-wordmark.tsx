"use client";

import { SeatCrest } from "@/components/seat-crest";
import { useI18n } from "@/i18n/provider";

export function TitleWordmark() {
  const { t } = useI18n();
  return (
    <div className="title-lockup">
      <SeatCrest size={128} />
      <h1 className="title-word" aria-label={t("brand.name")}>
        <span className="title-line">{t("brand.line1")}</span>
        <span className="title-line title-line-sub">{t("brand.line2")}</span>
      </h1>
    </div>
  );
}
