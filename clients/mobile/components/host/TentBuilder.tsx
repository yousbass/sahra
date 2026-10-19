import React from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { TentConfig } from '@/lib/hostListings';
import { TENT_FEATURES, TENT_TYPES, TentFeatureKey } from '@/lib/hostLabels';

interface TentBuilderProps {
  tents: TentConfig[];
  onAdd: (type: TentConfig['type']) => void;
  onRemove: (id: string) => void;
  onToggleFeature: (id: string, feature: TentFeatureKey) => void;
  onNotesChange: (id: string, text: string) => void;
}

/** Camp tent builder: add typed tents, toggle their 10 feature flags, notes. */
export function TentBuilder({ tents, onAdd, onRemove, onToggleFeature, onNotesChange }: TentBuilderProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const { isRTL } = useI18n();

  const typeLabel = (type: TentConfig['type']) =>
    t(TENT_TYPES.find((tt) => tt.value === type)?.i18nKey || 'hostTentSmall');

  return (
    <View style={styles.container}>
      <View style={[styles.addRow, isRTL ? styles.rtlRow : null]}>
        {TENT_TYPES.map((tt) => (
          <PressableScale
            key={tt.value}
            onPress={() => onAdd(tt.value)}
            style={[styles.addBtn, { borderColor: colors.primary + '66', backgroundColor: colors.primary + '10' }]}
          >
            <Ionicons name="add" size={14} color={colors.primary} />
            <AppText variant="labelSm" weight="bold" color={colors.primary}>
              {t(tt.i18nKey)}
            </AppText>
          </PressableScale>
        ))}
      </View>

      {tents.length === 0 ? (
        <AppText variant="bodySm" color={colors.mutedForeground}>
          {t('hostNoTentsYet')}
        </AppText>
      ) : null}

      {tents.map((tent, index) => (
        <View
          key={tent.id}
          style={[styles.tentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.tentHeader, isRTL ? styles.rtlRow : null]}>
            <AppText variant="label" weight="bold">
              {`${index + 1}. ${typeLabel(tent.type)}`}
            </AppText>
            <TouchableOpacity
              onPress={() => onRemove(tent.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            </TouchableOpacity>
          </View>

          <AppText variant="labelSm" color={colors.mutedForeground}>
            {t('hostTentFeatures')}
          </AppText>
          <View style={[styles.featureGrid, isRTL ? styles.rtlRow : null]}>
            {TENT_FEATURES.map((feature) => {
              const active = Boolean(tent[feature.key]);
              return (
                <TouchableOpacity
                  key={feature.key}
                  onPress={() => onToggleFeature(tent.id, feature.key)}
                  style={[
                    styles.featureChip,
                    {
                      backgroundColor: active ? colors.primary : colors.muted,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <AppText
                    variant="labelSm"
                    weight={active ? 'bold' : 'regular'}
                    color={active ? colors.primaryForeground : colors.mutedForeground}
                  >
                    {t(feature.i18nKey)}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            value={tent.description || ''}
            onChangeText={(text) => onNotesChange(tent.id, text)}
            placeholder={t('hostTentNotes')}
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.notesInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  addRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tentCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  tentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featureChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
});
