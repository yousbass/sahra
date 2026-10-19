import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { useTranslation } from 'react-i18next';
import { PressableScale } from '@/components/PressableScale';
import { EmptyState } from '@/components/EmptyState';
import { useColors } from '@/hooks/useColors';
import { getAdminApplications, decideAdminApplication, type AdminApplication } from '@/lib/adminPeopleApi';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';

export type ApplicationSectionProps = { kind: 'host' | 'seller'; onChanged?: () => void };

export function ApplicationSection({ kind, onChanged }: ApplicationSectionProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const { isRTL } = useI18n();
  const [items, setItems] = useState<AdminApplication[]>([]);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [query, setQuery] = useState('');
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await getAdminApplications(kind)); } finally { setLoading(false); }
  }, [kind]);
  useEffect(() => { void load(); }, [load]);
  const shown = useMemo(() => items.filter((item) => {
    const haystack = JSON.stringify(item).toLowerCase();
    return (status === 'all' || item.status === status) && (!query.trim() || haystack.includes(query.trim().toLowerCase()));
  }).sort((a, b) => dateValue(b.submittedAt) - dateValue(a.submittedAt)), [items, query, status]);
  const decide = async (item: AdminApplication, decision: 'approved' | 'rejected') => {
    const trimmed = reason.trim();
    if (decision === 'rejected' && !trimmed) return;
    setBusy(item.id);
    try {
      await decideAdminApplication(kind, item.id, decision, trimmed || undefined);
      setReasonFor(null); setReason(''); await load(); onChanged?.();
    } finally { setBusy(null); }
  };
  if (loading) return <ActivityIndicator color={colors.primary} style={styles.loader} />;
  return <View>
    <TextInput value={query} onChangeText={setQuery} placeholder={t('adminApplicationSearch')} placeholderTextColor={colors.mutedForeground} style={[styles.search, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]} />
     <View style={styles.filters}>{(['pending', 'approved', 'rejected', 'all'] as const).map((value) => <PressableScale key={value} onPress={() => setStatus(value)} style={[styles.chip, { backgroundColor: status === value ? colors.primary : colors.card, borderColor: colors.border }]}><AppText variant="labelSm" color={status === value ? colors.primaryForeground : colors.foreground}>{t(value === 'all' ? 'adminAll' : value === 'pending' ? 'adminPending' : value === 'approved' ? 'adminApproved' : 'adminRejected')}</AppText></PressableScale>)}</View>
     <FlatList data={shown} scrollEnabled={false} keyExtractor={(item) => item.id} ListEmptyComponent={<EmptyState icon="document-text-outline" title={t('adminNoApplications')} description={t('adminApplicationsDesc')} />} renderItem={({ item }) => {
      const seller = kind === 'seller';
       const applicant = item.userName || item.userEmail || t('adminUnknownApplicant');
      const business = item.businessNameEn || item.businessNameAr;
      const rejecting = reasonFor === item.id;
       return <View style={[styles.card, isRTL && styles.rtl, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
           <AppText variant="label" weight="bold">{seller ? business || t('adminUnknown') : applicant}</AppText>
          {seller && item.businessNameAr ? <AppText variant="labelSm" color={colors.mutedForeground}>{item.businessNameAr}</AppText> : null}
           <AppText variant="labelSm" color={colors.mutedForeground}>{seller ? applicant : item.userEmail || t('adminNoEmail')}</AppText>
           <AppText variant="labelSm" color={colors.mutedForeground} style={{ writingDirection: 'ltr' }}>{item.phoneNumber || t('adminPhoneMissing')}{seller && item.crNumber ? ` · ${t('adminCrNumber')} ${item.crNumber}` : !seller && item.cprNumber ? ` · ${t('adminCprNumber')} ${item.cprNumber}` : ''}</AppText>
          {seller && Array.isArray(item.categories) ? <AppText variant="labelSm" color={colors.mutedForeground}>{item.categories.join(' · ')}</AppText> : null}
           <AppText variant="labelSm" color={item.status === 'rejected' ? colors.destructive : item.status === 'approved' ? colors.kashta : colors.primary}>{t(item.status === 'rejected' ? 'adminRejected' : item.status === 'approved' ? 'adminApproved' : 'adminPending')}{item.rejectionReason ? ` · ${item.rejectionReason}` : ''}</AppText>
           {item.reviewedBy ? <AppText variant="labelSm" color={colors.mutedForeground}>{t('adminReviewedBy')} {item.reviewedBy}</AppText> : null}
        </View>
        {item.status === 'pending' ? <View style={styles.actions}>
           <PressableScale accessibilityLabel={t('adminApprove')} disabled={busy === item.id} onPress={() => void decide(item, 'approved')} style={[styles.action, { borderColor: colors.kashta }]}><AppText variant="labelSm" color={colors.kashta}>{t('adminApprove')}</AppText></PressableScale>
           <PressableScale accessibilityLabel={t('adminReject')} disabled={busy === item.id} onPress={() => { setReasonFor(rejecting ? null : item.id); setReason(''); }} style={[styles.action, { borderColor: colors.destructive }]}><AppText variant="labelSm" color={colors.destructive}>{t('adminReject')}</AppText></PressableScale>
        </View> : null}
         {rejecting ? <View style={styles.rejectBox}><TextInput value={reason} onChangeText={setReason} placeholder={t('adminRejectionReason')} placeholderTextColor={colors.mutedForeground} multiline style={[styles.reason, { color: colors.foreground, borderColor: colors.border }]} /><PressableScale disabled={busy === item.id || !reason.trim()} onPress={() => void decide(item, 'rejected')} style={[styles.confirm, { backgroundColor: colors.destructive }]}><AppText variant="labelSm" color="#fff">{t('adminConfirmReject')}</AppText></PressableScale></View> : null}
      </View>;
    }} />
  </View>;
}

function dateValue(value: unknown) {
  if (value && typeof value === 'object' && 'seconds' in value) return Number((value as { seconds: number }).seconds) * 1000;
  const parsed = Date.parse(String(value || ''));
  return Number.isNaN(parsed) ? 0 : parsed;
}
const styles = StyleSheet.create({ loader: { marginTop: 40 }, search: { minHeight: 44, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 }, filters: { flexDirection: 'row', gap: 8, marginBottom: 12 }, chip: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 8 }, card: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, rtl: { flexDirection: 'row-reverse' }, actions: { flexDirection: 'row', alignItems: 'center' }, action: { minWidth: 60, minHeight: 44, borderWidth: 1, borderRadius: 9, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }, rejectBox: { width: '100%', gap: 8 }, reason: { minHeight: 56, borderWidth: 1, borderRadius: 9, padding: 10, textAlignVertical: 'top' }, confirm: { minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 } });