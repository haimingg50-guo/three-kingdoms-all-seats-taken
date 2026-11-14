# Contributing

[中文](CONTRIBUTING.md) · [日本語](CONTRIBUTING.ja.md) · [한국어](CONTRIBUTING.ko.md)

Project notes: [README.en.md](README.en.md). This is a slow social experiment played by real people. The direction is not to fill empty seats with AI, and not to speed the turns.

## Run and test

Node.js 22.

```bash
npm install
cp .env.example .env.local
npm test
npm run dev
```

Open `http://127.0.0.1:4317`. `.env.local` may stay empty: SQLite, and no referee. Do not commit `.env.local`, a match database under `data/`, or a real token.

`npm test` needs no database server. `npm run build` makes a reproducible production build. `npm run sim` replays six fixed seats and takes a while. It is not required for every change.

## Bugs

Open an issue on [three-kingdoms-all-seats-taken](https://github.com/haimingg50-guo/three-kingdoms-all-seats-taken/issues). Include how to repeat it, what you expected, what happened, and the language. Do not attach a token, a database file, or a log that identifies a real person. Notes already kept are in [docs/bug-log.md](docs/bug-log.md).

## Useful directions

- Change all four languages together. Interface, chronicle, README, and this file are unfinished if one language is missing.
- Tests for old saves, permission, and money or materials that must not be spent twice.
- Original pixels. Do not copy art, music, interface, or number tables from a commercial Three Kingdoms game.
- Where the rules note and the reference implementation disagree, fix the document or the code. Do not pretend a missing feature exists.

## Leave these alone

- Do not add AI orders for empty seats. Do not make the classic 24-hour turn a faster default.
- A submission vote still needs more than two thirds. Exactly two thirds fails. Joining still needs the receiving lord's consent.
- Do not put the sample in `examples/spectacle/` into `public/spectacle/manifest.json`. That file does not play by itself.
- Fonts stay SIL OFL. Attribution is in [src/fonts/FONTS.md](src/fonts/FONTS.md). The code license is [AGPL-3.0](LICENSE).
