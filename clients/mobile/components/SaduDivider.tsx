import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface SaduDividerProps {
  width?: number | string;
  marginVertical?: number;
}

export function SaduDivider({ width = '100%', marginVertical = 24 }: SaduDividerProps) {
  const colors = useColors();

  return (
    <View style={[{ width: width as any, marginVertical }, styles.container]}>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
      <View style={styles.diamonds}>
        <View style={[styles.diamond, { backgroundColor: colors.primary }]} />
        <View style={[styles.diamond, { backgroundColor: colors.accent }]} />
        <View style={[styles.diamond, { backgroundColor: colors.primary }]} />
      </View>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    height: 1,
  },
  diamonds: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 6,
  },
  diamond: {
    width: 6,
    height: 6,
    transform: [{ rotate: '45deg' }],
  },
});
