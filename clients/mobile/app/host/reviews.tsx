import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { HostGate, HostHeader } from '@/components/host/HostGuard';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getReviewsByHostCamps,
  updateReviewResponse,
  recordReviewsVisit,
  Review,
} from '@/lib/firestore';
import { notify } from '@/lib/payments';
import { getDoc, getDocs, doc, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ─── Camp summary (id + title only, for filter) ─────────────────────────────

interface CampSummary {
  id: string;
  title: string;
}

// ─── Star row ────────────────────────────────────────────────────────────────

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  const filled = Math.round(rating);
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= filled ? 'star' : 'star-outline'}
          size={size}
          color={s <= filled ? '#F59E0B' : '#D1D5DB'}
        />
      ))}
    </View>
  );
}

// ─── Rating distribution bar ─────────────────────────────────────────────────

function RatingDistributionBar({
  reviews,
  isRTL,
  colors,
}: {
  reviews: Review[];
  isRTL: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const total = reviews.length;
  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  return (
    <View style={styles.distContainer}>
      {counts.map(({ star, count }) => {
        const pct = total > 0 ? count / total : 0;
        return (
          <View
            key={star}
            style={[styles.distRow, isRTL ? styles.rtlRow : null]}
          >
            <AppText
              variant="bodySm"
              weight="bold"
              style={{ width: 16, textAlign: 'center' }}
            >
              {star}
            </AppText>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <View
              style={[
                styles.distTrack,
                { backgroundColor: colors.muted },
              ]}
            >
              <View
                style={[
                  styles.distFill,
                  {
                    backgroundColor: '#F59E0B',
                    width: `${Math.round(pct * 100)}%`,
                  },
                ]}
              />
            </View>
            <AppText
              variant="bodySm"
              color={colors.mutedForeground}
              style={{ width: 24, textAlign: isRTL ? 'left' : 'right' }}
            >
              {count}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

// ─── Review Card ─────────────────────────────────────────────────────────────

interface ReviewCardProps {
  review: Review;
  isNew: boolean;
  isRTL: boolean;
  colors: ReturnType<typeof useColors>;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function ReviewCard({ review, isNew, isRTL, colors, t }: ReviewCardProps) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState(review.adminResponse || '');
  const [savedReply, setSavedReply] = useState(review.adminResponse || '');
  const [submitting, setSubmitting] = useState(false);

  const createdDate = new Date(review.createdAt);
  const formattedDate = createdDate.toLocaleDateString(isRTL ? 'ar-BH' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleSubmit = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await updateReviewResponse(review.id, replyText.trim());
      setSavedReply(replyText.trim());
      setReplying(false);
      notify(t('hostReviewsReplySaved'));
    } catch {
      notify(t('hostReviewsReplyFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      style={[
        styles.reviewCard,
        {
          backgroundColor: colors.card,
          borderColor: isNew ? colors.primary + '60' : colors.border,
          borderWidth: isNew ? 1.5 : 1,
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.reviewHeader, isRTL ? styles.rtlRow : null]}>
        {review.userPhoto ? (
          <Image
            source={{ uri: review.userPhoto }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View
            style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.muted }]}
          >
            <Ionicons name="person" size={20} color={colors.mutedForeground} />
          </View>
        )}
        <View style={[styles.reviewMeta, isRTL ? { alignItems: 'flex-end' } : null]}>
          <View style={[styles.reviewMetaRow, isRTL ? styles.rtlRow : null]}>
            <AppText variant="label" weight="bold" numberOfLines={1}>
              {review.userName || t('hostReviewsAnon')}
            </AppText>
            {isNew && (
              <View style={[styles.newBadge, { backgroundColor: colors.primary + '20' }]}>
                <AppText variant="labelSm" color={colors.primary} weight="bold">
                  {t('hostReviewsNewBadge')}
                </AppText>
              </View>
            )}
          </View>
          <View style={[styles.reviewMetaRow, isRTL ? styles.rtlRow : null]}>
            <StarRow rating={review.rating} />
            <AppText variant="bodySm" color={colors.mutedForeground}>
              {formattedDate}
            </AppText>
          </View>
        </View>
      </View>

      {/* Review text */}
      {review.reviewText ? (
        <AppText
          variant="body"
          color={colors.foreground}
          align={isRTL ? 'right' : 'left'}
          style={styles.reviewText}
        >
          {review.reviewText}
        </AppText>
      ) : null}

      {/* Existing reply */}
      {savedReply && !replying && (
        <View
          style={[
            styles.replyBox,
            {
              backgroundColor: colors.primary + '10',
              borderColor: colors.primary + '30',
            },
          ]}
        >
          <AppText
            variant="labelSm"
            weight="bold"
            color={colors.primary}
            align={isRTL ? 'right' : 'left'}
          >
            {t('hostReviewsYourReply')}
          </AppText>
          <AppText
            variant="bodySm"
            color={colors.foreground}
            align={isRTL ? 'right' : 'left'}
          >
            {savedReply}
          </AppText>
        </View>
      )}

      {/* Reply form */}
      {replying && (
        <View style={styles.replyForm}>
          <TextInput
            value={replyText}
            onChangeText={setReplyText}
            placeholder={t('hostReviewsReplyPlaceholder')}
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={[
              styles.replyInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.primary + '60',
                color: colors.foreground,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
          />
          <View style={[styles.replyActions, isRTL ? styles.rtlRow : null]}>
            <PressableScale
              onPress={handleSubmit}
              disabled={submitting || !replyText.trim()}
              style={[
                styles.replySubmitBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: submitting || !replyText.trim() ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons
                name={submitting ? 'hourglass-outline' : 'send'}
                size={14}
                color={colors.primaryForeground}
              />
              <AppText
                variant="labelSm"
                weight="bold"
                color={colors.primaryForeground}
              >
                {t('hostReviewsSubmitReply')}
              </AppText>
            </PressableScale>
            <PressableScale
              onPress={() => {
                setReplying(false);
                setReplyText(savedReply);
              }}
              style={[styles.replyCancelBtn, { borderColor: colors.border }]}
            >
              <AppText variant="labelSm" color={colors.mutedForeground}>
                {t('hostReviewsCancel')}
              </AppText>
            </PressableScale>
          </View>
        </View>
      )}

      {/* Reply / Edit button */}
      {!replying && (
        <PressableScale
          onPress={() => setReplying(true)}
          style={[styles.replyToggleBtn, { borderColor: colors.border }]}
        >
          <Ionicons name="chatbubble-outline" size={14} color={colors.foreground} />
          <AppText variant="labelSm">
            {savedReply ? t('hostReviewsEditReply') : t('hostReviewsReplyBtn')}
          </AppText>
        </PressableScale>
      )}
    </View>
  );
}

// ─── Listing Filter Pills ─────────────────────────────────────────────────────

interface ListingFilterProps {
  camps: CampSummary[];
  selectedCampId: string;
  onChange: (id: string) => void;
  isRTL: boolean;
  colors: ReturnType<typeof useColors>;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function ListingFilter({ camps, selectedCampId, onChange, isRTL, colors, t }: ListingFilterProps) {
  if (camps.length <= 1) return null;

  const pills: CampSummary[] = [{ id: '', title: t('hostReviewsAllListings') }, ...camps];

  return (
    <View style={styles.filterWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.filterScroll,
          isRTL ? styles.rtlRow : null,
        ]}
      >
        {pills.map((camp) => {
          const active = selectedCampId === camp.id;
          return (
            <TouchableOpacity
              key={camp.id}
              onPress={() => onChange(camp.id)}
              style={[
                styles.filterPill,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.75}
            >
              <AppText
                variant="labelSm"
                weight={active ? 'bold' : 'regular'}
                color={active ? colors.primaryForeground : colors.foreground}
                numberOfLines={1}
              >
                {camp.title}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

function ReviewsBody() {
  const colors = useColors();
  const { t } = useTranslation();
  const { isRTL } = useI18n();
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [camps, setCamps] = useState<CampSummary[]>([]);
  const [selectedCampId, setSelectedCampId] = useState('');
  const [lastVisit, setLastVisit] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!user) return;
      try {
        // Read last visit timestamp (skip on pull-to-refresh to keep existing value)
        if (!isRefresh && db) {
          const snap = await getDoc(doc(db, 'users', user.uid));
          const raw = snap.data()?.lastReviewsVisitAt;
          if (typeof raw === 'string') setLastVisit(new Date(raw));
        }

        const [data, campsSnap] = await Promise.all([
          getReviewsByHostCamps(user.uid),
          db
            ? getDocs(query(collection(db, 'camps'), where('hostId', '==', user.uid)))
            : Promise.resolve(null),
        ]);

        setReviews(data);

        if (campsSnap && !campsSnap.empty) {
          const summaries: CampSummary[] = campsSnap.docs.map((d) => ({
            id: d.id,
            title: typeof d.data().title === 'string' ? d.data().title : d.id,
          }));
          setCamps(summaries);
        }

        // Record this visit
        await recordReviewsVisit(user.uid);
      } catch (e) {
        console.error('[HostReviews] load failed', e);
        notify(t('hostReviewsLoadFailed'));
        setReviews([]);
      }
    },
    [user?.uid, t]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  // Filtered reviews based on selected listing
  const filteredReviews = selectedCampId
    ? (reviews ?? []).filter((r) => r.campId === selectedCampId)
    : (reviews ?? []);

  const totalCount = filteredReviews.length;
  const avgRating =
    totalCount > 0
      ? filteredReviews.reduce((s, r) => s + r.rating, 0) / totalCount
      : 0;

  // New-review count is always across all listings (host-level, not per-listing)
  const newCount =
    reviews?.filter((r) => {
      if (!lastVisit) return true;
      return new Date(r.createdAt) > lastVisit;
    }).length ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HostHeader title={t('hostReviewsTitle')} fallback="/host" />

      {reviews === null ? (
        <View style={styles.skeletons}>
          <Skeleton height={90} borderRadius={16} />
          <Skeleton height={160} borderRadius={16} />
          <Skeleton height={130} borderRadius={16} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Listing filter pills — only rendered when host has multiple camps */}
          <ListingFilter
            camps={camps}
            selectedCampId={selectedCampId}
            onChange={setSelectedCampId}
            isRTL={isRTL}
            colors={colors}
            t={t}
          />

          {/* Stats cards */}
          <View style={[styles.statsRow, isRTL ? styles.rtlRow : null]}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <AppText variant="h2" weight="bold" color="#F59E0B">
                {totalCount > 0 ? avgRating.toFixed(1) : '—'}
              </AppText>
              {totalCount > 0 && <StarRow rating={avgRating} size={12} />}
              <AppText variant="labelSm" color={colors.mutedForeground}>
                {t('hostReviewsAvg')}
              </AppText>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <AppText variant="h2" weight="bold">{String(totalCount)}</AppText>
              <AppText variant="labelSm" color={colors.mutedForeground}>
                {t('hostReviewsTotal')}
              </AppText>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <AppText variant="h2" weight="bold" color={colors.primary}>
                {String(newCount)}
              </AppText>
              <AppText variant="labelSm" color={colors.mutedForeground}>
                {t('hostReviewsNew')}
              </AppText>
            </View>
          </View>

          {/* Rating distribution */}
          {totalCount > 0 && (
            <View
              style={[
                styles.section,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <AppText
                variant="label"
                weight="bold"
                align={isRTL ? 'right' : 'left'}
                style={styles.sectionTitle}
              >
                {t('hostReviewsDistribution')}
              </AppText>
              <RatingDistributionBar reviews={filteredReviews} isRTL={isRTL} colors={colors} />
            </View>
          )}

          {/* Review list */}
          {totalCount === 0 ? (
            <EmptyState
              icon="star-outline"
              title={t('hostReviewsEmptyTitle')}
              description={t('hostReviewsEmptyDesc')}
            />
          ) : (
            <View style={styles.reviewsList}>
              <AppText
                variant="label"
                weight="bold"
                align={isRTL ? 'right' : 'left'}
              >
                {t('hostReviewsAll')} ({totalCount})
              </AppText>
              {filteredReviews.map((review) => {
                const isNew = lastVisit
                  ? new Date(review.createdAt) > lastVisit
                  : true;
                return (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    isNew={isNew}
                    isRTL={isRTL}
                    colors={colors}
                    t={t}
                  />
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

export default function HostReviewsScreen() {
  return (
    <HostGate>
      <ReviewsBody />
    </HostGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 48, gap: 16 },
  skeletons: { padding: 16, gap: 12 },
  rtlRow: { flexDirection: 'row-reverse' },

  filterWrapper: { marginBottom: 4 },
  filterScroll: { gap: 8, paddingVertical: 2 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 200,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 4,
    alignItems: 'center',
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },

  section: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: { marginBottom: 4 },

  distContainer: { gap: 8 },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distFill: {
    height: '100%',
    borderRadius: 4,
  },

  reviewsList: { gap: 12 },
  reviewCard: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewMeta: {
    flex: 1,
    gap: 3,
  },
  reviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  newBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reviewText: {
    lineHeight: 20,
  },
  replyBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  replyForm: { gap: 8 },
  replyInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    minHeight: 80,
  },
  replyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  replySubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  replyCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  replyToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
