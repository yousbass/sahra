import React, { useEffect, useRef } from 'react';
import {
  View, StyleSheet, Animated, TouchableOpacity, Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useFavorites } from '@/hooks/useFavorites';
import { Camp } from '@/lib/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { ListingCard } from './ListingCard';

interface Props {
  camp: Camp | null;
  onClose: () => void;
  /** Total active camps (after filters). */
  filteredCount: number;
  /** How many of those have pin coordinates. */
  mappableCount: number;
}

/**
 * Two-state bottom sheet for the map view:
 * - No selection: shows a floating stats chip (X on map · Y without location).
 * - Camp selected: slides up to show ListingCard + action buttons.
 *
 * Animation uses a single Animated.Value so the sheet can be driven with
 * spring on open and timing on close — same pattern used across the app.
 */
export function MapPreviewSheet({ camp, onClose, filteredCount, mappableCount }: Props) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isFavorite, toggleFavorite } = useFavorites();
  const translateY = useRef(new Animated.Value(600)).current;
  const visible = camp !== null;
  const unmappable = filteredCount - mappableCount;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 18,
        bounciness: 4,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 600,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  const openInMaps = () => {
    if (!camp?.coordinates) return;
    Linking.openURL(
      `https://maps.google.com/?q=${camp.coordinates.lat},${camp.coordinates.lng}`
    ).catch(() => {});
  };

  return (
    <>
      {/* Floating stats chip — visible when no camp is selected */}
      {!visible && mappableCount > 0 && (
        <View
          style={[styles.statsChip, { backgroundColor: colors.card, borderColor: colors.border }]}
          pointerEvents="none"
        >
          <Ionicons name="location" size={13} color={colors.primary} style={{ marginRight: 5 }} />
          <AppText variant="labelSm" color={colors.mutedForeground}>
            {t('campsOnMap', { count: mappableCount })}
            {unmappable > 0 ? `  ·  ${t('campsWithoutPin', { count: unmappable })}` : ''}
          </AppText>
        </View>
      )}

      {/* Camp preview sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, borderColor: colors.border },
          { transform: [{ translateY }] },
        ]}
        pointerEvents={visible ? 'box-none' : 'none'}
      >
        {/* Handle bar + close button */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {camp && (
          <>
            <ListingCard
              item={camp}
              index={0}
              isFavorite={isFavorite(camp.id)}
              onToggleFavorite={() => toggleFavorite(camp.id)}
            />

            <View style={styles.actionsRow}>
              {camp.coordinates && (
                <PressableScale
                  onPress={openInMaps}
                  style={[styles.secondaryBtn, { borderColor: colors.border }]}
                >
                  <Ionicons name="navigate-outline" size={15} color={colors.foreground} />
                  <AppText variant="labelSm" style={{ marginLeft: 6 }}>{t('openInMaps')}</AppText>
                </PressableScale>
              )}
              <PressableScale
                onPress={() => router.push(`/camp/${camp.id}`)}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <AppText variant="labelSm" weight="bold" color={colors.primaryForeground}>
                  {t('bookNow')}
                </AppText>
              </PressableScale>
            </View>
          </>
        )}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  statsChip: {
    position: 'absolute',
    bottom: 108,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 20,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 2,
    paddingHorizontal: 16,
    position: 'relative',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    top: 10,
    padding: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
