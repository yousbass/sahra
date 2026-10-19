import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path, Circle, G, Line } from 'react-native-svg';

/**
 * Camp Glow background patterns — subtle, low-opacity surface textures.
 * Every component absolutely fills its (overflow:hidden) parent and scales
 * via a fixed viewBox + slice, so geometry is deterministic everywhere.
 *
 * Recommended opacity: dark indigo surfaces 0.08–0.12, light ivory 0.03–0.06.
 */

interface PatternProps {
  color: string;
  opacity: number;
}

const VB_W = 400;
const VB_H = 200;

const svgProps = {
  width: '100%' as const,
  height: '100%' as const,
  viewBox: `0 0 ${VB_W} ${VB_H}`,
  preserveAspectRatio: 'xMidYMid slice',
  style: StyleSheet.absoluteFill,
  pointerEvents: 'none' as const,
};

/* ----------------------------- B. Sadu weave ------------------------------ */

const diamond = (cx: number, cy: number, w: number, h: number) =>
  `M ${cx} ${cy - h / 2} L ${cx + w / 2} ${cy} L ${cx} ${cy + h / 2} L ${cx - w / 2} ${cy} Z`;

export function PatternSadu({ color, opacity }: PatternProps) {
  const bands: React.ReactElement[] = [];
  const bandGap = 34;
  const dW = 16;
  const dH = 11;
  const step = 22;
  let key = 0;
  for (let row = 0; row * bandGap + 14 < VB_H + bandGap; row++) {
    const cy = 14 + row * bandGap;
    const offset = row % 2 === 0 ? 0 : step / 2;
    for (let cx = -step; cx < VB_W + step; cx += step) {
      bands.push(<Path key={key++} d={diamond(cx + offset, cy, dW, dH)} fill={color} />);
      bands.push(
        <Path
          key={key++}
          d={diamond(cx + offset, cy, dW * 0.42, dH * 0.42)}
          fill="none"
          stroke={color}
          strokeWidth={0.8}
        />,
      );
    }
    // thin guide lines framing each band
    bands.push(
      <Line key={key++} x1={0} y1={cy - dH / 2 - 4} x2={VB_W} y2={cy - dH / 2 - 4} stroke={color} strokeWidth={0.7} />,
      <Line key={key++} x1={0} y1={cy + dH / 2 + 4} x2={VB_W} y2={cy + dH / 2 + 4} stroke={color} strokeWidth={0.7} />,
    );
  }
  return (
    <Svg {...svgProps}>
      <G opacity={opacity}>{bands}</G>
    </Svg>
  );
}

/* ----------------------------- D. Dune contours ---------------------------- */

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

export function PatternDunes({ color, opacity }: PatternProps) {
  const lines: React.ReactElement[] = [];
  const rows = 7;
  for (let i = 0; i < rows; i++) {
    const y = 22 + i * ((VB_H - 20) / rows);
    lines.push(
      <Path
        key={i}
        d={dunePath(y, 10 + i * 2.2, (i % 3) * 14 - 14)}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
      />,
    );
  }
  return (
    <Svg {...svgProps}>
      <G opacity={opacity}>{lines}</G>
    </Svg>
  );
}

/* ---------------------------- E. Tent canvas weave ------------------------- */

export function PatternCanvas({ color, opacity }: PatternProps) {
  const gap = 7;
  const lines: React.ReactElement[] = [];
  let key = 0;
  for (let x = 0; x <= VB_W; x += gap) {
    lines.push(
      <Line key={key++} x1={x} y1={0} x2={x} y2={VB_H} stroke={color} strokeWidth={x % (gap * 4) === 0 ? 1.1 : 0.5} />,
    );
  }
  for (let y = 0; y <= VB_H; y += gap) {
    lines.push(
      <Line key={key++} x1={0} y1={y} x2={VB_W} y2={y} stroke={color} strokeWidth={y % (gap * 4) === 0 ? 1.1 : 0.5} />,
    );
  }
  return (
    <Svg {...svgProps}>
      <G opacity={opacity}>{lines}</G>
    </Svg>
  );
}
