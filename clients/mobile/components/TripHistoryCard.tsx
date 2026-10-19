import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
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
import { ExistingReview } from '@/hooks/useBookingReview';

interface Props {
  booking: Booking;
  existingReview: ExistingReview | null;
  onRateStay: (booking: Booking) => void;
}

/**
 * Compact history card for past stays.
 * Shows camp + dates in a single row, refund status if applicable,
 * and a review strip at the bottom:
 *  – "Rate your stay" prompt (empty stars) when no review exists
 *  – "Edit review" strip (filled stars + rating) when a review exists
 */
export function TripHistoryCard({ booking, existingReview, onRateStay }: Props) {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const { isRTL } = useI18n();

  const checkIn = new Date(booking.checkInDate);
  const checkOut = getDepartureDate(booking);
  const isRefunded = booking.paymentStatus === 'refunded';
  const showStrip = booking.status !== 'cancelled';

  return (
    <PressableScale
      onPress={() => router.push(`/booking/${booking.id}` as any)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      scaleTo={0.985}
    >
      <View style={[styles.topRow, isRTL && styles.rtlRow]}>
        {/* Camp info */}
        <View style={[styles.infoCol, isRTL ? { alignItems: 'flex-end' } : {}]}>
          <AppText variant="label" weight="semibold" numberOfLines={1}>
            {booking.campTitle}
          </AppText>
          <View style={[styles.locationRow, isRTL && styles.rtlRow]}>
            <Ionicons name="location-outline" size={12} color={colors.primary} />
            <AppText
              variant="labelSm"
              color={colors.mutedForeground}
              style={{ marginLeft: 3 }}
              numberOfLines={1}
            >
              {getLocationLabel(booking.campLocation) || booking.campLocation}
            </AppText>
          </View>
        </View>

        {/* Right: price + dates + refund badge */}
        <View style={[styles.rightCol, isRTL ? { alignItems: 'flex-start' } : { alignItems: 'flex-end' }]}>
          <AppText variant="label" weight="bold">
            {(Number(booking.totalPrice) || 0).toFixed(3)} BHD
          </AppText>
          <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginTop: 3 }}>
            {checkIn.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
            {'  –  '}
            {checkOut.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })}
          </AppText>
          {isRefunded && (
            <View style={[styles.refundBadge, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="checkmark-circle" size={11} color="#10B981" />
              <AppText variant="labelSm" color="#10B981" style={{ marginLeft: 3 }}>
                {t('refundedBadge')}
              </AppText>
            </View>
          )}
        </View>
      </View>

      {/* Review strip */}
      {showStrip && (
        <TouchableOpacity
          style={[styles.reviewStrip, { borderTopColor: colors.border }]}
          onPress={() => onRateStay(booking)}
          activeOpacity={0.75}
        >
          {existingReview ? (
            /* ── Edit-review variant: filled stars + label ── */
            <>
              <View style={[styles.starsRow, isRTL && styles.rtlRow]}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Ionicons
                    key={star}
                    name={star <= existingReview.rating ? 'star' : 'star-outline'}
                    size={16}
                    color={star <= existingReview.rating ? colors.primary : colors.mutedForeground}
                    style={{ marginRight: isRTL ? 0 : 2, marginLeft: isRTL ? 2 : 0 }}
                  />
                ))}
              </View>
              <AppText
                variant="labelSm"
                color={colors.mutedForeground}
                style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}
              >
                {t('editReview')}
              </AppText>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={14}
                color={colors.mutedForeground}
                style={{ marginLeft: isRTL ? 0 : 'auto', marginRight: isRTL ? 'auto' : 0 } as any}
              />
            </>
          ) : (
            /* ── Rate-your-stay variant: empty stars ── */
            <>
              <View style={[styles.starsRow, isRTL && styles.rtlRow]}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Ionicons
                    key={star}
                    name="star"
                    size={18}
                    color={colors.primary}
                    style={{ marginRight: isRTL ? 0 : 3, marginLeft: isRTL ? 3 : 0 }}
                  />
                ))}
              </View>
              <AppText
                variant="labelSm"
                color={colors.mutedForeground}
                style={{ marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0 }}
              >
                {t('rateYourStay')}
              </AppText>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={14}
                color={colors.mutedForeground}
                style={{ marginLeft: isRTL ? 0 : 'auto', marginRight: isRTL ? 'auto' : 0 } as any}
              />
            </>
          )}
        </TouchableOpacity>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  infoCol: { flex: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rightCol: {},
  refundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  reviewStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
  rtlRow: { flexDirection: 'row-reverse' },
});
