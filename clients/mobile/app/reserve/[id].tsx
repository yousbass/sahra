import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import {
  getCampById,
  Camp,
  createBookingWithLock,
  getCampBookedDates,
  getBlockedDates,
  hasUserBookingOnDate,
  sendBookingEmails,
  notifyHostNewBooking,
  updateUserProfile,
} from '@/lib/firestore';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { startTapPayment, notify } from '@/lib/payments';
import { goBack } from '@/lib/nav';
import { AppText } from '@/components/AppText';
import { CampfireLoader } from '@/components/CampfireLoader';
import { SaduDivider } from '@/components/SaduDivider';
import { PressableScale } from '@/components/PressableScale';
import { Calendar } from '@/components/Calendar';
import { resolveCancellationTier } from '@/lib/policyUtils';
import { getNightlyRateForDate } from '@/lib/peakPricing';
import { normalizeTentConfiguration } from '@/lib/tentConfiguration';

// Same conversion the web Reserve page uses: '08:00 AM' -> '08:00', '03:00 PM' -> '15:00'
const convertTo24Hour = (time12: string): string => {
  const match = time12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return time12.trim();
  let h = parseInt(match[1], 10);
  const m = match[2];
  const period = match[3]?.toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
};

export default function ReserveScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useScreenInsets();
  const { isRTL } = useI18n();
  const { user, userData } = useAuth();

  // Phone already on the profile (collected at signup or a previous booking):
  // don't ask again — it's reused for the booking so hosts can still call.
  const profilePhoneDigits = (userData?.phone || '').replace(/\D/g, '');
  const hasProfilePhone = profilePhoneDigits.length >= 8 && profilePhoneDigits.length <= 15;

  const [camp, setCamp] = useState<Camp | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [blockedDates, setBlockedDates] = useState<{ start: Date; end: Date }[]>([]);
  // Starts true (unconfirmed) — calendar is non-interactive until freshness is confirmed.
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityLoadError, setAvailabilityLoadError] = useState(false);

  // Booking details — same fields the website collects
  const [guests, setGuests] = useState(2);
  const [arrivalTime, setArrivalTime] = useState('08:00');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash_on_arrival'>('online');

  useEffect(() => {
    if (!user) {
      router.replace('/auth');
      return;
    }

    if (id) {
      const loadData = async () => {
        // Camp is the critical piece — a failure here shows "Not found".
        const campData = await getCampById(id as string).catch((e) => {
          console.log('[reserve] camp load failed', e);
          return null;
        });
        setCamp(campData);
        setLoading(false);
        // Load availability separately (retryable via loadAvailability).
        loadAvailability(id as string);
      };
      loadData();
    }
  }, [id, user]);

  // Extracted so guests can retry after a failure without reloading the page.
  // Starts as loading (unconfirmed); calendar and book button are locked
  // until both reads succeed. Either read failure triggers the retryable error.
  const loadAvailability = async (campId: string) => {
    setAvailabilityLoadError(false);
    setAvailabilityLoading(true);
    try {
      // Both reads must succeed — a blocked-dates failure is also surfaced
      // as a retryable availability error rather than silently omitting ranges.
      const [bookedDateList, blocks] = await Promise.all([
        getCampBookedDates(campId),
        getBlockedDates(campId),
      ]);
      setBookedDates(bookedDateList);
      const bBlocks = blocks.map((b: { startDate: string; endDate: string }) => {
        const [sy, sm, sd] = b.startDate.split('T')[0].split('-').map(Number);
        const [ey, em, ed] = b.endDate.split('T')[0].split('-').map(Number);
        return {
          start: new Date(sy, sm - 1, sd),
          end: new Date(ey, em - 1, ed, 23, 59, 59),
        };
      });
      setBlockedDates(bBlocks);
    } catch (e) {
      console.log('[reserve] availability load failed', e);
      setAvailabilityLoadError(true);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handlePayment = async (bookingId: string, amount: number) => {
    const r = await startTapPayment({
      bookingId,
      amount,
      customerName: userData?.displayName || user?.email || 'Guest',
      customerEmail: user?.email || undefined,
    });
    if (!r.started) {
      notify(t('paymentFailed'), r.error || t('couldNotStartPayment'), 'error');
    }
  };

  const checkAvailability = async (dateStr: string) => {
    // Check host-blocked ranges (publicly readable).
    try {
      const blocks = await getBlockedDates(camp!.id);
      const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
      const dateTime = new Date(y, m - 1, d).getTime();
      const isBlocked = blocks.some(b => {
        const [sy, sm, sd] = b.startDate.split('T')[0].split('-').map(Number);
        const [ey, em, ed] = b.endDate.split('T')[0].split('-').map(Number);
        const s = new Date(sy, sm - 1, sd).getTime();
        const e = new Date(ey, em - 1, ed, 23, 59, 59).getTime();
        return dateTime >= s && dateTime <= e;
      });
      if (isBlocked) return false;
    } catch {
      return false;
    }

    // Check the public campAvailability index (allow read: if true) — no
    // permission errors possible. createBookingWithLock's atomic lock is
    // still the definitive guard against concurrent races.
    try {
      const booked = await getCampBookedDates(camp!.id);
      const [y, m, d] = dateStr.split('-').map(Number);
      const selected = new Date(y, m - 1, d).getTime();
      const isBooked = booked.some(dt => dt.getTime() === selected);
      if (isBooked) return false;
    } catch {
      return false;
    }

    return true;
  };

  const maxGuests = camp && camp.maxGuests > 0 ? camp.maxGuests : 99;

  const validatePhone = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return t('phoneRequired');
    if (digits.length < 8 || digits.length > 15) return t('phoneInvalid');
    return '';
  };

  const handleBook = async () => {
    if (!camp || !user || !selectedDate) return;

    // Arrival time is optional, but if the guest typed something it must be
    // HH:MM — previously an invalid value was silently dropped from the
    // booking (Audit v4 M-4), so the host never saw the time the guest
    // believed they had submitted.
    const arrivalTrimmed = arrivalTime.trim();
    if (arrivalTrimmed && !/^\d{1,2}:\d{2}$/.test(arrivalTrimmed)) {
      notify(t('arrivalTimeInvalid'), undefined, 'error');
      return;
    }

    // Same phone validation as the website (required, 8-15 digits).
    // Skipped when the profile already has a usable phone number.
    if (!hasProfilePhone) {
      const phoneErr = validatePhone(phoneNumber);
      if (phoneErr) {
        setPhoneError(phoneErr);
        // The phone field may be scrolled out of view when tapping the bottom
        // button, so surface the error as a toast too.
        notify(phoneErr, undefined, 'error');
        return;
      }
      // One-time save to the profile so future bookings never ask again.
      // Best-effort: a failure here must not block the booking.
      updateUserProfile(user.uid, { phone: phoneNumber.trim() }).catch(() => {});
    }

    setSubmitting(true);

    try {
      // Format as YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // Same one-booking-per-date guard as the website
      const alreadyBooked = await hasUserBookingOnDate(user.uid, dateStr);
      if (alreadyBooked) {
        notify(t('duplicateBookingMsg'), undefined, 'error');
        setSubmitting(false);
        return;
      }

      // Re-check availability right before booking
      const isAvailable = await checkAvailability(dateStr);
      if (!isAvailable) {
        notify(t('dateUnavailable'), undefined, 'error');
        setSubmitting(false);
        return;
      }

      // Single-day booking: the applicable nightly rate is the rate for the
      // selected date (holiday > weekend > standard).
      const basePrice = getNightlyRateForDate(camp, selectedDate).rate;
      const serviceFee = basePrice * 0.10;
      const total = basePrice + serviceFee;

      // Check-in / check-out datetime strings, exactly like the website builds them
      const checkInDisplay = camp.checkInTime || '08:00 AM';
      const checkOutDisplay = camp.checkOutTime || '03:00 AM';
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;

      const guestsClamped = Math.min(Math.max(guests, 1), maxGuests);
      const tentConfiguration = normalizeTentConfiguration(camp.tentConfiguration);

      const bookingData: Record<string, any> = {
        campId: camp.id,
        campTitle: camp.title,
        campLocation: camp.location,
        campPhoto: camp.images?.[0] || '',
        campPrice: basePrice,
        campImages: camp.images || [],
        userId: user.uid,
        userName: userData?.displayName || user.email || 'Guest',
        userEmail: user.email || '',
        hostId: camp.hostId,
        hostName: camp.hostName || 'Host',
        hostEmail: camp.hostEmail || '',
        checkIn: `${dateStr} ${convertTo24Hour(checkInDisplay)}`,
        checkOut: `${nextDayStr} ${convertTo24Hour(checkOutDisplay)}`,
        checkInDate: dateStr,
        checkOutDate: dateStr, // Single day logic
        guests: guestsClamped,
        totalPrice: total,
        serviceFee,
        taxes: 0,
        currency: 'BHD',
        // Cash + Instant Book → auto-confirm so the stored document, emails,
        // and host view all agree with what the guest sees. Online payments
        // are confirmed later by the payment webhook.
        status: (paymentMethod === 'cash_on_arrival' && camp.instantBook)
          ? 'confirmed'
          : 'pending',
        paymentStatus: 'pending',
        paymentMethod,
        refundPolicy: camp.refundPolicy || 'moderate',
        tentSelection: { large: 0, small: 0, entertainment: 0 },
        ...(tentConfiguration ? { tentConfiguration } : {}),
        priceBreakdown: {
          basePrice,
          largeTentPrice: 0,
          smallTentPrice: 0,
          entertainmentTentPrice: 0,
          serviceFee,
          tax: 0,
          total
        }
      };

      const phoneDigits = hasProfilePhone ? profilePhoneDigits : phoneNumber.replace(/\D/g, '');
      if (phoneDigits) {
        bookingData.userPhone = phoneDigits;
      }
      if (specialRequests && specialRequests.trim()) {
        bookingData.specialRequests = specialRequests.trim();
      }
      if (arrivalTrimmed) {
        bookingData.arrivalTime = arrivalTrimmed;
      }

      // Use the required atomic lock
      const newBookingId = await createBookingWithLock(bookingData, camp.id, dateStr);

      if (paymentMethod === 'cash_on_arrival') {
        // Emails and host push notification are best-effort; booking already succeeded.
        await sendBookingEmails(bookingData, newBookingId);
        notifyHostNewBooking(newBookingId).catch(() => {});
        notify(
          camp.instantBook ? t('bookingConfirmedCash') : t('bookingPendingCash'),
          undefined,
          'success'
        );
        router.replace('/(tabs)/bookings');
        return;
      }

      // Online payment: emails and host push are best-effort in the background, then Tap
      sendBookingEmails(bookingData, newBookingId).catch(() => {});
      notifyHostNewBooking(newBookingId).catch(() => {});
      await handlePayment(newBookingId, total);
      setSubmitting(false);

    } catch (e: any) {
      if (e.name === 'DateUnavailableError' || e.code === 'date-unavailable') {
        notify(t('dateUnavailable'), undefined, 'error');
      } else {
        notify(e?.message || t('errAuthGeneric'), undefined, 'error');
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><CampfireLoader size="lg" /></View>;
  }

  if (!camp) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><AppText>Not found</AppText></View>;
  }

  // Single-day booking: the rate shown is the rate for the selected date
  // (holiday > weekend > standard). Falls back to the standard nightly rate
  // before a date is picked.
  const { rate: basePrice, kind: rateKind } = selectedDate
    ? getNightlyRateForDate(camp, selectedDate)
    : { rate: camp.pricePerNight || 0, kind: 'standard' as const };
  const serviceFee = basePrice * 0.10;
  const total = basePrice + serviceFee;

  // Concise cancellation-policy summary shown directly above the submit CTA.
  const policyTier = resolveCancellationTier(camp.cancellationPolicy, camp.refundPolicy);
  const policySummaryText =
    policyTier === 'free' ? t('cancelPolicyFree')
    : policyTier === 'partial' ? t('cancelPolicyPartial')
    : policyTier === 'none' ? t('cancelPolicyNone')
    : t('cancelPolicyReview');
  const img = camp.images?.length ? camp.images[0] : 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
  const checkInDisplay = camp.checkInTime || '08:00 AM';
  const checkOutDisplay = camp.checkOutTime || '03:00 AM';

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
      color: colors.foreground,
      textAlign: (isRTL ? 'right' : 'left') as 'right' | 'left',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }, isRTL && styles.rtlRow]}>
        <TouchableOpacity onPress={() => goBack({ pathname: '/camp/[id]', params: { id: String(id) } })} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <AppText variant="h3">{t('bookNow')}</AppText>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.campCard, { backgroundColor: colors.card, borderColor: colors.border }, isRTL && styles.rtlRow]}>
          <Image source={{ uri: img }} style={styles.thumb} contentFit="cover" />
          <View style={[styles.campInfo, isRTL && { alignItems: 'flex-end' }]}>
            <AppText variant="h3" numberOfLines={1}>{camp.title}</AppText>
            <AppText variant="bodySm" color={colors.mutedForeground} numberOfLines={1} style={{ marginTop: 4 }}>
              {camp.location}
            </AppText>
          </View>
        </View>

        <AppText variant="h3" style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('selectDate')}</AppText>

        <View style={[styles.calendarContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {availabilityLoading ? (
            <View style={[styles.availabilityError, { backgroundColor: colors.muted }]}>
              <CampfireLoader size="sm" />
              <AppText variant="bodySm" color={colors.mutedForeground} style={{ textAlign: 'center', marginTop: 8 }}>
                {t('loadingAvailability')}
              </AppText>
            </View>
          ) : availabilityLoadError ? (
            <TouchableOpacity
              onPress={() => id && loadAvailability(id as string)}
              activeOpacity={0.7}
              style={[styles.availabilityError, { backgroundColor: colors.muted }]}
            >
              <Ionicons name="warning-outline" size={24} color={colors.mutedForeground} />
              <AppText variant="bodySm" color={colors.mutedForeground} style={{ textAlign: 'center', marginTop: 8 }}>
                {t('availabilityLoadError')}
              </AppText>
            </TouchableOpacity>
          ) : (
            <Calendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              bookedDates={bookedDates}
              blockedDates={blockedDates}
              camp={camp}
            />
          )}
          <View style={[styles.timeInfo, { borderTopColor: colors.border }, isRTL && styles.rtlRow]}>
            <View style={[styles.timeBox, isRTL && { alignItems: 'flex-end' }]}>
              <AppText variant="labelSm" color={colors.mutedForeground}>{t('checkIn')}</AppText>
              <AppText variant="body" weight="medium">{checkInDisplay}</AppText>
            </View>
            <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={20} color={colors.mutedForeground} />
            <View style={[styles.timeBox, isRTL && { alignItems: 'flex-start' }, !isRTL && { alignItems: 'flex-end' }]}>
              <AppText variant="labelSm" color={colors.mutedForeground}>{t('checkOut')}</AppText>
              <AppText variant="body" weight="medium">{checkOutDisplay} <AppText variant="labelSm" color={colors.mutedForeground}>{t('nextDay')}</AppText></AppText>
            </View>
          </View>
        </View>

        {/* Expected arrival time — same input the website has */}
        <View style={styles.fieldBlock}>
          <AppText variant="label" style={[styles.fieldLabel, isRTL && { textAlign: 'right' }]}>{t('arrivalTime')}</AppText>
          <TextInput
            style={inputStyle}
            value={arrivalTime}
            onChangeText={setArrivalTime}
            placeholder="08:00"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            autoCorrect={false}
          />
        </View>

        {/* Number of guests */}
        <View style={styles.fieldBlock}>
          <AppText variant="label" style={[styles.fieldLabel, isRTL && { textAlign: 'right' }]}>{t('guests')}</AppText>
          <View style={[styles.stepperRow, { backgroundColor: colors.card, borderColor: colors.border }, isRTL && styles.rtlRow]}>
            <TouchableOpacity
              onPress={() => setGuests(g => Math.max(1, g - 1))}
              disabled={guests <= 1}
              style={[styles.stepBtn, guests <= 1 && { opacity: 0.35 }]}
            >
              <Ionicons name="remove-circle-outline" size={28} color={colors.primary} />
            </TouchableOpacity>
            <AppText variant="h3">{guests}</AppText>
            <TouchableOpacity
              onPress={() => setGuests(g => Math.min(maxGuests, g + 1))}
              disabled={guests >= maxGuests}
              style={[styles.stepBtn, guests >= maxGuests && { opacity: 0.35 }]}
            >
              <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {camp.maxGuests > 0 ? (
            <AppText variant="labelSm" color={colors.mutedForeground} style={[styles.fieldHint, isRTL && { textAlign: 'right' }]}>
              {t('guestMax', { count: camp.maxGuests })}
            </AppText>
          ) : null}
        </View>

        {/* Phone number — only asked when the profile doesn't have one yet */}
        {!hasProfilePhone && (
        <View style={styles.fieldBlock}>
          <AppText variant="label" style={[styles.fieldLabel, isRTL && { textAlign: 'right' }]}>{t('phoneNumber')} *</AppText>
          <TextInput
            style={[...inputStyle, phoneError ? { borderColor: '#DC2626' } : null]}
            value={phoneNumber}
            onChangeText={(v) => { setPhoneNumber(v); if (phoneError) setPhoneError(''); }}
            placeholder="+973 XXXX XXXX"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
            autoCorrect={false}
          />
          {phoneError ? (
            <AppText variant="labelSm" color="#DC2626" style={[styles.fieldHint, isRTL && { textAlign: 'right' }]}>
              {phoneError}
            </AppText>
          ) : null}
        </View>
        )}

        {/* Special requests (optional) */}
        <View style={styles.fieldBlock}>
          <AppText variant="label" style={[styles.fieldLabel, isRTL && { textAlign: 'right' }]}>{t('specialRequests')}</AppText>
          <TextInput
            style={[...inputStyle, styles.textArea]}
            value={specialRequests}
            onChangeText={setSpecialRequests}
            placeholder={t('specialRequestsPlaceholder')}
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
        </View>

        {/* Payment method — same two options as the website */}
        <View style={styles.fieldBlock}>
          <AppText variant="label" style={[styles.fieldLabel, isRTL && { textAlign: 'right' }]}>{t('paymentMethod')}</AppText>

          <TouchableOpacity
            onPress={() => setPaymentMethod('online')}
            activeOpacity={0.8}
            style={[
              styles.payOption,
              { backgroundColor: colors.card, borderColor: paymentMethod === 'online' ? colors.primary : colors.border },
              paymentMethod === 'online' && styles.payOptionSelected,
              isRTL && styles.rtlRow,
            ]}
          >
            <Ionicons name="card-outline" size={24} color={paymentMethod === 'online' ? colors.primary : colors.mutedForeground} />
            <View style={[styles.payOptionText, isRTL && { alignItems: 'flex-end' }]}>
              <AppText variant="body" weight="semibold">{t('payOnline')}</AppText>
              <AppText variant="labelSm" color={colors.mutedForeground}>{t('payOnlineDesc')}</AppText>
            </View>
            <View style={[styles.radioOuter, { borderColor: paymentMethod === 'online' ? colors.primary : colors.border }]}>
              {paymentMethod === 'online' ? <View style={[styles.radioInner, { backgroundColor: colors.primary }]} /> : null}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPaymentMethod('cash_on_arrival')}
            activeOpacity={0.8}
            style={[
              styles.payOption,
              { backgroundColor: colors.card, borderColor: paymentMethod === 'cash_on_arrival' ? colors.primary : colors.border },
              paymentMethod === 'cash_on_arrival' && styles.payOptionSelected,
              isRTL && styles.rtlRow,
            ]}
          >
            <Ionicons name="cash-outline" size={24} color={paymentMethod === 'cash_on_arrival' ? colors.primary : colors.mutedForeground} />
            <View style={[styles.payOptionText, isRTL && { alignItems: 'flex-end' }]}>
              <AppText variant="body" weight="semibold">{t('cashOnArrival')}</AppText>
              <AppText variant="labelSm" color={colors.mutedForeground}>{t('cashOnArrivalDesc')}</AppText>
            </View>
            <View style={[styles.radioOuter, { borderColor: paymentMethod === 'cash_on_arrival' ? colors.primary : colors.border }]}>
              {paymentMethod === 'cash_on_arrival' ? <View style={[styles.radioInner, { backgroundColor: colors.primary }]} /> : null}
            </View>
          </TouchableOpacity>
        </View>

        <SaduDivider marginVertical={32} />

        <AppText variant="h3" style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('priceBreakdown')}</AppText>
        <View style={[styles.priceBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.priceRow, isRTL && styles.rtlRow]}>
            <AppText variant="body">{t('basePrice')}</AppText>
            <AppText variant="body" weight="medium">{basePrice.toFixed(3)} BHD</AppText>
          </View>
          {rateKind !== 'standard' ? (
            <View style={[styles.priceRow, isRTL && styles.rtlRow]}>
              <View style={[styles.peakBadge, { backgroundColor: colors.muted }]}>
                <Ionicons name="pricetag" size={12} color={colors.mutedForeground} />
                <AppText variant="labelSm" color={colors.mutedForeground}>
                  {rateKind === 'holiday' ? t('holidayRate') : t('weekendRate')}
                </AppText>
              </View>
            </View>
          ) : null}
          <View style={[styles.priceRow, isRTL && styles.rtlRow]}>
            <AppText variant="body">{t('serviceFee')}</AppText>
            <AppText variant="body" weight="medium">{serviceFee.toFixed(3)} BHD</AppText>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={[styles.priceRow, isRTL && styles.rtlRow, { marginBottom: 0 }]}>
            <AppText variant="h3">{t('total')}</AppText>
            <AppText variant="h3" color={colors.primary}>{total.toFixed(3)} BHD</AppText>
          </View>
        </View>

      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom || 20 }]}>
        {/* Concise cancellation-policy summary directly above the submit CTA */}
        <View style={[styles.policySummary, { backgroundColor: colors.muted }, isRTL && styles.rtlRow]}>
          <Ionicons name="information-circle" size={16} color={colors.mutedForeground} />
          <AppText variant="labelSm" color={colors.mutedForeground} style={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
            {policySummaryText}
          </AppText>
        </View>
        <PressableScale
          style={[styles.submitBtn, { backgroundColor: colors.primary }, (!selectedDate || submitting || availabilityLoading || availabilityLoadError) && { opacity: 0.7 }]}
          onPress={handleBook}
          disabled={!selectedDate || submitting || availabilityLoading || availabilityLoadError}
        >
          {submitting ? (
            <CampfireLoader size="sm" />
          ) : (
            <AppText variant="label" color={colors.primaryForeground} weight="bold">
              {paymentMethod === 'cash_on_arrival' ? t('bookNow') : t('payNow')} {total.toFixed(3)} BHD
            </AppText>
          )}
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  rtlRow: { flexDirection: 'row-reverse' },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.05)' },
  content: { padding: 20, paddingBottom: 120 },
  campCard: { flexDirection: 'row', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 32, alignItems: 'center', gap: 16 },
  thumb: { width: 80, height: 80, borderRadius: 12 },
  campInfo: { flex: 1, justifyContent: 'center' },
  sectionTitle: { marginBottom: 16 },
  calendarContainer: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  availabilityError: { padding: 24, alignItems: 'center', justifyContent: 'center', minHeight: 120 },
  timeInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1 },
  timeBox: { gap: 4 },
  fieldBlock: { marginTop: 24 },
  fieldLabel: { marginBottom: 8 },
  fieldHint: { marginTop: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 48 },
  textArea: { minHeight: 100, paddingTop: 12 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  payOption: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 12 },
  payOptionSelected: { borderWidth: 2 },
  payOptionText: { flex: 1, gap: 2 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  priceBox: { padding: 20, borderRadius: 16, borderWidth: 1 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
  peakBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  divider: { height: 1, marginVertical: 16 },
  policySummary: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginBottom: 12, gap: 8, alignItems: 'center' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 10 },
  submitBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
});
