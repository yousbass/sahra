import React from 'react';
import {
  View, StyleSheet, ImageBackground, TouchableOpacity, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { Booking } from '@/lib/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { getLocationLabel } from '@/lib/locations';
import { getDepartureDate, getNights } from '@/lib/bookingDates';
import { isExpiredUnpaidOnline, useHoldCountdown } from './TripCard';

const desertBanner = require('../assets/images/banner-desert.jpg');

interface Props {
  booking: Booking;
  onPayNow: (booking: Booking) => void;
  paying: boolean;
  /** Manual re-check of a pending online payment with a stored charge. */
  onVerifyPayment?: (booking: Booking) => void;
  verifying?: boolean;
}

function countdownLabel(checkInDate: string, t: ReturnType<typeof useTranslation>['t']) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkIn = new Date(checkInDate);
  checkIn.setHours(0, 0, 0, 0);
  const diff = Math.round((checkIn.getTime() - today.getTime()) / 86_400_000);
  if (diff <= 0) return { label: t('checkInToday'), green: true };
  if (diff === 1) return { label: t('checkInTomorrow'), green: false };
  return { label: t('inDays', { count: diff }), green: false };
}

function nightsLabel(booking: Booking, t: ReturnType<typeof useTranslation>['t']) {
  return t('nights', { count: getNights(booking) });
}

export function TripHeroCard({ booking, onPayNow, paying, onVerifyPayment, verifying }: Props) {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const { isRTL } = useI18n();

  const img = booking.campImages?.[0] ? { uri: booking.campImages[0] } : desertBanner;
  const checkIn = new Date(booking.checkInDate);
  const checkOut = getDepartureDate(booking);
  const { label: cdLabel, green: cdGreen } = countdownLabel(booking.checkInDate, t);

  const expired = isExpiredUnpaidOnline(booking);
  const holdMsLeft = useHoldCountdown(booking);

  // A stored tapChargeId means a Tap charge is already in flight. While the
  // charge is pending we suppress "Pay Now" and show only "Verify Payment"
  // so the guest cannot accidentally start a second charge.
  const tapChargeInFlight =
    !!(booking as any).tapChargeId && booking.paymentStatus === 'pending';

  const needsPayment =
    !expired &&
    !tapChargeInFlight &&
    booking.status !== 'cancelled' &&
    (booking as any).paymentMethod !== 'cash_on_arrival' &&
    (!booking.paymentStatus ||
      ['pending', 'failed', 'cancelled'].includes(String(booking.paymentStatus)));

  const canVerify =
    !!onVerifyPayment &&
    booking.status !== 'cancelled' &&
    booking.status !== 'confirmed' &&
    (booking as any).paymentMethod !== 'cash_on_arrival' &&
    booking.paymentStatus !== 'paid' &&
    !!(booking as any).tapChargeId;

  const coords = (booking as any).coordinates as { lat: number; lng: number } | undefined;
  const openDirections = () => {
    if (!coords) return;
    Linking.openURL(`https://maps.google.com/?q=${coords.lat},${coords.lng}`).catch(() => {});
  };

  const dateOpts: Intl.DateTimeFormatOptions = {
    weekday: 'short', day: 'numeric', month: 'short',
  };

  return (
    <View style={styles.wrapper}>
      {/* Hero image card */}
      <PressableScale
        onPress={() => router.push(`/booking/${booking.id}` as any)}
        style={styles.imageCard}
        scaleTo={0.985}
      >
        <ImageBackground source={img} style={styles.image} imageStyle={{ borderRadius: 20 }}>
          <LinearGradient
            colors={['transparent', 'rgba(10,17,40,0.78)', 'rgba(10,17,40,0.96)']}
            locations={[0.2, 0.65, 1]}
            style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          />

          {/* Countdown badge */}
          <View
            style={[
              styles.countdownBadge,
              { backgroundColor: cdGreen ? colors.success : '#F0A03C' },
              isRTL ? { left: 16, right: undefined } : { right: 16 },
            ]}
          >
            <AppText
              variant="labelSm"
              weight="bold"
              color={cdGreen ? colors.successForeground : '#0A1128'}
            >
              {cdLabel}
            </AppText>
          </View>

          <View style={styles.content}>
            {/* Location */}
            <View style={[styles.locationRow, isRTL && styles.rtlRow]}>
              <Ionicons name="location" size={12} color="rgba(255,255,255,0.6)" />
              <AppText variant="labelSm" color="rgba(255,255,255,0.6)" style={{ marginLeft: 4 }} numberOfLines={1}>
                {getLocationLabel(booking.campLocation) || booking.campLocation}
              </AppText>
            </View>

            {/* Camp name */}
            <AppText variant="h2" weight="bold" color="#fff" numberOfLines={2} style={styles.title}>
              {booking.campTitle}
            </AppText>

            {/* Date columns */}
            <View style={[styles.dateRow, isRTL && styles.rtlRow]}>
              <View style={styles.dateCol}>
                <AppText variant="labelSm" color="rgba(255,255,255,0.45)">{t('checkInLabel')}</AppText>
                <AppText variant="label" weight="semibold" color="#fff" style={{ marginTop: 2 }}>
                  {checkIn.toLocaleDateString(i18n.language, dateOpts)}
                </AppText>
              </View>

              <Ionicons
                name={isRTL ? 'arrow-back' : 'arrow-forward'}
                size={14}
                color="rgba(255,255,255,0.3)"
                style={{ marginHorizontal: 12, marginTop: 14 }}
              />

              <View style={styles.dateCol}>
                <AppText variant="labelSm" color="rgba(255,255,255,0.45)">{t('checkOutLabel')}</AppText>
                <AppText variant="label" weight="semibold" color="#fff" style={{ marginTop: 2 }}>
                  {checkOut.toLocaleDateString(i18n.language, dateOpts)}
                </AppText>
              </View>

              <View style={[styles.nightsPill, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                <AppText variant="labelSm" color="rgba(255,255,255,0.75)">
                  {nightsLabel(booking, t)}
                </AppText>
              </View>
            </View>
          </View>
        </ImageBackground>
      </PressableScale>

      {/* Held online booking — visible payment-window countdown */}
      {holdMsLeft !== null && !expired && booking.status !== 'confirmed' && (
        <View style={[styles.expiredBadge, { backgroundColor: colors.primary + '18' }, isRTL && styles.rtlRow]}>
          <Ionicons name="hourglass-outline" size={14} color={colors.primary} />
          <AppText variant="labelSm" weight="bold" color={colors.primary} style={{ marginHorizontal: 6 }}>
            {t('heldPaymentBadge')} · {Math.floor(holdMsLeft / 60000)}:{String(Math.floor((holdMsLeft % 60000) / 1000)).padStart(2, '0')}
          </AppText>
        </View>
      )}

      {/* Expired unpaid online booking — display-only; server owns state */}
      {expired && (
        <View style={[styles.expiredBadge, { backgroundColor: colors.muted }, isRTL && styles.rtlRow]}>
          <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
          <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginHorizontal: 6 }}>
            {t('expiredPaymentBadge')}
          </AppText>
        </View>
      )}

      {/* Action buttons below card */}
      <View style={[styles.actionsRow, isRTL && styles.rtlRow]}>
        {needsPayment ? (
          <>
            <PressableScale
              onPress={() => onPayNow(booking)}
              style={[styles.payBtn, { backgroundColor: colors.primary }, paying && { opacity: 0.65 }]}
            >
              <AppText variant="label" weight="bold" color={colors.primaryForeground}>
                {paying ? t('startingPayment') : t('payNow')}
              </AppText>
            </PressableScale>
            {canVerify && (
              <TouchableOpacity
                style={[styles.ghostBtn, { borderColor: colors.primary }, verifying && { opacity: 0.65 }]}
                onPress={() => onVerifyPayment!(booking)}
                disabled={verifying}
                activeOpacity={0.75}
              >
                <AppText variant="labelSm" weight="bold" color={colors.primary}>
                  {verifying ? t('verifyingPaymentAction') : t('verifyPayment')}
                </AppText>
              </TouchableOpacity>
            )}
          </>
        ) : canVerify ? (
          <TouchableOpacity
            style={[styles.ghostBtn, { borderColor: colors.primary }, verifying && { opacity: 0.65 }]}
            onPress={() => onVerifyPayment!(booking)}
            disabled={verifying}
            activeOpacity={0.75}
          >
            <AppText variant="labelSm" weight="bold" color={colors.primary}>
              {verifying ? t('verifyingPaymentAction') : t('verifyPayment')}
            </AppText>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.ghostBtn, { borderColor: colors.border }]}
              onPress={openDirections}
              activeOpacity={0.75}
            >
              <Ionicons name="navigate-outline" size={15} color={colors.foreground} />
              <AppText variant="labelSm" style={{ marginLeft: 6 }}>{t('getDirections')}</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ghostBtn, { borderColor: colors.border }]}
              onPress={() => router.push(`/camp/${booking.campId}`)}
              activeOpacity={0.75}
            >
              <Ionicons name="chatbubble-outline" size={15} color={colors.foreground} />
              <AppText variant="labelSm" style={{ marginLeft: 6 }}>{t('contactHost')}</AppText>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 20, marginBottom: 4 },
  imageCard: { borderRadius: 20, overflow: 'hidden' },
  image: { height: 248, justifyContent: 'flex-end' },
  countdownBadge: {
    position: 'absolute',
    top: 16,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
  },
  content: { padding: 20 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  title: { marginBottom: 18 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dateCol: { flex: 1 },
  nightsPill: {
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 8,
    marginBottom: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  payBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  ghostBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  rtlRow: { flexDirection: 'row-reverse' },
});
