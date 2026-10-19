import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { Camp } from '@/lib/firestore';
import { getLocationLabel } from '@/lib/locations';
import { formatPrice } from '@/lib/priceCalculations';
import { getStartingRate, hasPeakPricing } from '@/lib/peakPricing';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

const desertBanner = require('../assets/images/banner-desert.jpg');
const beachBanner = require('../assets/images/banner-beach.jpg');

interface Props {
  item: Camp;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

/**
 * Compact card for the Explore 2-column grid view. Intentionally separate from
 * ListingCard (the full-width card) so both layouts stay simple.
 */
export function ListingCardGrid({ item, isFavorite, onToggleFavorite }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const { isRTL } = useI18n();
  const [imgError, setImgError] = useState(false);

  const fallback = item.listingType === 'kashta' ? beachBanner : desertBanner;
  const img = imgError || !(item.images && item.images.length > 0)
    ? fallback
    : item.images[0];
  const isKashta = item.listingType === 'kashta';
  const reviewCount = item.reviews ?? 0;

  return (
    <PressableScale
      onPress={() => router.push(`/camp/${item.id}`)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.imageContainer}>
        <Image
          source={img}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={200}
          onError={() => setImgError(true)}
        />
        <View
          style={[
            styles.typeBadge,
            isRTL ? { right: 8 } : { left: 8 },
            { backgroundColor: isKashta ? 'rgba(23, 126, 137, 0.92)' : 'rgba(240, 160, 60, 0.94)' },
          ]}
        >
          <AppText variant="labelSm" color={isKashta ? '#FFF' : '#0A1128'} weight="bold" style={styles.typeBadgeText}>
            {isKashta ? t('kashtas') : t('camps')}
          </AppText>
        </View>
        <TouchableOpacity
          style={[styles.favBtn, isRTL ? { left: 8 } : { right: 8 }]}
          onPress={onToggleFavorite}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={16}
            color={isFavorite ? colors.destructive : '#FFF'}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <AppText variant="label" weight="bold" numberOfLines={1} style={{ textAlign: isRTL ? 'right' : 'left' }}>
          {item.title}
        </AppText>
        <View style={[styles.row, isRTL ? styles.rtlRow : null, { marginTop: 3 }]}>
          <Ionicons name="location" size={11} color={colors.primary} />
          <AppText
            variant="labelSm"
            color={colors.mutedForeground}
            numberOfLines={1}
            style={{ marginHorizontal: 3, flexShrink: 1, textAlign: isRTL ? 'right' : 'left' }}
          >
            {getLocationLabel(item.location) || item.location}
          </AppText>
        </View>
        <View style={[styles.row, isRTL ? styles.rtlRow : null, styles.footerRow]}>
          <AppText variant="label" weight="bold" color={colors.foreground} numberOfLines={1} style={{ flexShrink: 1 }}>
            {hasPeakPricing(item) ? `${t('priceFrom')} ` : ''}{formatPrice(getStartingRate(item), 'BHD')}
          </AppText>
          {reviewCount > 0 ? (
            <View style={[styles.row, isRTL ? styles.rtlRow : null]}>
              <Ionicons name="star" size={11} color={colors.primary} />
              <AppText variant="labelSm" weight="semibold" style={{ marginHorizontal: 2 }}>
                {(item.rating ?? 0).toFixed(1)}
              </AppText>
              <AppText variant="labelSm" color={colors.mutedForeground}>
                ({reviewCount})
              </AppText>
            </View>
          ) : (
            <AppText variant="labelSm" color={colors.mutedForeground}>{t('cardNoReviews')}</AppText>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  imageContainer: {
    height: 120,
    width: '100%',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 12,
  },
  favBtn: {
    position: 'absolute',
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  footerRow: {
    marginTop: 8,
    justifyContent: 'space-between',
  },
});
