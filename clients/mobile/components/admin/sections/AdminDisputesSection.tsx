import React, { useState } from 'react';
import { Alert, Image, Linking, Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { resolveAdminDispute, type AdminDispute } from '@/lib/adminFinanceApi';

type Props = { disputes: AdminDispute[]; loading?: boolean; error?: string; onReload: () => Promise<void> | void };
const text = (x: unknown) => x == null ? '' : String(x);
const date = (v: unknown) => v ? new Date(text(v)).toLocaleString() : '';
const tr = (t: (key: string, options?: { defaultValue?: string }) => string, key: string, _fallback: string) => t(key);
const disputeTypeKeys: Record<string, string> = { not_as_described: 'adminDisputeTypeNotAsDescribed', missing_amenity: 'adminDisputeTypeMissingAmenity', safety: 'adminDisputeTypeSafety', safety_concern: 'adminDisputeTypeSafety', other: 'adminDisputeTypeOther' };
const disputeStatusKeys: Record<string, string> = { open: 'adminDisputeStatusOpen', pending: 'adminDisputeStatusPending', in_review: 'adminDisputeStatusInReview', resolved: 'adminDisputeStatusResolved', closed: 'adminDisputeStatusClosed' };
const disputeLabel = (value: string, keys: Record<string, string>, t: (key: string) => string) => t(keys[value] ?? 'adminUnknown');

export function AdminDisputesSection({ disputes, loading, error, onReload }: Props) {
  const colors = useColors(); const { t } = useTranslation(); const { isRTL } = useI18n();
  const [selected, setSelected] = useState<AdminDispute | null>(null); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  const confirmResolve = () => {
    if (!selected || selected.status === 'resolved' || selected.status === 'closed') return;
    Alert.alert(t('adminDisputes.resolve', { defaultValue: 'Resolve dispute' }), t('adminDisputes.resolveWarning', { defaultValue: 'Confirm that this dispute has been reviewed and resolved.' }), [
      { text: t('cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
      { text: t('confirm', { defaultValue: 'Confirm' }), style: 'destructive', onPress: async () => {
        setBusy(true); try { await resolveAdminDispute(selected.id, note.trim() || undefined); await onReload(); setSelected(null); } catch (e) { Alert.alert(t('adminActionFailed', { defaultValue: 'Action failed' }), e instanceof Error ? e.message : 'Please try again.'); } finally { setBusy(false); }
      } },
    ]);
  };
  if (loading) return <AppText color={colors.mutedForeground}>{t('loading', { defaultValue: 'Loading…' })}</AppText>;
  if (error) return <View><AppText color={colors.destructive}>{error}</AppText><PressableScale onPress={onReload}><AppText color={colors.primary}>{t('retry', { defaultValue: 'Retry' })}</AppText></PressableScale></View>;
  return <View style={styles.list}>{disputes.map(d => <View key={d.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, isRTL && styles.rtl]}>
     <View style={{ flex: 1 }}><AppText weight="bold">{disputeLabel(text(d.type), disputeTypeKeys, t)}</AppText><AppText variant="labelSm" color={colors.mutedForeground}>{text(d.bookingId)} · {date(d.createdAt)}</AppText><AppText variant="labelSm" color={d.status === 'resolved' ? colors.kashta : colors.destructive}>{disputeLabel(text(d.status) || 'open', disputeStatusKeys, t)}</AppText></View>
     <PressableScale onPress={() => { setSelected(d); setNote(text(d.adminNote)); }} style={styles.icon}><AppText variant="labelSm" color={colors.primary}>{t('adminDisputes.detailTitle')}</AppText></PressableScale>
  </View>)}
    {!disputes.length && <AppText color={colors.mutedForeground}>{t('adminNoResults', { defaultValue: 'Nothing to review' })}</AppText>}
    <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}><View style={styles.overlay}><ScrollView style={[styles.sheet, { backgroundColor: colors.background }]}>
      {selected && <><AppText variant="h2" weight="bold">{t('adminDisputes.detailTitle', { defaultValue: 'Dispute details' })}</AppText>
         <Detail label={t('adminDisputes.colType')} value={disputeLabel(text(selected.type), disputeTypeKeys, t)} colors={colors} /><Detail label={t('adminDisputes.colStatus')} value={disputeLabel(text(selected.status), disputeStatusKeys, t)} colors={colors} /><Detail label={t('adminDisputes.colBooking')} value={text(selected.bookingId)} colors={colors} /><Detail label={t('adminDisputes.colGuest')} value={text(selected.userId)} colors={colors} /><Detail label={t('adminDisputes.colDate')} value={date(selected.createdAt)} colors={colors} />
        <AppText variant="labelSm" color={colors.mutedForeground}>{t('adminDisputes.colDescription', { defaultValue: 'Description' })}</AppText><AppText style={styles.evidence}>{text(selected.description) || text(selected.reason) || '—'}</AppText>
        {selected.photoUrl ? <><Image source={{ uri: text(selected.photoUrl) }} style={styles.photo} /><PressableScale onPress={() => Linking.openURL(text(selected.photoUrl))}><AppText color={colors.primary}>{t('adminDisputes.photoLink', { defaultValue: 'Open evidence photo' })}</AppText></PressableScale></> : <AppText color={colors.mutedForeground}>{t('adminDisputes.noPhoto', { defaultValue: 'No evidence photo' })}</AppText>}
        {selected.status === 'resolved' || selected.status === 'closed' ? <><Detail label={t('adminDisputes.adminNoteLabel', { defaultValue: 'Admin note' })} value={text(selected.adminNote) || '—'} colors={colors} /></> : <><AppText variant="label" weight="bold" style={styles.label}>{t('adminDisputes.adminNote', { defaultValue: 'Admin note' })}</AppText><TextInput value={note} onChangeText={setNote} maxLength={1000} multiline textAlign={isRTL ? 'right' : 'left'} placeholder={t('adminDisputes.adminNotePlaceholder', { defaultValue: 'Add a resolution note (optional)' })} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} /><PressableScale disabled={busy} onPress={confirmResolve} style={[styles.resolve, { backgroundColor: colors.primary }]}><AppText color={colors.primaryForeground} weight="bold">{t('adminDisputes.resolve', { defaultValue: 'Resolve dispute' })}</AppText></PressableScale></>}
        <PressableScale onPress={() => setSelected(null)} style={styles.close}><AppText color={colors.primary}>{t('close', { defaultValue: 'Close' })}</AppText></PressableScale>
      </>}
    </ScrollView></View></Modal>
  </View>;
}
function Detail({ label, value, colors }: { label: string; value: string; colors: any }) { return <View style={styles.detail}><AppText variant="labelSm" color={colors.mutedForeground}>{label}</AppText><AppText selectable>{value}</AppText></View>; }
const styles = StyleSheet.create({ list: { gap: 10 }, card: { borderWidth: 1, borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }, rtl: { flexDirection: 'row-reverse' }, icon: { padding: 8 }, overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' }, sheet: { maxHeight: '92%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }, detail: { paddingVertical: 7, gap: 2 }, evidence: { marginTop: 6, padding: 12, borderRadius: 10, backgroundColor: '#0000000d' }, photo: { width: '100%', height: 180, borderRadius: 12, marginTop: 12 }, label: { marginTop: 14, marginBottom: 6 }, input: { minHeight: 80, borderWidth: 1, borderRadius: 10, padding: 10, textAlignVertical: 'top' }, resolve: { minHeight: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10 }, close: { alignItems: 'center', paddingVertical: 16 } });