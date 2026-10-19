import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { Camp } from '@/lib/firestore';
import { resolveCancellationTier } from '@/lib/policyUtils';
import { getLocationLabel } from '@/lib/locations';
import { getReviewSnippet } from '@/lib/reviewSnippet';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { PricePill } from './PricePill';
import { getStartingRate, hasPeakPricing } from '@/lib/peakPricing';

const desertBanner = require('../assets/images/banner-desert.jpg');
const beachBanner = require('../assets/images/banner-beach.jpg');

interface StayCardProps {
  camp: Camp;
  /** Section accent: amber for camps, Gulf teal for kashtas. */
  accent: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  testID?: string;
}

/** Full-width photo card for the Camps / Kashtas section pages. */
export function StayCard({ camp, accent, isFavorite, onToggleFavorite, testID }: StayCardProps) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const { t } = useTranslation();

  const reviewCount = camp.reviews ?? 0;
  const hasRating = reviewCount > 0;
  const reviewSnippet = hasRating ? getReviewSnippet(camp.latestReviewText) : null;

  const tier = resolveCancellationTier(camp.cancellationPolicy, camp.refundPolicy);

  const cancellationLabel =
    tier === 'free'
      ? t('cancellationFlexible')
      : tier === 'partial'
      ? t('cancellationModerate')
      : tier === 'none'
      ? t('cancellationNone')
      : null;

  const cancellationColor =
    tier === 'free'
      ? '#22c55e'
      : tier === 'partial'
      ? '#f59e0b'
      : 'rgba(255,255,255,0.55)';

  const img = camp.images && camp.images.length > 0
    ? camp.images[0]
    : (camp.listingType === 'kashta' ? beachBanner : desertBanner);

  return (
    <PressableScale
      testID={testID}
      onPress={() => router.push(`/camp/${camp.id}`)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Image
        source={typeof img === 'string' ? { uri: img } : img}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={250}
        accessibilityLabel={camp.title || 'Camp photo'}
      />
      <LinearGradient colors={['transparent', 'rgba(10,17,40,0.92)']} style={styles.gradient} />

      <Pressable
        hitSlop={8}
        onPress={() => onToggleFavorite(camp.id)}
        style={[styles.heartBtn, isRTL ? styles.heartBtnRtl : null]}
      >
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={18}
          color={isFavorite ? accent : '#FFF'}
        />
      </Pressable>

      <View style={[styles.content, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <AppText variant="h3" color="#FFF" weight="bold" numberOfLines={1}>{camp.title}</AppText>
        <View style={[styles.metaRow, isRTL ? styles.rtlRow : null]}>
          <Ionicons name="location" size={12} color="rgba(255,255,255,0.8)" />
          <AppText
            variant="labelSm"
            color="rgba(255,255,255,0.8)"
            numberOfLines={1}
            style={{ marginHorizontal: 4, flexShrink: 1 }}
          >
            {getLocationLabel(camp.location) || camp.location}
          </AppText>
          <View style={[styles.ratingBadge, isRTL ? styles.rtlRow : null]}>
            {hasRating ? (
              <>
                <Ionicons name="star" size={11} color={accent} />
                <AppText variant="labelSm" color="#FFF" weight="bold" style={{ marginHorizontal: 3 }}>
                  {(camp.rating ?? 0).toFixed(1)} ({reviewCount})
                </AppText>
              </>
            ) : (
              <AppText variant="labelSm" color="rgba(255,255,255,0.7)" style={{ marginHorizontal: 2 }}>
                {t('cardNoReviews')}
              </AppText>
            )}
          </View>
        </View>
        {reviewSnippet !== null && (
          <AppText
            variant="labelSm"
            color="rgba(255,255,255,0.85)"
            numberOfLines={1}
            style={[styles.reviewSnippet, { textAlign: isRTL ? 'right' : 'left' }]}
          >
            “{reviewSnippet}”
          </AppText>
        )}
        {cancellationLabel !== null && (
          <View style={[styles.cancellationRow, isRTL ? styles.rtlRow : null]}>
            <View style={[styles.cancellationBadge, isRTL ? styles.rtlRow : null]}>
              <View style={[styles.cancellationDot, { backgroundColor: cancellationColor }]} />
              <AppText variant="labelSm" color="rgba(255,255,255,0.92)" weight="semibold" style={{ marginHorizontal: 4 }} numberOfLines={1}>
                {cancellationLabel}
              </AppText>
            </View>
          </View>
        )}
        <View style={[styles.footerRow, isRTL ? styles.rtlRow : null]}>
          <PricePill price={getStartingRate(camp)} isFrom={hasPeakPricing(camp)} />
          {camp.maxGuests != null && (
            <View style={[styles.guestsChip, isRTL ? styles.rtlRow : null]}>
              <Ionicons name="people" size={12} color="#FFF" />
              <AppText variant="labelSm" color="#FFF" weight="semibold" style={{ marginHorizontal: 4 }}>
                {t('guestMax', { count: camp.maxGuests })}
              </AppText>
            </View>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  rtlRow: { flexDirection: 'row-reverse' },
  card: {
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 14,
  },
  gradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 150,
  },
  heartBtn: {
    position: 'absolute',
    top: 12, right: 12,
    width: 36, height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,17,40,0.45)',
  },
  heartBtnRtl: {
    right: undefined,
    left: 12,
  },
  content: {
    position: 'absolute',
    bottom: 14, left: 16, right: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 10,
  },
  guestsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  reviewSnippet: {
    marginTop: 5,
    fontStyle: 'italic',
    alignSelf: 'stretch',
  },
  cancellationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  cancellationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.30)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    flexShrink: 1,
    maxWidth: '80%',
  },
  cancellationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
