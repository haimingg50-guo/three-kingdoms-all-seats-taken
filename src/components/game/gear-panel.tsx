"use client";

import { useEffect, useState } from "react";
import { FORGE, LEARN_COST, SHOP } from "@/engine/gear";
import type { DomesticKind } from "@/engine/types";
import type { PublicKit } from "@/engine/view";
import { GEAR } from "@/i18n/glossary";
import { personName } from "@/i18n/render";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { blip } from "@/components/game/sfx";

export interface GearDraft {
  kind: DomesticKind;
  pattern?: string;
  itemId?: string;
  label?: string;
}

const SPEC_KEY = "tianxia-spectacle";

export function GearPanel({
  kit,
  locked,
  full,
  onAdd,
}: {
  kit: PublicKit;
  locked: boolean;
  full: boolean;
  onAdd: (action: GearDraft) => void;
}) {
  const { t, locale } = useI18n();
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState("on");
  useEffect(() => {
    const saved = window.localStorage.getItem(SPEC_KEY);
    if (saved === "off" || saved === "low" || saved === "on") setMode(saved);
  }, []);
  function setSpectacle(next: "on" | "off" | "low") {
    window.localStorage.setItem(SPEC_KEY, next);
    setMode(next);
    blip("move");
  }
  const name = (id: string) => GEAR[id]?.[locale] ?? id;
  const named = label.trim().slice(0, 8);
  function add(action: GearDraft) {
    if (locked || full) return;
    blip("move");
    onAdd(action);
  }
  return (
    <fieldset id="gear" className="space-y-2">
      <legend className="text-sm">{t("gear.title")}</legend>
      <p className="text-sm">{t("gear.purse", { n: kit.purse })}</p>
      <p className="text-sm">{t("gear.stock", kit.stock)}</p>
      <p className="text-xs text-muted-foreground">{t("gear.cap")}</p>
      <p className="text-xs text-muted-foreground">{t("gear.ap")}</p>
      <div className="gear-menu">
        {Object.entries(SHOP).map(([id, shop]) => (
          <Button key={id} type="button" size="sm" variant="outline" disabled={locked || full} onClick={() => add({ kind: "buy", pattern: id })}>
            {t("gear.buy")} {name(id)} {shop.price}
          </Button>
        ))}
      </div>
      <p className="text-sm">
        {t("gear.known")}：{kit.known.length ? kit.known.map((id) => name(id)).join("、") : t("gear.none")}
      </p>
      <div className="gear-menu">
        {Object.keys(FORGE).map((id) => (
          <Button key={id} type="button" size="sm" variant="outline" disabled={locked || full} onClick={() => add({ kind: "learn", pattern: id })}>
            {t("gear.learn")} {name(id)} {LEARN_COST}
          </Button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        {t("gear.name")}
        <input
          className="h-8 w-28 border border-border bg-card px-2"
          maxLength={8}
          value={label}
          disabled={locked}
          onChange={(event) => setLabel(event.target.value)}
        />
      </label>
      <div className="gear-menu">
        {Object.keys(FORGE).map((id) => (
          <Button key={id} type="button" size="sm" variant="outline" disabled={locked || full} onClick={() => add({ kind: "forge", pattern: id, ...(named ? { label: named } : {}) })}>
            {t("gear.forge")} {name(id)}
          </Button>
        ))}
        <Button type="button" size="sm" variant="outline" disabled={locked || full} onClick={() => add({ kind: "tame", ...(named ? { label: named } : {}) })}>
          {t("gear.tame")}
        </Button>
      </div>
      <ul className="text-sm">
        {kit.held.length === 0 ? <li className="text-muted-foreground">{t("status.empty")}</li> : null}
        {kit.held.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-2 border-b border-border/70 py-1">
            <span>
              {item.armory ? t("gear.armory") : t("gear.held")}
              {" "}
              {item.name && item.name !== "—" ? item.name : name(item.pattern)}
              {item.equipped ? ` · ${t("gear.worn")}` : ""}
            </span>
            <span className="text-xs text-muted-foreground">{t("gear.by")} {personName(item.makerId, locale, item.makerId)}</span>
            {item.armory ? null : (
              <>
                <Button type="button" size="sm" variant="outline" disabled={locked || full} onClick={() => add({ kind: "equip", itemId: item.id })}>
                  {t("gear.equip")}
                </Button>
                {item.equipped ? (
                  <Button type="button" size="sm" variant="outline" disabled={locked || full} onClick={() => add({ kind: "unequip", pattern: item.slot })}>
                    {t("gear.unequip")}
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="outline" disabled={locked || full} onClick={() => add({ kind: "donate", itemId: item.id })}>
                    {t("gear.donate")}
                  </Button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      <Button type="button" size="sm" variant="outline" disabled={locked || full} onClick={() => add({ kind: "draw" })}>
        {t("gear.draw")}
      </Button>
      <div className="gear-menu">
        <span className="text-xs text-muted-foreground">{t("spec.title")}</span>
        {(["on", "low", "off"] as const).map((id) => (
          <Button key={id} type="button" size="sm" variant={mode === id ? "default" : "outline"} onClick={() => setSpectacle(id)}>
            {t(`spec.${id}`)}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}
