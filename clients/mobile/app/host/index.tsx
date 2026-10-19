import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { SaduBand } from '@/components/SaduBand';
import { Skeleton } from '@/components/Skeleton';
import { HostGate, HostHeader } from '@/components/host/HostGuard';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToHostListings, subscribeToHostBookings, getReviewsByHostCamps } from '@/lib/firestore';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUnreadBookings } from '@/contexts/UnreadBookingsContext';

interface HostStats {
  listings: number;
  active: number;
  bookings: number;
  pending: number;
}

interface EarningsStats {
  totalGross: number;
  monthGross: number;
  pendingPayout: number;
}

function DashboardBody() {
  const colors = useColors();
  const { t } = useTranslation();
  const { isRTL } = useI18n();
  const { user } = useAuth();
  const [stats, setStats] = useState<HostStats | null>(null);
  const [earnings, setEarnings] = useState<EarningsStats | null>(null);
  const [error, setError] = useState(false);
  const [unreadReviews, setUnreadReviews] = useState(0);
  const { unreadCount: unreadBookings } = useUnreadBookings();

  // Real-time listeners for listing and booking counts + earnings
  useEffect(() => {
    if (!user) return;
    setError(false);

    let listingsReady = false;
    let bookingsReady = false;
    let latestCamps: { status: string }[] = [];
    let latestBookings: { status: string; paymentStatus?: string; totalPrice?: number; createdAt?: string }[] = [];

    const merge = () => {
      if (!listingsReady || !bookingsReady) return;
      setStats({
        listings: latestCamps.length,
        active: latestCamps.filter((c) => c.status === 'active').length,
        bookings: latestBookings.length,
        pending: latestBookings.filter((b) => b.status === 'pending').length,
      });

      // Compute earnings from settled bookings (card paid + cash collected)
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const earnedBookings = latestBookings.filter(
        (b) => b.paymentStatus === 'paid' || b.paymentStatus === 'cash_collected'
      );
      let totalGross = 0;
      let monthGross = 0;
      let pendingPayout = 0;
      for (const b of earnedBookings) {
        const amount = Number(b.totalPrice) || 0;
        totalGross += amount;
        const createdDate = b.createdAt ? new Date(b.createdAt) : new Date(0);
        if (createdDate >= monthStart) monthGross += amount;
        // Pending payout: only online-paid confirmed bookings (cash is already collected)
        if (b.paymentStatus === 'paid' && b.status === 'confirmed') pendingPayout += amount;
      }
      setEarnings({ totalGross, monthGross, pendingPayout });
    };

    const unsubListings = subscribeToHostListings(
      user.uid,
      (camps) => {
        latestCamps = camps;
        listingsReady = true;
        merge();
      },
      (e) => {
        console.error('[host] dashboard listings listener failed', e);
        setError(true);
      }
    );

    const unsubBookings = subscribeToHostBookings(
      user.uid,
      (bookings) => {
        latestBookings = bookings as typeof latestBookings;
        bookingsReady = true;
        merge();
      },
      (e) => {
        console.error('[host] dashboard bookings listener failed', e);
        setError(true);
      }
    );

    return () => {
      unsubListings();
      unsubBookings();
    };
  }, [user?.uid]);

  // Compute unread reviews on focus (best-effort, non-critical)
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const load = async () => {
        if (!user) return;
        try {
          let lastVisit: Date | null = null;
          if (db) {
            const snap = await getDoc(doc(db, 'users', user.uid));
            const raw = snap.data()?.lastReviewsVisitAt;
            if (typeof raw === 'string') lastVisit = new Date(raw);
          }
          const reviews = await getReviewsByHostCamps(user.uid);
          const unread = lastVisit
            ? reviews.filter((r) => new Date(r.createdAt) > lastVisit!).length
            : reviews.length;
          if (alive) setUnreadReviews(unread);
        } catch {
          // non-critical
        }
      };
      load();
      return () => {
        alive = false;
      };
    }, [user?.uid])
  );

  const statCards: { key: keyof HostStats; label: string; icon: keyof typeof Ionicons.glyphMap; tint: string }[] = [
    { key: 'listings', label: t('hostStatsListings'), icon: 'business-outline', tint: colors.primary },
    { key: 'active', label: t('hostStatsActive'), icon: 'checkmark-circle-outline', tint: colors.kashta },
    { key: 'bookings', label: t('hostStatsBookings'), icon: 'calendar-outline', tint: colors.primary },
    { key: 'pending', label: t('hostStatsPending'), icon: 'hourglass-outline', tint: colors.kashta },
  ];

  const quickActions: {
    title: string;
    desc: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: string;
    badge?: number;
  }[] = [
    { title: t('hostMyListings'), desc: t('hostActionListingsDesc'), icon: 'business-outline', route: '/host/listings' },
    { title: t('hostBookingsTitle'), desc: t('hostActionBookingsDesc'), icon: 'calendar-outline', route: '/host/bookings', badge: unreadBookings },
    { title: t('hostActionAvailability'), desc: t('hostActionAvailabilityDesc'), icon: 'time-outline', route: '/host/availability' },
    { title: t('hostReviewsNav'), desc: t('hostReviewsNavDesc'), icon: 'star-outline', route: '/host/reviews', badge: unreadReviews },
  ];

  const earningCards: { label: string; icon: keyof typeof Ionicons.glyphMap; tint: string; value: (e: EarningsStats) => string; sub?: (e: EarningsStats) => string }[] = [
    {
      label: t('hostEarningsTotalGross'),
      icon: 'trending-up-outline',
      tint: colors.primary,
      value: (e) => `${e.totalGross.toFixed(3)} BD`,
      sub: (e) => `${t('hostEarningsMonthLabel')}: ${e.monthGross.toFixed(3)} BD`,
    },
    {
      label: t('hostEarningsPendingPayout'),
      icon: 'cash-outline',
      tint: colors.kashta,
      value: (e) => `${e.pendingPayout.toFixed(3)} BD`,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HostHeader title={t('hostDashboardTitle')} fallback="/(tabs)/profile" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SaduBand />

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + '12', borderColor: colors.destructive + '40' }]}>
            <AppText variant="bodySm" color={colors.destructive}>{t('hostLoadError')}</AppText>
          </View>
        ) : null}

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {statCards.map((card) => (
            <View
              key={card.key}
              style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.statIcon, { backgroundColor: card.tint + '18' }]}>
                <Ionicons name={card.icon} size={18} color={card.tint} />
              </View>
              {stats ? (
                <AppText variant="h2" weight="bold">{String(stats[card.key])}</AppText>
              ) : (
                <Skeleton width={48} height={28} />
              )}
              <AppText variant="labelSm" color={colors.mutedForeground}>{card.label}</AppText>
            </View>
          ))}
        </View>

        {/* Earnings section */}
        <AppText variant="h3" style={styles.sectionTitle}>{t('hostEarningsTitle')}</AppText>
        <View style={[styles.earningsRow, isRTL ? styles.rtlRow : null]}>
          {earningCards.map((card) => (
            <View
              key={card.label}
              style={[styles.earningCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.statIcon, { backgroundColor: card.tint + '18' }]}>
                <Ionicons name={card.icon} size={18} color={card.tint} />
              </View>
              {earnings ? (
                <>
                  <AppText variant="h3" weight="bold" color={card.tint}>
                    {card.value(earnings)}
                  </AppText>
                  {card.sub && (
                    <AppText variant="labelSm" color={colors.mutedForeground}>
                      {card.sub(earnings)}
                    </AppText>
                  )}
                </>
              ) : (
                <Skeleton width={72} height={22} />
              )}
              <AppText variant="labelSm" color={colors.mutedForeground}>{card.label}</AppText>
            </View>
          ))}
        </View>

        <PressableScale
          onPress={() => router.push('/host/listing-form')}
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.primaryForeground} />
          <AppText variant="label" weight="bold" color={colors.primaryForeground}>
            {t('hostNewListing')}
          </AppText>
        </PressableScale>

        <AppText variant="h3" style={styles.sectionTitle}>{t('hostQuickActions')}</AppText>
        <View style={styles.actionsList}>
          {quickActions.map((action) => (
            <PressableScale
              key={action.route}
              onPress={() => router.push(action.route as never)}
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }, isRTL ? styles.rtlRow : null]}
            >
              <View style={{ position: 'relative' }}>
                <View style={[styles.actionIcon, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name={action.icon} size={22} color={colors.primary} />
                </View>
                {action.badge && action.badge > 0 ? (
                  <View style={styles.actionBadge}>
                    <AppText variant="labelSm" weight="bold" color="#FFFFFF" style={styles.actionBadgeText}>
                      {action.badge > 99 ? '99+' : String(action.badge)}
                    </AppText>
                  </View>
                ) : null}
              </View>
              <View style={[styles.actionText, isRTL ? { alignItems: 'flex-end' } : null]}>
                <AppText variant="label" weight="bold">{action.title}</AppText>
                <AppText variant="bodySm" color={colors.mutedForeground} align={isRTL ? 'right' : 'left'}>
                  {action.desc}
                </AppText>
              </View>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={18}
                color={colors.mutedForeground}
              />
            </PressableScale>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export default function HostDashboardScreen() {
  return (
    <HostGate>
      <DashboardBody />
    </HostGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 48, gap: 16 },
  rtlRow: { flexDirection: 'row-reverse' },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { marginTop: 4 },
  earningsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  earningCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 4,
    alignItems: 'flex-start',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  actionsList: { gap: 10 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { flex: 1, gap: 2 },
  actionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  actionBadgeText: { fontSize: 10, lineHeight: 12 },
});
