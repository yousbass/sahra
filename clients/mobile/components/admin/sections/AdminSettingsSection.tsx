import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { safePercentage } from '@/lib/adminAnalytics';

export type AdminSettingsValues = {
  siteName: string; supportEmail: string; supportPhone: string; platformDescription: string;
  serviceFeePercentage: string; hostCommissionRate: string; taxRate: string; minBookingAmount: string;
  defaultRefundPolicy: 'refundable' | 'non-refundable'; refundDeadlineHours: string; cancellationFeePercentage: string;
  maxGuestsPerCamp: string; minBookingDuration: string; maxBookingDuration: string; reviewDeadlineDays: string;
  currency: string; language: string; timezone: string;
};
type Props = { colors: Record<string, any>; t: (key: string, options?: { defaultValue?: string }) => string; initial?: Partial<AdminSettingsValues>; onSave?: (values: AdminSettingsValues) => Promise<void> };
const defaults: AdminSettingsValues = { siteName: 'MUKHYMAT', supportEmail: '', supportPhone: '', platformDescription: '', serviceFeePercentage: '10', hostCommissionRate: '85', taxRate: '5', minBookingAmount: '50', defaultRefundPolicy: 'refundable', refundDeadlineHours: '48', cancellationFeePercentage: '10', maxGuestsPerCamp: '50', minBookingDuration: '1', maxBookingDuration: '30', reviewDeadlineDays: '14', currency: 'BHD', language: 'en', timezone: 'Asia/Bahrain' };
const copy = (t: Props['t'], key: string, _fallback: string) => t(key);

export function AdminSettingsSection({ colors, t, initial, onSave }: Props) {
  const { user } = useAuth();
  const { isRTL } = useI18n();
  const [values, setValues] = useState<AdminSettingsValues>({ ...defaults, ...initial });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (initial) setValues(current => ({ ...current, ...initial }));
  }, [initial]);
  const set = (key: keyof AdminSettingsValues, value: string) => setValues(current => ({ ...current, [key]: value }));
  const field = (key: keyof AdminSettingsValues, label: string, numeric = false) => <View style={styles.field} key={key}><AppText variant="labelSm" color={colors.mutedForeground}>{label}</AppText><TextInput value={String(values[key] ?? '')} onChangeText={v => set(key, v)} keyboardType={numeric ? 'decimal-pad' : 'default'} style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} textAlign={isRTL ? 'right' : 'left'} /></View>;
  const save = async () => {
    if (!user) { Alert.alert(copy(t, 'adminActionFailed', 'Unable to save'), copy(t, 'adminSignInRequired', 'You must be signed in to save settings.')); return; }
    if (!values.siteName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.supportEmail.trim())) { Alert.alert(copy(t, 'adminInvalidSettings', 'Check settings'), copy(t, 'adminInvalidSettingsDesc', 'Enter a platform name and valid support email.')); return; }
    const percentages = ['serviceFeePercentage', 'hostCommissionRate', 'taxRate', 'cancellationFeePercentage'] as const;
    if (percentages.some(key => !Number.isFinite(Number(values[key])) || safePercentage(values[key]) < 0) || !Number.isFinite(Number(values.minBookingAmount)) || Number(values.minBookingAmount) < 0) { Alert.alert(copy(t, 'adminInvalidSettings', 'Check settings'), copy(t, 'adminInvalidSettingsDesc', 'Numeric settings must be valid non-negative values.')); return; }
    setSaving(true);
    try {
      if (onSave) await onSave(values);
      else {
        if (!db) throw new Error('Firestore is unavailable');
        await setDoc(doc(db, 'settings', 'general'), { ...values, updatedAt: new Date().toISOString(), updatedBy: user.uid }, { merge: true });
      }
      Alert.alert(copy(t, 'saved', 'Saved'), copy(t, 'adminSettingsSaved', 'Settings saved successfully.'));
    } catch (e) { Alert.alert(copy(t, 'adminActionFailed', 'Unable to save'), e instanceof Error ? e.message : copy(t, 'adminSaveError', 'Could not save settings.')); }
    finally { setSaving(false); }
  };
  return <View style={styles.container}>
    <View style={[styles.header, isRTL && styles.rtl]}><View><AppText variant="h2" weight="bold">{copy(t, 'adminSettings', 'Platform settings')}</AppText><AppText variant="bodySm" color={colors.mutedForeground}>{copy(t, 'adminSettingsDesc', 'Configure platform policies safely.')}</AppText></View><Ionicons name="settings-outline" size={24} color={colors.primary} /></View>
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><AppText variant="h3" weight="bold">{copy(t, 'adminPlatformSettings', 'Platform')}</AppText>{field('siteName', copy(t, 'adminPlatformName', 'Platform name'))}{field('supportEmail', copy(t, 'adminContactEmail', 'Contact email'))}{field('supportPhone', copy(t, 'adminSupportPhone', 'Support phone'))}{field('platformDescription', copy(t, 'adminPlatformDescription', 'Description'))}</View>
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><AppText variant="h3" weight="bold">{copy(t, 'adminFinancialSettings', 'Financial')}</AppText>{field('serviceFeePercentage', copy(t, 'adminServiceFee', 'Service fee (%)'), true)}{field('hostCommissionRate', copy(t, 'adminHostCommission', 'Host commission (%)'), true)}{field('taxRate', copy(t, 'adminTaxRate', 'Tax rate (%)'), true)}{field('minBookingAmount', copy(t, 'adminMinBooking', 'Minimum booking (BHD)'), true)}</View>
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><AppText variant="h3" weight="bold">{copy(t, 'adminPolicySettings', 'Policies')}</AppText>{field('defaultRefundPolicy', copy(t, 'adminRefundPolicy', 'Default refund policy'))}{field('refundDeadlineHours', copy(t, 'adminRefundDeadline', 'Refund deadline (hours)'), true)}{field('cancellationFeePercentage', copy(t, 'adminCancellationFee', 'Cancellation fee (%)'), true)}{field('maxGuestsPerCamp', copy(t, 'adminMaxGuests', 'Maximum guests'), true)}{field('minBookingDuration', copy(t, 'adminMinDuration', 'Minimum nights'), true)}{field('maxBookingDuration', copy(t, 'adminMaxDuration', 'Maximum nights'), true)}{field('reviewDeadlineDays', copy(t, 'adminReviewDeadline', 'Review deadline (days)'), true)}</View>
    <PressableScale disabled={saving} onPress={save} style={[styles.save, { backgroundColor: colors.primary }]}><AppText variant="label" color={colors.primaryForeground} weight="bold">{saving ? copy(t, 'saving', 'Saving…') : copy(t, 'save', 'Save settings')}</AppText></PressableScale>
  </View>;
}
 const styles = StyleSheet.create({ container: { gap: 14 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, rtl: { flexDirection: 'row-reverse' }, card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 }, field: { gap: 5 }, input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }, save: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 }, });