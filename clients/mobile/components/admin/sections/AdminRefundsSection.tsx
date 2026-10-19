import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { updateAdminRefund, type AdminRefund } from '@/lib/adminFinanceApi';

type Props = { refunds: AdminRefund[]; loading?: boolean; error?: string; onReload: () => Promise<void> | void };
const text = (x: unknown) => x == null ? '' : String(x);
const amount = (r: AdminRefund) => Number(r.refundAmountBHD ?? r.amount ?? 0);
const status = (r: AdminRefund) => text(r.refundStatus ?? r.status);
const refundStatusLabel = (value: string, t: (key: string) => string) => t(refundStatusKeys[value] ?? 'adminUnknown');
const paymentMethodLabel = (value: string, t: (key: string) => string) => t(paymentMethodKeys[value] ?? 'adminUnknown');
const refundStatusKeys: Record<string, string> = { pending: 'adminRefundStatusPending', processing: 'adminRefundStatusProcessing', refunded: 'adminRefundStatusRefunded', completed: 'adminRefundStatusCompleted', failed: 'adminRefundStatusFailed', failed_will_retry: 'adminRefundStatusFailedWillRetry', not_applicable: 'adminRefundStatusNotApplicable' };
const paymentMethodKeys: Record<string, string> = { cash_on_arrival: 'adminPaymentMethodCash', card: 'adminPaymentMethodCard', benefit: 'adminPaymentMethodBenefit', apple_pay: 'adminPaymentMethodApplePay', google_pay: 'adminPaymentMethodGooglePay', online: 'adminPaymentMethodOnline' };
const terminal = (r: AdminRefund) => ['refunded', 'completed', 'not_applicable'].includes(status(r));
const date = (v: unknown) => v ? new Date(text(v)).toLocaleString() : '';

export function AdminRefundsSection({ refunds, loading, error, onReload }: Props) {
  const colors = useColors(); const { t } = useTranslation(); const { isRTL } = useI18n();
  const [selected, setSelected] = useState<AdminRefund | null>(null);
  const [note, setNote] = useState(''); const [manualNote, setManualNote] = useState(''); const [busy, setBusy] = useState(false);
  const filtered = useMemo(() => [...refunds].sort((a, b) => text(b.createdAt).localeCompare(text(a.createdAt))), [refunds]);
  const confirm = (title: string, message: string, action: () => Promise<void>) => Alert.alert(title, message, [
    { text: t('cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
    { text: t('confirm', { defaultValue: 'Confirm' }), style: 'destructive', onPress: async () => { setBusy(true); try { await action(); await onReload(); setSelected(null); } catch (e) { Alert.alert(t('adminActionFailed', { defaultValue: 'Action failed' }), e instanceof Error ? e.message : 'Please try again.'); } finally { setBusy(false); } } },
  ]);
  const change = (next: 'pending' | 'processing' | 'refunded' | 'failed', extra?: Record<string, unknown>) => {
    if (!selected) return;
    confirm(t('adminRefundConfirmTitle', { defaultValue: 'Confirm refund action' }), t('adminRefundConfirmWarning', { defaultValue: 'This financial action will be recorded permanently.' }), async () => { await updateAdminRefund(selected.id, { status: next, ...(note.trim() ? { adminNotes: note.trim() } : {}), ...extra }); });
  };
  if (loading) return <AppText color={colors.mutedForeground}>{t('loading', { defaultValue: 'Loading…' })}</AppText>;
  if (error) return <View><AppText color={colors.destructive}>{error}</AppText><PressableScale onPress={onReload}><AppText color={colors.primary}>{t('retry', { defaultValue: 'Retry' })}</AppText></PressableScale></View>;
  return <View style={styles.list}>
    {filtered.map(r => <View key={r.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, isRTL && styles.rtl]}>
       <View style={{ flex: 1 }}><AppText weight="bold" numberOfLines={1}>{r.id}</AppText><AppText variant="labelSm" color={colors.mutedForeground}>{text(r.bookingId)} · {amount(r).toFixed(3)} {t('adminCurrency')}</AppText><AppText variant="labelSm" color={colors.primary}>{refundStatusLabel(status(r), t)}</AppText></View>
       <PressableScale onPress={() => { setSelected(r); setNote(text(r.adminNotes)); setManualNote(''); }} style={styles.icon}><AppText variant="labelSm" color={colors.primary}>{t('adminRefundDetails')}</AppText></PressableScale>
    </View>)}
    {!filtered.length && <AppText color={colors.mutedForeground}>{t('adminNoResults', { defaultValue: 'Nothing to review' })}</AppText>}
    <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
      <View style={styles.overlay}><ScrollView style={[styles.sheet, { backgroundColor: colors.background }]}>
        {selected && <><AppText variant="h2" weight="bold">{t('adminRefundDetails', { defaultValue: 'Refund details' })}</AppText>
           <Detail label={t('adminRefundId')} value={selected.id} colors={colors} /><Detail label={t('adminBookingId')} value={text(selected.bookingId)} colors={colors} /><Detail label={t('adminGuestId')} value={text(selected.guestId)} colors={colors} /><Detail label={t('adminAmount')} value={`${amount(selected).toFixed(3)} ${t('adminCurrency')}`} colors={colors} /><Detail label={t('adminPaymentMethod')} value={paymentMethodLabel(text(selected.paymentMethod), t)} colors={colors} /><Detail label={t('adminStatus')} value={refundStatusLabel(status(selected), t)} colors={colors} /><Detail label={t('adminInitiated')} value={date(selected.createdAt ?? selected.initiatedAt)} colors={colors} /><Detail label={t('adminCompleted')} value={date(selected.completedAt)} colors={colors} /><Detail label={t('adminTapChargeId')} value={text(selected.tapChargeId) || t('adminNotAvailable')} colors={colors} /><Detail label={t('adminTapRefundId')} value={text(selected.tapRefundId) || t('adminNotAvailable')} colors={colors} /><Detail label={t('adminFailureReason')} value={text(selected.failureReason) || t('adminNotAvailable')} colors={colors} />
          <AppText variant="label" weight="bold" style={styles.label}>{t('adminNotes', { defaultValue: 'Admin notes' })}</AppText><TextInput value={note} onChangeText={setNote} multiline maxLength={1000} textAlign={isRTL ? 'right' : 'left'} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />
          {!terminal(selected) ? <View style={styles.actions}>
            {Boolean(selected.tapChargeId) && !selected.tapRefundId && amount(selected) > 0 && selected.paymentMethod !== 'cash_on_arrival' && <Action label={t('adminRetryRefund', { defaultValue: 'Retry refund' })} icon="refresh" disabled={busy} onPress={() => change('processing')} colors={colors} />}
            {Boolean(selected.tapRefundId) && <Action label={t('adminVerifyComplete', { defaultValue: 'Verify & complete' })} icon="checkmark-circle" disabled={busy} onPress={() => change('refunded')} colors={colors} />}
            {status(selected) !== 'pending' && <Action label={t('adminResetPending', { defaultValue: 'Reset to pending' })} icon="time-outline" disabled={busy} onPress={() => change('pending')} colors={colors} />}
            <Action label={t('adminMarkFailed', { defaultValue: 'Mark failed' })} icon="close-circle" disabled={busy} onPress={() => change('failed')} colors={colors} />
            {amount(selected) > 0 && !selected.tapRefundId && selected.paymentMethod !== 'cash_on_arrival' && <><AppText variant="labelSm" color={colors.destructive}>{t('adminManualSettlementWarning', { defaultValue: 'Manual settlement bypasses Tap verification. Evidence is required.' })}</AppText><TextInput value={manualNote} onChangeText={setManualNote} multiline placeholder={t('adminSettlementEvidence', { defaultValue: 'Settlement evidence (required)' })} textAlign={isRTL ? 'right' : 'left'} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} /><Action label={t('adminManualSettlement', { defaultValue: 'Confirm manual settlement' })} icon="warning" disabled={busy || !manualNote.trim()} onPress={() => change('refunded', { adminNotes: manualNote.trim(), manualSettlementConfirmed: true })} colors={colors} /></>}
          </View> : <AppText color={colors.mutedForeground}>{t('adminRefundTerminal', { defaultValue: 'This refund is in a terminal state and cannot be changed.' })}</AppText>}
          <PressableScale onPress={() => setSelected(null)} style={styles.close}><AppText color={colors.primary}>{t('close', { defaultValue: 'Close' })}</AppText></PressableScale>
        </>}
      </ScrollView></View>
    </Modal>
  </View>;
}
function Detail({ label, value, colors }: { label: string; value: string; colors: any }) { return <View style={styles.detail}><AppText variant="labelSm" color={colors.mutedForeground}>{label}</AppText><AppText selectable>{value}</AppText></View>; }
function Action({ label, icon, onPress, disabled, colors }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean; colors: any }) { return <PressableScale disabled={disabled} onPress={onPress} style={[styles.action, { borderColor: colors.border }]}><Ionicons name={icon} size={18} color={colors.primary} /><AppText color={colors.primary} weight="bold">{label}</AppText></PressableScale>; }
const styles = StyleSheet.create({ list: { gap: 10 }, card: { borderWidth: 1, borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }, rtl: { flexDirection: 'row-reverse' }, icon: { padding: 8 }, overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' }, sheet: { maxHeight: '92%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }, detail: { paddingVertical: 7, gap: 2 }, label: { marginTop: 12, marginBottom: 6 }, input: { minHeight: 48, borderWidth: 1, borderRadius: 10, padding: 10, textAlignVertical: 'top' }, actions: { gap: 9, marginTop: 16 }, action: { minHeight: 46, borderWidth: 1, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }, close: { alignItems: 'center', paddingVertical: 16 } });