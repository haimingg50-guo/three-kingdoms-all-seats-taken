import { Bust, type Mood } from "@/components/game/bust";

/** 每人一张原创 8×16 点阵。字母是颜色，不是任何游戏的立绘。 */
const INK = "#14121a";
const PAL: Record<string, string> = {
  o: INK,
  s: "#f0c8a0",
  k: "#e0a070",
  h: "#3a2418",
  H: "#d8d0c0",
  m: "#d8dce6",
  e: "#1a120c",
  n: "#6a4030",
  g: "#f0c040",
  r: "#d84848",
  w: "#f4f0dc",
  p: "#e89090",
  f: "#3a2a22",
  u: "#14121a",
};

function sprite(art: string): string[] {
  const rows = art
    .trim()
    .split("\n")
    .map((row) => row.trim())
    .filter((row) => row.length > 0);
  if (rows.length !== 16 || rows.some((row) => row.length !== 8)) {
    throw new Error(`立绘尺寸不对 ${rows.length}:${rows.map((row) => row.length).join(",")}`);
  }
  return rows;
}

const RAW: Record<string, string> = {
  "cao-cao": `
.gggggg.
ghhhhhhg
.msssssm
.mseessm
..ssss..
..snns..
..nnnn..
..bbbb..
.bbbbbb.
bbbbbbbb
brbbbbrb
b.bbbb.b
..b..b..
..f..f..
........
........
`,
  "xiahou-dun": `
.mmmmmm.
mmhhhhmm
.msssssm
.muuessm
..ssss..
.rnnnnr.
..nnnn..
..bbbb..
.bbbbbb.
bbbbbbbb
b.bbbb.b
b.b..b.b
..b..b..
..f..f..
........
........
`,
  "xun-yu": `
.hhhhhh.
hhhhhhhh
h.ssss.h
..seess.
..ssss..
...nn...
..ssss..
..bbbb..
.bbbbbb.
.bggggb.
.bbbbbb.
..b..b..
..b..b..
..f..f..
........
........
`,
  "guo-jia": `
hhhh....
.hhhhhh.
..sssss.
..seess.
..spps..
..ssss..
...ss...
..bbbb..
.bbbbbb.
..bbbb..
..b..b..
..b..b..
..f..f..
........
........
........
`,
  "liu-bei": `
.wwwwww.
wssssssw
.mseessm
..ssss..
..snns..
..ssss..
...ss...
..bbbb..
.bbbbbb.
bbggggbb
.bbbbbb.
..b..b..
..b..b..
..f..f..
........
........
`,
  "guan-yu": `
.rrrrrr.
rmssssmr
.mseessm
..ssss..
..nnnn..
..nnnn..
..nnnn..
.nnbbnn.
.nbbbnn.
nnbbbbnn
.n.bb.n.
..b..b..
..b..b..
..f..f..
........
........
`,
  "zhang-fei": `
.hhhhhh.
hmssssmh
.meeessm
.msppsm.
.nnnnnn.
nn.nn.nn
..nnnn..
..bbbb..
bbbbbbbb
b.bbbb.b
bb.bb.bb
..b..b..
..f..f..
........
........
........
`,
  "zhuge-liang": `
ghhhhhhg
hhhhhhhh
..ssss..
..seess.
..ssss..
...ss...
..wbbw..
.wwbbww.
..bbbb..
.gggggg.
..b..b..
..b..b..
..f..f..
.ww.....
w.w.....
.w......
`,
  "sun-quan": `
.gggggg.
gmssssmg
.mseessm
..ssss..
..spps..
...ss...
..bbbb..
.bbbbbb.
brbbbbrb
.bbbbbb.
..b..b..
..b..b..
..f..f..
........
........
........
`,
  "zhou-yu": `
hhhh....
hhhhhhh.
.msssssm
.mseessm
..ssss..
..spps..
...ss...
..bbbb..
.bggggb.
.bbbbbb.
..b..b..
..b..b..
..f..f..
........
........
........
`,
  "lu-su": `
.hhhhhh.
hssssssh
.mseessm
..ssss..
..snns..
..ssss..
.ssssss.
..bbbb..
.bbbbbb.
bbbbbbbb
.b.bb.b.
..b..b..
..f..f..
........
........
........
`,
  "lu-xun": `
.mmmmmm.
mhhhhhmm
..ssss..
..seess.
..ssss..
...nn...
...ss...
..bbbb..
.bbbbbb.
.bgbbgb.
..b..b..
..b..b..
..f..f..
........
........
........
`,
  "lv-bu": `
r.mmmm.r
rmhhhhmr
.meeessm
.mssssm.
.nnnnnn.
..nnnn..
..bbbb..
bbbbbbbb
brbbbbrb
bb.bb.bb
.b.bb.b.
..b..b..
..f..f..
.rr.....
rr......
r.......
`,
  "yuan-shao": `
gggggggg
ghhhhhhg
gmssssmg
.mseessm
..snns..
.nnnnnn.
..nnnn..
..bbbb..
bbbbbbbb
bggggggb
.b.bb.b.
..b..b..
..b..b..
..f..f..
........
........
`,
  "sima-yi": `
.hhhhhh.
hhhhhhhh
..ssss..
..s.ees.
..ssss..
...pp...
...ss...
..bbbb..
.b.bb.b.
..bbbb..
..b..b..
..b..b..
..f..f..
........
........
........
`,
  "pang-tong": `
wwwwwwww
wssssssw
.mseessm
..ssss..
..sn.n..
..ssss..
...ss...
..bbbb..
.bbbbbb.
.b.bb.b.
..b..b..
..b..b..
..f..f..
........
........
........
`,
  "zhao-yun": `
.wwmmww.
wmmmmmmw
.msssssm
.mseessm
..ssss..
..spps..
...ss...
..bbbb..
.bbbbbb.
bwbbbbwb
..b..b..
..b..b..
..f..f..
........
........
........
`,
  "dian-wei": `
.hhhhhh.
hmssssmh
.meeeesm
.msssssm
.nnnnnn.
..nnnn..
bbbbbbbb
bbbbbbbb
brbbbbrb
bb.bb.bb
b..bb..b
..b..b..
..f..f..
r.......
.r......
........
`,
  "gan-ning": `
.r.hh.r.
rhhhhhhr
.msssssm
.mseessm
..spps..
..ssss..
...ss...
..bbbb..
.bbbbbb.
brbbbbrb
..b..b..
..b..b..
..f..f..
g.......
.g......
........
`,
  "huang-zhong": `
.HHHHHH.
HssssssH
.mseessm
..ssss..
.HnnnnH.
..nnnn..
..nnnn..
..bbbb..
.bbbbbb.
.b.bb.b.
..b..b..
..b..b..
..f..f..
.....gg.
......g.
........
`,
  garrison: `
.mmmmmm.
mmssssmm
.mseessm
..ssss..
...ss...
...ss...
..bbbb..
.bbbbbb.
..bbbb..
..b..b..
..b..b..
..f..f..
........
........
........
........
`,
};

const CITIZENS = [
  `
.hhhhhh.
.msssssm
..seess.
..ssss..
...pp...
...ss...
..bbbb..
.bbbbbb.
..bbbb..
..b..b..
..b..b..
..f..f..
........
........
........
........
`,
  `
hhhh....
.msssss.
..seess.
..ssss..
...nn...
...ss...
..bbbb..
.bbbbbb.
..b..b..
..b..b..
..f..f..
........
........
........
........
........
`,
  `
.HHHHHH.
.msssssm
..seess.
..snns..
..nnnn..
...ss...
..bbbb..
.bbbbbb.
..bbbb..
..b..b..
..f..f..
........
........
........
........
........
`,
  `
.mmmmmm.
.msssssm
..suess.
..ssss..
...pp...
...ss...
..bbbb..
.bbbbbb.
..b..b..
..b..b..
..f..f..
........
........
........
........
........
`,
].map(sprite);

export const PORTRAITS: Record<string, string[]> = Object.fromEntries(
  Object.entries(RAW).map(([id, art]) => [id, sprite(art)]),
);

export function portraitRows(id: string): string[] {
  if (PORTRAITS[id]) return PORTRAITS[id];
  let hash = 0;
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return CITIZENS[hash % CITIZENS.length]!;
}

export function Portrait({
  id,
  cloth = "#c4a060",
  scale = 2,
  mood = "calm",
}: {
  id: string;
  cloth?: string;
  scale?: number;
  mood?: Mood;
}) {
  return Bust({ id, cloth, scale, mood });
}

export function portraitColor(ch: string, cloth: string) {
  if (ch === ".") return null;
  if (ch === "b") return cloth;
  return PAL[ch] ?? null;
}
