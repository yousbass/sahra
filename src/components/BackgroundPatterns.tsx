/**
 * Camp Glow background patterns — subtle, low-opacity surface textures.
 * Mirrors the mobile app's components/BackgroundPatterns.tsx geometry.
 * Each renders an absolutely-positioned SVG filling its nearest positioned
 * ancestor (add `relative`/`overflow-hidden` to the container as needed).
 *
 * Recommended opacity: dark surfaces 0.05–0.08, light surfaces 0.03–0.05.
 */

interface PatternProps {
  color?: string;
  opacity: number;
  className?: string;
}

const VB_W = 400;
const VB_H = 200;

function Shell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full pointer-events-none ${className ?? ''}`}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid slice"
    >
      {children}
    </svg>
  );
}

/* Sadu weave rows */
const diamond = (cx: number, cy: number, w: number, h: number) =>
  `M ${cx} ${cy - h / 2} L ${cx + w / 2} ${cy} L ${cx} ${cy + h / 2} L ${cx - w / 2} ${cy} Z`;

export function PatternSadu({ color = '#0A1128', opacity, className }: PatternProps) {
  const items: React.ReactNode[] = [];
  const bandGap = 34;
  const dW = 16;
  const dH = 11;
  const step = 22;
  let key = 0;
  for (let row = 0; row * bandGap + 14 < VB_H + bandGap; row++) {
    const cy = 14 + row * bandGap;
    const offset = row % 2 === 0 ? 0 : step / 2;
    for (let cx = -step; cx < VB_W + step; cx += step) {
      items.push(<path key={key++} d={diamond(cx + offset, cy, dW, dH)} fill={color} />);
      items.push(
        <path key={key++} d={diamond(cx + offset, cy, dW * 0.42, dH * 0.42)} fill="none" stroke={color} strokeWidth={0.8} />,
      );
    }
    items.push(
      <line key={key++} x1={0} y1={cy - dH / 2 - 4} x2={VB_W} y2={cy - dH / 2 - 4} stroke={color} strokeWidth={0.7} />,
      <line key={key++} x1={0} y1={cy + dH / 2 + 4} x2={VB_W} y2={cy + dH / 2 + 4} stroke={color} strokeWidth={0.7} />,
    );
  }
  return (
    <Shell className={className}>
      <g opacity={opacity}>{items}</g>
    </Shell>
  );
}

/* Dune contours */
const dunePath = (baseY: number, amp: number, phase: number) => {
  const seg = VB_W / 4;
  let d = `M -10 ${baseY}`;
  for (let i = 0; i < 5; i++) {
    const x0 = i * seg;
    const dir = i % 2 === 0 ? 1 : -0.55;
    d += ` Q ${x0 + seg / 2 + phase} ${baseY - amp * dir}, ${x0 + seg} ${baseY}`;
  }
  return d;
};

export function PatternDunes({ color = '#0A1128', opacity, className }: PatternProps) {
  const rows = 7;
  const lines: React.ReactNode[] = [];
  for (let i = 0; i < rows; i++) {
    const y = 22 + i * ((VB_H - 20) / rows);
    lines.push(
      <path key={i} d={dunePath(y, 10 + i * 2.2, (i % 3) * 14 - 14)} fill="none" stroke={color} strokeWidth={1.4} />,
    );
  }
  return (
    <Shell className={className}>
      <g opacity={opacity}>{lines}</g>
    </Shell>
  );
}

/* Tent canvas weave */
export function PatternCanvas({ color = '#0A1128', opacity, className }: PatternProps) {
  const gap = 7;
  const lines: React.ReactNode[] = [];
  let key = 0;
  for (let x = 0; x <= VB_W; x += gap) {
    lines.push(<line key={key++} x1={x} y1={0} x2={x} y2={VB_H} stroke={color} strokeWidth={x % (gap * 4) === 0 ? 1.1 : 0.5} />);
  }
  for (let y = 0; y <= VB_H; y += gap) {
    lines.push(<line key={key++} x1={0} y1={y} x2={VB_W} y2={y} stroke={color} strokeWidth={y % (gap * 4) === 0 ? 1.1 : 0.5} />);
  }
  return (
    <Shell className={className}>
      <g opacity={opacity}>{lines}</g>
    </Shell>
  );
}
