import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useAuth } from '@/contexts/AuthContext';
import { getBookingById, getCampById, Booking } from '@/lib/firestore';
import { startTapPayment, verifyBookingPayment, notify } from '@/lib/payments';
import { CancelBookingSheet } from '@/components/CancelBookingSheet';
import { ReportIssueSheet } from '@/components/ReportIssueSheet';
import { getMyDisputes, GuestDisputeStatus } from '@/lib/disputes';
import { cancelBooking } from '@/lib/firestore';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { PageLoader } from '@/components/PageLoader';
import { getLocationLabel } from '@/lib/locations';
import { getDepartureDate, getNights } from '@/lib/bookingDates';
import {
  hasConfiguredTents,
  normalizeTentConfiguration,
  TentConfiguration,
} from '@/lib/tentConfiguration';

const desertBanner = require('../../assets/images/banner-desert.jpg');

function isPast(b: Booking) {
  const end = getDepartureDate(b);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end < today;
}

function paymentMethodLabel(method?: string, t?: any): string {
  // Use i18n keys for all translatable labels (M-1 audit fix).
  // Apple Pay / Google Pay are brand names — kept as-is per platform guidelines.
  if (!method) return t?.('paymentMethodOnline') ?? 'Online payment';
  if (method === 'cash_on_arrival') return t?.('paymentMethodCash') ?? 'Cash on arrival';
  if (method === 'apple_pay') return 'Apple Pay';
  if (method === 'google_pay') return 'Google Pay';
  if (method === 'card') return t?.('paymentMethodCard') ?? 'Card payment';
  if (method === 'online') return t?.('paymentMethodOnline') ?? 'Online payment';
  return t?.('paymentMethodCard') ?? 'Card payment';
}

export default function BookingDetailScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const { isRTL } = useI18n();
  const insets = useScreenInsets();
  const { user, userData } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [tentConfiguration, setTentConfiguration] = useState<TentConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<'processing' | 'failed' | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [reportTarget, setReportTarget] = useState<Booking | null>(null);
  const [myDispute, setMyDispute] = useState<GuestDisputeStatus | null>(null);

  useEffect(() => {
    if (!bookingId) { setLoading(false); return; }
    let active = true;

    void (async () => {
      try {
        const b = await getBookingById(bookingId);
        if (!active) return;

        let configuration = normalizeTentConfiguration(b?.tentConfiguration);
        if (!configuration && b?.campId) {
          try {
            const camp = await getCampById(b.campId);
            configuration = normalizeTentConfiguration(camp?.tentConfiguration);
          } catch {
            // The booking remains usable if the linked listing is unavailable.
          }
        }

        if (active) {
          setBooking(b);
          setTentConfiguration(configuration);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    // Best-effort: surface this booking's dispute resolution status.
    getMyDisputes().then(list => {
      if (!active) return;
      const match = list.find(d => d.bookingId === bookingId) ?? null;
      setMyDispute(match);
    }).catch(() => {});

    return () => {
      active = false;
    };
  }, [bookingId]);

  const handleVerifyPayment = async () => {
    if (!booking || verifying) return;
    const chargeId = (booking as any).tapChargeId;
    if (!chargeId) return;
    setVerifying(true);
    try {
      const r = await verifyBookingPayment(booking.id, chargeId);
      if (r.checked && r.settled) {
        setVerifyNotice(null);
        notify(t('paymentConfirmedMsg'), undefined, 'success');
        const fresh = await getBookingById(booking.id);
        if (fresh) setBooking(fresh);
      } else if (r.checked) {
        // Refresh booking so paymentStatus reflects any server-side update.
        const fresh = await getBookingById(booking.id);
        if (fresh) setBooking(fresh);
        const isFailed = (fresh ?? booking).paymentStatus === 'failed';
        setVerifyNotice(isFailed ? 'failed' : 'processing');
      } else {
        notify(t('verifyFailedMsg'), r.error, 'error');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handlePayNow = async () => {
    if (!booking || paying) return;
    setPaying(true);
    try {
      const r = await startTapPayment({
        bookingId: booking.id,
        amount: Number(booking.totalPrice) || 0,
        customerName: userData?.displayName || user?.email || 'Guest',
        customerEmail: user?.email || undefined,
      });
      if (!r.started) {
        if (r.reason === 'already_settled') {
          notify(t('alreadyPaidMsg'));
          const fresh = await getBookingById(booking.id);
          if (fresh) setBooking(fresh);
        } else {
          notify(t('paymentFailed'), r.error || t('couldNotStartPayment'), 'error');
        }
      }
    } finally {
      setPaying(false);
    }
  };

  const handleCancellation = async (b: Booking, reason: string) => {
    await cancelBooking(b.id, reason || 'Cancelled by guest from mobile app');
    notify(t('bookingCancelled'), undefined, 'success');
    const fresh = await getBookingById(b.id);
    if (fresh) setBooking(fresh);
    setCancelTarget(null);
  };

  const openInMaps = () => {
    const coords = (booking as any)?.coordinates as { lat: number; lng: number } | undefined;
    if (!coords) return;
    Linking.openURL(`https://maps.google.com/?q=${coords.lat},${coords.lng}`).catch(() => {});
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return <PageLoader />;
  }

  if (!booking) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnFallback}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Ionicons name="alert-circle-outline" size={48} color={colors.mutedForeground} />
        <AppText variant="h3" style={{ marginTop: 16 }}>{t('bookingNotFound')}</AppText>
        <PressableScale onPress={() => router.back()} style={[styles.fallbackBtn, { borderColor: colors.border }]}>
          <AppText variant="label">{t('goBack')}</AppText>
        </PressableScale>
      </View>
    );
  }

  // ── Derived state ────────────────────────────────────────────────────────
  const img = booking.campImages?.[0] ? { uri: booking.campImages[0] } : desertBanner;
  const checkIn = new Date(booking.checkInDate);
  const checkOut = getDepartureDate(booking);
  const nights = getNights(booking);
  const past = isPast(booking);
  const isCancelled = booking.status === 'cancelled';

  const cashOnArrival = (booking as any).paymentMethod === 'cash_on_arrival';
  const cashDue = !isCancelled && cashOnArrival && (!booking.paymentStatus || booking.paymentStatus === 'pending');
  const cashCollected = cashOnArrival && booking.paymentStatus === 'cash_collected';
  // Expired unpaid online booking: display-only — never cancelled client-side.
  const expiredUnpaid = !isCancelled && booking.status !== 'confirmed' && !cashOnArrival &&
    (!booking.paymentStatus || ['pending', 'failed'].includes(String(booking.paymentStatus))) &&
    typeof (booking as any).expiresAt === 'number' && (booking as any).expiresAt < Date.now();
  // A stored tapChargeId means a Tap charge is already in flight. While the
  // charge is pending we must not let the guest start a second charge — show
  // only "Verify Payment" until the outcome is known.
  const tapChargeInFlight =
    !!(booking as any).tapChargeId && booking.paymentStatus === 'pending';
  const canPay = !isCancelled && !past && !cashOnArrival && !expiredUnpaid && !tapChargeInFlight &&
    (!booking.paymentStatus || ['pending', 'failed', 'cancelled', 'pending_verification'].includes(String(booking.paymentStatus)));
  // Show verify when a Tap charge is in flight and the booking isn't settled.
  const canVerify =
    !isCancelled &&
    !past &&
    !cashOnArrival &&
    booking.status !== 'confirmed' &&
    booking.paymentStatus !== 'paid' &&
    !!(booking as any).tapChargeId;
  const canCancel = !isCancelled && !past;

  const hasCoords = !!(booking as any)?.coordinates?.lat;

  // Status colour
  let statusColor = colors.primary;
  let statusBg = colors.primary + '18';
  let statusText = t('pending');
  if (booking.status === 'confirmed') {
    statusColor = colors.success; statusBg = colors.successBg; statusText = t('confirmed');
  } else if (isCancelled) {
    statusColor = colors.destructive; statusBg = colors.destructive + '18'; statusText = t('cancelled');
  } else if (booking.status === 'completed') {
    statusColor = '#6B7280'; statusBg = '#6B728018'; statusText = t('completed');
  } else if (expiredUnpaid) {
    statusColor = colors.mutedForeground; statusBg = colors.muted; statusText = t('expiredPaymentBadge');
  } else if (booking.paymentStatus === 'failed') {
    statusColor = colors.destructive; statusBg = colors.destructive + '18'; statusText = t('paymentFailed');
  } else if (!cashOnArrival && booking.paymentStatus === 'pending' && booking.status === 'pending') {
    statusText = t('heldPaymentBadge');
  }

  const dateOpts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const serviceFee = Number(booking.serviceFee) || 0;
  const campFee = serviceFee > 0 ? Number(booking.totalPrice) - serviceFee : 0;

  const shortRef = booking.id.slice(-8).toUpperCase();
  const showTentConfiguration = hasConfiguredTents(tentConfiguration);
  const tentItems = showTentConfiguration
    ? [
        { key: 'large', count: tentConfiguration.large, label: t('largeTents'), icon: 'bed-outline' as const },
        { key: 'small', count: tentConfiguration.small, label: t('smallTents'), icon: 'home-outline' as const },
        {
          key: 'entertainment',
          count: tentConfiguration.entertainment,
          label: t('entertainmentTents'),
          icon: 'people-outline' as const,
        },
      ]
    : [];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        <View style={styles.hero}>
          <ImageBackground source={img} style={styles.heroImage} imageStyle={{ borderRadius: 0 }}>
            <LinearGradient
              colors={['rgba(10,17,40,0.55)', 'rgba(10,17,40,0.1)', 'transparent']}
              locations={[0, 0.4, 1]}
              style={StyleSheet.absoluteFill}
            />
            {/* Back button */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.backBtn, { top: insets.top + 12, [isRTL ? 'right' : 'left']: 16 }]}
            >
              <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#fff" />
            </TouchableOpacity>

            {/* Status badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusBg, bottom: 16, [isRTL ? 'left' : 'right']: 16 }]}>
              <AppText variant="labelSm" color={statusColor} weight="bold">{statusText}</AppText>
            </View>
          </ImageBackground>
        </View>

        {/* Main content card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

          {/* Camp name + location + ref */}
          <View style={styles.section}>
            <AppText variant="h2" weight="bold" numberOfLines={2}>{booking.campTitle}</AppText>
            <View style={[styles.row, { marginTop: 6 }, isRTL && styles.rtlRow]}>
              <Ionicons name="location" size={14} color={colors.primary} />
              <AppText variant="body" color={colors.mutedForeground} style={{ marginLeft: 4, flex: 1 }} numberOfLines={1}>
                {getLocationLabel(booking.campLocation) || booking.campLocation}
              </AppText>
            </View>
            <View style={[styles.row, { marginTop: 8 }, isRTL && styles.rtlRow]}>
              <Ionicons name="receipt-outline" size={14} color={colors.mutedForeground} />
              <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginLeft: 6 }}>
                {t('bookingRef')} #{shortRef}
              </AppText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Dates */}
          <View style={styles.section}>
            <AppText variant="label" weight="semibold" color={colors.mutedForeground} style={styles.sectionLabel}>
              {t('yourDates')}
            </AppText>
            <View style={[styles.datesRow, isRTL && styles.rtlRow]}>
              {/* Check-in */}
              <View style={[styles.dateBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <AppText variant="labelSm" color={colors.mutedForeground}>{t('checkInLabel')}</AppText>
                <AppText variant="h3" weight="bold" style={{ marginTop: 4 }}>{checkIn.getDate()}</AppText>
                <AppText variant="label" color={colors.mutedForeground}>
                  {checkIn.toLocaleDateString(i18n.language, { month: 'short', year: 'numeric' })}
                </AppText>
                <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginTop: 4 }}>
                  {checkIn.toLocaleDateString(i18n.language, { weekday: 'short' })}
                </AppText>
              </View>

              {/* Night count chip */}
              <View style={styles.nightsCol}>
                <View style={[styles.nightsPill, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                  <Ionicons name="moon" size={14} color={colors.primary} />
                  <AppText variant="labelSm" color={colors.primary} weight="bold" style={{ marginTop: 3 }}>
                    {nights}
                  </AppText>
                  <AppText variant="labelSm" color={colors.primary} style={{ fontSize: 12 }}>
                    {t('nights', { count: nights })}
                  </AppText>
                </View>
              </View>

              {/* Check-out */}
              <View style={[styles.dateBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <AppText variant="labelSm" color={colors.mutedForeground}>{t('checkOutLabel')}</AppText>
                <AppText variant="h3" weight="bold" style={{ marginTop: 4 }}>{checkOut.getDate()}</AppText>
                <AppText variant="label" color={colors.mutedForeground}>
                  {checkOut.toLocaleDateString(i18n.language, { month: 'short', year: 'numeric' })}
                </AppText>
                <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginTop: 4 }}>
                  {checkOut.toLocaleDateString(i18n.language, { weekday: 'short' })}
                </AppText>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Guests + arrival time */}
          <View style={styles.section}>
            <View style={[styles.infoRow, isRTL && styles.rtlRow]}>
              <View style={[styles.infoIconCircle, { backgroundColor: colors.muted }]}>
                <Ionicons name="people-outline" size={18} color={colors.foreground} />
              </View>
              <View style={[styles.infoText, isRTL ? { alignItems: 'flex-end' } : {}]}>
                <AppText variant="labelSm" color={colors.mutedForeground}>{t('guests')}</AppText>
                <AppText variant="label" weight="semibold" style={{ marginTop: 1 }}>
                  {booking.guests} {t('guests')}
                </AppText>
              </View>
            </View>

            {booking.arrivalTime ? (
              <View style={[styles.infoRow, { marginTop: 16 }, isRTL && styles.rtlRow]}>
                <View style={[styles.infoIconCircle, { backgroundColor: colors.muted }]}>
                  <Ionicons name="time-outline" size={18} color={colors.foreground} />
                </View>
                <View style={[styles.infoText, isRTL ? { alignItems: 'flex-end' } : {}]}>
                  <AppText variant="labelSm" color={colors.mutedForeground}>{t('arrivalTime')}</AppText>
                  <AppText variant="label" weight="semibold" style={{ marginTop: 1 }}>{booking.arrivalTime}</AppText>
                </View>
              </View>
            ) : null}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {showTentConfiguration ? (
            <>
              <View style={styles.section}>
                <AppText variant="label" weight="semibold" color={colors.mutedForeground} style={styles.sectionLabel}>
                  {t('tentConfig')}
                </AppText>
                <AppText variant="body" color={colors.mutedForeground} style={styles.tentDescription}>
                  {t('bookingTentConfigDescription')}
                </AppText>
                <View style={[styles.tentGrid, isRTL && styles.rtlRow]}>
                  {tentItems.map(item => (
                    <View
                      key={item.key}
                      style={[styles.tentItem, { backgroundColor: colors.muted, borderColor: colors.border }]}
                    >
                      <Ionicons name={item.icon} size={20} color={colors.primary} />
                      <AppText variant="h3" weight="bold" style={styles.tentCount}>
                        {item.count}
                      </AppText>
                      <AppText
                        variant="labelSm"
                        color={colors.mutedForeground}
                        align="center"
                        style={styles.tentLabel}
                      >
                        {item.label}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </>
          ) : null}

          {/* Payment */}
          <View style={styles.section}>
            <AppText variant="label" weight="semibold" color={colors.mutedForeground} style={styles.sectionLabel}>
              {t('paymentDetails')}
            </AppText>

            {/* Method */}
            <View style={[styles.infoRow, isRTL && styles.rtlRow]}>
              <View style={[styles.infoIconCircle, { backgroundColor: colors.muted }]}>
                <Ionicons
                  name={cashOnArrival ? 'cash-outline' : 'card-outline'}
                  size={18}
                  color={colors.foreground}
                />
              </View>
              <View style={[styles.infoText, isRTL ? { alignItems: 'flex-end' } : {}]}>
                <AppText variant="labelSm" color={colors.mutedForeground}>{t('paymentMethod')}</AppText>
                <AppText variant="label" weight="semibold" style={{ marginTop: 1 }}>
                  {paymentMethodLabel(booking.paymentMethod, t)}
                </AppText>
              </View>
              {/* Payment status pill */}
              <View style={[styles.payStatusPill, {
                backgroundColor:
                  booking.paymentStatus === 'paid' ? colors.successBg :
                  booking.paymentStatus === 'refunded' ? colors.successBg :
                  cashCollected ? colors.successBg :
                  booking.paymentStatus === 'failed' ? colors.destructive + '18' :
                  colors.primary + '18',
              }]}>
                <AppText variant="labelSm" color={
                  booking.paymentStatus === 'paid' || booking.paymentStatus === 'refunded' || cashCollected ? colors.success :
                  booking.paymentStatus === 'failed' ? colors.destructive :
                  colors.primary
                } weight="semibold">
                  {booking.paymentStatus === 'paid' ? t('paymentPaid') :
                   booking.paymentStatus === 'refunded' ? t('refundedBadge') :
                   cashCollected ? t('hostCashCollectedBadge') :
                   booking.paymentStatus === 'failed' ? t('paymentFailed') :
                   cashDue ? t('cashDueBadge') :
                   t('pending')}
                </AppText>
              </View>
            </View>

            {/* Price breakdown */}
            <View style={[styles.priceBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              {campFee > 0 && (
                <View style={[styles.priceRow, isRTL && styles.rtlRow]}>
                  <AppText variant="body" color={colors.mutedForeground}>{t('campFee')}</AppText>
                  <AppText variant="body">{campFee.toFixed(3)} BHD</AppText>
                </View>
              )}
              {serviceFee > 0 && (
                <View style={[styles.priceRow, isRTL && styles.rtlRow]}>
                  <AppText variant="body" color={colors.mutedForeground}>{t('serviceFeeLabel')}</AppText>
                  <AppText variant="body">{serviceFee.toFixed(3)} BHD</AppText>
                </View>
              )}
              <View style={[styles.priceRowTotal, { borderTopColor: colors.border }, isRTL && styles.rtlRow]}>
                <AppText variant="label" weight="bold">{t('total')}</AppText>
                <AppText variant="h3" weight="bold" color={colors.primary}>
                  {(Number(booking.totalPrice) || 0).toFixed(3)} BHD
                </AppText>
              </View>
            </View>

            {/* Payment processing / terminal-failure inline notice */}
            {verifyNotice === 'processing' && (
              <View style={[styles.verifyNotice, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '40' }]}>
                <Ionicons name="time-outline" size={16} color={colors.primary} style={{ marginTop: 1 }} />
                <AppText variant="labelSm" color={colors.primary} style={{ flex: 1, lineHeight: 20 }}>
                  {t('paymentStillProcessingNotice')}
                </AppText>
              </View>
            )}
            {verifyNotice === 'failed' && (
              <View style={[styles.verifyNotice, { backgroundColor: colors.destructive + '12', borderColor: colors.destructive + '40' }]}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} style={{ marginTop: 1 }} />
                <AppText variant="labelSm" color={colors.destructive} style={{ flex: 1, lineHeight: 20 }}>
                  {t('paymentTerminalFailureNotice')}
                </AppText>
              </View>
            )}

            {/* Refund status row — shown on cancelled paid online bookings */}
            {isCancelled && (booking as any).refundStatus && (booking as any).refundStatus !== 'not_applicable' && (
              <View style={[styles.refundRow, { borderColor: colors.border }, isRTL && styles.rtlRow]}>
                <AppText variant="labelSm" color={colors.mutedForeground}>{t('refundStatus')}</AppText>
                <View style={[styles.refundPill, {
                  backgroundColor: (booking as any).refundStatus === 'refunded'
                    ? colors.successBg
                    : colors.primary + '18',
                  borderColor: (booking as any).refundStatus === 'refunded'
                    ? colors.success
                    : colors.primary + '60',
                }]}>
                  <AppText variant="labelSm" weight="semibold" color={
                    (booking as any).refundStatus === 'refunded' ? colors.success : colors.primary
                  }>
                    {(booking as any).refundStatus === 'refunded'
                      ? t('refundedBadge')
                      : t('refundProcessing')}
                  </AppText>
                </View>
                {(booking as any).refundAmount > 0 && (
                  <AppText variant="labelSm" weight="bold" color={colors.foreground}>
                    {(Number((booking as any).refundAmount) || 0).toFixed(3)} BHD
                  </AppText>
                )}
              </View>
            )}
          </View>

          {/* Special requests */}
          {booking.specialRequests ? (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.section}>
                <AppText variant="label" weight="semibold" color={colors.mutedForeground} style={styles.sectionLabel}>
                  {t('specialRequests')}
                </AppText>
                <View style={[styles.requestBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <AppText variant="body" style={{ lineHeight: 22 }}>{booking.specialRequests}</AppText>
                </View>
              </View>
            </>
          ) : null}

          {/* Quick links */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={[styles.section, styles.quickLinks]}>
            <TouchableOpacity
              style={[styles.quickLink, { borderColor: colors.border }, isRTL && styles.rtlRow]}
              onPress={() => router.push(`/camp/${booking.campId}`)}
              activeOpacity={0.75}
            >
              <Ionicons name="home-outline" size={18} color={colors.foreground} />
              <AppText variant="labelSm" style={{ marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0, flex: 1 }}>
                {t('viewListing')}
              </AppText>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            {hasCoords && (
              <TouchableOpacity
                style={[styles.quickLink, { borderColor: colors.border }, isRTL && styles.rtlRow]}
                onPress={openInMaps}
                activeOpacity={0.75}
              >
                <Ionicons name="navigate-outline" size={18} color={colors.foreground} />
                <AppText variant="labelSm" style={{ marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0, flex: 1 }}>
                  {t('getDirections')}
                </AppText>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}

            {myDispute?.status === 'resolved' && (
              <View style={[styles.quickLink, { borderColor: colors.success, backgroundColor: colors.successBg }, isRTL && styles.rtlRow]}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                <AppText variant="labelSm" color={colors.success} style={{ marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0, flex: 1, lineHeight: 18 }}>
                  {t('disputeResolvedNotice')}
                </AppText>
              </View>
            )}

            {past && !isCancelled && myDispute?.status !== 'resolved' && (
              <TouchableOpacity
                style={[styles.quickLink, { borderColor: colors.border }, isRTL && styles.rtlRow]}
                onPress={() => setReportTarget(booking)}
                activeOpacity={0.75}
              >
                <Ionicons name="flag-outline" size={18} color={colors.destructive} />
                <AppText variant="labelSm" style={{ marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0, flex: 1 }}>
                  {t('reportIssueBtn')}
                </AppText>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky footer actions */}
      {(canPay || canVerify || canCancel) && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 20),
            },
            isRTL && styles.rtlRow,
          ]}
        >
          {canCancel && (
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => setCancelTarget(booking)}
              activeOpacity={0.8}
            >
              <AppText variant="label" color={colors.destructive} weight="semibold">{t('cancel')}</AppText>
            </TouchableOpacity>
          )}
          {/* When a Tap charge is in flight, show only Verify — never both buttons at once */}
          {canVerify && !canPay && (
            <PressableScale
              onPress={handleVerifyPayment}
              style={[styles.payBtn, { backgroundColor: colors.primary + '18', borderWidth: 1, borderColor: colors.primary }, verifying && { opacity: 0.65 }]}
            >
              <AppText variant="label" weight="bold" color={colors.primary}>
                {verifying ? t('verifyingPaymentAction') : t('verifyPayment')}
              </AppText>
            </PressableScale>
          )}
          {canPay && (
            <PressableScale
              onPress={handlePayNow}
              style={[styles.payBtn, { backgroundColor: colors.primary }, paying && { opacity: 0.65 }]}
            >
              <AppText variant="label" weight="bold" color={colors.primaryForeground}>
                {paying ? t('startingPayment') : `${t('payNow')} · ${(Number(booking.totalPrice) || 0).toFixed(3)} BHD`}
              </AppText>
            </PressableScale>
          )}
        </View>
      )}

      <CancelBookingSheet
        booking={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancellation}
      />

      <ReportIssueSheet
        booking={reportTarget}
        onClose={() => setReportTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },

  hero: { width: '100%' },
  heroImage: { height: 280, justifyContent: 'flex-end' },
  backBtn: {
    position: 'absolute',
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(10,17,40,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnFallback: { position: 'absolute', top: 20, left: 16, padding: 8 },
  statusBadge: {
    position: 'absolute',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },

  card: {
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  section: { padding: 20 },
  sectionLabel: { marginBottom: 14, textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.6 },
  divider: { height: 1, marginHorizontal: 0 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rtlRow: { flexDirection: 'row-reverse' },

  // Dates
  datesRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  nightsCol: { alignItems: 'center', justifyContent: 'center' },
  nightsPill: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
  },

  // Info rows
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  infoIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1 },

  // Tent configuration
  tentDescription: { marginTop: -6, marginBottom: 14 },
  tentGrid: { flexDirection: 'row', gap: 10 },
  tentItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  tentCount: { marginTop: 6 },
  tentLabel: { marginTop: 3, lineHeight: 16 },

  // Payment
  payStatusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  priceBox: { marginTop: 16, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  priceRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  refundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  refundPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  verifyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },

  // Special requests
  requestBox: { borderRadius: 16, borderWidth: 1, padding: 16 },

  // Quick links
  quickLinks: { gap: 0, paddingTop: 8, paddingBottom: 8 },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  payBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },

  fallbackBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
});
