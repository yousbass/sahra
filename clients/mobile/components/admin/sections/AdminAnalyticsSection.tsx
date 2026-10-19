import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { EmptyState } from '@/components/EmptyState';
import { db } from '@/lib/firebase';
import { buildAdminTrends, TrendPoint } from '@/lib/adminAnalytics';

type Palette = Record<string, any> & { primary: string; card: string; border: string; foreground?: string; mutedForeground?: string; background?: string };
type AnalyticsProps = { colors: Palette; t: (key: string, options?: { defaultValue?: string }) => string; isRTL?: boolean };
type Camp = { id: string; title?: string; rating?: number; reviewCount?: number; pricePerNight?: number };

const ranges = [{ key: '7days', days: 7 }, { key: '30days', days: 30 }, { key: '3months', days: 90 }, { key: '1year', days: 365 }];
const tr = (t: AnalyticsProps['t'], key: string, _fallback: string) => t(key);

export function AdminAnalyticsSection({ colors, t, isRTL }: AnalyticsProps) {
  const [range, setRange] = useState('30days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ users: 0, bookings: 0, revenue: 0, listings: 0 });
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);
  const load = useCallback(async () => {
    if (!db) { setError(tr(t, 'adminFirebaseUnavailable', 'Data service is unavailable.')); setLoading(false); return; }
    try {
      setError('');
      const [usersSnap, bookingsSnap, campsSnap] = await Promise.all([getDocs(collection(db, 'users')), getDocs(collection(db, 'bookings')), getDocs(collection(db, 'camps'))]);
      const users = usersSnap.docs.map(d => d.data() as Record<string, unknown>);
      const bookings = bookingsSnap.docs.map(d => d.data() as Record<string, unknown>);
      const listings = campsSnap.docs.map(d => d.data() as Record<string, unknown>);
      const paid = bookings.filter(b => b.paymentStatus === 'paid' || b.paymentStatus === 'cash_collected');
      setStats({ users: users.length, bookings: bookings.length, listings: listings.length, revenue: paid.reduce((n, b) => n + Number(b.totalPrice ?? b.amount ?? 0), 0) });
      const end = new Date(); const selected = ranges.find(item => item.key === range) ?? ranges[1];
      const start = new Date(end); start.setDate(end.getDate() - selected.days);
      setTrends(buildAdminTrends({ users, bookings, listings }, start, end));
      setCamps(campsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Camp)).sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0)).slice(0, 5));
    } catch (e) { setError(e instanceof Error ? e.message : tr(t, 'adminLoadError', 'Could not load administrator data.')); }
    finally { setLoading(false); }
  }, [range, t]);
  useEffect(() => { setLoading(true); load(); }, [load]);
  const max = useMemo(() => Math.max(1, ...trends.map(point => Math.max(point.revenue, point.bookings, point.users, point.listings))), [trends]);
  const share = async () => {
    await Share.share({ message: `${tr(t, 'adminAnalytics', 'Analytics')}\n${tr(t, 'adminMetricUsers', 'Users')}: ${stats.users}\n${tr(t, 'adminMetricBookings', 'Bookings')}: ${stats.bookings}\n${tr(t, 'adminMetricRevenue', 'Revenue')}: ${stats.revenue.toFixed(3)} ${t('adminCurrency')}` });
  };
  if (loading) return <AppText color={colors.mutedForeground}>…</AppText>;
  if (error) return <View style={styles.notice}><AppText color={colors.destructive}>{error}</AppText><PressableScale onPress={load}><AppText color={colors.primary} weight="bold">{tr(t, 'retry', 'Retry')}</AppText></PressableScale></View>;
  return <View style={styles.container}>
    <View style={[styles.header, isRTL && styles.rtl]}><View><AppText variant="h2" weight="bold">{tr(t, 'adminAnalytics', 'Analytics')}</AppText><AppText variant="bodySm" color={colors.mutedForeground}>{tr(t, 'adminAnalyticsDesc', 'Platform performance overview')}</AppText></View><PressableScale onPress={share} accessibilityLabel={tr(t, 'adminShare', 'Share summary')} style={styles.touch}><AppText color={colors.primary}>↗</AppText></PressableScale></View>
    <View style={styles.rangeRow}>{ranges.map(item => <PressableScale key={item.key} onPress={() => setRange(item.key)} style={[styles.range, { backgroundColor: range === item.key ? colors.primary : colors.card, borderColor: colors.border }]}><AppText variant="labelSm" color={range === item.key ? colors.primaryForeground : colors.foreground}>{tr(t, `adminRange${item.key}`, item.key === '7days' ? '7 days' : item.key === '30days' ? '30 days' : item.key === '3months' ? '3 months' : '1 year')}</AppText></PressableScale>)}</View>
    <View style={styles.grid}>{[['users', stats.users], ['bookings', stats.bookings], ['revenue', `${stats.revenue.toFixed(3)} ${t('adminCurrency')}`], ['listings', stats.listings]].map(([key, value]) => <View key={String(key)} style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}><AppText variant="h2" weight="bold">{String(value)}</AppText><AppText variant="labelSm" color={colors.mutedForeground}>{tr(t, `adminMetric${String(key)[0].toUpperCase()}${String(key).slice(1)}`, String(key))}</AppText></View>)}</View>
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><AppText variant="h3" weight="bold">{tr(t, 'adminTrends', 'Trends')}</AppText>{trends.length ? trends.map(point => <View key={point.label} style={styles.trend}><AppText variant="labelSm" style={styles.label}>{point.label}</AppText><View style={styles.bars}>{[['revenue', point.revenue], ['bookings', point.bookings], ['users', point.users], ['listings', point.listings]].map(([key, value]) => <View key={String(key)} style={[styles.bar, { height: Math.max(3, Number(value) / max * 58), backgroundColor: key === 'revenue' ? colors.primary : colors.border }]} />)}</View></View>) : <EmptyState title={tr(t, 'adminNoResults', 'No data')} description={tr(t, 'adminNoResultsDesc', 'There are no records for this period.')} />}</View>
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><AppText variant="h3" weight="bold">{tr(t, 'adminTopCamps', 'Top camps')}</AppText>{camps.length ? camps.map((camp, index) => <View key={camp.id} style={styles.camp}><AppText variant="label" weight="bold">{`${index + 1}. ${camp.title || camp.id}`}</AppText><AppText variant="labelSm" color={colors.mutedForeground}>★ {camp.rating?.toFixed(1) ?? '—'} · {camp.reviewCount ?? 0} {tr(t, 'adminReviews', 'reviews')} · {camp.pricePerNight ?? '—'} {t('adminCurrency')}</AppText></View>) : <AppText color={colors.mutedForeground}>{tr(t, 'adminNoResults', 'No data')}</AppText>}</View>
  </View>;
}
const styles = StyleSheet.create({ container: { gap: 14 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, rtl: { flexDirection: 'row-reverse' }, touch: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }, rangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, range: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 8 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, metric: { width: '48%', minHeight: 78, borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 }, card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 }, trend: { flexDirection: 'row', alignItems: 'flex-end', height: 78, gap: 4 }, label: { width: 30 }, bars: { flex: 1, height: 64, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }, bar: { flex: 1, borderRadius: 3 }, camp: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#999' }, notice: { gap: 12, padding: 12 }, });