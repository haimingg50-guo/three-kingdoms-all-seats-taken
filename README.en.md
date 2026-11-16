# Three Kingdoms: All Seats Taken

[中文](README.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Contributing](CONTRIBUTING.en.md)

A Three Kingdoms with no director. The rules are public. Unification closes the server. Seats are real people. An empty seat does not receive an AI order. A classic turn is 24 hours. The sandbox demo is 8 minutes. Speeding turns is not the direction of this project. There is no official online server. After you clone it, you run it on your own machine.

This is a social experiment you can deploy yourself. It is not a remake of Bandit Kings of Ancient China, or of any commercial game. It does not use their art, music, interface, number tables, or maps. The people and commanderies are public history. That is the only thing inherited here.

The repository ships tools. It does not run a world. Whoever deploys a match for others to play bears the law where they deploy it. This project has no official server and charges nothing.

A project that studies how a society with no officials organizes itself puts its own code in the open the same way: a fork may inherit, the chronicle may not be deleted.

## What happens in a match

Twelve historical seats, four cities, and unattached people who have not yet been found by a search. You bring no nickname. Choose Cao Cao, and the board shows only Cao Cao.

Each turn you submit one order: impeach or second, farm or search, ally or refuse, march or hold. At the clock, everything resolves together. An empty seat only holds the city. It does not think for you. After a person falls in battle or is executed, they leave for good. That name is not handed to the next player.

If someone holds the capital, enough cities, and has the other major powers gone or as vassals, then holds the consolidation, the match enters the memorial and stops. There is no switch that makes unification impossible. Controlling the whole map (ratio 1) is rejected by the setup check.

To learn the menu, open a sandbox. A sandbox lets you change seats. Its log is not experiment data.

## Run it locally

Node.js 22.

```bash
npm install
npm test
npm run dev
```

Open `http://127.0.0.1:4317`. The home page lists experiments. The first time it opens, if the database has no `demo`, the program writes Experiment One itself, profile `tabletop_demo`. There is no separate seed command. The board is `http://127.0.0.1:4317/world/demo`. The dev server listens on `0.0.0.0:4317`, so a LAN machine can reach it if the firewall allows. Data lives in `data/tianxia.sqlite`. Copy that file and you have backed up a whole chronicle. The filename, and the profile id `tianxia_classic`, stay as save identifiers so an old save still opens.

This is a trial on your own machine. It is not a service ready for the public internet. Identity is only the `tx_session` cookie. There is no account. On an experiment, whoever claims a name first keeps that seat, and a lost cookie cannot return to it. There is no background clock. A turn catches up when someone opens the page. Rate limits live in the memory of one process. The repository has no WebSocket. Do not expose the port to the public internet.

The board is original layered pixels and square-wave sound. Each cell is 32 pixels. Cities, fields, mountains, water, and roads are separate layers, not a scaled-up 16-pixel grid. Seasons are a change of color. Rain, snow, fog, and drought are pixel particles. The classic twelve cities are placed by hand. Each person has their own pixel portrait. No art or tune from a commercial Three Kingdoms game. The interface uses Fusion Pixel (SIL OFL; see `src/fonts/FONTS.md`). Chinese, Japanese, Korean, and English each use that font's glyphs for the language. The header switches 简体中文, English, 日本語, and 한국어. The choice is remembered in this browser. With no choice, it follows the browser language. Any Chinese tag uses the simplified interface. The chronicle stores only the kind of event and its parameters, and writes the sentence in the viewer's language. Sound stays off until you choose Sound. The sky seed is written in the opening chronicle. Weather can be recomputed from the public algorithm. Relief shares action points with domestic work. Dikes, granaries, clinics, canals, and mended roads are in the public setup. Filling them does not cut a loss to zero. Brotherhood, duels, schemes, rewards, refugees, and the seasonal bounty are in the People section of `docs/rules.en.md`. Search can bring iron, wood, leather, fodder, or purse coins. A pattern is learned, then forged. A mount is tamed, not forged. A duel can gain at most 4 from gear. The army resolution does not. After unification, the memorial lists people and records already written in that match. Spectacle notes are in [docs/spectacle.en.md](docs/spectacle.en.md). `npm run sim` replays a match with six fixed seats. The report is `docs/playtest-6bots.md`.

If the environment provides `DATABASE_URL` (`postgres://` or `postgresql://`), the program uses Postgres. Otherwise it uses SQLite.

The referee token is shown once, when the match opens. For a referee on Experiment One, set `TIANXIA_REFEREE_TOKEN` before start. The token can freeze cheating or harassment. It cannot change the war.

## Docker

```bash
docker compose up --build
```

It listens on 4317. The Compose service is `sanguo`. The database file is still `./data/tianxia.sqlite`.

## Implemented

- Simplified Chinese, English, Japanese, and Korean. The chronicle stores the kind of event and its parameters, and writes the sentence in the viewer's language.
- Original pixel board, portraits, and chip music. The board is drawn in 32-pixel layers. It is not the old 16-pixel grid scaled up. The font is Fusion Pixel, SIL OFL.
- A seated officer can move one adjacent friendly city along a road, takes no troops, and gains no extra action points. Locking an order only seals it. Harvest and battle results play after resolution.
- An empty seat only holds the city. A submission vote must be greater than two thirds. Exactly two thirds fails. Joining still needs the receiving lord's consent.
- Gear: search for materials, buy, learn a pattern, forge, tame a mount, equip and unequip, donate to the armory and draw. A personal piece can be named, and the maker is recorded.
- After unification, the memorial lists only the power and the records already written in that match.
- Pixel storyboards for the three spectacles, plus skip, off, low-data, and a pixel fallback when the file is missing.

## Not done

- No hosted public match. `npm run dev` and Docker run on your machine.
- Blade-borrows-rain and the smith's hammer have no video, only storyboards.
- Grain-check has an AI concept sample of about 6 seconds in [examples/spectacle/](examples/spectacle/README.en.md). The game does not play it. The manifest addresses are empty. The sample is not an editable 3D project.
- There is no market between players. The armory does not issue gear by itself. Mounts are not bred.

## Contributing

How to start, how to test, where to report a bug, and which rules to leave alone: [CONTRIBUTING.en.md](CONTRIBUTING.en.md).

## Documents

- [Aim](docs/愿景与哲学陈述.md) (Chinese)
- [Rules setup](docs/rules.en.md)
- [Reference implementation](docs/参照实现.md) (Chinese)
- [Spectacle](docs/spectacle.en.md)

The seven axioms are in the aim, and in the checker in `src/engine/config.ts`. The rules document is the experiment design. The reference note is the layer that actually resolves today. Where they differ, the reference note wins. Do not pretend a feature already exists.

## License

The code is [GNU AGPL-3.0](LICENSE). If you serve a modified version over a network, you must publish the corresponding source.

Exported match data defaults to CC BY 4.0. The log is indexed by role. Do not try to recover a real-world identity from it.

Terrain, cities, portraits, cutscenes, and the chip music were written for this experiment. They do not come from any commercial game. The interface font is Fusion Pixel, SIL OFL. The files and the upstream notices are in `src/fonts/`. Nothing else brings in third-party art or melody.
