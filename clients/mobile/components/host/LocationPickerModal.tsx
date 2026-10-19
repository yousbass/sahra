import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Modal, TextInput, SectionList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { AppText } from '@/components/AppText';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import {
  BAHRAIN_CAMPING_LOCATIONS,
  getRegions,
  getRegionLabel,
} from '@/lib/locations';

interface LocationPickerModalProps {
  visible: boolean;
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

/** Full-screen searchable location list grouped by governorate (web parity list). */
export function LocationPickerModal({ visible, selected, onSelect, onClose }: LocationPickerModalProps) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const { isRTL } = useI18n();
  const insets = useScreenInsets();
  const [search, setSearch] = useState('');

  const sections = useMemo(() => {
    const term = search.trim().toLowerCase();
    return getRegions()
      .map((region) => ({
        title: getRegionLabel(region, i18n.language),
        data: BAHRAIN_CAMPING_LOCATIONS.filter(
          (loc) =>
            loc.region === region &&
            (term.length === 0 || loc.label.toLowerCase().includes(term))
        ),
      }))
      .filter((section) => section.data.length > 0);
  }, [search, i18n.language]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
        <View style={[styles.header, isRTL ? styles.rtlRow : null]}>
          <AppText variant="h3" style={styles.headerTitle}>
            {t('hostSelectLocation')}
          </AppText>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
            <Ionicons name="close" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.searchRow,
            { backgroundColor: colors.card, borderColor: colors.border },
            isRTL ? styles.rtlRow : null,
          ]}
        >
          <Ionicons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('hostSearchLocation')}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}
            autoCorrect={false}
          />
        </View>

        {sections.length === 0 ? (
          <AppText variant="body" color={colors.mutedForeground} align="center" style={styles.noResults}>
            {t('hostNoLocationResults')}
          </AppText>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.value}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.list}
            renderSectionHeader={({ section }) => (
              <AppText
                variant="labelSm"
                color={colors.mutedForeground}
                style={styles.sectionHeader}
                align={isRTL ? 'right' : 'left'}
              >
                {section.title}
              </AppText>
            )}
            renderItem={({ item }) => {
              const active = item.value === selected;
              return (
                <TouchableOpacity
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                  style={[
                    styles.row,
                    {
                      backgroundColor: active ? colors.primary + '14' : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                    },
                    isRTL ? styles.rtlRow : null,
                  ]}
                >
                  <AppText variant="body" weight={active ? 'bold' : 'regular'} style={styles.rowLabel}>
                    {item.label}
                  </AppText>
                  {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  noResults: {
    marginTop: 32,
  },
  list: {
    paddingBottom: 48,
    gap: 8,
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  rowLabel: {
    flex: 1,
  },
});
