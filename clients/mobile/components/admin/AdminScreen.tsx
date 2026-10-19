import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { HostHeader } from '@/components/host/HostGuard';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { deleteReview } from '@/lib/firestore';
import { listAdminDisputes, listAdminRefunds, type AdminDispute, type AdminRefund } from '@/lib/adminFinanceApi';
import type { Booking, Camp, Review } from '@/lib/firestore';
import { AdminAnalyticsSection } from './sections/AdminAnalyticsSection';
import { AdminBookingsSection } from './sections/AdminBookingsSection';
import { AdminCampsSection } from './sections/AdminCampsSection';
import { AdminDisputesSection } from './sections/AdminDisputesSection';
import { AdminRefundsSection } from './sections/AdminRefundsSection';
import { AdminReviewsSection } from './sections/AdminReviewsSection';
import { AdminSettingsSection, type AdminSettingsValues } from './sections/AdminSettingsSection';
import { ApplicationSection } from './sections/ApplicationSection';
import { UsersSection } from './sections/UsersSection';

export type AdminSection =
  | 'dashboard' | 'users' | 'host-applications' | 'seller-applications'
  | 'camps' | 'bookings' | 'reviews' | 'analytics' | 'refunds' | 'disputes' | 'settings';

const menu: AdminSection[] = [
  'dashboard', 'users', 'host-applications', 'seller-applications', 'camps',
  'bookings', 'reviews', 'analytics', 'refunds', 'disputes', 'settings',
];

const labels: Record<AdminSection, string> = {
  dashboard: 'adminDashboard', users: 'adminUsers', 'host-applications': 'adminHostApplications',
  'seller-applications': 'adminSellerApplications', camps: 'adminCamps', bookings: 'adminBookings',
  reviews: 'adminReviews', analytics: 'adminAnalytics', refunds: 'adminRefunds',
  disputes: 'adminDisputes', settings: 'adminSettings',
};

type Settings = AdminSettingsValues;
const defaultSettings: Settings = {
  siteName: 'MUKHYMAT', supportEmail: '', supportPhone: '', platformDescription: '',
  serviceFeePercentage: '10', hostCommissionRate: '85', taxRate: '5', minBookingAmount: '50',
  defaultRefundPolicy: 'refundable', refundDeadlineHours: '48', cancellationFeePercentage: '10',
  maxGuestsPerCamp: '50', minBookingDuration: '1', maxBookingDuration: '30', reviewDeadlineDays: '14',
  currency: 'BHD', language: 'en', timezone: 'Asia/Bahrain',
};

export function AdminScreen({ section }: { section: AdminSection }) {
  const colors = useColors();
  const { t } = useTranslation();
  const { isRTL } = useI18n();
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [camps, setCamps] = useState<Camp[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<(Review & { id: string })[]>([]);
  const [refunds, setRefunds] = useState<AdminRefund[]>([]);
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [settings, setSettings] = useState<Partial<Settings>>(defaultSettings);

  const reload = useCallback(() => setRefreshKey(value => value + 1), []);
  const loadSection = useCallback(async () => {
    if (!db || !user) return;
    if (!['camps', 'bookings', 'reviews', 'refunds', 'disputes', 'settings'].includes(section)) return;
    setLoading(true);
    setError('');
    try {
      if (section === 'camps') {
        const snap = await getDocs(collection(db, 'camps'));
        setCamps(snap.docs.map(item => ({ id: item.id, ...item.data() }) as Camp));
      } else if (section === 'bookings') {
        const snap = await getDocs(collection(db, 'bookings'));
        setBookings(snap.docs.map(item => ({ id: item.id, ...item.data() }) as Booking));
      } else if (section === 'reviews') {
        const snap = await getDocs(collection(db, 'reviews'));
        setReviews(snap.docs.map(item => ({ id: item.id, ...item.data() }) as Review & { id: string }));
      } else if (section === 'refunds') {
        const data = await listAdminRefunds();
        setRefunds(data.refunds ?? []);
      } else if (section === 'disputes') {
        const data = await listAdminDisputes();
        setDisputes(data.disputes ?? []);
      } else if (section === 'settings') {
        const snap = await getDocs(doc(db, 'settings', 'general').parent);
        const general = snap.docs.find(item => item.id === 'general');
        if (general) setSettings(current => ({ ...current, ...general.data() }));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('adminLoadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [section, user, refreshKey, t]);

  useEffect(() => { void loadSection(); }, [loadSection]);
  const title = t(labels[section], { defaultValue: section.replace('-', ' ') });
  const run = useCallback(async (action: () => Promise<void>) => {
    try { await action(); reload(); } catch (cause) {
      Alert.alert(t('adminActionFailed'), cause instanceof Error ? cause.message : t('adminTryAgain'));
    }
  }, [reload, t]);

  const content = useMemo(() => {
    if (section === 'dashboard' || section === 'analytics') {
      return <AdminAnalyticsSection colors={colors} t={t} isRTL={isRTL} />;
    }
    if (section === 'users') return <UsersSection onChanged={reload} />;
    if (section === 'host-applications') return <ApplicationSection kind="host" onChanged={reload} />;
    if (section === 'seller-applications') return <ApplicationSection kind="seller" onChanged={reload} />;
    if (section === 'camps') return <AdminCampsSection camps={camps} onStatusChange={(camp, status) => run(async () => {
      if (!db) throw new Error(t('adminFirebaseUnavailable'));
      await updateDoc(doc(db, 'camps', camp.id), { status, updatedAt: new Date().toISOString() });
    })} onCoordinatesChange={(camp, coordinates) => run(async () => {
      if (!db) throw new Error(t('adminFirebaseUnavailable'));
      await updateDoc(doc(db, 'camps', camp.id), { coordinates, updatedAt: new Date().toISOString() });
    })} onRecalculateRatings={() => run(async () => {
      if (!db) throw new Error(t('adminFirebaseUnavailable'));
      const snap = await getDocs(collection(db, 'reviews'));
      const grouped = new Map<string, number[]>();
      snap.docs.forEach(item => {
        const value = item.data();
        const campId = typeof value.campId === 'string' ? value.campId : '';
        const rating = Number(value.rating);
        if (campId && Number.isFinite(rating)) grouped.set(campId, [...(grouped.get(campId) ?? []), rating]);
      });
      await Promise.all(camps.map(camp => {
        const ratings = grouped.get(camp.id) ?? [];
        const rating = ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0;
        return updateDoc(doc(db!, 'camps', camp.id), { rating, reviewCount: ratings.length });
      }));
    })} />;
    if (section === 'bookings') return <AdminBookingsSection bookings={bookings} />;
    if (section === 'reviews') return <AdminReviewsSection reviews={reviews} onFlag={(review, reason) => run(async () => {
      if (!db) throw new Error(t('adminFirebaseUnavailable'));
      await updateDoc(doc(db, 'reviews', review.id), { flagged: true, reported: true, flagReason: reason });
    })} onDelete={review => run(async () => deleteReview({ reviewId: review.id, campId: String(review.campId), oldRating: Number(review.rating) || 0 }))} />;
    if (section === 'refunds') return <AdminRefundsSection refunds={refunds} loading={loading} error={error} onReload={reload} />;
    if (section === 'disputes') return <AdminDisputesSection disputes={disputes} loading={loading} error={error} onReload={reload} />;
    if (section === 'settings') return <AdminSettingsSection colors={colors} t={t} initial={settings} onSave={async values => {
      if (!db || !user) throw new Error(t('adminSignInRequired'));
      await updateDoc(doc(db, 'settings', 'general'), { ...values, updatedAt: new Date().toISOString(), updatedBy: user.uid });
    }} />;
    return null;
  }, [section, colors, t, isRTL, camps, bookings, reviews, refunds, disputes, settings, loading, error, run, reload, user]);

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <HostHeader title={title} fallback="/(tabs)/profile" />
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); reload(); }} tintColor={colors.primary} />}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.menu}>
        {menu.map(key => <PressableScale key={key} onPress={() => router.push(key === 'dashboard' ? '/admin' : `/admin/${key}`)} style={[styles.menuItem, { backgroundColor: key === section ? colors.primary : colors.card, borderColor: colors.border }]}>
          <AppText variant="labelSm" color={key === section ? colors.primaryForeground : colors.foreground}>{t(labels[key])}</AppText>
        </PressableScale>)}
      </ScrollView>
      {error && section !== 'refunds' && section !== 'disputes' ? <View style={[styles.error, { backgroundColor: colors.destructive + '15' }]}><AppText color={colors.destructive}>{error}</AppText></View> : null}
      {loading && !['refunds', 'disputes'].includes(section) ? <View style={styles.loading}>{[1, 2, 3].map(key => <Skeleton key={key} height={64} />)}</View> : content}
      {!loading && error && !content ? <EmptyState title={t('adminLoadError')} description={error} /> : null}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 48 },
  menu: { gap: 8, paddingBottom: 16 },
  menuItem: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  error: { padding: 12, borderRadius: 10, marginBottom: 12 },
  loading: { gap: 10 },
});