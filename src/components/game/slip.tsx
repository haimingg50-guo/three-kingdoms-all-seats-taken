"use client";

import { useEffect, useRef, useState } from "react";
import { AMENDABLE } from "@/engine/config";
import { CHARGES } from "@/engine/order";
import type { DomesticKind, Order, VoteChoice } from "@/engine/types";
import type { PublicRole, PublicWorld } from "@/engine/view";
import { GearPanel } from "@/components/game/gear-panel";
import { GuideBar, useGuide } from "@/components/game/guide";
import { blip } from "@/components/game/sfx";
import { readMotion } from "@/components/game/motion";
import {
  draftHasStarter,
  draftStorageKey,
  guideFocus,
  nextGuide,
  orderLines,
  primaryFor,
  readStoredDraft,
  seatMeta,
  starterKinds,
  turnPhase,
} from "@/components/game/play";
import { Portrait } from "@/components/game/portraits";
import { Button } from "@/components/ui/button";
import { explain, useI18n } from "@/i18n/provider";
import { CHARGES as CHARGE_NAMES } from "@/i18n/glossary";
import { GEAR } from "@/i18n/glossary";
import { cityName, factionName, officeDisplay, personName } from "@/i18n/render";

function friendlyCities(world: PublicWorld, me: PublicRole) {
  const here = world.cities.find((city) => city.id === me.cityId);
  return (here?.links ?? [])
    .map((id) => world.cities.find((city) => city.id === id))
    .filter((city): city is PublicWorld["cities"][number] => Boolean(city && city.controllerId && city.controllerId === me.factionId));
}

function MoveOrder({
  world,
  me,
  draft,
  locked,
  onChange,
}: {
  world: PublicWorld;
  me: PublicRole;
  draft: Order;
  locked: boolean;
  onChange: (war: Order["war"]) => void;
}) {
  const { t, locale } = useI18n();
  const here = world.cities.find((city) => city.id === me.cityId);
  const friends = friendlyCities(world, me);
  return (
    <div className="space-y-2">
      <p className="text-sm">{here ? t("slip.here", { city: cityName(here.id, locale, here.name) }) : t("map.noGarrison")}</p>
      <Button
        type="button"
        size="sm"
        variant={draft.war?.type === "move" ? "default" : "outline"}
        disabled={locked || friends.length === 0}
        onClick={() => onChange({ type: "move", targetCityId: friends[0]?.id })}
      >
        {t("slip.move")}
      </Button>
      {friends.length === 0 ? <p className="text-sm text-muted-foreground">{t("slip.noFriend")}</p> : null}
      {draft.war?.type === "move" ? (
        <label className="block text-sm">
          {t("slip.moveTo")}
          <select
            className="mt-1 h-9 w-full border border-border bg-card px-2"
            disabled={locked}
            value={draft.war.targetCityId ?? ""}
            onChange={(event) => onChange({ type: "move", targetCityId: event.target.value })}
          >
            {friends.map((city) => (
              <option key={city.id} value={city.id}>{cityName(city.id, locale, city.name)}</option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

function clothOf(id: string | null) {
  if (id === "wei") return "#5088d8";
  if (id === "shu") return "#48a848";
  if (id === "wu") return "#d85848";
  return "#c4a060";
}

const RELIEF: { kind: DomesticKind; label: string }[] = [
  { kind: "raise_dike", label: "修堤" },
  { kind: "store_grain", label: "积谷" },
  { kind: "raise_clinic", label: "医营" },
  { kind: "dig_canal", label: "开渠" },
  { kind: "mend_road", label: "修路" },
  { kind: "relieve", label: "赈济" },
  { kind: "watch_sky", label: "观天" },
];

const RELIEF_KINDS = new Set(RELIEF.map((item) => item.kind));
const DEED_KINDS = new Set<DomesticKind>(["reward", "swear", "break_bond", "scheme", "release"]);

function blank(): Order {
  return { votes: [], domestic: [] };
}

async function send(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "没有完成");
  return data;
}

export function Slip({
  world,
  onDone,
  reviewing = false,
  onFocusMine,
}: {
  world: PublicWorld;
  onDone: () => void;
  reviewing?: boolean;
  onFocusMine?: () => void;
}) {
  const closed = world.status === "memorial" || world.status === "settled";
  if (closed) return <Closed world={world} />;
  if (!world.you) return <Claim world={world} onDone={onDone} />;
  return <Orders world={world} onDone={onDone} reviewing={reviewing} onFocusMine={onFocusMine} />;
}

function Closed({ world }: { world: PublicWorld }) {
  const { t, locale } = useI18n();
  const reason = world.closeReason?.startsWith("unify:")
    ? t("status.unified", { faction: factionName(world.closeReason.slice(6), locale) })
    : world.closeReason === "season"
      ? t("status.seasonClose")
      : world.closeReason;
  return (
    <div className="p-4">
      <h2 className="font-display text-3xl">{world.status === "memorial" ? t("status.memorial") : t("slip.closedTitle")}</h2>
      {world.status === "memorial" ? <p className="mt-2 text-primary">{t("slip.memorialName")}</p> : null}
      <p className="mt-2 leading-relaxed">{reason}</p>
      <p className="mt-3 text-sm text-muted-foreground">{t("slip.closed")}</p>
    </div>
  );
}

function SeatCard({
  role,
  world,
  picked,
  onPick,
}: {
  role: PublicRole;
  world: PublicWorld;
  picked: boolean;
  onPick: () => void;
}) {
  const { t, locale } = useI18n();
  const faction = world.factions.find((item) => item.id === role.factionId);
  const city = world.cities.find((item) => item.id === role.cityId);
  const where = city ? t("play.where", { city: cityName(city.id, locale, city.name) }) : t("play.whereNone");
  const meta = seatMeta({
    faction: faction ? factionName(faction.id, locale, faction.name) : null,
    office: officeDisplay(role, locale),
    where,
  });
  return (
    <button
      type="button"
      data-seat={role.id}
      aria-pressed={picked}
      disabled={role.seated}
      onClick={onPick}
      className={picked ? "seat-card is-on" : "seat-card"}
    >
      <Portrait id={role.id} cloth={clothOf(role.factionId)} scale={3} />
      <span className="seat-copy">
        <strong>{personName(role.id, locale, role.name)}</strong>
        <span>{meta}{role.seated ? ` · ${t("slip.taken")}` : ""}</span>
      </span>
    </button>
  );
}

function Claim({ world, onDone }: { world: PublicWorld; onDone: () => void }) {
  const { t, locale } = useI18n();
  const guide = useGuide();
  const [cityId, setCityId] = useState(world.cities[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cursor, setCursor] = useState("");
  const openRoles = world.roles.filter((role) => role.alive);
  const lords = openRoles.filter((role) => role.office === "lord");
  const groups = [
    ...world.factions.map((faction) => ({
      title: factionName(faction.id, locale, faction.name),
      roles: openRoles.filter((role) => role.factionId === faction.id && role.office !== "lord"),
    })),
    {
      title: t("roster.wanderers"),
      roles: openRoles.filter((role) => !role.factionId && role.office !== "citizen"),
    },
  ].filter((group) => group.roles.length > 0);

  async function take(body: { roleId?: string; citizen?: boolean; cityId?: string }) {
    setPending(true);
    setError(null);
    try {
      await send(`/api/worlds/${world.id}/claim`, "POST", body);
      blip("ok");
      onDone();
    } catch (caught) {
      blip("no");
      setError(explain(caught instanceof Error ? caught.message : t("slip.seatFail"), locale));
    } finally {
      setPending(false);
    }
  }

  const picked = cursor || lords[0]?.id || openRoles[0]?.id || "";
  const order = [...lords, ...groups.flatMap((group) => group.roles)];

  function move(delta: number) {
    const index = order.findIndex((role) => role.id === picked);
    const next = order[index + delta];
    if (!next) return;
    setCursor(next.id);
    blip("move");
  }

  const pickedRole = order.find((role) => role.id === picked);
  const focus = guideFocus({
    skipped: guide.saved.skipped,
    closed: false,
    seated: false,
    canStart: false,
    started: false,
    locked: false,
    cursor: guide.saved.cursor,
  });

  return (
    <div
      className="play-claim"
      data-phase="watch"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowRight") {
          event.preventDefault();
          move(1);
        }
        if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
          event.preventDefault();
          move(-1);
        }
        if (event.key === "Enter" && pickedRole && !pickedRole.seated) {
          event.preventDefault();
          void take({ roleId: picked });
        }
      }}
    >
      <p className="play-phase is-watch" role="status">
        <strong>{t("play.phase.watch")}</strong>
        <span>{t("play.note.watch")}</span>
      </p>
      <h2 className="font-display text-3xl">{t("slip.claimTitle")}</h2>
      <GuideBar
        id={focus}
        text={t("guide.seat")}
        canNext={false}
        onNext={() => undefined}
        onSkip={() => guide.write({ cursor: "done", skipped: true })}
      />
      <ul className="seat-grid">
        {lords.map((role) => (
          <li key={role.id}>
            <SeatCard role={role} world={world} picked={picked === role.id} onPick={() => { setCursor(role.id); blip("move"); }} />
          </li>
        ))}
      </ul>
      <button type="button" className="nes-choice is-on play-submit" disabled={pending || !pickedRole || pickedRole.seated} onClick={() => void take({ roleId: picked })}>
        {pickedRole ? t("play.sitAs", { name: personName(pickedRole.id, locale, pickedRole.name) }) : t("slip.confirmSeat")}
      </button>
      <details className="play-more">
        <summary>{t("play.otherSeats")}</summary>
        <div>
          {groups.map((group) => (
            <div key={group.title} className="mt-3">
              <h3>{group.title}</h3>
              <ul className="seat-grid">
                {group.roles.map((role) => (
                  <li key={role.id}>
                    <SeatCard role={role} world={world} picked={picked === role.id} onPick={() => { setCursor(role.id); blip("move"); }} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label className="text-sm">
              {t("slip.citizen")}
              <select className="mt-1 block h-10 border border-border bg-card px-2" value={cityId} onChange={(event) => setCityId(event.target.value)}>
                {world.cities.map((city) => (
                  <option key={city.id} value={city.id}>{cityName(city.id, locale, city.name)}</option>
                ))}
              </select>
            </label>
            <Button type="button" size="lg" disabled={pending} onClick={() => void take({ citizen: true, cityId })}>
              {t("slip.naming")}
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t("slip.citizenNote")}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {world.kind === "sandbox" ? t("slip.sandboxSwap") : t("slip.experimentLock")}
            {world.hiddenReserves > 0 ? ` ${t("slip.hidden", { n: world.hiddenReserves })}` : ""}
          </p>
        </div>
      </details>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function Orders({
  world,
  onDone,
  reviewing = false,
  onFocusMine,
}: {
  world: PublicWorld;
  onDone: () => void;
  reviewing?: boolean;
  onFocusMine?: () => void;
}) {
  const { t, locale } = useI18n();
  const guide = useGuide();
  const me = world.roles.find((role) => role.id === world.you?.roleId);
  const [draft, setDraft] = useState<Order>(world.you?.order ?? blank());
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sealed, setSealed] = useState(false);
  const locked = Boolean(world.you?.locked);
  const storageKey = world.you ? draftStorageKey(world.id, world.turn, world.you.roleId) : "";

  useEffect(() => {
    if (!storageKey) return;
    if (locked) {
      const next = world.you?.order ?? blank();
      draftRef.current = next;
      setDraft(next);
      return;
    }
    const next = readStoredDraft(window.sessionStorage.getItem(storageKey)) ?? blank();
    draftRef.current = next;
    setDraft(next);
    setSealed(false);
  }, [storageKey, locked, world.you?.order]);

  useEffect(() => {
    if (!storageKey || locked) return;
    window.sessionStorage.setItem(storageKey, JSON.stringify(draftRef.current));
  }, [draft, storageKey, locked]);

  if (!me || !world.you) return null;
  const officer = me.office === "lord" || me.office === "general" || me.office === "advisor";
  const voting = world.motions.filter((motion) => motion.status === "voting");
  const defense = world.motions.filter((motion) => motion.status === "defense" && motion.targetRoleId === me.id);
  const incoming = world.offers.filter((offer) => {
    if (offer.status !== "pending" && offer.status !== "delayed") return false;
    if (offer.kind === "defect") return offer.targetRoleId === me.id;
    return me.office === "lord" && offer.toFactionId === me.factionId;
  });
  const points = world.config.eco.action_points_per_turn;

  async function lock() {
    setPending(true);
    setError(null);
    try {
      await send(`/api/worlds/${world.id}/orders`, "POST", {
        votes: draft.votes,
        domestic: draft.domestic,
        ...(draft.motion ? { motion: draft.motion } : {}),
        ...(draft.diplomacy ? { diplomacy: draft.diplomacy } : {}),
        ...(draft.war ? { war: draft.war } : {}),
        ...(draft.plea ? { plea: draft.plea } : {}),
        ...(draft.remark ? { remark: draft.remark } : {}),
        ...(draft.letter ? { letter: draft.letter } : {}),
      });
      blip("ok");
      setSealed(true);
      onDone();
    } catch (caught) {
      blip("no");
      setError(explain(caught instanceof Error ? caught.message : t("slip.orderFail"), locale));
    } finally {
      setPending(false);
    }
  }

  async function unlock() {
    setPending(true);
    setError(null);
    try {
      await send(`/api/worlds/${world.id}/orders`, "DELETE");
      onDone();
    } catch (caught) {
      setError(explain(caught instanceof Error ? caught.message : t("slip.undoFail"), locale));
    } finally {
      setPending(false);
    }
  }

  function addDomestic(kind: DomesticKind) {
    if (draft.domestic.length >= points) return;
    setDraft({ ...draft, domestic: [...draft.domestic, { kind }] });
  }

  const phase = turnPhase({ seated: true, locked, sealOpen: sealed, reviewing, closed: false });
  const starters = starterKinds(me);
  const focus = guideFocus({
    skipped: guide.saved.skipped,
    closed: false,
    seated: true,
    canStart: starters.length > 0,
    started: draftHasStarter(draft),
    locked,
    cursor: guide.saved.cursor,
  });
  const faction = world.factions.find((item) => item.id === me.factionId);
  const home = world.cities.find((city) => city.id === me.cityId);
  const where = home ? t("play.where", { city: cityName(home.id, locale, home.name) }) : t("play.whereNone");
  const meta = seatMeta({
    faction: faction ? factionName(faction.id, locale, faction.name) : null,
    office: officeDisplay(me, locale),
    where,
  });
  const guideText = focus === "who"
    ? t("guide.who", { name: personName(me.id, locale, me.name), meta, points })
    : focus === "act"
      ? (starters.length > 0 ? t("guide.act") : t("guide.actGone"))
      : focus === "draft"
        ? t("guide.draft")
        : focus === "wait"
          ? t("guide.wait")
          : "";
  const lines = orderLines(draft);

  return (
    <form
      className="play-order"
      data-phase={phase}
      onSubmit={(event) => {
        event.preventDefault();
        void lock();
      }}
    >
      <p className={`play-phase is-${phase}`} data-phase={phase} role="status">
        <strong>{t(`play.phase.${phase}`)}</strong>
        <span>
          {phase === "waiting"
            ? t("play.note.waiting", { seated: world.seatedCount, locked: world.lockedCount })
            : t(`play.note.${phase}`)}
        </span>
      </p>
      {sealed ? (
        <div className={readMotion() === "off" ? "seal-banner" : "seal-banner is-on"} role="status">
          <p className="font-display text-2xl">{t("slip.seal")}</p>
          <p>{t("play.note.sealed")}</p>
          <button type="button" className="play-quiet" onClick={() => setSealed(false)}>{t("slip.sealSkip")}</button>
        </div>
      ) : null}
      <button type="button" className="seat-card is-on" onClick={() => onFocusMine?.()}>
        <Portrait id={me.id} cloth={clothOf(me.factionId)} scale={3} />
        <span className="seat-copy">
          <strong>{t("play.you", { name: personName(me.id, locale, me.name) })}</strong>
          <span>{meta}</span>
          <span>{t("play.points", { points, used: draft.domestic.length })}</span>
        </span>
      </button>
      {world.turn > 1 && !locked && !reviewing ? (
        <p className="mt-2">{t("board.wrote", { turn: world.turn - 1, now: world.turn })}</p>
      ) : null}
      <GuideBar
        id={focus}
        text={guideText}
        canNext={focus === "who"}
        onNext={() => guide.write({ cursor: nextGuide(focus === "done" ? "wait" : focus), skipped: false })}
        onSkip={() => guide.write({ cursor: "done", skipped: true })}
      />

      {officer ? (
        <fieldset>
          <legend className="text-sm">{t("slip.move")}</legend>
          <MoveOrder world={world} me={me} draft={draft} locked={locked} onChange={(war) => setDraft({ ...draft, war })} />
        </fieldset>
      ) : null}

      {voting.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm">{t("slip.pendingVote")}</legend>
          {voting.map((motion) => (
            <div key={motion.id} className="border border-border p-2">
              <p className="text-sm">{motionLabel(world, motion.type, t, locale, motion.targetRoleId, motion.charge)}</p>
              <div className="nes-menu mt-2">
                {(["aye", "nay", "silent"] as VoteChoice[]).map((choice) => (
                  <Button
                    key={choice}
                    type="button"
                    size="sm"
                    variant={draft.votes.find((vote) => vote.motionId === motion.id)?.choice === choice ? "default" : "outline"}
                    disabled={locked || (choice === "silent" && world.config.comm.menu_expressiveness === "minimal")}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        votes: [...draft.votes.filter((vote) => vote.motionId !== motion.id), { motionId: motion.id, choice }],
                      })
                    }
                  >
                    {choice === "aye" ? t("choice.aye") : choice === "nay" ? t("choice.nay") : t("choice.silent")}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </fieldset>
      ) : null}

      {defense.map((motion) => (
        <fieldset key={motion.id}>
          <legend className="text-sm">{t("slip.pleaTitle")}</legend>
          <div className="nes-menu mt-2">
            {(["deny", "admit", "silent"] as const).map((plea) => (
              <Button
                key={plea}
                type="button"
                size="sm"
                variant={draft.plea?.plea === plea ? "default" : "outline"}
                disabled={locked}
                onClick={() => setDraft({ ...draft, plea: { motionId: motion.id, plea } })}
              >
                {plea === "deny" ? t("plea.deny") : plea === "admit" ? t("plea.admit") : t("plea.silence")}
              </Button>
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset>
        <legend>{t("play.now")}</legend>
        <p className="mt-1">{t("play.nowNote")}</p>
        {draft.domestic.length >= points ? <p>{t("play.pointsFull")}</p> : null}
        <div className="play-actions">
          {primaryFor(me).map((kind) => (
            <Button
              key={kind}
              type="button"
              size="sm"
              className={focus === "act" && (kind === "farm" || kind === "search") ? "play-suggest" : undefined}
              variant={draft.domestic.some((action) => action.kind === kind) ? "default" : "outline"}
              disabled={locked || draft.domestic.length >= points}
              title={draft.domestic.length >= points ? t("play.pointsFull") : undefined}
              onClick={() => { blip("move"); addDomestic(kind); }}
            >
              {t(`act.${kind}`)}
            </Button>
          ))}
        </div>
        <ul className="mt-2 text-sm">
          {draft.domestic.filter((action) => !RELIEF_KINDS.has(action.kind) && !DEED_KINDS.has(action.kind)).map((action) => {
            const index = draft.domestic.indexOf(action);
            return (
            <li key={`${action.kind}-${index}`} className="flex items-center gap-2">
              <span>
                {t(`act.${action.kind}`)}
                {action.pattern ? ` ${GEAR[action.pattern]?.[locale] ?? action.pattern}` : ""}
                {action.label ? `「${action.label}」` : ""}
              </span>
              {action.kind === "transport" ? (
                <select
                  className="h-8 border border-border bg-card px-1"
                  disabled={locked}
                  value={action.destCityId ?? ""}
                  onChange={(event) => {
                    const domestic = draft.domestic.slice();
                    domestic[index] = { ...action, destCityId: event.target.value };
                    setDraft({ ...draft, domestic });
                  }}
                >
                  <option value="">{t("slip.neighbor")}</option>
                  {world.cities
                    .find((city) => city.id === me.cityId)
                    ?.links.map((link) => (
                      <option key={link} value={link}>{cityName(link, locale, world.cities.find((city) => city.id === link)?.name ?? link)}</option>
                    ))}
                </select>
              ) : null}
              <button
                type="button"
                className="text-muted-foreground"
                disabled={locked}
                onClick={() => setDraft({ ...draft, domestic: draft.domestic.filter((_, item) => item !== index) })}
              >
                {t("slip.remove")}
              </button>
            </li>
            );
          })}
        </ul>
      </fieldset>

      <details className="play-more">
        <summary>{t("play.foldKit")}</summary>
        <div>
      <p className="mb-2">{t("play.moreNote")}</p>
      <GearPanel
        kit={world.you.kit}
        locked={locked}
        full={draft.domestic.length >= points}
        onAdd={(action) => {
          if (draft.domestic.length >= points) return;
          setDraft({ ...draft, domestic: [...draft.domestic, action] });
        }}
      />

      {world.config.relief.enabled ? (
        <fieldset>
          <legend className="text-sm">{t("slip.relief")}</legend>
          <p className="mt-1 text-sm text-primary">{t("slip.reliefNote", { points })}</p>
          <div className="nes-menu mt-2">
            {RELIEF.map((item) => (
              <Button key={item.kind} type="button" size="sm" variant={draft.domestic.some((action) => action.kind === item.kind) ? "default" : "outline"} disabled={locked || draft.domestic.length >= points} onClick={() => { blip("move"); addDomestic(item.kind); }}>
                {t(`act.${item.kind}`)}
              </Button>
            ))}
          </div>
          <ul className="mt-2 text-sm">
            {draft.domestic.filter((action) => RELIEF_KINDS.has(action.kind)).map((action) => {
              const index = draft.domestic.indexOf(action);
              const here = world.cities.find((city) => city.id === me.cityId);
              return (
                <li key={`${action.kind}-${index}`} className="flex flex-wrap items-center gap-2">
                  <span>{t(`act.${action.kind}`)}</span>
                  {action.kind === "mend_road" || action.kind === "relieve" ? (
                    <select
                      className="h-8 border border-border bg-card px-1"
                      disabled={locked}
                      value={action.destCityId ?? ""}
                      onChange={(event) => {
                        const domestic = draft.domestic.slice();
                        domestic[index] = { ...action, destCityId: event.target.value };
                        setDraft({ ...draft, domestic });
                      }}
                    >
                      <option value="">{action.kind === "mend_road" ? t("slip.road") : t("slip.hitCity")}</option>
                      {(action.kind === "mend_road" ? here?.links ?? [] : world.cities.map((city) => city.id).filter((id) => id !== me.cityId)).map((id) => (
                        <option key={id} value={id}>{world.cities.find((city) => city.id === id)?.name}</option>
                      ))}
                    </select>
                  ) : null}
                  <button type="button" className="text-muted-foreground" disabled={locked} onClick={() => setDraft({ ...draft, domestic: draft.domestic.filter((_, item) => item !== index) })}>
                    {t("slip.remove")}
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}

      <fieldset>
        <legend className="text-sm">{t("slip.deeds")}</legend>
        <p className="mt-1 text-sm text-primary">{t("slip.deedsNote", { gold: world.config.deeds.reward_gold })}</p>
        <div className="nes-menu mt-2">
          {([
            ["reward", "act.reward"],
            ["swear", "act.swear"],
            ["break_bond", "act.break_bond"],
            ["fire", "act.fire"],
            ["discord", "act.discord"],
            ["rumor", "act.rumor"],
          ] as const).map(([kind, label]) => (
            <Button key={kind} type="button" size="sm" variant="outline" disabled={locked || draft.domestic.length >= points} onClick={() => {
              blip("move");
              const action = kind === "fire" || kind === "discord" || kind === "rumor"
                ? { kind: "scheme" as const, scheme: kind }
                : { kind };
              setDraft({ ...draft, domestic: [...draft.domestic, action] });
            }}>
              {t(label)}
            </Button>
          ))}
        </div>
        <ul className="mt-2 text-sm">
          {draft.domestic.filter((action) => action.kind === "reward" || action.kind === "swear" || action.kind === "break_bond" || action.kind === "scheme").map((action) => {
            const index = draft.domestic.indexOf(action);
            const label = t(action.kind === "scheme" ? (action.scheme === "fire" ? "act.fire" : action.scheme === "discord" ? "act.discord" : "act.rumor") : action.kind === "reward" ? "act.reward" : action.kind === "swear" ? "act.swear" : "act.break_bond");
            return (
              <li key={`${action.kind}-${index}`} className="flex flex-wrap items-center gap-2">
                <span>{label}</span>
                {action.kind === "swear" || action.kind === "break_bond" || action.scheme === "discord" ? (
                  <select className="h-8 border border-border bg-card px-1" disabled={locked} value={action.targetRoleId ?? ""} onChange={(event) => {
                    const domestic = draft.domestic.slice();
                    domestic[index] = { ...action, targetRoleId: event.target.value };
                    setDraft({ ...draft, domestic });
                  }}>
                    <option value="">{t("slip.person")}</option>
                    {world.roles.filter((role) => role.alive && role.id !== me.id).map((role) => (
                      <option key={role.id} value={role.id}>{personName(role.id, locale, role.name)}</option>
                    ))}
                  </select>
                ) : null}
                {action.scheme === "rumor" ? (
                  <select className="h-8 border border-border bg-card px-1" disabled={locked} value={action.destCityId ?? ""} onChange={(event) => {
                    const domestic = draft.domestic.slice();
                    domestic[index] = { ...action, destCityId: event.target.value };
                    setDraft({ ...draft, domestic });
                  }}>
                    <option value="">{t("slip.enemy")}</option>
                    {world.cities.filter((city) => city.id !== me.cityId).map((city) => (
                      <option key={city.id} value={city.id}>{cityName(city.id, locale, city.name)}</option>
                    ))}
                  </select>
                ) : null}
                <button type="button" className="text-muted-foreground" disabled={locked} onClick={() => setDraft({ ...draft, domestic: draft.domestic.filter((_, item) => item !== index) })}>{t("slip.remove")}</button>
              </li>
            );
          })}
        </ul>
      </fieldset>
        </div>
      </details>

      {incoming.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm">{t("slip.offers")}</legend>
          {incoming.map((offer) => (
            <div key={offer.id} className="border border-border p-2 text-sm">
              <p>
                {(() => {
                  const role = world.roles.find((item) => item.id === offer.targetRoleId);
                  const faction = world.factions.find((item) => item.id === offer.fromFactionId);
                  return role ? personName(role.id, locale, role.name) : faction ? factionName(faction.id, locale, faction.name) : t("motion.someone");
                })()}
                {t(`kind.${offer.kind}`)}
                {offer.cityId ? t("slip.offerCity", { city: cityName(offer.cityId, locale) }) : ""}
              </p>
              <div className="nes-menu mt-2">
                {(["accept", "reject", "delay", "conditional", "silent"] as const).map((response) => (
                  <Button
                    key={response}
                    type="button"
                    size="sm"
                    variant={draft.diplomacy?.offerId === offer.id && draft.diplomacy.response === response ? "default" : "outline"}
                    disabled={locked || (!world.config.comm.contract_system && response === "conditional") || (world.config.comm.menu_expressiveness !== "rich" && response === "conditional")}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        diplomacy: { type: "respond", offerId: offer.id, response, condition: response === "conditional" ? "cede_city" : undefined },
                      })
                    }
                  >
                    {response === "accept" ? t("dip.accept") : response === "reject" ? t("dip.reject") : response === "delay" ? t("dip.delay") : response === "silent" ? t("dip.silent") : t("dip.condition")}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </fieldset>
      ) : null}

      {(() => {
        const vote = (world.submitBallots ?? []).find((item) => item.status === "open" && item.factionId === me.factionId && item.turn < world.turn);
        if (!vote || !me.seated) return null;
        const already = vote.ballots.some((ballot) => ballot.roleId === me.id);
        const choice = draft.diplomacy?.type === "ballot" && draft.diplomacy.voteId === vote.id ? draft.diplomacy.choice : undefined;
        return (
          <fieldset className="space-y-2">
            <legend className="text-sm">{t("slip.ballot")}</legend>
            <p className="text-sm text-muted-foreground">
              {t("slip.ballotNote", {
                host: factionName(vote.targetFactionId, locale, world.factions.find((faction) => faction.id === vote.targetFactionId)?.name ?? ""),
                bar: world.config.allegiance?.submit_threshold === 2 / 3 ? "2/3" : String(world.config.allegiance?.submit_threshold ?? "2/3"),
              })}
            </p>
            {already ? <p className="text-sm">{t("slip.voted")}</p> : (
              <>
                <div className="nes-menu">
                  <Button type="button" size="sm" variant={choice === "aye" ? "default" : "outline"} disabled={locked} onClick={() => setDraft({ ...draft, diplomacy: { type: "ballot", voteId: vote.id, choice: "aye" } })}>{t("vote.aye")}</Button>
                  <Button type="button" size="sm" variant={choice === "nay" ? "default" : "outline"} disabled={locked} onClick={() => setDraft({ ...draft, diplomacy: { type: "ballot", voteId: vote.id, choice: "nay" } })}>{t("vote.nay")}</Button>
                </div>
                {choice === "nay" && (me.office === "general" || me.office === "advisor") ? (
                  <div className="nes-menu">
                    <Button type="button" size="sm" variant={draft.diplomacy?.contingent === "retire" ? "default" : "outline"} disabled={locked} onClick={() => setDraft({ ...draft, diplomacy: { type: "ballot", voteId: vote.id, choice: "nay", contingent: "retire" } })}>{t("vote.retireIf")}</Button>
                    <Button type="button" size="sm" variant={draft.diplomacy?.contingent === "seek" ? "default" : "outline"} disabled={locked} onClick={() => setDraft({ ...draft, diplomacy: { type: "ballot", voteId: vote.id, choice: "nay", contingent: "seek", targetFactionId: otherFaction(world, me.factionId) } })}>{t("vote.seekIfPass")}</Button>
                  </div>
                ) : null}
                {choice === "aye" ? (
                  <Button type="button" size="sm" variant={draft.diplomacy?.contingent === "seek" ? "default" : "outline"} disabled={locked} onClick={() => setDraft({ ...draft, diplomacy: { type: "ballot", voteId: vote.id, choice: "aye", contingent: "seek", targetFactionId: otherFaction(world, me.factionId) } })}>{t("vote.seekIfFail")}</Button>
                ) : null}
                {draft.diplomacy?.type === "ballot" && draft.diplomacy.contingent === "seek" ? (
                  <label className="block text-sm">
                    {t("vote.host")}
                    <select className="mt-1 h-9 w-full border border-border bg-card px-2" disabled={locked} value={draft.diplomacy.targetFactionId ?? ""} onChange={(event) => setDraft({ ...draft, diplomacy: { ...draft.diplomacy!, targetFactionId: event.target.value } })}>
                      {world.factions.filter((faction) => faction.id !== me.factionId && !faction.eliminated).map((faction) => (
                        <option key={faction.id} value={faction.id}>{factionName(faction.id, locale, faction.name)}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </>
            )}
          </fieldset>
        );
      })()}

      <details className="play-more">
        <summary>{t("play.foldWar")}</summary>
        <div>
      <MotionEditor world={world} me={me} officer={officer} draft={draft} locked={locked} onChange={setDraft} />
      {officer || me.office === "wanderer" ? <fieldset className="space-y-2">
        <legend className="text-sm">{t("slip.allegiance")}</legend>
        <p className="text-sm text-muted-foreground">
          {t("slip.allegianceNote")}
        </p>
        <div className="nes-menu">
          {me.office === "lord" ? (
            <>
              <Button type="button" size="sm" variant={draft.diplomacy?.type === "submit" ? "default" : "outline"} disabled={locked} onClick={() => setDraft({ ...draft, diplomacy: { type: "submit", targetFactionId: otherFaction(world, me.factionId) } })}>{t("kind.submit")}</Button>
              <Button type="button" size="sm" variant={draft.diplomacy?.type === "surrender" ? "default" : "outline"} disabled={locked} onClick={() => setDraft({ ...draft, diplomacy: { type: "surrender", targetFactionId: otherFaction(world, me.factionId), cityId: me.cityId ?? undefined } })}>{t("kind.surrender")}</Button>
              {world.factions.find((faction) => faction.id === me.factionId)?.liegeId ? (
                <Button type="button" size="sm" variant={draft.diplomacy?.type === "renounce" ? "default" : "outline"} disabled={locked} onClick={() => setDraft({ ...draft, diplomacy: { type: "renounce" } })}>{t("kind.renounce")}</Button>
              ) : null}
            </>
          ) : me.office === "wanderer" ? (
            <Button type="button" size="sm" variant={draft.diplomacy?.type === "serve" ? "default" : "outline"} disabled={locked} onClick={() => setDraft({ ...draft, diplomacy: { type: "serve", targetFactionId: otherFaction(world, null) } })}>{t("kind.serve")}</Button>
          ) : officer ? (
            <>
              <Button type="button" size="sm" variant={draft.diplomacy?.type === "seek" ? "default" : "outline"} disabled={locked} onClick={() => setDraft({ ...draft, diplomacy: { type: "seek", targetFactionId: otherFaction(world, me.factionId) } })}>{t("kind.seek")}</Button>
              <Button type="button" size="sm" variant={draft.diplomacy?.type === "surrender" ? "default" : "outline"} disabled={locked} onClick={() => setDraft({ ...draft, diplomacy: { type: "surrender", targetFactionId: otherFaction(world, me.factionId), cityId: me.cityId ?? undefined } })}>{t("kind.surrender")}</Button>
              <Button type="button" size="sm" variant={draft.diplomacy?.type === "retire" ? "default" : "outline"} disabled={locked} onClick={() => setDraft({ ...draft, diplomacy: { type: "retire" } })}>{t("kind.retire")}</Button>
            </>
          ) : null}
        </div>
        {draft.diplomacy && draft.diplomacy.type !== "retire" && draft.diplomacy.type !== "renounce" && draft.diplomacy.type !== "respond" && (draft.diplomacy.type === "submit" || draft.diplomacy.type === "surrender" || draft.diplomacy.type === "seek" || draft.diplomacy.type === "serve") ? (
          <label className="block text-sm">
            {t("slip.hostFaction")}
            <select
              className="mt-1 h-9 w-full border border-border bg-card px-2"
              disabled={locked}
              value={draft.diplomacy.targetFactionId ?? ""}
              onChange={(event) => setDraft({ ...draft, diplomacy: { ...draft.diplomacy!, targetFactionId: event.target.value } })}
            >
              {world.factions.filter((faction) => faction.id !== me.factionId && !faction.eliminated).map((faction) => (
                <option key={faction.id} value={faction.id}>{factionName(faction.id, locale, faction.name)}</option>
              ))}
            </select>
          </label>
        ) : null}
      </fieldset> : null}

      {me.office === "lord" ? (
        <fieldset className="space-y-2">
          <legend className="text-sm">{t("slip.diplomacy")}</legend>
          <div className="nes-menu">
            {(["alliance", "truce", "vassal", "break"] as const).map((type) => (
              <Button
                key={type}
                type="button"
                size="sm"
                variant={draft.diplomacy?.type === type ? "default" : "outline"}
                disabled={locked}
                onClick={() => setDraft({ ...draft, diplomacy: { type, targetFactionId: otherFaction(world, me.factionId) } })}
              >
                {type === "alliance" ? t("dip.proposeAlliance") : type === "truce" ? t("dip.proposeTruce") : type === "vassal" ? t("dip.proposeVassal") : t("dip.break")}
              </Button>
            ))}
          </div>
          <label className="block text-sm">
            {t("slip.target")}
            <select
              className="mt-1 h-9 w-full border border-border bg-card px-2"
              disabled={locked || !draft.diplomacy || draft.diplomacy.type === "respond"}
              value={draft.diplomacy?.targetFactionId ?? ""}
              onChange={(event) =>
                draft.diplomacy
                  ? setDraft({ ...draft, diplomacy: { ...draft.diplomacy, targetFactionId: event.target.value } })
                  : undefined
              }
            >
              {world.factions.filter((faction) => faction.id !== me.factionId && !faction.eliminated).map((faction) => (
                <option key={faction.id} value={faction.id}>{factionName(faction.id, locale, faction.name)}</option>
              ))}
            </select>
          </label>
          <div className="nes-menu">
            <Button
              type="button"
              size="sm"
              variant={draft.war?.type === "march" ? "default" : "outline"}
              disabled={locked}
              onClick={() =>
                setDraft({
                  ...draft,
                  war: {
                    type: "march",
                    personal: true,
                    portion: "half",
                    targetCityId: world.cities.find((city) => city.id === me.cityId)?.links[0],
                  },
                })
              }
            >
              {t("slip.personal")}
            </Button>
            <Button type="button" size="sm" variant={draft.war?.type === "duel" ? "default" : "outline"} disabled={locked} onClick={() => setDraft({ ...draft, war: { type: "duel", personal: true } })}>
              {t("slip.duel")}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={locked} onClick={() => setDraft({ ...draft, war: undefined })}>
              {t("slip.noMarch")}
            </Button>
          </div>
          {draft.war?.type === "march" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                className="h-9 border border-border bg-card px-2"
                disabled={locked}
                value={draft.war.targetCityId ?? ""}
                onChange={(event) => setDraft({ ...draft, war: { ...draft.war!, targetCityId: event.target.value } })}
              >
                {world.cities.find((city) => city.id === me.cityId)?.links.map((link) => (
                  <option key={link} value={link}>{world.cities.find((city) => city.id === link)?.name}</option>
                ))}
              </select>
              <select
                className="h-9 border border-border bg-card px-2"
                disabled={locked}
                value={draft.war.portion ?? "half"}
                onChange={(event) =>
                  setDraft({ ...draft, war: { ...draft.war!, portion: event.target.value as "half" | "most" } })
                }
              >
                <option value="half">{t("slip.half")}</option>
                <option value="most">{t("slip.most")}</option>
              </select>
            </div>
          ) : null}
        </fieldset>
      ) : (
        <fieldset>
          <legend className="text-sm">{t("slip.war")}</legend>
          <p className="mt-1 text-sm text-primary">{t("slip.warNote")}</p>
          <div className="nes-menu mt-2">
            {(["confirm", "refuse", "leave", "hold", "duel"] as const).map((type) => (
              <Button
                key={type}
                type="button"
                size="sm"
                variant={draft.war?.type === type ? "default" : "outline"}
                disabled={locked}
                onClick={() => setDraft({ ...draft, war: { type, preset: draft.war?.preset } })}
              >
                {type === "confirm" ? t("war.confirm") : type === "refuse" ? t("war.refuse") : type === "leave" ? t("war.leave") : type === "duel" ? t("war.duel") : t("war.hold")}
              </Button>
            ))}
          </div>
        </fieldset>
      )}

      {world.config.eco.offline_preset ? (
        <label className="block text-sm">
          {t("slip.ifAbsent")}
          <select
            className="mt-1 h-9 w-full border border-border bg-card px-2"
            disabled={locked}
            value={draft.war?.preset ?? ""}
            onChange={(event) => {
              const preset = event.target.value === "retreat" || event.target.value === "defend" ? event.target.value : undefined;
              setDraft({ ...draft, war: { ...(draft.war ?? { type: "hold" }), preset } });
            }}
          >
            <option value="">{t("preset.none")}</option>
            <option value="defend">{t("preset.defend")}</option>
            <option value="retreat">{t("preset.retreat")}</option>
          </select>
        </label>
      ) : null}

      {world.config.comm.free_chat ? (
        <label className="block text-sm">
          {t("slip.speech")}
          <textarea
            className="mt-1 w-full border border-border bg-card p-2"
            maxLength={280}
            disabled={locked}
            value={draft.remark ?? ""}
            onChange={(event) => setDraft({ ...draft, remark: event.target.value })}
          />
        </label>
      ) : null}
        </div>
      </details>

      <aside className={locked ? "play-draft is-sealed" : "play-draft"} aria-label={locked ? t("play.sealedList") : t("play.draftList")}>
        <h3>{locked ? t("play.sealedList") : t("play.draftList")}</h3>
        <p>{locked ? t("play.sealedNotResult") : t("play.draftNotResult")}</p>
        {lines.length === 0 ? <p>{t("play.draftEmpty")}</p> : (
          <ul>
            {lines.map((line, index) => <li key={`${line.labelKey}-${index}`}>{t(line.labelKey)}</li>)}
          </ul>
        )}
      </aside>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      {locked ? (
        <Button type="button" size="lg" className="play-submit" variant="outline" disabled={pending} onClick={() => void unlock()}>
          {t("play.unseal")}
        </Button>
      ) : (
        <Button type="submit" size="lg" className="play-submit" disabled={pending}>
          {pending ? t("play.sealing") : t("play.sealButton")}
        </Button>
      )}
      <p className="mt-2">
        {phase === "waiting" || phase === "sealed"
          ? t("play.note.waiting", { seated: world.seatedCount, locked: world.lockedCount })
          : world.seatedCount < world.config.turn.early_resolve_min_seated
            ? t("slip.waitSeats", { n: world.config.turn.early_resolve_min_seated })
            : t("slip.waitLock")}
      </p>
      <button type="button" className="play-quiet" onClick={() => guide.write({ cursor: "who", skipped: false })}>{t("play.guideReplay")}</button>
    </form>
  );
}

function MotionEditor({
  world,
  me,
  officer,
  draft,
  locked,
  onChange,
}: {
  world: PublicWorld;
  me: PublicRole;
  officer: boolean;
  draft: Order;
  locked: boolean;
  onChange: (order: Order) => void;
}) {
  const { t, locale } = useI18n();
  if (!officer && me.kind !== "soldier") return null;
  const targets = world.roles.filter((role) => role.alive && role.id !== me.id && role.factionId === me.factionId);
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm">{t("motion.title")}</legend>
      <select
        className="h-9 w-full border border-border bg-card px-2"
        disabled={locked}
        value={draft.motion?.type ?? ""}
        onChange={(event) => {
          const type = event.target.value;
          if (!type) {
            onChange({ ...draft, motion: undefined });
            return;
          }
          onChange({
            ...draft,
            motion: {
              type: type as NonNullable<Order["motion"]>["type"],
              targetRoleId: targets[0]?.id,
              charge: "neglect",
              amendKey: AMENDABLE[0]?.key,
              amendValue: AMENDABLE[0]?.min,
            },
          });
        }}
      >
        <option value="">{t("motion.none")}</option>
        {me.office === "lord" || me.office === "general" ? <option value="impeach">{t("motion.impeach")}</option> : null}
        {me.office === "lord" || me.office === "general" ? <option value="exile">{t("motion.exile")}</option> : null}
        {me.office === "lord" ? <option value="execute">{t("motion.execute")}</option> : null}
        {me.office === "lord" || me.office === "advisor" ? <option value="recommend">{t("motion.recommend")}</option> : null}
        {me.office !== "lord" && world.config.politics.mutiny.enabled ? <option value="mutiny">{t("motion.mutiny")}</option> : null}
        {me.office === "lord" ? <option value="abdicate">{t("motion.abdicate")}</option> : null}
        {me.office === "lord" && world.config.politics.regency.enabled ? <option value="regency">{t("motion.regency")}</option> : null}
        {world.config.rules.amendment_via_ingame_politics ? <option value="amend">{t("motion.amend")}</option> : null}
      </select>
      {draft.motion && draft.motion.type !== "amend" ? (
        <select
          className="h-9 w-full border border-border bg-card px-2"
          disabled={locked}
          value={draft.motion.targetRoleId ?? ""}
          onChange={(event) => onChange({ ...draft, motion: { ...draft.motion!, targetRoleId: event.target.value } })}
        >
          {(draft.motion.type === "recommend"
            ? world.roles.filter((role) => role.alive && (role.office === "wanderer" || role.office === "captain"))
            : draft.motion.type === "mutiny"
              ? world.roles.filter((role) => role.office === "lord" && role.factionId === me.factionId)
              : targets
          ).map((role) => (
            <option key={role.id} value={role.id}>{personName(role.id, locale, role.name)} · {officeDisplay(role, locale)}</option>
          ))}
        </select>
      ) : null}
      {draft.motion && (draft.motion.type === "impeach" || draft.motion.type === "exile" || draft.motion.type === "execute") ? (
        <select
          className="h-9 w-full border border-border bg-card px-2"
          disabled={locked}
          value={draft.motion.charge ?? "neglect"}
          onChange={(event) => onChange({ ...draft, motion: { ...draft.motion!, charge: event.target.value } })}
        >
          {CHARGES.map((charge) => (
            <option key={charge.id} value={charge.id}>{CHARGE_NAMES[charge.id]?.[locale] ?? charge.label}</option>
          ))}
        </select>
      ) : null}
      {draft.motion?.type === "amend" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            className="h-9 border border-border bg-card px-2"
            disabled={locked}
            value={draft.motion.amendKey}
            onChange={(event) => onChange({ ...draft, motion: { ...draft.motion!, amendKey: event.target.value } })}
          >
            {AMENDABLE.map((item) => (
              <option key={item.key} value={item.key}>{t(`amend.${item.key}`)}</option>
            ))}
          </select>
          <input
            className="h-9 border border-border bg-card px-2"
            type="number"
            step="0.01"
            disabled={locked}
            value={Number(draft.motion.amendValue ?? 0)}
            onChange={(event) => onChange({ ...draft, motion: { ...draft.motion!, amendValue: Number(event.target.value) } })}
          />
        </div>
      ) : null}
    </fieldset>
  );
}

function otherFaction(world: PublicWorld, mine: string | null) {
  return world.factions.find((faction) => faction.id !== mine && !faction.eliminated)?.id;
}

function motionLabel(
  world: PublicWorld,
  type: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
  locale: import("@/i18n/locale").Locale,
  targetId?: string,
  charge?: string,
) {
  const role = world.roles.find((item) => item.id === targetId);
  const name = role ? personName(role.id, locale, role.name) : t("motion.someone");
  const chargeText = charge ? (CHARGE_NAMES[charge]?.[locale] ?? charge) : "";
  const verb = type === "impeach" ? t("motion.impeach") : type === "exile" ? t("motion.exile") : type === "execute" ? t("motion.execute") : "";
  if (verb) return t("motion.line", { verb, name, charge: chargeText });
  if (type === "amend") return t("motion.amendLine");
  return t(`motion.${type}`);
}
