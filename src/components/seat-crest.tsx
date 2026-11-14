/** 原创字标：三席都坐着人。不是任何商业三国游戏的标志。 */

export function SeatCrest({ size = 96 }: { size?: number }) {
  const height = Math.round(size * (40 / 64));
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 64 40"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="seat-crest"
    >
      <rect x="30" y="1" width="4" height="2" fill="#f0c040" />
      <rect x="26" y="3" width="12" height="2" fill="#f0c040" />
      <rect x="22" y="5" width="20" height="2" fill="#d85848" />
      <rect x="16" y="7" width="32" height="2" fill="#d85848" />
      <rect x="12" y="9" width="40" height="2" fill="#f0c040" />
      <rect x="12" y="11" width="40" height="2" fill="#14121a" />
      <rect x="14" y="13" width="3" height="18" fill="#f0c040" />
      <rect x="47" y="13" width="3" height="18" fill="#f0c040" />
      <rect x="20" y="15" width="4" height="3" fill="#f4f0dc" />
      <rect x="30" y="15" width="4" height="3" fill="#f4f0dc" />
      <rect x="40" y="15" width="4" height="3" fill="#f4f0dc" />
      <rect x="19" y="18" width="6" height="4" fill="#6a8cbe" />
      <rect x="29" y="18" width="6" height="4" fill="#6a9a62" />
      <rect x="39" y="18" width="6" height="4" fill="#d85848" />
      <rect x="18" y="22" width="8" height="2" fill="#f0c040" />
      <rect x="28" y="22" width="8" height="2" fill="#f0c040" />
      <rect x="38" y="22" width="8" height="2" fill="#f0c040" />
      <rect x="19" y="24" width="2" height="3" fill="#f4f0dc" />
      <rect x="23" y="24" width="2" height="3" fill="#f4f0dc" />
      <rect x="29" y="24" width="2" height="3" fill="#f4f0dc" />
      <rect x="33" y="24" width="2" height="3" fill="#f4f0dc" />
      <rect x="39" y="24" width="2" height="3" fill="#f4f0dc" />
      <rect x="43" y="24" width="2" height="3" fill="#f4f0dc" />
      <rect x="12" y="31" width="40" height="2" fill="#f0c040" />
      <rect x="10" y="33" width="44" height="2" fill="#14121a" />
      <rect x="14" y="35" width="36" height="2" fill="#d85848" />
    </svg>
  );
}
