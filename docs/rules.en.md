> This file translates the setup written on 2026-11-11. Where the reference implementation differs, see the reference note (Chinese).

# Three Kingdoms: All Seats Taken

## Rules setup V0.1

> This document defines every tunable of a Three Kingdoms: All Seats Taken instance. The principle: **the code does not freeze a contested design decision. Every decision is a variable, and every variable is an experiment question.** Tuning the setup is designing the experiment.
>
> It is the other side of the aim: axioms are not configurable. Variables all live here.

Config keys stay identifiers. They are not translated.

---

## 1. Design

**1. Invariants and variables stay apart.**
Every experiment shares the same invariants (seven axioms: no script, verifiable, death has weight, offices move, structured speech, the narrow gate stays open, the referee has a boundary). Only the variables differ. Otherwise the instances cannot be compared. They would be one-off copies, not an experiment.

**2. Every variable names its question.**
Changing a number is stating a hypothesis. A deployer should be able to answer: what do I want this variable to show?

**3. The defaults are the classic setup.**
Together they are the profile `tianxia_classic`, the combination the project thinks best tests the core question: is unification possible?

**4. The setup freezes and is posted when the server opens.**
It cannot be hot-edited while the instance runs (except the far Nomic shape in section 9). The whole setup is posted to the players at open. An immutable parameter and an auditable rule matter equally.

---

## 2. Modules

| Module | Prefix | Scope |
|---|---|---|
| World and turn | `world` / `turn` | Map size, cast, pace |
| Identity | `identity` | Lifespan, death, succession, promotion, names |
| Speech | `comm` | Chat, menu grain, contracts, notice |
| Politics | `politics` | Impeach, exile, execute, mutiny, regency |
| War and absence | `war` | Muster, command order, fallback |
| Domestic and economy | `eco` | Action points, resources, search |
| Ending | `endgame` | Unification, consolidation, shutdown |
| Referee | `mod` | Audit, replay, the boundary of punishment |
| Data | `data` | Record, anonymization, export |

---

## 3. World and turn (`world` / `turn`)

| Variable | Type | Default | Range | Question |
|---|---|---|---|---|
| `world.city_count` | int | 12 | 3–200 | How does the size of the world change whether unification can be reached? |
| `world.role_pool_size` | int | 60 | 12–500 | How does a scarce identity change the wish to take part? |
| `world.reserve_roles` | int | 8 | 0–50 | Do reserved unattached people slow the emptying of the pool? |
| `world.map_topology` | enum | `historic_13zhou` | see note | How does geography (passes, barriers) shape a divided land? |
| `turn.duration_hours` | int | 24 | 1–168 | How does pace change the share of deliberation and impulse? |
| `turn.war_phase_mode` | enum | `room_tactical` | `room_tactical` / `turn_tactical` | How does a live tactical layer change the cost of dropping offline? |

Note: built-in maps do not copy any existing game's map data. They offer an abstract commandery topology from public history, and a random generator.

Opening troops of the classic twelve cities: Xuchang and Jianye 1500 each, Chengdu 1400, the capital Luoyang 1000, other unheld cities 850. In the three-city gate Jianye is also 1500. 850 sits between 800 and 900: half of a 1500 garrison cannot break that defense; eight tenths can. Consolidation still has to decide whether to march.

---

## 4. Identity (`identity`)

| Variable | Type | Default | Range | Question |
|---|---|---|---|---|
| `identity.permadeath` | bool | true | **always true (red line)** | Permanent death is the floor of the experiment. It cannot be removed. |
| `identity.lifespan` | enum | `infinite` | `infinite` / `natural_decay` | Is a natural lifespan needed? How fast does power harden if life is endless? |
| `identity.death_succession` | enum | `power_transfers` | `power_transfers` | The seat of power may pass. The person does not return (axiom 3, fixed). |
| `identity.new_player_entry` | enum | `soldier_or_citizen` | `soldier_or_citizen` | Newcomers enter from the bottom (axiom 4, fixed). |
| `identity.promotion_enabled` | bool | true | true / false | Does a path upward change how much a newcomer invests? |
| `identity.promotion_path` | list | soldier, captain, junior officer, unattached, general | editable | How many rungs change how hard a class hardens? |
| `identity.disposed_destinations` | list | unattached, exile, soldier, citizen | editable | How does the width of a disposed person's destination change how often disposal is used? |
| `identity.citizen_naming` | enum | `system_random_3char` | **fixed** | Citizen names are drawn from a surname list. They cannot be chosen, changed, or traded (red line). |
| `identity.front_display` | enum | `role_name_only` | **fixed** | The board shows only the role name. No account (red line). |

---

## 5. Speech (`comm`)

| Variable | Type | Default | Range | Question |
|---|---|---|---|---|
| `comm.free_chat` | bool | false | true / false | **Control switch.** How far does free chat change the depth and the poison of politics? |
| `comm.private_message` | bool | false | true / false | Is a private channel a lubricant of diplomacy, or a bed for collusion? |
| `comm.menu_expressiveness` | enum | `rich` | `minimal` / `standard` / `rich` | When the grain of speech is too coarse, how fast do misreadings rise? |
| `comm.contract_system` | bool | true | true / false | Can an executable system contract replace a spoken promise? |
| `comm.contract_breach_record` | bool | true | true / false | Once a breach is public, how does the cost of betrayal change? |
| `comm.public_notice_hours` | int | 12 | 0–72 | How does the length of notice change whether a disposal looks legitimate? |
| `comm.accusation_freeform` | bool | false | **fixed false** | An impeachment charge is chosen from a fixed list. It cannot be written freely (red line, against abuse). |
| `comm.external_collusion_recognized` | bool | false | **fixed false** | The game recognizes only contracts the system recorded. An outside pact is not recognized. |

Menu grain: `minimal` is only yes or no. `standard` adds a target, a term, and a reason to refuse. `rich` adds a conditional yes, silence, delay, a counter-offer, and a combined contract. **Constraint C1 in section 11.**

---

## 6. Politics (`politics`)

| Variable | Type | Default | Range | Question |
|---|---|---|---|---|
| `politics.impeach.threshold` | float | 0.33 | 0.1–0.9 | How does the impeach bar change how often it is used as a weapon? |
| `politics.impeach.defense_hours` | int | 24 | 0–72 | Does a plea period cut wrongful cases? |
| `politics.exile.threshold` | float | 0.5 | 0.3–1.0 | How does the cost gap between exile and execution change which one is chosen? |
| `politics.exile.reputation_cost` | int | 20 | 0–100 | How does the reputation cost of a disposal restrain a purge? |
| `politics.execute.threshold` | float | 0.66 | 0.5–1.0 | The same question. |
| `politics.execute.public_notice` | bool | true | **fixed true** | An execution must pass a public notice (red line). |
| `politics.mutiny.enabled` | bool | true | true / false | If mutiny is allowed, does tyranny correct itself? |
| `politics.regency.enabled` | bool | true | true / false | When a lord is long offline, does a regent appear before a rival court? |
| `politics.usurpation.enabled` | bool | true | true / false | Are raising a lord, emptying the throne, and a rival court the main path of succession? |
| `politics.auto_punishment` | bool | false | **fixed false** | The system never punishes idleness by itself. Disposal is started only by a player (axiom 1, red line). |

---

## 7. War and absence (`war`)

| Variable | Type | Default | Range | Question |
|---|---|---|---|---|
| `war.muster_notice_turns` | int | 1 | 1–3 | How does warning time balance preparation and surprise? |
| `war.confirm_window_hours` | int | 12 | 1–48 | How does the confirm window relate to absence? |
| `war.grace_window_hours` | int | 2 | 0–12 | How long can a grace be before one disconnect is a coup? |
| `war.command_chain` | list | main, deputy or strategist, lord, system fallback | order editable | How does the order of command change how an army holds together? |
| `war.fallback_behavior` | enum | `execute_preset_then_defend` | see note | The system fallback is only a floor. It makes no strategic decision on the spot (red line, C4). |
| `war.fallback_scope_lord` | enum | `troops_only` | `troops_only` | A lord standing in commands only that force. The fallback cannot execute, confiscate, or change allegiance (red line). |
| `war.absence_death_risk_kept` | bool | true | **fixed true** | Merit and the risk of death stay with the role during fallback. Offline is not an escape from defeat. |
| `war.absence_to_reputation` | bool | true | true / false | A streak of absence marks the role's reputation, as a ground for impeachment. It is not an automatic punishment. |
| `war.handover_on_return` | enum | `next_phase` | `immediate` / `next_phase` | When command returns to the main, how do we avoid two heads? |

Note: `fallback_behavior` may be `execute_preset_then_defend`, `execute_preset_then_retreat`, `defend`, or `retreat`. **Any fallback that makes a strategic decision on the spot is forbidden.**

---

## 8. Domestic and economy (`eco`)

| Variable | Type | Default | Range | Question |
|---|---|---|---|---|
| `eco.action_points_per_turn` | int | 3 | 1–10 | How does scarce action force a specialty and a division of work? |
| `eco.resource_cap` | int | 10000 | 1000–∞ | Can a cap and diminishing returns stop a snowball? |
| `eco.diminishing_returns` | bool | true | true / false | The same question. |
| `eco.search_discovers` | list | existing unattached people, items, news | editable | A search finds only what already exists. It adds no historical person (axiom 4, C5). |
| `eco.offline_preset` | bool | true | true / false | Does a preset order reduce the pressure to be online every hour? |
| `eco.idle_decay` | float | 0.0 | 0–0.2 | How does idle decay stop endless accumulation? |

---

## 8a. Season and weather (`climate`)

Seasons rotate by turn: turn 1 is spring, then summer, autumn, winter, then spring again. Weather is not chosen at resolution. Opening generates `climateSeed` and writes it into the chronicle. A turn's weather is one slot of that season's ten-slot table, from `mulberry32(hashSeed(match:turn:seed))`. A disaster is the next draw of the same stream. The chance is a per-thousand. The four disasters are equally likely. The algorithm is the same for every faction.

| Variable | Type | Default | Range | Effect |
|---|---|---|---|---|
| `climate.enabled` | bool | true | true / false | Off: the season is still noted, but grain and troops do not change. |
| `climate.snow_march_loss` | float | 0.08 | 0–0.12 | Winter snow march loss, including winter itself. Not below `winter_march_loss`. |
| `climate.winter_march_loss` | float | 0.04 | 0–0.1 | Winter march loss when it is not snowing. |
| `climate.rain_ford_loss` | float | 0.05 | 0–0.12 | Extra loss on a ford or a river road in rain. |
| `climate.flood_ford_loss` | float | 0.08 | 0–0.15 | Extra ford loss in a flood. With the line above, not over 0.2. |
| `climate.drought_farm_factor` | float | 0.75 | 0.5–1 | Drought farm multiplier. |
| `climate.winter_farm_factor` | float | 0.9 | 0.7–1 | Winter farm multiplier. |
| `climate.fair_farm_bonus` | float | 0.06 | 0–0.15 | Clear-weather farm bonus. It is not added to battle. |
| `climate.disasters_enabled` | bool | true | true / false | Off: no disaster is drawn. |
| `climate.disaster_permille` | int | 35 | 0–80 | Per-thousand chance of one disaster each turn. |
| `climate.disaster_grain_loss` | float | 0.08 | 0.02–0.15 | Grain cut by drought, flood, or locusts. |
| `climate.disaster_troop_loss` | float | 0.04 | 0–0.08 | Troop cut by plague. It does not remove a person. |

Fords in the code: on the Yellow River, Ye–Luoyang, Jinyang–Chang'an, Wuwei–Chang'an, Ye–Xiapi; and Xiangyang–Jiangling, Jiangling–Jianye, Xiapi–Jianye, Luoyang–Xiangyang, Xuchang–Xiangyang, Luoyang–Jianye. On a random map, a road that crosses the midline counts as a river road. Fog does not change resolution.

Relief is `relief`. It shares `eco.action_points_per_turn` with domestic work. It does not open a second pool of points. By default a dike of 3 still leaves four tenths of the flood's grain loss, and a clinic of 3 still leaves four tenths of the plague's troop loss. A dike's cut is capped at eight tenths. A clinic's cut is capped at three quarters. The checker refuses a product of level and per-level cut that reaches 1. Relief is valid only on a turn with a disaster, a drought, or a plague in the city. An enemy city cannot be relieved. Trust is a record. It does not sign a contract by itself. Watching the sky does not change the seed.

| Variable | Default | Range | Effect |
|---|---|---|---|
| `relief.dike_max` | 3 | 1–4 | Dike cap |
| `relief.dike_grain_cut` | 0.2 | 0.1–0.3 | Flood grain cut removed per level |
| `relief.dike_ford_cut` | 0.2 | 0.1–0.3 | Rain and flood ford loss removed per level |
| `relief.dike_decay_turns` | 3 | 2–6 | Dike and canal decay when neglected |
| `relief.granary_cap` | 600 | 200–2000 | Granary cap |
| `relief.granary_deposit` | 120 | 50–300 | One storing of grain |
| `relief.granary_spoil` | 0.03 | 0.01–0.1 | Granary spoil each turn |
| `relief.clinic_max` | 3 | 1–4 | Clinic cap |
| `relief.clinic_plague_cut` | 0.2 | 0.1–0.3 | Plague troop loss removed per level |
| `relief.plague_turns` | 2 | 1–4 | Turns a plague lingers |
| `relief.linger_ratio` | 0.5 | 0.2–0.8 | Troop cut on a lingering turn |
| `relief.relief_grain` | 100 | 50–200 | Grain moved by one relief |
| `relief.relief_morale` | 4 | 2–10 | Morale from relief, capped at 90 |
| `relief.relief_reputation` | 2 | 1–5 | Reputation from relief |
| `relief.road_cut` | 0.4 | 0.2–0.6 | Weather loss cut by one mended road |
| `relief.road_decay_turns` | 3 | 2–6 | When a mended road fails |
| `relief.canal_max` | 2 | 1–3 | Canal cap |
| `relief.canal_drought_ease` | 0.08 | 0.05–0.15 | Per level, pull the drought farm factor toward 1 |

---

## 8b. People (`deeds`)

These actions share action points with domestic work. A duel sits in the war order. It does not take an extra action point. All comparisons are public. There is no hidden die. An empty seat cannot be sworn to, cannot answer diplomacy, and cannot claim a bounty. A captive changes lords only by answering a call to defect themselves.

| Variable | Default | Range | Effect |
|---|---|---|---|
| `deeds.reward_gold` | 80 | 40–200 | Gold a reward costs |
| `deeds.reward_morale` | 3 | 1–6 | Morale a reward adds, capped at 90 |
| `deeds.duel_gap` | 8 | 6–20 | Duel gap. The loser leaves only if they fought in person and the gap reaches this |
| `deeds.fire_loss` | 0.08 | 0.04–0.12 | Garrison cut by fire first. Only in drought, or a clear autumn |
| `deeds.discord_reputation` | 4 | 2–8 | Reputation the target loses when discord works. It works only if intellect is not lower |
| `deeds.rumor_morale` | 6 | 2–10 | Morale a false report cuts from a neighboring enemy city. Intellect at least 12 |
| `deeds.refugee_morale` | 36 | 20–45 | Refugees start only below this morale |
| `deeds.refugee_ratio` | 0.03 | 0.02–0.08 | Troops and grain refugees take. Named people do not leave with them |
| `deeds.bounty_merit` | 2 | 1–3 | Merit of the seasonal bounty. If it is already met at the season's start, it is not paid |
| `deeds.betray_reputation` | 10 | 5–20 | Reputation a broken bond costs |

Brotherhood needs both sides to name each other on the same turn, both seated, of one faction, and not captives. If sworn people fight in the same city, the main's command rises by 1. A duel score is arms × 2 + command. The higher side wins. After a result, the loser's city loses 6 morale, and the winner gains 1 merit. When discord works, that city's morale falls another 4. When a city breaks, people of the old faction fall back to their own city with the most troops, if they still have one. Otherwise they are captured. They do not defect by themselves. A diplomatic offer expires if nobody answers by the next turn. The same unanswered offer is not sent again. The bounty is written into the chronicle at open. After a season resolves, the next season's bounty is posted, visible before orders lock.

### Allegiance

Any seated lord, general, or strategist may offer an allegiance from the menu. An unattached person who has already appeared may take service. These actions use the diplomacy slot. They add no action point and do not change the length of a turn.

| Action | Who | When it takes effect | Result | Reputation |
|---|---|---|---|---|
| Submit | Lord | The other seated lord agrees | The whole faction becomes a vassal. Lands and followers stay with the old faction. Cities stay in the vassal's name, and count toward the liege's unification. The one who offered remains the vassal's lord | −8 |
| Surrender | An officer, including a captive | The other seated lord agrees | If the person is in a city their faction holds, that city is ceded. The troops stay. The one who offered becomes a general of the other side. If it was the last city, the old faction is gone. The rest step down. They do not automatically join the new lord | −12 |
| Seek a lord | General or strategist | The other seated lord agrees | Leave the old faction and become a general or strategist of the other side. Troops are not taken. The old lord cannot block it | −6 |
| Step down | General or strategist | Immediate. No consent | Become unattached. The same player continues, and may take service later | −6 |
| Take service | An unattached person who has appeared and has no lord | The other seated lord agrees | Become a general of that side | none |
| Renounce | A vassal lord who already has a liege | Immediate. The liege's consent is not required | The vassalage ends. The lands are not returned | −6 |

If the other lord does not answer, the offer expires on the next turn. An empty seat does not answer. A lord cannot submit to their own vassal. The same unanswered allegiance is not sent again. The chronicle records the offer, the yes, the no, the expiry, the step-down, and the renunciation. Those lines are appended to the experiment log with the match events. The unification conditions themselves do not change: capital, control ratio, the other major powers gone or vassal, then consolidation. Submission and a ceded city only move cities into the receiver's public count. The one who offered is still under permadeath, and may leave again.

### The submission vote

When a lord offers submission and more than one real person of that faction is seated, the faction votes first. Only after it passes is the offer sent. Surrender, including ceding a city, is not voted. The other lord must still agree.

| Variable | Default | Range | Meaning |
|---|---|---|---|
| `allegiance.submit_threshold` | 2/3 | 0.5–0.9 | Ayes divided by seated people must be **greater than** this number. Exactly two thirds does not pass |
| `allegiance.submit_cooldown` | 3 | 1–8 | Turns that must pass after an opening. Opened on turn 5, the next opening waits until turn 8 |
| `allegiance.vote_named` | true | true / false | Whether the chronicle writes the voter's name. When false, the public sentence says "a seated member" |

Each real person seated has one vote, including the lord. Empty seats do not count. A missing ballot is not an aye. A captive may vote. With two seated, both must vote aye. With three seated, all three must vote aye. Two ayes are exactly 2/3, and do not pass.

A vote is open for one turn. The opening turn records the lord's aye. The next turn counts the others, then closes. Expiry follows the other offers. It is not stretched. The same lord cannot open another before the cooldown ends. If the lord is the only real person seated, there is no vote. That lord sends the offer directly, and this also starts the cooldown.

After a pass, those who voted nay need not follow: they may step down, or seek the other side. Seeking still needs that seated lord's yes. After a failure, those who voted aye may seek a lord on their own. The choice may be written on the ballot, or chosen on the turn after the result. Stepping down is immediate. Seeking only sends an offer.

The opening, each ballot, and the result are written into the chronicle. When unnamed, the public sentence does not name the voter. The event in the experiment log still carries the role id. An old save without this section resolves with the defaults: two thirds, cooldown 3, named.

---

## 9. Ending (`endgame`)

| Variable | Type | Default | Range | Question |
|---|---|---|---|---|
| `endgame.unify.capital_required` | bool | true | true / false | Is holding the capital a necessary condition? |
| `endgame.unify.control_ratio` | float | 0.6 | 0.5–0.9 | How high a ratio makes unification hard, rather than impossible? (Axiom 6: ratio 1, the whole map, is forbidden. The checker accepts 0.5–0.9.) |
| `endgame.unify.major_powers` | enum | `subdued_or_vassal` | `eliminated` / `subdued_or_vassal` | If vassalage is allowed, can unification leave the dead end of killing everyone? |
| `endgame.unify.stable_turns` | int | 4 | 1–20 | How many stable turns separate a military win from an order that holds? |
| `endgame.consolidation_turns` | int | 4 | 0–20 | Consolidation: the whole server may strike back inside the window. Holding it is unification. Four turns are one round of seasons. |
| `endgame.on_unify` | enum | `memorial_then_shutdown` | **fixed** | After unification the server becomes a memorial, then the main server closes for good (axiom 6). |
| `endgame.season_deadline_days` | int | null | null / 30–365 | Season variant: if nobody unifies by the day, score the map. null means no deadline (classic). |
| `endgame.official_interference` | bool | false | **fixed false** | No interface lets a deployer quietly change a chance or stage an event (red line). |

The Chinese source lists the ratio range as 0.5–1.0 and then forbids 1.0 in C7. The checker that actually runs accepts 0.5–0.9. This translation follows the checker.

---

## 10. Referee and data (`mod` / `data`)

| Variable | Type | Default | Range | Question |
|---|---|---|---|---|
| `mod.anti_multiaccount` | bool | true | **fixed true** | A limited-identity server must resist extra accounts. |
| `mod.behavior_audit` | bool | true | true / false | How fine an audit of stand-ins and scripts. |
| `mod.replay_available` | bool | true | **fixed true** | Battle and disposal can be replayed (axiom 2). |
| `mod.punishment_scope` | list | cheating, harassment | **fixed** | Punishment covers only cheating and harassment, not a stab or a purge that walks inside the rules (axiom 7, red line). |
| `data.event_log` | enum | `complete_append_only` | **fixed** | The full event log may only be appended. It cannot be deleted or rewritten (red line). |
| `data.anonymization` | enum | `role_indexed_hash` | **fixed** | The log is indexed by role. The account behind it is an irreversible hash (red line). |
| `data.export_format` | list | `[json, csv]` | editable | Each finished match writes an anonymized packet that can be analyzed. |
| `data.export_license` | enum | `CC-BY-4.0` | `CC-BY-4.0` / `ODbL-1.0` | The open license of the dataset. |

---

## 11. Constraints

The setup is not free. The checker enforces these before open. An instance that breaks one does not start.

- **C1 (enough speech):** if `comm.free_chat` is false, `comm.menu_expressiveness` must be `standard` or `rich`. Closing free chat without enough menu grain produces interface noise, not human data.
- **C2 (death cannot be removed):** `identity.permadeath` is always true. A fork that removes it may not call itself Three Kingdoms: All Seats Taken (section 13).
- **C3 (a season is posted):** if `endgame.season_deadline_days` is not null, the opening notice must state the deadline and the scoring rule.
- **C4 (fallback has no strategy):** `war.fallback_behavior` may not include a strategic decision on the spot. The system may only run a preset or a conservative floor. Anything else is hidden official interference.
- **C5 (the cast is closed):** `eco.search_discovers` may not include "add a historical person". A search finds only what is already there.
- **C6 (anti-cheat is mandatory):** `mod.anti_multiaccount` is always true. A limited-identity server that gives up on extra accounts is contaminated before the experiment starts.
- **C7 (the narrow gate):** `endgame.unify.control_ratio` is at most 0.9. Setting it to 1.0 (hold the whole map) makes unification impossible by mechanism, and breaks axiom 6.

---

## 12. Profiles

A deployer may start from these. Each one is a stated comparison.

**`tianxia_classic` (classic, no script, all defaults)**
Tests the core question: under the strictest axioms, is unification possible? This is the baseline. Every variant is compared with it.

**`free_talk_control` (free speech control)**
Changes only `comm.free_chat = true` and `comm.private_message = true`.
Tests whether free language is the glue unification needs, or a source of disorder. Against the classic group, this is the highest-priority comparison in the project.

**`high_pressure` (a short, tight match)**
Changes `world.role_pool_size = 20`, `world.city_count = 5`, `turn.duration_hours = 6`, `endgame.unify.control_ratio = 0.6`.
Tests how the distribution of unification moves when the world is smaller and the pace is faster. It is for checking the mechanism quickly. Its results do not extend to a large world. A small circle of acquaintances and a large anonymous society are two questions.

**`season_mode` (a season)**
Changes `endgame.season_deadline_days = 60`.
Tests whether a deadline produces a late rush to unify, and how end-anxiety changes the stability of alliances.

**`nomic_lab` (Nomic bench, experimental, off by default)**
Unlocks `rules.amendment_via_ingame_politics = true`. Proposals to change this instance's rules are decided by its own politics (propose, second, vote, proclaim) and merged into that instance's branch.
This is the smallest shape of the farther aim. Turning it on takes the instance out of the standard comparison. Its data is marked apart. Warning: a coup inside the game may become a coup of the code. That is what it is there to watch.

---

## 13. Red lines (not configurable)

These are not variables. They are the axioms in the code. The setup offers no switch. A fork that removes a red line may not publish an instance under the name Three Kingdoms: All Seats Taken.

1. Death is permanent. A person leaves for good. No return, no substitute, no refill (C2).
2. The cast is closed. No new historical person. Newcomers enter only from the bottom (C5).
3. The board is anonymous. No account, no real-world identity. Citizen names are generated (axioms 5 and 4).
4. Officials do not interfere. No quiet change of a chance, no director of events, no automatic political punishment (C4, axiom 1).
5. Unification is not locked shut. The conditions may not be made impossible by mechanism (C7).
6. The referee is limited. Punishment is only cheating and harassment, not politics that walks inside the rules (axiom 7).
7. The log is complete. Full, append-only, and an export must be anonymized (axiom 2, and ethics).

---

## 14. Ethics

1. **Knowing.** Before sitting, a player must see the full setup and the ending, and acknowledge that what they put in may go to zero because the server closes, because of death, or because of a disposal.
2. **Leaving.** A player may leave at any time. What happens to the role (fallback, retirement, being set aside) is decided by the setup and posted in advance. There is no real-world punishment.
3. **Data.** Exported packets follow `data.export_license`. They are for research and discussion. Trying to recover a real-world identity from the log breaks the project's ethics, and each instance should refuse to help.
4. **The deployer's duty.** A deployer follows the law of their jurisdiction. The repository does not provide, and does not recognize, any official operated service.

---

*These items are the schema of the setup in the code. An implementation enforces every constraint in section 11 with a JSON Schema or an equivalent checker.*
