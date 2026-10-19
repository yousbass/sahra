import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { AppText } from './AppText';

const NIGHT = '#0A1128';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Selected background; brand rule: night-indigo text on amber/teal fills. */
  accent: string;
  icon?: keyof typeof Ionicons.glyphMap;
  testID?: string;
}

/** Pill filter chip used on section pages (sort, price bands, guests). */
export function FilterChip({ label, selected, onPress, accent, icon, testID }: FilterChipProps) {
  const colors = useColors();
  const { isRTL } = useI18n();

  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.chip,
        isRTL ? styles.rtlRow : null,
        { backgroundColor: selected ? accent : colors.muted },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={13} color={selected ? NIGHT : colors.mutedForeground} />
      ) : null}
      <AppText
        variant="labelSm"
        weight={selected ? 'bold' : 'semibold'}
        color={selected ? NIGHT : colors.mutedForeground}
        style={{ marginHorizontal: icon ? 5 : 2 }}
      >
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  rtlRow: { flexDirection: 'row-reverse' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 18,
    minHeight: 44,  /* WCAG / Apple HIG minimum touch target */
  },
});
