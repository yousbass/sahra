import React, { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import type { Booking } from '@/lib/firestore';

export function AdminBookingsSection({ bookings }: { bookings: Booking[] }) {
  const colors = useColors(); const { t } = useTranslation(); const { isRTL } = useI18n(); const [query, setQuery] = useState(''); const [status, setStatus] = useState('all'); const [payment, setPayment] = useState('all');
  const filtered = useMemo(() => bookings.filter(b => (!query.trim() || `${b.id} ${b.userName ?? ''} ${b.campTitle}`.toLowerCase().includes(query.trim().toLowerCase())) && (status === 'all' || b.status === status) && (payment === 'all' || b.paymentStatus === payment)), [bookings, query, status, payment]);
  return <View>
    <AppText variant="bodySm" color={colors.mutedForeground} style={styles.notice}>{t('adminBookingReadOnly')}</AppText>
    <TextInput value={query} onChangeText={setQuery} placeholder={t('adminBookingSearch')} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]} />
    <View style={[styles.filters, isRTL && styles.rtl]}>{['all', 'pending', 'confirmed', 'cancelled', 'completed'].map(value => <PressableScale key={value} onPress={() => setStatus(value)} style={[styles.chip, { borderColor: status === value ? colors.primary : colors.border }]}><AppText variant="labelSm">{t(bookingStatusKeys[value])}</AppText></PressableScale>)}{['all', 'paid', 'pending', 'pending_verification', 'cash_collected', 'failed', 'refunded'].map(value => <PressableScale key={value} onPress={() => setPayment(value)} style={[styles.chip, { borderColor: payment === value ? colors.primary : colors.border }]}><AppText variant="labelSm">{t(paymentStatusKeys[value])}</AppText></PressableScale>)}</View>
    {filtered.map(booking => <View key={booking.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><AppText variant="label" weight="bold">{booking.campTitle}</AppText><AppText variant="labelSm" color={colors.mutedForeground}>{booking.userName || booking.userEmail || t('adminUnknown')}</AppText><AppText variant="labelSm">{booking.checkInDate} → {booking.checkOutDate} · {booking.guests} {t('adminGuests')}</AppText><AppText variant="labelSm" color={colors.primary}>{booking.totalPrice.toFixed(3)} {t('adminCurrency')} · {t(bookingStatusKeys[String(booking.status)] ?? 'adminUnknown')} · {t(paymentStatusKeys[String(booking.paymentStatus)] ?? 'adminUnknown')}</AppText></View>)}
    {!filtered.length ? <AppText color={colors.mutedForeground} style={styles.empty}>{t('adminNoResults')}</AppText> : null}
  </View>;
}
const bookingStatusKeys: Record<string, string> = { all: 'adminAll', pending: 'adminBookingStatusPending', confirmed: 'adminBookingStatusConfirmed', cancelled: 'adminBookingStatusCancelled', completed: 'adminBookingStatusCompleted' };
const paymentStatusKeys: Record<string, string> = { all: 'adminAllPayments', paid: 'adminPaymentStatusPaid', pending: 'adminPaymentStatusPending', pending_verification: 'adminPaymentStatusPendingVerification', cash_collected: 'adminPaymentStatusCashCollected', failed: 'adminPaymentStatusFailed', refunded: 'adminPaymentStatusRefunded' };
const styles = { input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 }, notice: { paddingVertical: 8 }, filters: { flexDirection: 'row' as const, gap: 7, flexWrap: 'wrap' as const, marginBottom: 10 }, chip: { minHeight: 44, justifyContent: 'center' as const, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10 }, card: { borderWidth: 1, borderRadius: 14, padding: 13, gap: 6, marginBottom: 10 }, rtl: { flexDirection: 'row-reverse' as const }, empty: { textAlign: 'center' as const, padding: 24 } };