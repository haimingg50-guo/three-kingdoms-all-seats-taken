# 기여

[中文](CONTRIBUTING.md) · [English](CONTRIBUTING.en.md) · [日本語](CONTRIBUTING.ja.md)

프로젝트 설명은 [README.ko.md](README.ko.md). 이것은 전원이 실존 인물이고 박자가 느린 사회 실험이다. 방향은 AI로 빈 자리를 채우지 않고, 회를 빨리하지 않는다.

## 시작과 시험

Node.js 22.

```bash
npm install
cp .env.example .env.local
npm test
npm run dev
```

브라우저에서 `http://127.0.0.1:4317`. `.env.local` 은 비워 두어도 된다. 비우면 SQLite 이고 재판은 없다. `.env.local`, `data/` 의 대국 파일, 진짜 패는 넣지 않는다.

`npm test` 는 데이터베이스 서버가 필요 없다. `npm run build` 는 다시 만들 수 있는 프로덕션 빌드다. `npm run sim` 은 여섯 고정 자리로 다시 돌린다. 시간이 걸린다. 매번의 변경에 필수는 아니다.

## 결함

[three-kingdoms-all-seats-taken 의 Issues](https://github.com/haimingg50-guo/three-kingdoms-all-seats-taken/issues)에 하나를 연다. 재현 방법, 기대, 실제, 언어를 적는다. 패, 데이터베이스 파일, 실존 인물을 가리킬 기록은 붙이지 않는다. 이미 있는 기록은 [docs/bug-log.md](docs/bug-log.md).

## 맞는 방향

- 네 언어를 함께 고친다. 화면, 사서, README, 이 파일은 하나가 빠지면 끝나지 않은 것이다.
- 시험: 옛 저장, 권한, 돈과 재료가 두 번 빠지지 않는 것.
- 창작 픽셀. 상업 삼국 게임의 그림, 곡, 화면, 수치표를 베끼지 않는다.
- 규칙 설명과 참조 구현이 어긋나면 문서나 코드를 고친다. 아직 없는 기능을 있는 척하지 않는다.

## 하지 말 것

- 빈 자리에 AI 명령을 더하지 않는다. 고전의 24시간 한 회를 기본의 빠른 박자로 만들지 않는다.
- 복속 표결은 여전히 2/3을 넘어야 한다. 딱 2/3은 통과가 아니다. 가입은 여전히 받는 군주의 동의가 필요하다.
- `examples/spectacle/` 의 견본을 `public/spectacle/manifest.json` 에 적지 않는다. 그 파일은 스스로 재생되지 않는다.
- 글꼴은 SIL OFL 그대로. 귀속은 [src/fonts/FONTS.md](src/fonts/FONTS.md). 코드 허가는 [AGPL-3.0](LICENSE).
