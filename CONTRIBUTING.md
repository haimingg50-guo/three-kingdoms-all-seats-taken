# 贡献

[English](CONTRIBUTING.en.md) · [日本語](CONTRIBUTING.ja.md) · [한국어](CONTRIBUTING.ko.md)

项目说明：[README.md](README.md)。这是全真人、慢节奏的社会实验。路线不是用 AI 填席，也不是把回合改快。

## 启动与测试

需要 Node.js 22。

```bash
npm install
cp .env.example .env.local
npm test
npm run dev
```

浏览器打开 `http://127.0.0.1:4317`。`.env.local` 可以留空：不填就用 SQLite，也没有裁判。不要把 `.env.local`、`data/` 里的对局库、或真实令牌提交进来。

`npm test` 不需要数据库服务。`npm run build` 做一次可复现的生产构建。`npm run sim` 用六个固定席位重跑，会比较久，不是每次提交都要跑。

## 缺陷

到 [three-kingdoms-all-seats-taken 的 Issues](https://github.com/haimingg50-guo/three-kingdoms-all-seats-taken/issues) 开一条。写明怎么复现、期望和实际、语言。不要附上令牌、数据库文件，或能认出真人的记录。已有记录在 [docs/bug-log.md](docs/bug-log.md)。

## 适合做的方向

- 四种语言一起改。界面、史书、README、本文件，缺一种就不算完成。
- 测试：旧档、权限、钱和材料不能重复扣。
- 原创像素。不要临摹商业三国游戏的图、曲、界面或数值表。
- 规则说明和参照实现不一致时，改文档或改代码，但不要假装还没有的功能已经有了。

## 不要做的

- 不要加 AI 替空席下令，不要把经典局的 24 小时回合改成默认的快节奏。
- 臣服表决仍须超过三分之二。刚好三分之二不算通过。加入仍须接收一方的君主同意。
- 不要把 `examples/spectacle/` 里的样片写进 `public/spectacle/manifest.json`。那支片子不自动演出。
- 字体保持 SIL OFL，归属见 [src/fonts/FONTS.md](src/fonts/FONTS.md)。代码许可是 [AGPL-3.0](LICENSE)。
