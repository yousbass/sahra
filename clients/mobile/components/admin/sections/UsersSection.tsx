import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { EmptyState } from '@/components/EmptyState';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { getAdminUsers, updateAdminUserStatus, type AdminUser } from '@/lib/adminPeopleApi';

export function UsersSection({ onChanged }: { onChanged?: () => void }) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await getAdminUsers()); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const shown = useMemo(() => users.filter((user) => {
    const haystack = `${user.displayName || ''} ${user.email || ''} ${user.phone || ''}`.toLowerCase();
    return (!query.trim() || haystack.includes(query.trim().toLowerCase())) &&
      (filter === 'all' || (user.status || 'active') === filter);
  }), [users, query, filter]);
  const toggle = async (user: AdminUser) => {
    if (user.isAdmin || !user.id) return;
    setBusy(user.id);
    try { await updateAdminUserStatus(user.id, user.status === 'suspended' ? 'active' : 'suspended'); await load(); onChanged?.(); }
    finally { setBusy(null); }
  };
  if (loading) return <ActivityIndicator color={colors.primary} style={styles.loader} />;
  return <View>
    <TextInput value={query} onChangeText={setQuery} placeholder={t('adminPeopleSearch')} placeholderTextColor={colors.mutedForeground} style={[styles.search, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]} />
     <View style={styles.filters}>{(['all', 'active', 'suspended'] as const).map((value) => <PressableScale key={value} onPress={() => setFilter(value)} style={[styles.chip, { backgroundColor: filter === value ? colors.primary : colors.card, borderColor: colors.border }]}><AppText variant="labelSm" color={filter === value ? colors.primaryForeground : colors.foreground}>{t(value === 'all' ? 'adminAll' : value === 'active' ? 'adminActive' : 'adminSuspended')}</AppText></PressableScale>)}</View>
     <FlatList data={shown} scrollEnabled={false} keyExtractor={(item) => item.id} ListEmptyComponent={<EmptyState icon="people-outline" title={t('adminNoUsers')} description={t('adminNoUsersDesc')} />} renderItem={({ item }) => {
      const suspended = item.status === 'suspended';
       return <View style={[styles.card, isRTL && styles.rtl, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}><AppText variant="label" weight="bold">{item.displayName || item.email || t('adminUnknown')}</AppText><AppText variant="labelSm" color={colors.mutedForeground}>{item.email || t('adminNoEmail')}</AppText><AppText variant="labelSm" color={colors.mutedForeground} style={[styles.phone, { writingDirection: 'ltr' }]}>{item.phone || t('adminPhoneMissing')}</AppText><AppText variant="labelSm" color={suspended ? colors.destructive : colors.kashta}>{suspended ? t('adminSuspended') : t('adminActive')}{item.isHost ? ` · ${t('adminHostRole')}` : ''}{item.isAdmin ? ` · ${t('adminAdminRole')}` : ''}</AppText></View>
         <PressableScale accessibilityLabel={suspended ? t('adminUnsuspend') : t('adminSuspend')} disabled={Boolean(item.isAdmin) || busy === item.id} onPress={() => void toggle(item)} style={styles.action}><AppText variant="labelSm" color={item.isAdmin ? colors.mutedForeground : colors.primary}>{suspended ? t('adminUnsuspend') : t('adminSuspend')}</AppText></PressableScale>
      </View>;
    }} />
  </View>;
}

const styles = StyleSheet.create({ loader: { marginTop: 40 }, search: { minHeight: 44, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 }, filters: { flexDirection: 'row', gap: 8, marginBottom: 12 }, chip: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 }, card: { minHeight: 88, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }, rtl: { flexDirection: 'row-reverse' }, phone: { marginTop: 3 }, action: { minWidth: 70, minHeight: 44, alignItems: 'center', justifyContent: 'center' } });