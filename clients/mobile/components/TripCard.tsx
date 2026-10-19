import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { Booking } from '@/lib/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { getLocationLabel } from '@/lib/locations';
import { getDepartureDate } from '@/lib/bookingDates';

const desertBanner = require('../assets/images/banner-desert.jpg');

interface Props {
  booking: Booking;
  onPayNow: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  onMessage: (booking: Booking) => void;
  paying: boolean;
  /** Manual re-check of a pending online payment with a stored charge. */
  onVerifyPayment?: (booking: Booking) => void;
  verifying?: boolean;
}

/** Unpaid online booking whose payment hold has lapsed. Display-only — the
 * client never cancels; the server/webhook owns booking state. */
export function isExpiredUnpaidOnline(booking: Booking): boolean {
  return (
    booking.status !== 'cancelled' &&
    booking.status !== 'confirmed' &&
    (booking as any).paymentMethod !== 'cash_on_arrival' &&
    (!booking.paymentStatus || ['pending', 'failed'].includes(String(booking.paymentStatus))) &&
    typeof (booking as any).expiresAt === 'number' &&
    (booking as any).expiresAt < Date.now()
  );
}

/** Ticking countdown (ms remaining) for a held online booking; null when not applicable. */
export function useHoldCountdown(booking: Booking): number | null {
  const expiresAt = (booking as any).expiresAt as number | undefined;
  const active =
    typeof expiresAt === 'number' &&
    booking.status === 'pending' &&
    (booking as any).paymentMethod !== 'cash_on_arrival' &&
    (!booking.paymentStatus || booking.paymentStatus === 'pending');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active || !expiresAt || expiresAt <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active, expiresAt]);
  if (!active || !expiresAt) return null;
  const left = expiresAt - now;
  return left > 0 ? left : null;
}

/**
 * Upcoming trip card — used in the Trips tab for upcoming bookings.
 * Shows thumbnail, two-column date layout, status badge, total, and actions.
 * A 4px left border color indicates the booking status at a glance.
 */
export function TripCard({ booking, onPayNow, onCancel, onMessage, paying, onVerifyPayment, verifying }: Props) {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const { isRTL } = useI18n();

  const img = booking.campImages?.[0] ? { uri: booking.campImages[0] } : desertBanner;

  const checkIn = new Date(booking.checkInDate);
  const checkOut = getDepartureDate(booking);

  const cashDue =
    booking.status !== 'cancelled' &&
    (booking as any).paymentMethod === 'cash_on_arrival' &&
    (!booking.paymentStatus || booking.paymentStatus === 'pending');

  const expired = isExpiredUnpaidOnline(booking);

  // A stored tapChargeId means a Tap charge is already in flight for this
  // booking. While the charge is pending we must not let the guest start a
  // second charge — show only "Verify Payment" until the outcome is known.
  const tapChargeInFlight =
    !!(booking as any).tapChargeId && booking.paymentStatus === 'pending';

  const canPay =
    !expired &&
    !tapChargeInFlight &&
    booking.status !== 'cancelled' &&
    (booking as any).paymentMethod !== 'cash_on_arrival' &&
    (!booking.paymentStatus ||
      ['pending', 'failed', 'cancelled', 'pending_verification'].includes(String(booking.paymentStatus)));

  // Manual verify action: pending online booking that already has a stored
  // Tap charge (payment may have succeeded but redirect back failed).
  const canVerify =
    !!onVerifyPayment &&
    booking.status !== 'cancelled' &&
    booking.status !== 'confirmed' &&
    (booking as any).paymentMethod !== 'cash_on_arrival' &&
    booking.paymentStatus !== 'paid' &&
    !!(booking as any).tapChargeId;

  let statusColor = colors.primary;
  let statusText = t('pending');
  let statusBg = colors.primary + '18';
  let borderAccent = colors.primary;

  if (booking.status === 'confirmed') {
    statusColor = colors.success;
    statusText = t('confirmed');
    statusBg = colors.successBg;
    borderAccent = colors.success;
  } else if (expired) {
    statusColor = colors.mutedForeground;
    statusText = t('expiredPaymentBadge');
    statusBg = colors.muted;
    borderAccent = colors.mutedForeground;
  } else if (booking.paymentStatus === 'failed') {
    statusColor = colors.destructive;
    statusText = t('paymentFailed');
    statusBg = colors.destructive + '18';
    borderAccent = colors.destructive;
  } else if ((booking as any).paymentMethod !== 'cash_on_arrival' && booking.paymentStatus === 'pending') {
    statusText = t('heldPaymentBadge');
  }

  // Live countdown for held online bookings (display-only)
  const holdMsLeft = useHoldCountdown(booking);
  if (holdMsLeft !== null && !expired && booking.status !== 'confirmed') {
    const mins = Math.floor(holdMsLeft / 60000);
    const secs = Math.floor((holdMsLeft % 60000) / 1000);
    statusText = `${t('heldPaymentBadge')} · ${mins}:${String(secs).padStart(2, '0')}`;
  }

  const dateOpts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };

  return (
    <PressableScale
      onPress={() => router.push(`/booking/${booking.id}` as any)}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        isRTL ? { borderRightWidth: 4, borderRightColor: borderAccent } : { borderLeftWidth: 4, borderLeftColor: borderAccent },
      ]}
      scaleTo={0.985}
    >
      {/* Top: thumbnail + camp info */}
      <View style={[styles.topRow, isRTL && styles.rtlRow]}>
        <Image
          source={img}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
        />
        <View style={[styles.infoCol, isRTL ? { paddingRight: 12, alignItems: 'flex-end' } : { paddingLeft: 12 }]}>
          <AppText variant="h3" numberOfLines={1}>{booking.campTitle}</AppText>
          <View style={[styles.locationRow, isRTL && styles.rtlRow]}>
            <Ionicons name="location" size={12} color={colors.primary} />
            <AppText
              variant="labelSm"
              color={colors.mutedForeground}
              style={{ marginLeft: 3 }}
              numberOfLines={1}
            >
              {getLocationLabel(booking.campLocation) || booking.campLocation}
            </AppText>
          </View>
          <View style={[styles.badgeRow, isRTL && styles.rtlRow]}>
            <View style={[styles.badge, { backgroundColor: statusBg }]}>
              <AppText variant="labelSm" color={statusColor}>{statusText}</AppText>
            </View>
            {cashDue && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: '#D9770615', flexDirection: 'row', alignItems: 'center', gap: 3 },
                ]}
              >
                <Ionicons name="cash-outline" size={11} color="#B45309" />
                <AppText variant="labelSm" color="#B45309">{t('cashDueBadge')}</AppText>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Date row */}
      <View style={[styles.dateRow, { borderTopColor: colors.border }, isRTL && styles.rtlRow]}>
        <View style={styles.dateCol}>
          <AppText variant="labelSm" color={colors.mutedForeground}>{t('checkInLabel')}</AppText>
          <AppText variant="label" weight="semibold" style={{ marginTop: 2 }}>
            {checkIn.toLocaleDateString(i18n.language, dateOpts)}
          </AppText>
        </View>

        <Ionicons
          name={isRTL ? 'arrow-back' : 'arrow-forward'}
          size={14}
          color={colors.mutedForeground}
          style={{ marginHorizontal: 10, marginTop: 14 }}
        />

        <View style={styles.dateCol}>
          <AppText variant="labelSm" color={colors.mutedForeground}>{t('checkOutLabel')}</AppText>
          <AppText variant="label" weight="semibold" style={{ marginTop: 2 }}>
            {checkOut.toLocaleDateString(i18n.language, dateOpts)}
          </AppText>
        </View>

        <View style={[styles.guestsPill, { backgroundColor: colors.muted }]}>
          <Ionicons name="people-outline" size={13} color={colors.mutedForeground} />
          <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginLeft: 4 }}>
            {booking.guests}
          </AppText>
        </View>
      </View>

      {/* Footer: total + actions */}
      <View
        style={[
          styles.footer,
          { borderTopColor: colors.border, backgroundColor: colors.muted + '40' },
          isRTL && styles.rtlRow,
        ]}
      >
        <View style={isRTL ? { alignItems: 'flex-end' } : {}}>
          <AppText variant="labelSm" color={colors.mutedForeground}>{t('total')}</AppText>
          <AppText variant="h3" weight="bold" style={{ marginTop: 2 }}>
            {(Number(booking.totalPrice) || 0).toFixed(3)} BHD
          </AppText>
        </View>

        <View style={[styles.actionRow, isRTL && styles.rtlRow]}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={() => onCancel(booking)}
            activeOpacity={0.75}
          >
            <AppText variant="labelSm" color={colors.destructive}>{t('cancel')}</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.msgBtn, { borderColor: colors.primary, backgroundColor: colors.primary + '18' }]}
            onPress={() => onMessage(booking)}
            activeOpacity={0.75}
          >
            <Ionicons name="chatbubbles-outline" size={15} color={colors.primary} />
          </TouchableOpacity>

          {canVerify && (
            <TouchableOpacity
              style={[styles.verifyBtn, { borderColor: colors.primary }, verifying && { opacity: 0.65 }]}
              onPress={() => onVerifyPayment!(booking)}
              disabled={verifying}
              activeOpacity={0.75}
            >
              <AppText variant="labelSm" weight="bold" color={colors.primary}>
                {verifying ? t('verifyingPaymentAction') : t('verifyPayment')}
              </AppText>
            </TouchableOpacity>
          )}

          {canPay && (
            <TouchableOpacity
              style={[styles.payBtn, { backgroundColor: colors.primary }, paying && { opacity: 0.65 }]}
              onPress={() => onPayNow(booking)}
              disabled={paying}
              activeOpacity={0.8}
            >
              <AppText variant="labelSm" weight="bold" color={colors.primaryForeground}>
                {paying ? t('startingPayment') : t('payNow')}
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  topRow: { flexDirection: 'row', padding: 16, alignItems: 'flex-start' },
  thumbnail: { width: 80, height: 80, borderRadius: 12 },
  infoCol: { flex: 1, justifyContent: 'flex-start' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  dateCol: { flex: 1 },
  guestsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cancelBtn: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  msgBtn: { paddingVertical: 9, paddingHorizontal: 11, borderRadius: 12, borderWidth: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  payBtn: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 12 },
  verifyBtn: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  rtlRow: { flexDirection: 'row-reverse' },
});
