import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
  ImageBackground, ScrollView, AppState,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { subscribeToUserBookings, cancelBooking, Booking } from '@/lib/firestore';
import { startTapPayment, verifyBookingPayment, notify } from '@/lib/payments';
import { CancelBookingSheet } from '@/components/CancelBookingSheet';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SegmentedControl } from '@/components/SegmentedControl';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { PageLoader } from '@/components/PageLoader';
import { PatternSadu } from '@/components/BackgroundPatterns';
import { TripHeroCard } from '@/components/TripHeroCard';
import { TripCard } from '@/components/TripCard';
import { TripHistoryCard } from '@/components/TripHistoryCard';
import { useBookingReview } from '@/hooks/useBookingReview';
import { getLocationLabel } from '@/lib/locations';
import { getDepartureDate } from '@/lib/bookingDates';
import { RateStaySheet } from '@/components/RateStaySheet';
import { MessageThreadSheet } from '@/components/MessageThreadSheet';

const nightTexture = require('../../assets/images/texture-night.jpg');

/** midnight — anything after this date/time belongs to the next day */
function isPast(b: Booking): boolean {
  const end = getDepartureDate(b);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end < today;
}

export default function TripsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useScreenInsets();
  const { isRTL } = useI18n();
  const { user, userData } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [segment, setSegment] = useState<0 | 1 | 2>(0); // 0=Upcoming 1=History 2=Cancelled
  const [payingId, setPayingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [rateTarget, setRateTarget] = useState<Booking | null>(null);
  const [messagingTarget, setMessagingTarget] = useState<Booking | null>(null);

  // Real-time listener keeps the Firestore offline cache warm.
  // When online, server-side booking status changes (confirmed, cancelled) land
  // automatically and are persisted to the local cache.  When offline, the last
  // cached query result is served — including any client-side writes made by
  // payment-result.tsx — so guests never see a stale "pending" booking.
  // retryKey can be incremented to restart the listener after an error.
  useEffect(() => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setLoading(true);
    setNetworkError(false);
    const unsub = subscribeToUserBookings(
      user.uid,
      (data) => {
        setBookings(data);
        setNetworkError(false);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.log('Error loading bookings', err);
        setNetworkError(true);
        setLoading(false);
        setRefreshing(false);
      }
    );
    return unsub;
  }, [user, retryKey]);

  // Pull-to-refresh: Firestore listeners auto-update so there is nothing to
  // explicitly re-fetch, but we briefly show the spinner for UX continuity.
  const onRefresh = () => {
    setRefreshing(true);
    // The active onSnapshot listener will push any new data on its own;
    // reset the spinner after a short delay if no snapshot arrives first.
    setTimeout(() => setRefreshing(false), 1500);
  };

  // Segment-specific lists
  const upcoming = useMemo(
    () => bookings.filter(b => b.status !== 'cancelled' && !isPast(b)),
    [bookings]
  );
  const history = useMemo(
    () => bookings.filter(b => b.status !== 'cancelled' && isPast(b)),
    [bookings]
  );
  const cancelled = useMemo(
    () => bookings.filter(b => b.status === 'cancelled'),
    [bookings]
  );

  const displayedBookings =
    segment === 0 ? upcoming : segment === 1 ? history : cancelled;

  // Hero card — shown when exactly 1 upcoming trip
  const heroBooking = upcoming.length === 1 ? upcoming[0] : null;

  // Review status for past trips — gather all unique campIds from history
  const historyCampIds = useMemo(() => history.map(b => b.campId), [history]);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  const { reviewsByBookingId } = useBookingReview(segment === 1 ? historyCampIds : [], reviewRefreshKey);

  // ── Payment re-verification ─────────────────────────────────────────────
  // Pending online bookings with a stored Tap charge may have been paid even
  // though the redirect back from the external browser failed. Re-check them
  // against the authenticated server verify endpoint on screen focus and on
  // app resume. Read-only: when a charge is settled, the webhook has already
  // updated the booking and the realtime listener surfaces the new state.
  // Never auto-cancel client-side.
  const bookingsRef = useRef<Booking[]>(bookings);
  bookingsRef.current = bookings;
  const lastAutoVerifyRef = useRef(0);

  const verifiablePending = (list: Booking[]) =>
    list.filter(
      b =>
        b.status !== 'cancelled' &&
        b.status !== 'confirmed' &&
        (b as any).paymentMethod !== 'cash_on_arrival' &&
        b.paymentStatus !== 'paid' &&
        b.paymentStatus !== 'refunded' &&
        !!(b as any).tapChargeId
    );

  const autoVerifyPending = useCallback(async () => {
    // Throttle: focus + resume can fire together; once per 15s is plenty.
    const now = Date.now();
    if (now - lastAutoVerifyRef.current < 15_000) return;
    lastAutoVerifyRef.current = now;
    const targets = verifiablePending(bookingsRef.current);
    for (const b of targets) {
      // Sequential, best-effort, silent — the listener reflects any change.
      await verifyBookingPayment(b.id, (b as any).tapChargeId).catch(() => {});
    }
  }, []);

  // On screen focus (open/switch back to the tab)
  useFocusEffect(
    useCallback(() => {
      autoVerifyPending();
    }, [autoVerifyPending])
  );

  // On app resume from background (e.g. returning from the Tap browser)
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') autoVerifyPending();
    });
    return () => sub.remove();
  }, [autoVerifyPending]);

  // Manual per-booking "verify payment" action — gives explicit feedback.
  const handleVerifyPayment = async (item: Booking) => {
    const chargeId = (item as any).tapChargeId;
    if (!chargeId || verifyingId) return;
    setVerifyingId(item.id);
    try {
      const r = await verifyBookingPayment(item.id, chargeId);
      if (r.checked && r.settled) {
        notify(t('paymentConfirmedMsg'), undefined, 'success');
        // Listener reflects the confirmed booking automatically
      } else if (r.checked) {
        notify(t('paymentNotConfirmedMsg'), undefined, 'info');
      } else {
        notify(t('verifyFailedMsg'), r.error, 'error');
      }
    } finally {
      setVerifyingId(null);
    }
  };

  const handlePayNow = async (item: Booking) => {
    if (payingId || cancelTarget) return;
    setPayingId(item.id);
    try {
      const r = await startTapPayment({
        bookingId: item.id,
        amount: Number(item.totalPrice) || 0,
        customerName: userData?.displayName || user?.email || 'Guest',
        customerEmail: user?.email || undefined,
      });
      if (!r.started) {
        if (r.reason === 'already_settled') {
          notify(t('alreadyPaidMsg'));
          // Listener will reflect the settled status automatically
        } else {
          notify(t('paymentFailed'), r.error || t('couldNotStartPayment'), 'error');
        }
      }
    } finally {
      setPayingId(null);
    }
  };

  const performCancellation = async (booking: Booking, reason: string) => {
    await cancelBooking(booking.id, reason || 'Cancelled by guest from mobile app');
    notify(t('bookingCancelled'), undefined, 'success');
    // Listener reflects the cancellation automatically — no explicit reload needed
  };

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Minimal dark header */}
        <View style={[styles.gateHeader, { height: 180 + insets.top }]}>
          <ImageBackground source={nightTexture} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.9 }} />
          <LinearGradient colors={['rgba(10,17,40,0.6)', 'rgba(10,17,40,1)']} style={StyleSheet.absoluteFill} />
          <PatternSadu color="#FDFBF7" opacity={0.08} />
          <View style={[styles.gateHeaderContent, { paddingTop: insets.top + 20 }]}>
            <AppText variant="h1" color="#fff" weight="bold">{t('tripsTab')}</AppText>
          </View>
        </View>
        <View style={styles.gateBody}>
          <View style={[styles.gateIconCircle, { backgroundColor: colors.muted }]}>
            <Ionicons name="briefcase-outline" size={40} color={colors.mutedForeground} />
          </View>
          <AppText variant="h3" weight="bold" style={styles.gateTitle}>{t('signInToSeeTrips')}</AppText>
          <AppText variant="body" color={colors.mutedForeground} style={styles.gateDesc}>
            {t('signInToSeeTripsDesc')}
          </AppText>
          <PressableScale
            onPress={() => router.push('/auth')}
            style={[styles.authBtn, { backgroundColor: colors.primary }]}
          >
            <AppText variant="label" weight="bold" color={colors.primaryForeground}>{t('signIn')}</AppText>
          </PressableScale>
        </View>
      </View>
    );
  }

  // ── Cancelled card (inline — no photo, simple) ────────────────────────────
  const renderCancelledItem = ({ item }: { item: Booking }) => {
    const checkIn = new Date(item.checkInDate);
    const checkOut = getDepartureDate(item);
    const cancelledByHost = (item as any).cancelledBy === 'host' || (item as any).cancelledBy === 'admin';

    return (
      <PressableScale
        onPress={() => router.push(`/booking/${item.id}` as any)}
        style={[styles.cancelledCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        scaleTo={0.985}
      >
        <View style={[styles.cancelledTop, isRTL && styles.rtlRow]}>
          <View style={[styles.cancelledInfo, isRTL ? { alignItems: 'flex-end' } : {}]}>
            <AppText variant="label" weight="semibold" numberOfLines={1}>{item.campTitle}</AppText>
            <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginTop: 4 }}>
              {checkIn.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
              {'  –  '}
              {checkOut.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })}
            </AppText>
            {cancelledByHost && (
              <View style={[styles.cancelledBadge, { backgroundColor: '#7C3AED15' }]}>
                <AppText variant="labelSm" color="#7C3AED">{t('cancelledByHost')}</AppText>
              </View>
            )}
          </View>
          <View style={isRTL ? { alignItems: 'flex-start' } : { alignItems: 'flex-end' }}>
            <AppText variant="label" weight="bold">{(Number(item.totalPrice) || 0).toFixed(3)} BHD</AppText>
            {(item.paymentStatus === 'refunded' || (item as any).refundStatus === 'refunded') && (
              <View style={[styles.refundBadge, { backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.success }]}>
                <AppText variant="labelSm" color={colors.success}>{t('refundedBadge')}</AppText>
              </View>
            )}
            {((item as any).refundStatus === 'processing' || (item as any).refundStatus === 'pending') &&
             item.paymentStatus !== 'refunded' && (
              <View style={[styles.refundBadge, { backgroundColor: colors.primary + '18', borderWidth: 1, borderColor: colors.primary + '60' }]}>
                <AppText variant="labelSm" color={colors.primary}>{t('refundProcessing')}</AppText>
              </View>
            )}
          </View>
        </View>
      </PressableScale>
    );
  };

  // ── Empty states ───────────────────────────────────────────────────────────
  const emptyStateMap: Record<number, { icon: string; title: string; desc: string; cta?: boolean }> = {
    0: { icon: 'calendar-outline', title: t('noUpcomingTrips'), desc: t('noUpcomingTripsDesc'), cta: true },
    1: { icon: 'time-outline', title: t('noTripHistory'), desc: t('noTripHistoryDesc') },
    2: { icon: 'close-circle-outline', title: t('noCancelledTrips'), desc: t('noCancelledTripsDesc') },
  };
  const emptyState = emptyStateMap[segment];

  const ListEmptyComponent = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconCircle, { backgroundColor: colors.muted }]}>
        <Ionicons name={emptyState.icon as any} size={32} color={colors.mutedForeground} />
      </View>
      <AppText variant="h3" weight="bold" style={styles.emptyTitle}>{emptyState.title}</AppText>
      <AppText variant="body" color={colors.mutedForeground} style={styles.emptyDesc}>
        {emptyState.desc}
      </AppText>
      {emptyState.cta && (
        <PressableScale
          onPress={() => router.push('/search')}
          style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
        >
          <AppText variant="label" weight="bold" color={colors.primaryForeground}>{t('exploreCamps')}</AppText>
        </PressableScale>
      )}
    </View>
  );

  if (loading) return <PageLoader />;

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Dark header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <ImageBackground source={nightTexture} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.9 }} />
        <LinearGradient colors={['rgba(10,17,40,0.6)', 'rgba(10,17,40,1)']} style={StyleSheet.absoluteFill} />
        <PatternSadu color="#FDFBF7" opacity={0.08} />
        <View style={styles.headerContent}>
          <AppText variant="h1" color="#fff" weight="bold">{t('tripsTab')}</AppText>
          <View style={styles.segmentWrapper}>
            <SegmentedControl
              values={[
                `${t('upcoming')}${upcoming.length > 0 ? ` (${upcoming.length})` : ''}`,
                t('history'),
                `${t('cancelled')}${cancelled.length > 0 ? ` (${cancelled.length})` : ''}`,
              ]}
              selectedIndex={segment}
              onChange={idx => setSegment(idx as 0 | 1 | 2)}
            />
          </View>
        </View>
      </View>

      {/* Hero card for the single upcoming trip */}
      {segment === 0 && heroBooking && (
        <View style={styles.heroSection}>
          <TripHeroCard
            booking={heroBooking}
            onPayNow={handlePayNow}
            paying={payingId === heroBooking.id}
            onVerifyPayment={handleVerifyPayment}
            verifying={verifyingId === heroBooking.id}
          />
        </View>
      )}

      {networkError ? (
        <View style={styles.errorState}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.muted }]}>
            <Ionicons name="cloud-offline-outline" size={32} color={colors.mutedForeground} />
          </View>
          <AppText variant="h3" weight="bold" style={styles.emptyTitle}>{t('tripsLoadError')}</AppText>
          <AppText variant="body" color={colors.mutedForeground} style={styles.emptyDesc}>
            {t('tripsLoadErrorDesc')}
          </AppText>
          <PressableScale
            onPress={() => setRetryKey(k => k + 1)}
            style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
          >
            <AppText variant="label" weight="bold" color={colors.primaryForeground}>{t('retry')}</AppText>
          </PressableScale>
        </View>
      ) : (
        <FlatList
          data={displayedBookings}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
            displayedBookings.length === 0 && { flex: 1, justifyContent: 'center' },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<ListEmptyComponent />}
          renderItem={({ item }) => {
            if (segment === 0) {
              // Skip the hero booking in the list (it's already shown above)
              if (heroBooking && item.id === heroBooking.id) return null;
              return (
                <TripCard
                  booking={item}
                  onPayNow={handlePayNow}
                  onCancel={setCancelTarget}
                  onMessage={setMessagingTarget}
                  paying={payingId === item.id}
                  onVerifyPayment={handleVerifyPayment}
                  verifying={verifyingId === item.id}
                />
              );
            }
            if (segment === 1) {
              return (
                <TripHistoryCard
                  booking={item}
                  existingReview={reviewsByBookingId.get(item.id) ?? null}
                  onRateStay={setRateTarget}
                />
              );
            }
            return renderCancelledItem({ item });
          }}
          ListHeaderComponent={
            segment === 0 && upcoming.length > 1 && heroBooking ? (
              <AppText
                variant="label"
                weight="semibold"
                style={[styles.sectionSubtitle, isRTL && { textAlign: 'right' }]}
              >
                {t('allUpcoming')}
              </AppText>
            ) : null
          }
        />
      )}

      <CancelBookingSheet
        booking={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={performCancellation}
      />

      <RateStaySheet
        booking={rateTarget}
        existing={rateTarget ? (reviewsByBookingId.get(rateTarget.id) ?? null) : null}
        onClose={() => setRateTarget(null)}
        onSuccess={() => {
          // Bump the refresh key so useBookingReview re-queries the reviews
          // collection even though the camp ID list hasn't changed.
          setReviewRefreshKey(k => k + 1);
        }}
      />

      <MessageThreadSheet
        booking={messagingTarget}
        userRole="guest"
        onClose={() => setMessagingTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Auth gate
  gateHeader: { overflow: 'hidden', justifyContent: 'flex-end' },
  gateHeaderContent: { paddingHorizontal: 24, paddingBottom: 24 },
  gateBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  gateIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  gateTitle: { textAlign: 'center', marginBottom: 10 },
  gateDesc: { textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  authBtn: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
  },

  // Main header
  header: { overflow: 'hidden' },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  segmentWrapper: { marginTop: 20 },

  // Hero section
  heroSection: { paddingTop: 24 },

  // List
  listContent: { paddingHorizontal: 20, paddingTop: 20 },
  sectionSubtitle: {
    color: '#6B7280',
    marginBottom: 12,
    fontSize: 14,
  },

  // Skeleton cards
  skeletonCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Cancelled card
  cancelledCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    opacity: 0.85,
  },
  cancelledTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  cancelledInfo: { flex: 1 },
  cancelledBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  refundBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  // Error + Empty states
  errorState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 40 },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: { textAlign: 'center', marginBottom: 10 },
  emptyDesc: { textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  exploreBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
  },

  rtlRow: { flexDirection: 'row-reverse' },
});
