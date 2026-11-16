/**
 * 山河图的原创插画。城位和河道走廊沿用示意图，没有描历史地图，也没有用别的游戏的画面。
 * 河湾仍是为了读图排的，不是复原的古河道。
 */

type Pt = [number, number];
type Seg = [Pt, Pt, Pt, Pt];

function smoothClosed(points: Pt[], tension = 6): string {
  const n = points.length;
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / tension;
    const c1y = p1[1] + (p2[1] - p0[1]) / tension;
    const c2x = p2[0] - (p3[0] - p1[0]) / tension;
    const c2y = p2[1] - (p3[1] - p1[1]) / tension;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return `${d} Z`;
}

function sample(a: Pt, b: Pt, c: Pt, d: Pt, t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
  ];
}

function ribbon(segments: Seg[], widthAt: (g: number) => number, samples = 36): string {
  const left: Pt[] = [];
  const right: Pt[] = [];
  const n = segments.length;
  for (let i = 0; i <= samples; i += 1) {
    const g = i / samples;
    const pos = g * n;
    const seg = Math.min(n - 1, pos >= n ? n - 1 : Math.floor(pos));
    const t = pos >= n ? 1 : pos - seg;
    const [a, b, c, d] = segments[seg];
    const p = sample(a, b, c, d, t);
    const ahead = sample(a, b, c, d, Math.min(1, t + 0.035));
    const dx = ahead[0] - p[0] || (d[0] - a[0]);
    const dy = ahead[1] - p[1] || (d[1] - a[1]);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const w = widthAt(g);
    left.push([p[0] + nx * w, p[1] + ny * w]);
    right.push([p[0] - nx * w, p[1] - ny * w]);
  }
  const ring = [...left, ...right.reverse()];
  return `${ring.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ")} Z`;
}

const YELLOW: Seg[] = [
  [[4, 28], [16, 26], [24, 30], [34, 27]],
  [[34, 27], [44, 24], [54, 22], [66, 26]],
  [[66, 26], [78, 30], [88, 28], [96, 32]],
];
const HAN: Seg[] = [
  [[30, 52.4], [40, 54], [48, 56], [52, 58]],
  [[52, 58], [54, 64], [53, 70], [52, 74]],
];
const YANGTZE: Seg[] = [
  [[2, 78.4], [14, 75.2], [22, 73.2], [32, 74]],
  [[32, 74], [42, 75.2], [48, 73.1], [52, 74]],
  [[52, 74], [64, 76.2], [72, 70.2], [80, 66]],
  [[80, 66], [88, 63.6], [94, 66.4], [99, 68.2]],
];
const HUAI: Seg[] = [
  [[66, 47.2], [74, 45.6], [84, 48.4], [92, 50.6]],
  [[92, 50.6], [96, 51.6], [98, 53], [100, 54.2]],
];

function yellowWidth(g: number) {
  return 0.32 + 1.85 * Math.sin(Math.PI * g) ** 0.75 + 0.28 * Math.sin(g * 9);
}
function yangtzeWidth(g: number) {
  const gorge = Math.exp(-((g - 0.36) ** 2) / 0.006);
  return (0.55 + 1.7 * g) * (1 - 0.5 * gorge) + 0.2 * Math.sin(g * 11);
}
function hanWidth(g: number) {
  return 0.22 + 0.55 * Math.sin(Math.PI * g) + 0.1 * Math.sin(g * 8);
}

const QINLING: Pt[] = [
  [7.2, 47.4], [10.4, 44.2], [13.2, 46.4], [16.4, 42.4], [19.2, 45.8], [22.2, 41.8],
  [25.4, 45.6], [28.6, 43.2], [31.2, 46.2], [34.2, 42.0], [37.4, 45.4], [40.4, 42.6],
  [43.6, 46.0], [46.4, 47.8],
  [46.8, 49.6], [41.4, 50.0], [35.6, 48.8], [30.4, 49.4], [24.8, 48.6], [18.6, 49.6],
  [12.8, 48.6], [7.4, 48.6],
];
const QINLING_LIT: Pt[] = [
  [8.0, 46.6], [11.0, 44.0], [13.8, 45.8], [16.8, 42.6], [19.6, 45.2], [22.6, 42.0],
  [25.8, 45.0], [28.8, 43.4], [31.6, 45.6], [34.6, 42.4], [37.6, 44.8], [40.6, 43.0],
  [43.4, 45.6], [45.6, 47.2],
  [44.8, 47.6], [40.2, 44.8], [36.2, 46.4], [31.8, 46.2], [27.4, 45.6], [22.4, 44.6],
  [17.2, 45.8], [12.2, 46.2], [8.4, 47.2],
];
const DABA: Pt[] = [
  [6.2, 63.4], [10.2, 60.4], [13.6, 62.8], [17.2, 59.8], [21.2, 62.6], [25.0, 60.0],
  [28.8, 62.8], [32.6, 60.2], [36.4, 62.6], [40.2, 61.0], [42.2, 63.2],
  [42.4, 65.6], [36.6, 66.2], [29.4, 65.2], [22.4, 66.4], [15.4, 65.4], [8.6, 66.0], [6.0, 64.2],
];
const DABA_LIT: Pt[] = [
  [7.0, 62.8], [10.6, 60.6], [14.0, 62.2], [17.6, 60.0], [21.6, 62.0], [25.4, 60.2],
  [29.2, 62.2], [33.0, 60.4], [36.6, 62.0], [40.0, 61.2], [41.4, 62.8],
  [40.4, 63.6], [35.2, 63.4], [29.2, 62.8], [23.2, 63.6], [16.6, 63.0], [11.0, 63.4], [7.4, 63.6],
];
const TAIHANG: Pt[] = [
  [42.6, 7.2], [46.4, 8.2], [48.8, 12.6], [47.4, 17.8], [49.4, 22.8], [47.6, 27.2],
  [44.4, 29.0], [41.8, 26.2], [40.4, 20.4], [41.8, 14.6], [40.6, 9.6], [41.8, 7.4],
];
const TAIHANG_LIT: Pt[] = [
  [42.4, 7.6], [41.2, 11.2], [40.8, 16.4], [41.6, 21.6], [42.4, 26.2], [44.2, 28.2],
  [45.2, 24.6], [44.2, 18.4], [45.4, 12.8], [44.2, 8.4],
];

const NORTH_PLAIN: Pt[] = [
  [48, 6], [62, 5.2], [78, 8], [90, 16], [86, 28], [74, 32], [60, 30], [50, 24], [46, 14],
];
const GUANZHONG: Pt[] = [
  [14, 34], [24, 31.5], [36, 32.4], [46, 34.2], [48, 40], [36, 42.2], [24, 41.4], [14, 38.5],
];
const SICHUAN: Pt[] = [
  [4, 67.2], [14, 66.4], [26, 67], [34, 69.5], [30, 76], [16, 77.2], [4, 74.5],
];
const JIANGHAN: Pt[] = [
  [40, 54], [52, 52.5], [64, 56], [66, 66], [54, 70], [42, 66], [38, 58],
];

function woods(points: Pt[], seed = 1) {
  const spots: { x: number; y: number; rx: number; ry: number; fill: string }[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const steps = 3;
    for (let s = 0; s < steps; s += 1) {
      const t = (s + 0.35) / steps;
      const wobble = ((i * 5 + s * seed) % 3) - 1;
      spots.push({
        x: x1 + (x2 - x1) * t + wobble * 0.15,
        y: y1 + (y2 - y1) * t + (s % 2 === 0 ? 0.15 : -0.05),
        rx: 0.42 + (s % 3) * 0.12,
        ry: 0.26 + (s % 2) * 0.08,
        fill: s % 3 === 0 ? "#24382c" : s % 3 === 1 ? "#3c5640" : "#567454",
      });
    }
  }
  return spots;
}

function Mass({ outline, lit, foot, rocks }: { outline: Pt[]; lit: Pt[]; foot: Pt[]; rocks: Pt[] }) {
  const canopy = woods(foot);
  return (
    <g>
      <path d={smoothClosed(outline, 11)} fill="#3a4038" />
      <path d={smoothClosed(outline, 11)} fill="#5a6848" opacity="0.72" />
      <path d={smoothClosed(lit, 12)} fill="#8d877c" />
      <path d={smoothClosed(lit, 12)} fill="#c4bba6" opacity="0.28" />
      {rocks.map(([x, y], index) => (
        <path
          key={`r${x}-${y}`}
          d={index % 2 === 0
            ? `M ${x} ${y} l 0.7 -0.85 l 0.85 0.2 l 0.15 0.75 l -1.15 0.25 Z`
            : `M ${x} ${y} l 0.45 -0.55 l 0.95 0.35 l -0.2 0.55 l -0.9 0.05 Z`}
          fill={index % 2 === 0 ? "#6e6960" : "#a39888"}
        />
      ))}
      {canopy.map((tree, index) => (
        <ellipse key={`w${index}`} cx={tree.x} cy={tree.y} rx={tree.rx} ry={tree.ry} fill={tree.fill} />
      ))}
      {foot.slice(0, -1).map(([x, y], index) => {
        const next = foot[index + 1];
        if (!next || index % 2 !== 0) return null;
        const mx = (x + next[0]) / 2;
        const my = (y + next[1]) / 2 - 1.1;
        return <path key={`s${x}`} d={`M ${mx} ${my} Q ${mx + 0.3} ${my + 0.8} ${(x + next[0]) / 2} ${(y + next[1]) / 2}`} fill="none" stroke="#2c382c" strokeWidth="0.12" opacity="0.45" />;
      })}
    </g>
  );
}

function pointAlong(segments: Seg[], g: number): { p: Pt; n: Pt } {
  const nSeg = segments.length;
  const pos = g * nSeg;
  const seg = Math.min(nSeg - 1, pos >= nSeg ? nSeg - 1 : Math.floor(pos));
  const t = pos >= nSeg ? 1 : pos - seg;
  const [a, b, c, d] = segments[seg];
  const p = sample(a, b, c, d, t);
  const ahead = sample(a, b, c, d, Math.min(1, t + 0.04));
  const dx = ahead[0] - p[0] || 1;
  const dy = ahead[1] - p[1] || 0;
  const len = Math.hypot(dx, dy) || 1;
  return { p, n: [-dy / len, dx / len] };
}

function Water({ segments, widthAt, bank, water, deep, gleam, bars }: { segments: Seg[]; widthAt: (g: number) => number; bank: string; water: string; deep: string; gleam: string; bars: number[] }) {
  const shore = ribbon(segments, (g) => widthAt(g) + 0.42 + 0.35 * Math.sin(g * 7));
  const body = ribbon(segments, widthAt);
  const thalweg = ribbon(segments, (g) => Math.max(0.12, widthAt(g) * 0.38));
  const shine = ribbon(segments, (g) => Math.max(0.08, widthAt(g) * 0.16));
  return (
    <g>
      <path d={shore} fill={bank} />
      <path d={body} fill={water} />
      <path d={thalweg} fill={deep} opacity="0.62" />
      <path d={shine} fill={gleam} opacity="0.35" />
      {bars.map((g) => {
        const { p, n } = pointAlong(segments, g);
        const w = widthAt(g);
        const cx = p[0] + n[0] * w * 0.35;
        const cy = p[1] + n[1] * w * 0.35;
        return <ellipse key={g} cx={cx} cy={cy} rx={Math.max(0.35, w * 0.55)} ry={0.18} fill="#e7d7b0" opacity="0.85" transform={`rotate(${(Math.atan2(n[0], n[1]) * 180) / Math.PI} ${cx} ${cy})`} />;
      })}
    </g>
  );
}

export function RiverBackdrop() {
  return (
    <g aria-hidden="true">
      <defs>
        <linearGradient id="land-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d7c74" />
          <stop offset="0.45" stopColor="#4e5e52" />
          <stop offset="1" stopColor="#3c4c42" />
        </linearGradient>
        <linearGradient id="east-sea" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3e6a72" stopOpacity="0.15" />
          <stop offset="0.45" stopColor="#2c5a68" />
          <stop offset="1" stopColor="#1c4458" />
        </linearGradient>
      </defs>
      <rect width="100" height="84" fill="url(#land-sky)" />
      <path d={smoothClosed(NORTH_PLAIN)} fill="#8b8458" opacity="0.42" />
      <path d={smoothClosed(GUANZHONG)} fill="#9a9168" opacity="0.38" />
      <path d={smoothClosed(JIANGHAN)} fill="#6d7a58" opacity="0.4" />
      <path d={smoothClosed(SICHUAN)} fill="#5e8a5a" opacity="0.38" />
      <path d="M84 14 C91 20 89 38 93 54 C96 64 98 72 100 76 L100 12 Z" fill="url(#east-sea)" />
      <path d="M86 18 C92 26 90 42 94 58" fill="none" stroke="#d5e4e4" strokeWidth="0.28" opacity="0.45" />
      <g opacity="0.55">
        <path d={smoothClosed(QINLING_LIT.map(([x, y]) => [x, y - 1.35]), 12)} fill="#8d968e" />
        <path d={smoothClosed(DABA_LIT.map(([x, y]) => [x, y - 1.15]), 12)} fill="#8d968e" />
      </g>
      <Mass
        outline={QINLING}
        lit={QINLING_LIT}
        foot={[...QINLING.slice(14)].reverse()}
        rocks={[[16.4, 43.2], [22.2, 42.6], [34.2, 42.8], [40.4, 43.4]]}
      />
      <Mass
        outline={DABA}
        lit={DABA_LIT}
        foot={[...DABA.slice(11)].reverse()}
        rocks={[[17.2, 60.8], [25, 60.8], [32.6, 61]]}
      />
      <Mass
        outline={TAIHANG}
        lit={TAIHANG_LIT}
        foot={TAIHANG.slice(6)}
        rocks={[[42.4, 12.2], [41.8, 18.6], [42.8, 24.4]]}
      />
      <Water segments={YELLOW} widthAt={yellowWidth} bank="#c6b184" water="#e4cc8e" deep="#a88448" gleam="#f6edd0" bars={[0.22, 0.48, 0.74]} />
      <Water segments={HUAI} widthAt={(g) => 0.28 + 0.42 * Math.sin(Math.PI * g)} bank="#8aa484" water="#7eaea4" deep="#4e7e86" gleam="#e7f4f2" bars={[0.45]} />
      <Water segments={HAN} widthAt={hanWidth} bank="#7f9e96" water="#7eb4b0" deep="#3e7478" gleam="#e7f6f4" bars={[0.42, 0.7]} />
      <Water segments={YANGTZE} widthAt={yangtzeWidth} bank="#7d9a78" water="#3f86a4" deep="#1a4a62" gleam="#d5eef4" bars={[0.18, 0.55, 0.82]} />
      <text x="8.2" y="42.6" fill="#d9d0bc" fontSize="1.7" opacity="0.85">秦岭</text>
      <text x="6.2" y="59.2" fill="#d9d0bc" fontSize="1.7" opacity="0.85">大巴</text>
      <text x="50.2" y="16.2" fill="#d9d0bc" fontSize="1.7" opacity="0.85">太行</text>
      <text x="70" y="21.6" fill="#f3e6c4" fontSize="1.7" opacity="0.9">黄河</text>
      <text x="78" y="44.6" fill="#e4f0ea" fontSize="1.55" opacity="0.8">淮河</text>
      <text x="38.5" y="51.2" fill="#e7f3f0" fontSize="1.6" opacity="0.85">汉水</text>
      <text x="60" y="79.6" fill="#e4f1f6" fontSize="1.7" opacity="0.9">长江</text>
      <text x="74" y="14.5" fill="#d5d8c4" fontSize="1.6" opacity="0.7">华北</text>
      <text x="16" y="33.2" fill="#d5d8c4" fontSize="1.6" opacity="0.7">关中</text>
      <text x="5.2" y="69.2" fill="#d5d8c4" fontSize="1.6" opacity="0.7">四川</text>
      <text x="92.4" y="36" fill="#d5e6ee" fontSize="1.6" opacity="0.75">东海</text>
      <text x="50" y="4.6" fill="#f4f0dc" fontSize="1.8">北</text>
    </g>
  );
}

const HALLS: Record<1 | 2 | 3, [number, number, number, number][]> = {
  1: [[-1.15, -0.85, 1.15, 0.7], [0.2, -0.95, 1.05, 0.75], [-1.2, 0.05, 1.05, 0.6], [0.05, 0.1, 1.15, 0.62]],
  2: [[-2.15, -1.25, 1.25, 0.78], [-0.65, -1.4, 1.7, 1.0], [1.25, -1.15, 1.0, 0.7], [-2.15, -0.25, 1.15, 0.65], [-0.75, -0.15, 1.15, 0.62], [0.6, -0.05, 1.25, 0.7], [-2.05, 0.6, 1.2, 0.55], [-0.55, 0.7, 1.15, 0.52], [0.85, 0.8, 1.2, 0.5]],
  3: [[-2.3, -1.45, 1.35, 0.8], [-0.7, -1.6, 1.9, 1.1], [1.4, -1.35, 1.05, 0.75], [-2.35, -0.4, 1.2, 0.65], [-0.9, -0.25, 1.2, 0.6], [0.5, -0.15, 1.15, 0.62], [1.8, -0.2, 0.7, 0.55], [-2.2, 0.5, 1.25, 0.55], [-0.7, 0.55, 1.2, 0.55], [0.7, 0.6, 1.15, 0.5], [1.95, 0.45, 0.55, 0.5]],
};

const TILE = ["#8d4034", "#a85a3a", "#6e4a3a", "#9a6844", "#7a5340"];

export function Town({ rank, fill, selected, mine }: { rank: 1 | 2 | 3; fill: string; selected: boolean; mine?: boolean }) {
  const s = rank === 3 ? 1.16 : rank === 2 ? 1 : 0.76;
  const halls = HALLS[rank];
  return (
    <g transform={`scale(${s})`}>
      <ellipse cx="0.2" cy="2.35" rx="3.4" ry="0.55" fill="#1a2218" opacity="0.28" />
      <g>
        <rect x="-4.35" y="-0.55" width="1.15" height="0.7" fill="#6d7a45" transform="rotate(-6 -3.8 0)" />
        <path d="M -4.2 -0.35 H -3.3 M -4.15 -0.15 H -3.25" stroke="#4a5830" strokeWidth="0.05" />
        <rect x="-4.25" y="0.4" width="1.05" height="0.58" fill="#c2a15a" transform="rotate(4 -3.7 0.7)" />
        <rect x="3.25" y="-0.35" width="1.15" height="0.72" fill="#5e6a40" transform="rotate(5 3.8 0)" />
        <rect x="3.35" y="0.55" width="1.0" height="0.5" fill="#c2a15a" />
        <rect x="-1.35" y="2.25" width="0.95" height="0.42" fill="#6a7844" />
        <rect x="0.35" y="2.28" width="1.15" height="0.38" fill="#c2a15a" />
      </g>
      {rank > 1 ? <rect x="-1.6" y="-2.85" width="1.35" height="0.38" fill="#617048" /> : null}
      {rank === 3 ? (
        <rect x="-3.85" y="-2.55" width="7.7" height="5.15" fill="none" stroke="#a89070" strokeWidth="0.16" />
      ) : null}
      <rect x="-3.15" y="-2.15" width="6.3" height="4.3" fill="#c4b496" />
      <rect x="-3.15" y="-2.15" width="6.3" height="0.28" fill="#8d7356" />
      <rect x="-3.15" y="1.85" width="6.3" height="0.3" fill="#8d7356" />
      <path d="M -3.15 -2.15 h0.42 v-0.42 h0.38 v0.42 h0.46 v-0.42 h0.38 v0.42 h0.46 v-0.42 h0.38 v0.42 h0.46 v-0.42 h0.38 v0.42 h0.46 v-0.42 h0.38 v0.42 h0.46 v-0.42 h0.38 v0.42 h0.46 v-0.42 h0.4 v0.42 H 3.15 v0.28 H -3.15 Z" fill="#d9c7a6" />
      <rect x="-2.7" y="-1.7" width="5.4" height="3.15" fill="#e6d5b4" />
      <path d="M 0 1.45 V -0.15 M -2.15 0.15 H 2.15" stroke="#c2b094" strokeWidth="0.32" />
      {halls.map(([x, y, w, h], index) => (
        <g key={`${x}-${y}`}>
          <rect x={x - 0.06} y={y + h - 0.08} width={w + 0.12} height="0.1" fill="#4a3028" opacity="0.35" />
          <rect x={x} y={y} width={w} height={h} fill={TILE[index % TILE.length]} />
          <path d={`M ${x} ${y + 0.16} H ${x + w}`} stroke="#f0d2b0" strokeWidth="0.05" opacity="0.45" />
          <path d={`M ${x + w * 0.5} ${y} V ${y + h}`} stroke="#4a3028" strokeWidth="0.05" opacity="0.4" />
        </g>
      ))}
      <rect x="-0.48" y="1.15" width="0.96" height="1.0" fill="#3a322c" />
      <path d="M -0.48 1.15 Q 0 0.72 0.48 1.15" fill="#e6d3a8" />
      <rect x="-1.05" y="0.95" width="2.1" height="0.42" fill="#8d4034" />
      <rect x="-0.95" y="0.72" width="0.22" height="0.55" fill={fill} />
      <rect x="0.73" y="0.72" width="0.22" height="0.55" fill={fill} />
      {[[-3.15, -2.15], [2.72, -2.15], [-3.15, 1.55], [2.72, 1.55]].map(([x, y]) => (
        <rect key={`${x}${y}`} x={x} y={y} width="0.48" height="0.62" fill="#b7a27e" stroke="#6a543c" strokeWidth="0.05" />
      ))}
      {selected ? <rect x="-3.28" y="-2.55" width="6.56" height="4.7" fill="none" stroke="#f4efe2" strokeWidth="0.14" /> : null}
      {mine ? <path d="M -2.7 -2.15 v-1.15 l0.7 0.38 l0.7 -0.38 v1.15" fill="#e2b84a" stroke="#6a5018" strokeWidth="0.05" /> : null}
    </g>
  );
}

export function PassGate({ x, y }: { x: number; y: number }) {
  return (
    <g aria-hidden="true" transform={`translate(${x} ${y})`}>
      <rect x="-0.95" y="-0.42" width="1.9" height="0.95" fill="#8a8174" />
      <rect x="-0.7" y="-0.62" width="0.38" height="0.28" fill="#d9c7a6" />
      <rect x="0.32" y="-0.62" width="0.38" height="0.28" fill="#c4b496" />
      <rect x="-0.22" y="-0.05" width="0.44" height="0.58" fill="#2c2824" />
    </g>
  );
}

export function FordMark({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <g aria-hidden="true" transform={`translate(${mx} ${my}) rotate(${angle})`}>
      <rect x="-0.16" y="-1.55" width="0.32" height="0.55" fill="#e6d3a8" />
      <rect x="-0.16" y="1.0" width="0.32" height="0.55" fill="#e6d3a8" />
      <path d="M -1.15 0.28 Q 0 -0.55 1.15 0.28 L 0.85 0.48 L -0.85 0.48 Z" fill="#6a3e22" stroke="#f0e0c4" strokeWidth="0.06" />
    </g>
  );
}
