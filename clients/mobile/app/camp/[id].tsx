import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, Share, Linking, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getCampById, getReviewsByCamp, Camp, Review } from '@/lib/firestore';
import { goBack } from '@/lib/nav';
import { useAuth } from '@/contexts/AuthContext';
import { HostReplySheet } from '@/components/HostReplySheet';
import { useColors } from '@/hooks/useColors';
import { CampfireLoader } from '@/components/CampfireLoader';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { useFavorites } from '@/hooks/useFavorites';
import { AppText } from '@/components/AppText';
import { PricePill } from '@/components/PricePill';
import { RatingPill } from '@/components/RatingPill';
import { Skeleton } from '@/components/Skeleton';
import { SaduDivider } from '@/components/SaduDivider';
import { PressableScale } from '@/components/PressableScale';
import { calculateRefund } from '@/lib/refundCalculator';
import { formatPrice } from '@/lib/priceCalculations';
import { getStartingRate, hasPeakPricing } from '@/lib/peakPricing';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 350;
const REVIEWS_PREVIEW_COUNT = 3;

export default function CampDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useScreenInsets();
  const { isRTL } = useI18n();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user } = useAuth();

  const [camp, setCamp] = useState<Camp | null>(null);
  const [loading, setLoading] = useState(true);
  const [campError, setCampError] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [replyTarget, setReplyTarget] = useState<Review | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;

  const loadCamp = () => {
    if (!id) return;
    setLoading(true);
    setCampError(false);
    getCampById(id).then(data => {
      setCamp(data);
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setCampError(true);
      setLoading(false);
    });
  };

  useEffect(() => { loadCamp(); }, [id]);

  useEffect(() => {
    if (!id) return;
    getReviewsByCamp(id).then(data => {
      setReviews(data);
      setReviewsLoading(false);
    }).catch(e => {
      console.error(e);
      setReviewsError(true);
      setReviewsLoading(false);
    });
  }, [id]);

  const onShare = async () => {
    if (!camp) return;
    try {
      await Share.share({
        message: `Check out ${camp.title} on MUKHYMAT!`,
      });
    } catch (error) {}
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <CampfireLoader size="lg" />
      </View>
    );
  }

  if (campError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <View style={[styles.notFoundIcon, { backgroundColor: colors.muted }]}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.mutedForeground} />
        </View>
        <AppText variant="h2" align="center" style={{ marginTop: 20, marginBottom: 12 }}>
          {t('campLoadError')}
        </AppText>
        <AppText variant="body" color={colors.mutedForeground} align="center" style={{ marginBottom: 32 }}>
          {t('campLoadErrorDesc')}
        </AppText>
        <PressableScale
          style={[styles.notFoundBtn, { backgroundColor: colors.primary }]}
          onPress={loadCamp}
        >
          <AppText variant="label" color={colors.primaryForeground} weight="bold">
            {t('retry')}
          </AppText>
        </PressableScale>
      </View>
    );
  }

  if (!camp) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <View style={[styles.notFoundIcon, { backgroundColor: colors.muted }]}>
          <Ionicons name="map-outline" size={48} color={colors.mutedForeground} />
        </View>
        <AppText variant="h2" align="center" style={{ marginTop: 20, marginBottom: 12 }}>
          {t('campNotFound')}
        </AppText>
        <AppText variant="body" color={colors.mutedForeground} align="center" style={{ marginBottom: 32 }}>
          {t('campNotFoundDesc')}
        </AppText>
        <PressableScale
          style={[styles.notFoundBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/(tabs)')}
        >
          <AppText variant="label" color={colors.primaryForeground} weight="bold">
            {t('browseCamps')}
          </AppText>
        </PressableScale>
      </View>
    );
  }

  const fallbackImage = camp.listingType === 'kashta'
    ? require('../../assets/images/banner-beach.jpg')
    : require('../../assets/images/banner-desert.jpg');
  const images: any[] = camp.images?.length ? camp.images.map(u => ({ uri: u })) : [fallbackImage];
  const isFav = isFavorite(camp.id);
  const hasAmenities = camp.amenities && camp.amenities.length > 0;

  // Prefer live review data for the section summary; fall back to the camp's
  // stored aggregate when reviews failed to load or the collection is empty.
  const displayCount = reviews.length > 0 ? reviews.length : (camp.reviews ?? 0);
  const displayAvg = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : (camp.rating ?? 0);
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, REVIEWS_PREVIEW_COUNT);
  const isCampHost = !!user && user.uid === camp.hostId;

  const handleReplySaved = (reviewId: string, responseText: string) => {
    setReviews(prev =>
      prev.map(r => (r.id === reviewId ? { ...r, adminResponse: responseText } : r))
    );
  };

  const formatReviewDate = (iso: string): string => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(isRTL ? 'ar' : 'en', { year: 'numeric', month: 'long' });
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  const onMomentumScrollEnd = (e: any) => {
    const offset = e.nativeEvent.contentOffset.x;
    setActiveImage(Math.round(offset / width));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.galleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            style={styles.galleryScroll}
          >
            {images.map((img, i) => (
              <Image
                key={i}
                source={img}
                style={styles.galleryImage}
                contentFit="cover"
                accessibilityLabel={`${camp?.title || 'Camp'} — photo ${i + 1} of ${images.length}`}
              />
            ))}
          </ScrollView>
          {images.length > 1 && (
            <>
              <View style={styles.counterBadge}>
                <AppText variant="labelSm" color="#FFF">{activeImage + 1} / {images.length}</AppText>
              </View>
              <View style={styles.dotsContainer}>
                {images.map((_, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.dot, 
                      { backgroundColor: activeImage === i ? '#FFF' : 'rgba(255,255,255,0.4)' }
                    ]} 
                  />
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.content}>
          <View style={[styles.headerRow, isRTL && styles.rtlRow]}>
            <View style={{ flex: 1 }}>
              <AppText variant="h2">{camp.title}</AppText>
              <AppText variant="body" color={colors.mutedForeground} style={{ marginTop: 4 }}>
                {camp.location}
              </AppText>
              {camp.instantBook ? (
                <View style={[styles.instantBookBadge, { backgroundColor: colors.primary + '1A', borderColor: colors.primary + '40' }]}>
                  <Ionicons name="flash" size={13} color={colors.primary} />
                  <AppText variant="labelSm" weight="bold" color={colors.primary}>
                    {t('instantBook', { defaultValue: 'Instant Book' })}
                  </AppText>
                </View>
              ) : null}
            </View>
            {camp.rating ? (
              <RatingPill rating={camp.rating} reviews={camp.reviews} size="large" />
            ) : null}
          </View>

          <SaduDivider />

          <View style={styles.section}>
            {camp.listingType === 'kashta' && (
              <View style={{ backgroundColor: '#0d4f4f22', borderColor: '#2dd4bf44', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <AppText variant="bodySm" color="#2dd4bf">{t('kashtaDayRentalNote')}</AppText>
              </View>
            )}
            <AppText variant="h3" style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('about')}</AppText>
            <AppText 
              variant="body" 
              color={colors.mutedForeground} 
              numberOfLines={aboutExpanded ? undefined : 3}
              style={isRTL && { textAlign: 'right' }}
            >
              {camp.description || t('noDescription')}
            </AppText>
            {(camp.description?.length ?? 0) > 100 ? (
              <TouchableOpacity onPress={() => setAboutExpanded(!aboutExpanded)} style={{ marginTop: 8 }}>
                <AppText variant="label" color={colors.primary}>
                  {aboutExpanded ? t('showLess') : t('readMore')}
                </AppText>
              </TouchableOpacity>
            ) : null}
          </View>

          {hasAmenities && (
            <>
              <SaduDivider />
              <View style={styles.section}>
                <AppText variant="h3" style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('amenities')}</AppText>
                <View style={[styles.amenitiesGrid, isRTL && styles.rtlRow]}>
                  {camp.amenities?.map((amenity, i) => {
                    // M-1: look up a translated label; fall back to the raw
                    // string for host-defined free-text amenities not in the map.
                    const label = (t as any)(`amenityLabels.${amenity}`, amenity);
                    return (
                      <View key={i} style={[styles.amenityItem, { backgroundColor: colors.muted }]}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                        <AppText variant="bodySm" color={colors.foreground}>{label}</AppText>
                      </View>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          {camp.coordinates && (
            <>
              <SaduDivider />
              <View style={styles.section}>
                <AppText variant="h3" style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('location')}</AppText>
                <View style={[styles.mapCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <View style={styles.mapPlaceholder}>
                    <View style={[styles.mapPinRing, { borderColor: colors.primary + '30', backgroundColor: colors.primary + '10' }]}>
                      <View style={[styles.mapPinDot, { backgroundColor: colors.primary }]}>
                        <Ionicons name="location" size={20} color="#FFF" />
                      </View>
                    </View>
                    <AppText variant="bodySm" color={colors.mutedForeground} align="center" style={{ marginTop: 12 }}>
                      {camp.location}
                    </AppText>
                    <AppText variant="labelSm" color={colors.mutedForeground} align="center" style={{ marginTop: 4 }}>
                      {camp.coordinates.lat.toFixed(5)}, {camp.coordinates.lng.toFixed(5)}
                    </AppText>
                  </View>
                  <PressableScale
                    style={[styles.directionsBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      const lat = camp.coordinates!.lat;
                      const lng = camp.coordinates!.lng;
                      // Open Apple Maps on iOS for native UX, Google Maps on Android
                      const url = Platform.OS === 'ios'
                        ? `maps://?q=${lat},${lng}&ll=${lat},${lng}`
                        : `https://maps.google.com/?q=${lat},${lng}`;
                      Linking.openURL(url).catch(() => {
                        // Fallback to Google Maps if Apple Maps fails
                        Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`).catch(() => {});
                      });
                    }}
                  >
                    <Ionicons name="navigate" size={16} color="#FFF" />
                    <AppText variant="label" color="#FFF" weight="bold" style={{ marginLeft: 6 }}>
                      {t('getDirections')}
                    </AppText>
                  </PressableScale>
                </View>
              </View>
            </>
          )}

          <SaduDivider />

          <View style={styles.section}>
            <View style={[styles.reviewsHeader, isRTL && styles.rtlRow]}>
              <AppText variant="h3">{t('reviews')}</AppText>
              {displayAvg > 0 ? (
                <View style={[styles.reviewsSummary, isRTL && styles.rtlRow]}>
                  <Ionicons name="star" size={16} color={colors.primary} />
                  <AppText variant="label" weight="bold">{displayAvg.toFixed(1)}</AppText>
                  <AppText variant="bodySm" color={colors.mutedForeground}>
                    · {t('reviewsCount', { count: displayCount })}
                  </AppText>
                </View>
              ) : null}
            </View>

            {reviewsLoading ? (
              <View style={{ gap: 12 }}>
                <Skeleton width="100%" height={90} borderRadius={16} />
                <Skeleton width="100%" height={90} borderRadius={16} />
              </View>
            ) : reviewsError ? (
              <View style={[styles.reviewsEmpty, { backgroundColor: colors.muted }]}>
                <Ionicons name="cloud-offline-outline" size={28} color={colors.mutedForeground} />
                <AppText variant="bodySm" color={colors.mutedForeground} style={{ textAlign: 'center' }}>
                  {t('reviewsLoadError')}
                </AppText>
              </View>
            ) : reviews.length === 0 ? (
              <View style={[styles.reviewsEmpty, { backgroundColor: colors.muted }]}>
                <Ionicons name="chatbubbles-outline" size={28} color={colors.mutedForeground} />
                <AppText variant="label" style={{ textAlign: 'center' }}>{t('noReviewsTitle')}</AppText>
                <AppText variant="bodySm" color={colors.mutedForeground} style={{ textAlign: 'center' }}>
                  {t('noReviewsDesc')}
                </AppText>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {visibleReviews.map(review => (
                  <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.reviewTopRow, isRTL && styles.rtlRow]}>
                      <View style={[styles.reviewAuthorRow, isRTL && styles.rtlRow]}>
                        {review.userPhoto ? (
                          <Image source={{ uri: review.userPhoto }} style={styles.reviewAvatar} contentFit="cover" />
                        ) : (
                          <View style={[styles.reviewAvatar, styles.reviewAvatarFallback, { backgroundColor: colors.muted }]}>
                            <AppText variant="label" weight="bold" color={colors.primary}>
                              {review.userName.trim().charAt(0).toUpperCase()}
                            </AppText>
                          </View>
                        )}
                        <View>
                          <AppText variant="label" weight="bold" style={isRTL && { textAlign: 'right' }}>
                            {review.userName}
                          </AppText>
                          <AppText variant="labelSm" color={colors.mutedForeground} style={isRTL && { textAlign: 'right' }}>
                            {formatReviewDate(review.createdAt)}
                          </AppText>
                        </View>
                      </View>
                      <View style={[styles.reviewStars, isRTL && styles.rtlRow]}>
                        {[1, 2, 3, 4, 5].map(i => (
                          <Ionicons
                            key={i}
                            name={i <= Math.round(review.rating) ? 'star' : 'star-outline'}
                            size={13}
                            color={colors.primary}
                          />
                        ))}
                      </View>
                    </View>
                    {review.reviewText ? (
                      <AppText variant="bodySm" color={colors.foreground} style={[{ marginTop: 10 }, isRTL && { textAlign: 'right' }]}>
                        {review.reviewText}
                      </AppText>
                    ) : null}
                    {review.verified ? (
                      <View style={[styles.verifiedRow, isRTL && styles.rtlRow]}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                        <AppText variant="labelSm" color={colors.mutedForeground}>{t('verifiedStay')}</AppText>
                      </View>
                    ) : null}
                    {review.adminResponse ? (
                      <View style={[styles.adminResponse, { backgroundColor: colors.muted }]}>
                        <AppText variant="labelSm" weight="bold" style={isRTL && { textAlign: 'right' }}>
                          {t('hostResponse')}
                        </AppText>
                        <AppText variant="bodySm" color={colors.mutedForeground} style={isRTL && { textAlign: 'right' }}>
                          {review.adminResponse}
                        </AppText>
                      </View>
                    ) : null}
                    {isCampHost ? (
                      <TouchableOpacity
                        onPress={() => setReplyTarget(review)}
                        style={[styles.replyBtn, { borderColor: colors.border }, isRTL && { alignSelf: 'flex-end' }]}
                      >
                        <Ionicons name="arrow-undo-outline" size={14} color={colors.primary} />
                        <AppText variant="labelSm" weight="semibold" color={colors.primary}>
                          {review.adminResponse ? t('editReply') : t('addReply')}
                        </AppText>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
                {reviews.length > REVIEWS_PREVIEW_COUNT ? (
                  <TouchableOpacity onPress={() => setShowAllReviews(!showAllReviews)} style={{ marginTop: 4 }}>
                    <AppText variant="label" color={colors.primary} style={isRTL && { textAlign: 'right' }}>
                      {showAllReviews ? t('showFewerReviews') : t('showAllReviews', { count: reviews.length })}
                    </AppText>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>

          <SaduDivider />

          <View style={[styles.policyCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <View style={[styles.policyHeader, isRTL && styles.rtlRow]}>
              <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
              <AppText variant="h3">{t('refundPolicy')}</AppText>
            </View>
            <AppText variant="bodySm" color={colors.mutedForeground} style={[isRTL && { textAlign: 'right' }]}>
              {camp.cancellationPolicy === 'flexible' 
                ? t('freeCancellation') 
                : t('refundPolicyDefault')}
            </AppText>
          </View>
        </View>
      </ScrollView>

      {/* Floating Header Actions */}
      <View style={[styles.floatingHeader, { top: insets.top + 10 }, isRTL && styles.rtlRow]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => goBack()}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.rightActions}>
          <TouchableOpacity style={[styles.iconButton, { marginRight: 12 }]} onPress={onShare}>
            <Ionicons name="share-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => toggleFavorite(camp.id)}>
            <Ionicons name={isFav ? "heart" : "heart-outline"} size={24} color={isFav ? colors.destructive : '#000'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sticky Bottom Bar */}
      <View style={[
        styles.bottomBar, 
        { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom || 20 },
        isRTL && styles.rtlRow
      ]}>
        <View style={styles.priceContainer}>
          <PricePill price={getStartingRate(camp)} isFrom={hasPeakPricing(camp)} style={{ borderWidth: 0, paddingHorizontal: 0 }} />
          {camp.maxGuests ? (
            <AppText variant="labelSm" color={colors.mutedForeground}>
              {t('guestMax', { count: camp.maxGuests })}
            </AppText>
          ) : null}
          <AppText variant="labelSm" color={colors.mutedForeground} style={{ opacity: 0.75 }}>
            {t('serviceFeeNote')}
          </AppText>
        </View>
        <PressableScale 
          style={[styles.reserveBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push(`/reserve/${camp.id}`)}
        >
          <AppText variant="label" color={colors.primaryForeground} weight="bold">{t('bookNow')}</AppText>
        </PressableScale>
      </View>

      <HostReplySheet
        review={replyTarget}
        onClose={() => setReplyTarget(null)}
        onSaved={handleReplySaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  galleryContainer: {
    height: HEADER_HEIGHT,
    width,
    position: 'relative',
  },
  galleryScroll: {
    flex: 1,
  },
  galleryImage: {
    width,
    height: HEADER_HEIGHT,
  },
  counterBadge: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  section: {
    marginVertical: 8,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewsEmpty: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
    borderRadius: 16,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  reviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  reviewAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  adminResponse: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  policyCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  floatingHeader: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  rightActions: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 10,
  },
  priceContainer: {
    flex: 1,
  },
  reserveBtn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  instantBookBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  notFoundIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundBtn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  mapCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  mapPinRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    marginTop: 0,
    paddingVertical: 14,
    borderRadius: 14,
  },
});
