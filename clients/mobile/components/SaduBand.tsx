import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

/**
 * SaduBand — signature Camp Glow identity motif.
 * A thin sadu-weaving-inspired strip of alternating diamonds
 * (lantern amber / Gulf teal / night indigo) between two hairlines.
 * Pure Views (no SVG dependency); direction-symmetric so RTL-safe.
 */
export function SaduBand({ style }: { style?: any }) {
  const colors = useColors();
  const palette = [colors.primary, '#0A1128', colors.kashta, '#0A1128'];
  const diamonds = Array.from({ length: 24 });

  return (
    <View style={[styles.wrap, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.hairline, { backgroundColor: colors.border }]} />
      <View style={styles.row}>
        {diamonds.map((_, i) => (
          <View
            key={i}
            style={[
              styles.diamond,
              { backgroundColor: palette[i % palette.length] },
              i % 4 === 0 ? { opacity: 0.95 } : { opacity: 0.55 },
            ]}
          />
        ))}
      </View>
      <View style={[styles.hairline, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    gap: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 9,
  },
  diamond: {
    width: 7,
    height: 7,
    borderRadius: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
});
