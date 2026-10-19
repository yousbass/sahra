import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
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
import { RatingPill } from './RatingPill';
import { PricePill } from './PricePill';
import { getStartingRate, hasPeakPricing } from '@/lib/peakPricing';

const desertBanner = require('../assets/images/banner-desert.jpg');
const beachBanner = require('../assets/images/banner-beach.jpg');

interface Props {
  item: Camp;
  index: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function ListingCard({ item, index, isFavorite, onToggleFavorite }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const { isRTL } = useI18n();
  
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;
  const scale = useRef(new Animated.Value(1)).current;
  // Track whether the entrance animation has already run so FlatList
  // virtualization does not re-trigger it when cards are recycled on scroll.
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: Math.min(index, 5) * 50,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        delay: Math.min(index, 5) * 50,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start();
    // intentionally omit opacity/translateY — they are stable Animated.Value refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFavorite = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true })
    ]).start();
    onToggleFavorite();
  };

  const [imgError, setImgError] = useState(false);
  const fallback = item.listingType === 'kashta' ? beachBanner : desertBanner;
  const img = imgError || !(item.images && item.images.length > 0)
    ? fallback
    : item.images[0];

  const isKashta = item.listingType === 'kashta';
  const reviewCount = item.reviews ?? 0;
  const reviewSnippet = reviewCount > 0 ? getReviewSnippet(item.latestReviewText) : null;

  const tier = resolveCancellationTier(item.cancellationPolicy, item.refundPolicy);
  const cancellationLabel =
    tier === 'free'    ? t('cancellationFlexible') :
    tier === 'partial' ? t('cancellationModerate') :
    tier === 'none'    ? t('cancellationNone') :
    null;
  const cancellationColor =
    tier === 'free'    ? colors.kashta :
    tier === 'partial' ? '#f59e0b' :
    colors.mutedForeground;

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      <PressableScale 
        onPress={() => router.push(`/camp/${item.id}`)}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.imageContainer}>
          <Image
            source={img}
            style={styles.image}
            contentFit="cover"
            transition={300}
            onError={() => setImgError(true)}
          />
          <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={styles.gradientTop} />
          
          <View style={[styles.badgesRow, isRTL ? styles.rtlRow : null]}>
            <View style={[styles.typeBadge, { backgroundColor: isKashta ? 'rgba(23, 126, 137, 0.92)' : 'rgba(240, 160, 60, 0.94)' }]}>
              <AppText variant="labelSm" color={isKashta ? '#FFF' : '#0A1128'} weight="bold">
                {isKashta ? t('kashtas') : t('camps')}
              </AppText>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.favBtn, isRTL ? { left: 16 } : { right: 16 }]} 
            onPress={handleFavorite}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Animated.View style={{ transform: [{ scale }] }}>
              <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={22} color={isFavorite ? colors.destructive : '#FFF'} />
            </Animated.View>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={[styles.headerRow, isRTL ? styles.rtlRow : null]}>
            <View style={{ flex: 1, paddingRight: isRTL ? 0 : 12, paddingLeft: isRTL ? 12 : 0 }}>
              <AppText variant="h3" numberOfLines={1}>{item.title}</AppText>
              <View style={[styles.locationRow, isRTL ? styles.rtlRow : null]}>
                <Ionicons name="location" size={14} color={colors.primary} />
                <AppText variant="bodySm" color={colors.mutedForeground} numberOfLines={1} style={{ marginHorizontal: 4 }}>
                  {getLocationLabel(item.location) || item.location}
                </AppText>
              </View>
            </View>
            {reviewCount > 0 ? (
              <RatingPill rating={item.rating ?? 0} reviews={reviewCount} size="large" />
            ) : (
              <View style={[styles.newBadge, { backgroundColor: colors.muted }]}>
                <AppText variant="labelSm" weight="bold">{t('cardNoReviews')}</AppText>
              </View>
            )}
          </View>
          
          {reviewSnippet !== null && (
            <AppText
              variant="bodySm"
              color={colors.mutedForeground}
              numberOfLines={1}
              style={[styles.reviewSnippet, { textAlign: isRTL ? 'right' : 'left' }]}
            >
              “{reviewSnippet}”
            </AppText>
          )}

          <View style={[styles.metaRow, isRTL ? styles.rtlRow : null]}>
            <View style={[styles.metaChip, { backgroundColor: colors.muted }]}>
              <Ionicons name="people" size={14} color={colors.foreground} />
              <AppText variant="labelSm" style={{ marginHorizontal: 4 }}>
                {t('guestMax', { count: item.maxGuests || 2 })}
              </AppText>
            </View>
            {cancellationLabel !== null && (
              <View style={[styles.metaChip, { backgroundColor: colors.muted }]}>
                <View style={[styles.policyDot, { backgroundColor: cancellationColor }]} />
                <AppText variant="labelSm" color={colors.foreground} style={{ marginHorizontal: 4 }} numberOfLines={1}>
                  {cancellationLabel}
                </AppText>
              </View>
            )}
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <View style={[styles.footerRow, isRTL ? styles.rtlRow : null]}>
            <PricePill price={getStartingRate(item)} isFrom={hasPeakPricing(item)} />
            <AppText variant="labelSm" color={colors.primary} weight="bold">
              {t('bookNow')}
            </AppText>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  imageContainer: {
    height: 260,
    width: '100%',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, height: 80,
  },
  badgesRow: {
    position: 'absolute',
    top: 16, left: 16, right: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  favBtn: {
    position: 'absolute',
    top: 16,
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  newBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  reviewSnippet: {
    marginTop: 10,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  policyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
