import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Rect, Path, Text as SvgText } from 'react-native-svg';

interface Props {
  price: number;
  isKashta: boolean;
  selected: boolean;
}

/**
 * Custom SVG map pin rendered as a price pill with a downward pointer tip.
 * Amber for camps, teal for kashtas. Scales up on selection via spring animation.
 * Built with react-native-svg (already bundled in the project).
 */
export function CampMapPin({ price, isKashta, selected }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 1.4 : 1,
      useNativeDriver: true,
      speed: 22,
      bounciness: 8,
    }).start();
  }, [selected, scale]);

  const bg = isKashta ? '#177E89' : '#F0A03C';
  const fg = isKashta ? '#FFFFFF' : '#0A1128';

  const priceText = price >= 100 ? `BD${price}` : `BD ${price}`;
  const W = 68;
  const H = 30;
  const TIP = 7;
  const R = H / 2;

  return (
    <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
      <Svg width={W} height={H + TIP} viewBox={`0 0 ${W} ${H + TIP}`}>
        {/* Shadow layer — slightly larger, dark rect behind */}
        <Rect
          x={1}
          y={2}
          width={W - 2}
          height={H}
          rx={R}
          fill="rgba(10,17,40,0.18)"
        />
        {/* Pill */}
        <Rect x={0} y={0} width={W} height={H} rx={R} fill={bg} />
        {/* Tip */}
        <Path
          d={`M ${W / 2 - 5} ${H} L ${W / 2} ${H + TIP} L ${W / 2 + 5} ${H} Z`}
          fill={bg}
        />
        {/* Price text */}
        <SvgText
          x={W / 2}
          y={H / 2 + 5}
          textAnchor="middle"
          fill={fg}
          fontSize={12}
          fontWeight="700"
          letterSpacing={-0.2}
        >
          {priceText}
        </SvgText>
      </Svg>
    </Animated.View>
  );
}
