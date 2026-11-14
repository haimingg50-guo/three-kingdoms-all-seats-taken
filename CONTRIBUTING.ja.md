# 貢献

[中文](CONTRIBUTING.md) · [English](CONTRIBUTING.en.md) · [한국어](CONTRIBUTING.ko.md)

企ての説明は [README.ja.md](README.ja.md)。これは全員が真人で、拍の遅い社会実験である。路線は、AI で空席を埋めず、回合を速めない。

## 起動と試験

Node.js 22。

```bash
npm install
cp .env.example .env.local
npm test
npm run dev
```

ブラウザで `http://127.0.0.1:4317`。`.env.local` は空でよい。空なら SQLite で、裁判はない。`.env.local`、`data/` の対局庫、本物の令牌は入れない。

`npm test` はデータベースのサーバを要しない。`npm run build` は再現できる本番の構築。`npm run sim` は六つの固定席をやり直す。時間がかかる。毎回の変更では要しない。

## 欠陥

[three-kingdoms-all-seats-taken の Issues](https://github.com/haimingg50-guo/three-kingdoms-all-seats-taken/issues) に一条を開ける。再現の手順、期待、実際、言語を書く。令牌、データベースのファイル、真人を指せる記録は付けない。既にある記録は [docs/bug-log.md](docs/bug-log.md)。

## 向く方向

- 四つの言語を一緒に直す。界面、史書、README、このファイルは、一つ欠ければ未完である。
- 試験：旧い保存、権限、銭と材料が二度引かれないこと。
- 創作の画素。商業の三国ゲームの絵、曲、界面、数値表を写さない。
- 規則の説明と参照実装が食い違うときは、文書かコードを直す。まだない機能を、あるふりはしない。

## しないこと

- 空席に AI の指令を足さない。古典の 24 時間一回合を、既定の速拍にしない。
- 臣従の表決はなお三分の二を超えること。ちょうど三分の二は不通過。加入はなお受け取る君主の同意を要する。
- `examples/spectacle/` の見本を `public/spectacle/manifest.json` に書かない。そのファイルは自動では流れない。
- 字体は SIL OFL のまま。帰属は [src/fonts/FONTS.md](src/fonts/FONTS.md)。コードの許可は [AGPL-3.0](LICENSE)。
