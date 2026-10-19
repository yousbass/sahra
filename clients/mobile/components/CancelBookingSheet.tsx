import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Modal, Animated, Dimensions, TextInput, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { CampfireLoader } from '@/components/CampfireLoader';
import { Booking } from '@/lib/firestore';
import { calculateRefund, policyLabelKey } from '@/lib/refunds';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  booking: Booking | null;
  onClose: () => void;
  /** Performs the actual cancellation; throws on failure. */
  onConfirm: (booking: Booking, reason: string) => Promise<void>;
}

export function CancelBookingSheet({ booking, onClose, onConfirm }: Props) {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const { isRTL } = useI18n();

  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const visible = booking !== null;

  useEffect(() => {
    if (visible) {
      setReason('');
      setError('');
      setCancelling(false);
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    }
  }, [visible, slideAnim]);

  if (!booking) {
    return null;
  }

  // Same math + same legacy-policy handling as the website's cancellation dialog.
  // Bookings created on the web store the policy snapshot as `refundPolicy`;
  // older/mobile ones may have `cancellationPolicy` — read both so the label
  // matches the actual policy (the math treats all string policies alike).
  const policySnapshot =
    (booking as Record<string, any>).cancellationPolicy ||
    (booking as Record<string, any>).refundPolicy ||
    'moderate';
  const refund = calculateRefund(
    Number(booking.totalPrice) || 0,
    new Date(booking.checkInDate),
    new Date(),
    policySnapshot
  );

  const close = () => {
    if (cancelling) return;
    Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start(() => onClose());
  };

  const handleConfirm = async () => {
    if (cancelling) return;
    setCancelling(true);
    setError('');
    try {
      await onConfirm(booking, reason.trim());
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start(() => onClose());
    } catch {
      setError(t('cancelFailedMsg'));
      setCancelling(false);
    }
  };

  const dateLabel = new Date(booking.checkInDate).toLocaleDateString(i18n.language, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const refundPositive = refund.refundAmount > 0;
  const refundColor = refundPositive ? colors.kashta : colors.destructive;

  const row = (label: string, value: string, opts?: { bold?: boolean; color?: string }) => (
    <View style={[styles.row, isRTL ? styles.rtlRow : null]}>
      <AppText variant="bodySm" color={colors.mutedForeground}>{label}</AppText>
      <AppText variant="bodySm" weight={opts?.bold ? 'bold' : 'semibold'} color={opts?.color || colors.foreground}>
        {value}
      </AppText>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} activeOpacity={1} />
        <Animated.View style={[styles.sheet, { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />

          <View style={[styles.headerRow, isRTL ? styles.rtlRow : null]}>
            <AppText variant="h3" weight="bold">{t('cancelBookingTitle')}</AppText>
            <TouchableOpacity onPress={close} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
              <Ionicons name="close" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.card, { backgroundColor: colors.muted + '50', borderColor: colors.border }]}>
              <AppText variant="label" weight="bold" numberOfLines={1} style={isRTL ? { textAlign: 'right' } : null}>
                {booking.campTitle}
              </AppText>
              <View style={{ marginTop: 10, gap: 8 }}>
                {row(t('bookingDateLabel'), dateLabel)}
                {row(t('guests'), String(booking.guests || 1))}
                {row(t('totalPaid'), `${(Number(booking.totalPrice) || 0).toFixed(3)} BHD`, { bold: true })}
              </View>
            </View>

            <View style={[styles.policyRow, isRTL ? styles.rtlRow : null]}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.mutedForeground} />
              <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginHorizontal: 6 }}>
                {t('cancellationPolicyLabel')}: {t(policyLabelKey(policySnapshot))}
              </AppText>
            </View>

            <View style={[styles.card, { borderColor: refundPositive ? '#10B98140' : colors.destructive + '40', backgroundColor: refundPositive ? '#10B98110' : colors.destructive + '10' }]}>
              <AppText variant="label" weight="bold" style={isRTL ? { textAlign: 'right' } : null}>
                {t('refundBreakdown')}
              </AppText>
              <View style={{ marginTop: 10, gap: 8 }}>
                {row(t('originalAmount'), `${(Number(booking.totalPrice) || 0).toFixed(3)} BHD`)}
                {row(t('serviceFeeRow'), `-${refund.serviceFee.toFixed(3)} BHD`)}
                {refund.arboonAmount > 0
                  ? row(t('arboonRow'), `-${refund.arboonAmount.toFixed(3)} BHD`)
                  : null}
                {row(t('refundPercentRow'), `${refund.refundPercentage}%`)}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={[styles.row, isRTL ? styles.rtlRow : null]}>
                  <AppText variant="label" weight="bold">{t('youllReceive')}</AppText>
                  <AppText variant="h3" weight="bold" color={refundColor}>
                    {refund.refundAmount.toFixed(3)} BHD
                  </AppText>
                </View>
              </View>
              <AppText variant="labelSm" color={colors.mutedForeground} style={[{ marginTop: 10 }, isRTL ? { textAlign: 'right' } : null]}>
                {refund.message === 'full' ? t('refundMsgFull') : refund.message === 'half' ? t('refundMsgHalf') : t('refundMsgNone')}
              </AppText>
              {refundPositive ? (
                <AppText variant="labelSm" color={colors.mutedForeground} style={[{ marginTop: 6 }, isRTL ? { textAlign: 'right' } : null]}>
                  {t('refundTimeline')}
                </AppText>
              ) : null}
            </View>

            <View style={[styles.warnRow, isRTL ? styles.rtlRow : null]}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} style={{ marginTop: 1 }} />
              <AppText variant="labelSm" color={colors.mutedForeground} style={[styles.warnText, isRTL ? { textAlign: 'right' } : null]}>
                {t('cancelBookingMsg')}
              </AppText>
            </View>

            <AppText variant="labelSm" color={colors.mutedForeground} style={[{ marginBottom: 8 }, isRTL ? { textAlign: 'right' } : null]}>
              {t('reasonOptional')}
            </AppText>
            <TextInput
              style={[styles.reasonInput, { borderColor: colors.border, color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}
              placeholder={t('reasonPlaceholder')}
              placeholderTextColor={colors.mutedForeground}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              editable={!cancelling}
            />

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + '15' }]}>
                <AppText variant="labelSm" color={colors.destructive}>{error}</AppText>
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }, isRTL ? styles.rtlRow : null]}>
            <PressableScale
              onPress={close}
              disabled={cancelling}
              style={[styles.keepBtn, { borderColor: colors.border }]}
            >
              <AppText variant="label" weight="semibold">{t('keepBooking')}</AppText>
            </PressableScale>
            <PressableScale
              onPress={handleConfirm}
              disabled={cancelling}
              style={[styles.confirmBtn, { backgroundColor: colors.destructive }, cancelling ? { opacity: 0.7 } : null]}
            >
              {cancelling
                ? <CampfireLoader size="sm" />
                : <AppText variant="label" weight="bold" color="#FFF">{t('yesCancelBooking')}</AppText>}
            </PressableScale>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { overflow: 'hidden', width: '100%', maxHeight: SCREEN_HEIGHT * 0.88, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 8 },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 24, paddingBottom: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rtlRow: { flexDirection: 'row-reverse' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  policyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 },
  warnRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, marginBottom: 16, paddingHorizontal: 4, gap: 8 },
  warnText: { flex: 1 },
  reasonInput: { borderWidth: 1, borderRadius: 16, padding: 14, minHeight: 80, fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', textAlignVertical: 'top' },
  errorBox: { padding: 12, borderRadius: 12, marginTop: 12, alignItems: 'center' },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, borderTopWidth: 1, marginTop: 8 },
  keepBtn: { flex: 1, height: 54, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  confirmBtn: { flex: 1, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
