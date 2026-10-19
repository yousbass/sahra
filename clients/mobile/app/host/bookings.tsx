import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, ScrollView, Modal, Pressable, RefreshControl, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { PageLoader } from '@/components/PageLoader';
import { HostGate, HostHeader } from '@/components/host/HostGuard';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { HostBooking, parseDateOnly } from '@/lib/hostListings';
import { subscribeToHostBookings } from '@/lib/firestore';
import { getLocationLabel } from '@/lib/locations';
import { getDepartureDateStr } from '@/lib/bookingDates';
import { notify } from '@/lib/payments';
import { useUnreadBookings } from '@/contexts/UnreadBookingsContext';
import { auth, db } from '@/lib/firebase';
import { MessageThreadSheet } from '@/components/MessageThreadSheet';

function BookingsBody() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const { isRTL } = useI18n();
  const { user } = useAuth();
  const { setBookingsFocused } = useUnreadBookings();
  const [bookings, setBookings] = useState<HostBooking[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedBooking, setSelectedBooking] = useState<HostBooking | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [messagingBooking, setMessagingBooking] = useState<HostBooking | null>(null);

  // Clear the unread badge while this screen is in view.
  useFocusEffect(
    useCallback(() => {
      setBookingsFocused(true);
      return () => setBookingsFocused(false);
    }, [setBookingsFocused])
  );

  // Real-time subscription — keeps the list live without manual refresh
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToHostBookings(
      user.uid,
      (data) => setBookings(data as HostBooking[]),
      (err) => {
        console.error('[host] bookings listener error', err);
        notify(t('hostLoadError'));
        setBookings(prev => prev ?? []);
      }
    );
    return unsubscribe;
  }, [user?.uid, t]);

  // Pull-to-refresh is cosmetic only — the listener already keeps data live
  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const formatDate = (value: string) => {
    if (!value) return '—';
    const date = parseDateOnly(value);
    if (isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const paymentLabel = (status?: string) => {
    if (status === 'paid') return t('paymentPaid');
    if (status === 'cash_collected') return t('hostCashCollectedBadge');
    if (status === 'refunded') return t('paymentRefunded');
    if (status === 'failed') return t('paymentFailedLbl');
    return t('paymentPendingLbl');
  };

  const isCashPending = (b: HostBooking) =>
    b.paymentMethod === 'cash_on_arrival' && b.status === 'pending';

  const isCashCollectable = (b: HostBooking) =>
    b.paymentMethod === 'cash_on_arrival' &&
    b.status === 'confirmed' &&
    (!b.paymentStatus || b.paymentStatus === 'pending');

  const handleAccept = async (booking: HostBooking) => {
    try {
      setActionLoading(`accept-${booking.id}`);
      await acceptBooking(booking.id);
      notify(t('hostAcceptSuccess'));
      if (selectedBooking?.id === booking.id) {
        setSelectedBooking(prev => prev ? { ...prev, status: 'confirmed' } : null);
      }
    } catch (e) {
      console.error('Accept failed:', e);
      notify(t('hostAcceptFail'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (booking: HostBooking) => {
    try {
      setActionLoading(`decline-${booking.id}`);
      await declineBooking(booking);
      notify(t('hostDeclineSuccess'));
      if (selectedBooking?.id === booking.id) {
        setSelectedBooking(null);
      }
    } catch (e) {
      console.error('Decline failed:', e);
      notify(t('hostDeclineFail'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCollectCash = async (booking: HostBooking) => {
    try {
      setActionLoading(`collect-${booking.id}`);
      await collectCash(booking.id);
      notify(t('hostCollectCashSuccess'));
      if (selectedBooking?.id === booking.id) {
        setSelectedBooking(prev =>
          prev ? { ...prev, paymentStatus: 'cash_collected', collectedAt: new Date().toISOString() } : null
        );
      }
    } catch (e) {
      console.error('Collect cash failed:', e);
      notify(t('hostCollectCashFail'));
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status?: string) => {
    if (status === 'confirmed') return colors.success;
    if (status === 'cancelled') return colors.destructive;
    if (status === 'completed') return colors.kashta;
    return colors.primary;
  };

  const getStatusText = (status?: string) => {
    if (status === 'confirmed') return t('confirmed');
    if (status === 'cancelled') return t('cancelled');
    if (status === 'completed') return t('completed');
    return t('pending');
  };

  const allTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('hostFilterAll') },
    { key: 'pending', label: t('hostFilterPending') },
    { key: 'confirmed', label: t('hostFilterConfirmed') },
    { key: 'completed', label: t('hostFilterCompleted') },
    { key: 'cancelled', label: t('hostFilterCancelled') },
  ];

  const filteredBookings = bookings === null
    ? []
    : statusFilter === 'all'
      ? bookings
      : bookings.filter(b => b.status === statusFilter);

  const tabCount = (key: StatusFilter) => {
    if (!bookings) return 0;
    return key === 'all' ? bookings.length : bookings.filter(b => b.status === key).length;
  };

  const renderItem = ({ item }: { item: HostBooking }) => {
    const statusColor = getStatusColor(item.status);
    const statusText = getStatusText(item.status);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setSelectedBooking(item)}
        activeOpacity={0.85}
      >
        <View style={[styles.topRow, isRTL ? styles.rtlRow : null]}>
          <AppText variant="h3" numberOfLines={1} style={styles.title} align={isRTL ? 'right' : 'left'}>
            {item.campTitle || t('hostBookingsTitle')}
          </AppText>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
            <AppText variant="labelSm" weight="bold" color={statusColor}>{statusText}</AppText>
          </View>
        </View>

        <View style={[styles.metaRow, isRTL ? styles.rtlRow : null]}>
          <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
          <AppText variant="bodySm" color={colors.mutedForeground} numberOfLines={1}>
            {item.campLocation ? getLocationLabel(item.campLocation) : '—'}
          </AppText>
        </View>

        <View style={[styles.metaRow, isRTL ? styles.rtlRow : null]}>
          <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
          <AppText variant="bodySm" color={colors.mutedForeground}>
            {formatDate(item.checkInDate)}
            {` → ${formatDate(getDepartureDateStr(item))}`}
          </AppText>
          <Ionicons name="people-outline" size={14} color={colors.mutedForeground} style={styles.metaGap} />
          <AppText variant="bodySm" color={colors.mutedForeground}>{String(item.guests || 0)}</AppText>
        </View>

        <View style={[styles.footerRow, { borderTopColor: colors.border }, isRTL ? styles.rtlRow : null]}>
          <View style={isRTL ? { alignItems: 'flex-end' } : null}>
            <AppText variant="labelSm" color={colors.mutedForeground}>
              {t('hostPaymentLabel')}: {paymentLabel(item.paymentStatus)}
            </AppText>
            <AppText variant="labelSm" color={colors.mutedForeground} numberOfLines={1}>
              {t('hostBookingIdLabel')}: {item.id.slice(0, 8).toUpperCase()}
            </AppText>
          </View>
          <View style={[styles.footerRight, isRTL ? styles.rtlRow : null]}>
            <AppText variant="h3" weight="bold" color={colors.primary}>
              {(Number(item.totalPrice) || 0).toFixed(3)} BHD
            </AppText>
            {isCashPending(item) && (
              <View style={styles.cashBadge}>
                <Ionicons name="cash-outline" size={12} color={colors.kashta} />
                <AppText variant="labelSm" color={colors.kashta}>{t('cashDueBadge')}</AppText>
              </View>
            )}
          </View>
        </View>

        {/* Inline accept/decline for pending cash bookings */}
        {isCashPending(item) && (
          <View style={[styles.actionRow, isRTL ? styles.rtlRow : null]}>
            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: colors.success }]}
              disabled={!!actionLoading}
              onPress={() => handleAccept(item)}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <AppText variant="labelSm" weight="bold" color="#fff">
                {actionLoading === `accept-${item.id}` ? t('hostAccepting') : t('hostAcceptBooking')}
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.declineBtn, { backgroundColor: colors.destructive }]}
              disabled={!!actionLoading}
              onPress={() => handleDecline(item)}
            >
              <Ionicons name="close-circle-outline" size={16} color="#fff" />
              <AppText variant="labelSm" weight="bold" color="#fff">
                {actionLoading === `decline-${item.id}` ? t('hostDeclining') : t('hostDeclineBooking')}
              </AppText>
            </TouchableOpacity>
          </View>
        )}
        {/* Collect cash for accepted cash bookings */}
        {isCashCollectable(item) && (
          <TouchableOpacity
            style={[styles.collectCashBtn]}
            disabled={!!actionLoading}
            onPress={() => handleCollectCash(item)}
          >
            <Ionicons name="cash-outline" size={16} color="#fff" />
            <AppText variant="labelSm" weight="bold" color="#fff">
              {actionLoading === `collect-${item.id}` ? t('hostCollectingCash') : t('hostCollectCash')}
            </AppText>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (bookings === null) return <PageLoader />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HostHeader title={t('hostBookingsTitle')} />

      {/* Status filter tabs */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {allTabs.map(tab => {
            const active = statusFilter === tab.key;
            const count = tabCount(tab.key);
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  { borderColor: active ? colors.primary : colors.border },
                  active ? { backgroundColor: colors.primary } : { backgroundColor: colors.card },
                ]}
                onPress={() => setStatusFilter(tab.key)}
              >
                <AppText
                  variant="labelSm"
                  weight="bold"
                  color={active ? colors.primaryForeground : colors.mutedForeground}
                >
                  {tab.label} ({count})
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {filteredBookings.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title={t('hostNoBookingsTitle')}
          description={t('hostNoBookingsDesc')}
        />
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}

      {/* Booking Detail Modal */}
      <Modal
        visible={!!selectedBooking}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedBooking(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setSelectedBooking(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={() => {}}>
            {/* Handle */}
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }, isRTL ? styles.rtlRow : null]}>
              <AppText variant="h3" weight="bold">
                {t('hostDetailTitle')}
              </AppText>
              <TouchableOpacity onPress={() => setSelectedBooking(null)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
                {/* Camp name + status */}
                <AppText variant="h3" weight="bold" style={styles.campTitle} align={isRTL ? 'right' : 'left'}>
                  {selectedBooking.campTitle}
                </AppText>
                <View style={[styles.statusRow, isRTL ? styles.rtlRow : null]}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedBooking.status) + '18' }]}>
                    <AppText variant="labelSm" weight="bold" color={getStatusColor(selectedBooking.status)}>
                      {getStatusText(selectedBooking.status)}
                    </AppText>
                  </View>
                  {selectedBooking.paymentMethod === 'cash_on_arrival' && (
                    <View style={styles.cashBadge}>
                      <Ionicons name="cash-outline" size={12} color={colors.kashta} />
                      <AppText variant="labelSm" color={colors.kashta}>{t('cashDueBadge')}</AppText>
                    </View>
                  )}
                </View>

                {/* Dates */}
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <DetailRow label={t('hostCheckInLabel')} value={formatDate(selectedBooking.checkInDate)} isRTL={isRTL} colors={colors} />
                  <DetailRow label={t('hostCheckOutLabel')} value={formatDate(getDepartureDateStr(selectedBooking))} isRTL={isRTL} colors={colors} />
                  <DetailRow label={t('hostGuestsLabel')} value={String(selectedBooking.guests || '—')} isRTL={isRTL} colors={colors} />
                </View>

                {/* Guest info */}
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <AppText variant="labelSm" weight="bold" color={colors.mutedForeground} style={styles.sectionLabel}>
                    {t('hostGuestSection')}
                  </AppText>
                  <DetailRow label={t('hostGuestName')} value={selectedBooking.userName || '—'} isRTL={isRTL} colors={colors} />
                  <DetailRow label={t('hostGuestEmail')} value={selectedBooking.userEmail || '—'} isRTL={isRTL} colors={colors} />
                  {selectedBooking.userPhone ? (
                    <DetailRow label={t('hostGuestPhone')} value={selectedBooking.userPhone} isRTL={isRTL} colors={colors} />
                  ) : null}
                </View>

                {/* Booking notes */}
                {selectedBooking.specialRequests ? (
                  <View style={[styles.notesBox, { backgroundColor: colors.kashta + '10', borderColor: colors.kashta + '30' }]}>
                    <AppText variant="labelSm" weight="bold" color={colors.kashta} style={styles.sectionLabel}>
                      {t('hostBookingNotes')}
                    </AppText>
                    <AppText variant="bodySm" color={colors.foreground} align={isRTL ? 'right' : 'left'}>
                      {selectedBooking.specialRequests}
                    </AppText>
                  </View>
                ) : null}

                {/* Payment */}
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <AppText variant="labelSm" weight="bold" color={colors.mutedForeground} style={styles.sectionLabel}>
                    {t('hostPaymentLabel')}
                  </AppText>
                  <DetailRow label={t('paymentPaid')} value={paymentLabel(selectedBooking.paymentStatus)} isRTL={isRTL} colors={colors} />
                  {selectedBooking.priceBreakdown && (
                    <>
                      <DetailRow
                        label={t('basePrice')}
                        value={`${(selectedBooking.priceBreakdown.basePrice || 0).toFixed(3)} BHD`}
                        isRTL={isRTL}
                        colors={colors}
                      />
                      <DetailRow
                        label={t('hostPlatformFee')}
                        value={`${(selectedBooking.priceBreakdown.serviceFee || 0).toFixed(3)} BHD`}
                        isRTL={isRTL}
                        colors={colors}
                      />
                    </>
                  )}
                  <View style={[styles.totalRow, { borderTopColor: colors.border }, isRTL ? styles.rtlRow : null]}>
                    <AppText variant="label" weight="bold">{t('total')}</AppText>
                    <AppText variant="h3" weight="bold" color={colors.primary}>
                      {(Number(selectedBooking.totalPrice) || 0).toFixed(3)} BHD
                    </AppText>
                  </View>
                </View>

                <AppText variant="labelSm" color={colors.mutedForeground} align={isRTL ? 'right' : 'left'}>
                  {t('hostBookingIdLabel')}: {selectedBooking.id.slice(0, 8).toUpperCase()}
                </AppText>

                {/* Contact guest */}
                {selectedBooking.userEmail ? (
                  <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: colors.primary + '15' }]}
                    onPress={() =>
                      Linking.openURL(
                        `mailto:${selectedBooking.userEmail}?subject=${encodeURIComponent(
                          `Your booking at ${selectedBooking.campTitle}`
                        )}`
                      )
                    }
                  >
                    <Ionicons name="mail-outline" size={18} color={colors.primary} />
                    <AppText variant="label" weight="bold" color={colors.primary}>
                      {t('hostContactGuest')}
                    </AppText>
                  </TouchableOpacity>
                ) : null}

                {/* Message Guest */}
                <TouchableOpacity
                  style={[styles.messageGuestBtn, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => { setMessagingBooking(selectedBooking); setSelectedBooking(null); }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
                  <AppText variant="label" weight="bold" color={colors.primary}>
                    {t('messaging.messageGuest', 'Message Guest')}
                  </AppText>
                </TouchableOpacity>

                {/* Accept / Decline */}
                {isCashPending(selectedBooking) && (
                  <View style={[styles.actionRow, isRTL ? styles.rtlRow : null]}>
                    <TouchableOpacity
                      style={[styles.acceptBtn, styles.sheetActionBtn, { backgroundColor: colors.success }]}
                      disabled={!!actionLoading}
                      onPress={() => handleAccept(selectedBooking)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <AppText variant="label" weight="bold" color="#fff">
                        {actionLoading === `accept-${selectedBooking.id}` ? t('hostAccepting') : t('hostAcceptBooking')}
                      </AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.declineBtn, styles.sheetActionBtn, { backgroundColor: colors.destructive }]}
                      disabled={!!actionLoading}
                      onPress={() => handleDecline(selectedBooking)}
                    >
                      <Ionicons name="close-circle-outline" size={18} color="#fff" />
                      <AppText variant="label" weight="bold" color="#fff">
                        {actionLoading === `decline-${selectedBooking.id}` ? t('hostDeclining') : t('hostDeclineBooking')}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                )}
                {/* Collect cash for accepted cash bookings */}
                {isCashCollectable(selectedBooking) && (
                  <TouchableOpacity
                    style={[styles.collectCashBtn, styles.sheetActionBtn]}
                    disabled={!!actionLoading}
                    onPress={() => handleCollectCash(selectedBooking)}
                  >
                    <Ionicons name="cash-outline" size={18} color="#fff" />
                    <AppText variant="label" weight="bold" color="#fff">
                      {actionLoading === `collect-${selectedBooking.id}` ? t('hostCollectingCash') : t('hostCollectCash')}
                    </AppText>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <MessageThreadSheet
        booking={messagingBooking as any}
        userRole="host"
        onClose={() => setMessagingBooking(null)}
      />
    </View>
  );
}

function DetailRow({
  label, value, isRTL, colors,
}: {
  label: string;
  value: string;
  isRTL: boolean;
  colors: ReturnType<typeof import('@/hooks/useColors').useColors>;
}) {
  return (
    <View style={[detailStyles.row, isRTL ? detailStyles.rtlRow : null]}>
      <AppText variant="bodySm" color={colors.mutedForeground}>{label}</AppText>
      <AppText variant="bodySm" weight="bold" color={colors.foreground} align={isRTL ? 'left' : 'right'} style={{ flex: 1 }}>
        {value}
      </AppText>
    </View>
  );
}

export default function HostBookingsScreen() {
  return (
    <HostGate>
      <BookingsBody />
    </HostGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  rtlRow: { flexDirection: 'row-reverse' },
  tabsContainer: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  list: { padding: 16, paddingBottom: 48, gap: 12 },
  skeletons: { padding: 16, gap: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  cashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#F59E0B18',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaGap: { marginStart: 10 },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 2,
  },
  footerRight: { flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sheetActionBtn: { paddingVertical: 14 },
  collectCashBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#D97706',
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 32 },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetContent: { padding: 20, gap: 14 },
  campTitle: { marginBottom: 4 },
  section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  sectionLabel: { marginBottom: 4 },
  notesBox: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 4,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  messageGuestBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
});

const detailStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 3 },
  rtlRow: { flexDirection: 'row-reverse' },
});

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';


// Host accept routes through the authenticated server endpoint so ownership,
// booking state, and availability conflicts are all re-checked inside one
// server transaction (never a direct client-side status write).
const acceptBooking = async (bookingId: string) => {
  const idToken = await auth?.currentUser?.getIdToken();
  if (!idToken) throw new Error('Not signed in');
  const res = await fetch(
    `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/bookings/${bookingId}/accept`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || 'Request failed');
  }
};

const collectCash = async (bookingId: string) => {
  const idToken = await auth?.currentUser?.getIdToken();
  if (!idToken) throw new Error('Not signed in');
  const res = await fetch(
    `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/bookings/${bookingId}/collect-cash`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || 'Request failed');
  }
};

// Host-initiated cancellation / decline. Routes through the authenticated
// server endpoint so the server can apply the refund policy, initiate a Tap
// refund for paid online bookings, write the refund record, and release the
// availability slot atomically with idempotency guarantees.
const declineBooking = async (booking: HostBooking) => {
  const idToken = await auth?.currentUser?.getIdToken().catch(() => null) ?? null;
  if (!idToken) throw new Error('Not signed in');
  const res = await fetch(
    `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/bookings/${booking.id}/cancel`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ reason: 'Declined by host' }),
    },
  );
  const body = await res.json().catch(() => ({})) as { error?: string };
  if (!res.ok) throw new Error(body.error || 'Request failed');
};
