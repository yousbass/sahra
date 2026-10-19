import React, { useMemo, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import type { Camp } from '@/lib/firestore';

type Props = {
  camps: Camp[];
  onStatusChange: (camp: Camp, status: Camp['status']) => Promise<void>;
  onCoordinatesChange: (camp: Camp, coordinates: { lat: number; lng: number }) => Promise<void>;
  onRecalculateRatings?: () => Promise<void>;
};

export function AdminCampsSection({ camps, onStatusChange, onCoordinatesChange, onRecalculateRatings }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const { isRTL } = useI18n();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | Camp['status']>('all');
  const filtered = useMemo(() => camps.filter(camp => {
    const text = `${camp.title} ${camp.location} ${camp.hostName}`.toLowerCase();
    return (!query.trim() || text.includes(query.trim().toLowerCase())) && (status === 'all' || camp.status === status);
  }), [camps, query, status]);
  return <View>
    <TextInput value={query} onChangeText={setQuery} placeholder={t('adminCampSearch')} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]} />
    <View style={styles.filters}>{(['all', 'active', 'pending', 'inactive'] as const).map(value => <PressableScale key={value} onPress={() => setStatus(value)} style={[styles.chip, { borderColor: status === value ? colors.primary : colors.border, backgroundColor: status === value ? colors.primary + '18' : colors.card }]}><AppText variant="labelSm" color={status === value ? colors.primary : colors.foreground}>{t(value === 'all' ? 'adminAll' : `adminStatus${value[0].toUpperCase()}${value.slice(1)}`)}</AppText></PressableScale>)}</View>
    {onRecalculateRatings ? <PressableScale onPress={onRecalculateRatings} style={[styles.action, { backgroundColor: colors.primary }]}><AppText variant="label" color={colors.primaryForeground}>{t('adminRecalculateRatings')}</AppText></PressableScale> : null}
    {filtered.map(camp => <CampCard key={camp.id} camp={camp} colors={colors} t={t} isRTL={isRTL} onStatusChange={onStatusChange} onCoordinatesChange={onCoordinatesChange} />)}
    {!filtered.length ? <AppText color={colors.mutedForeground} style={styles.empty}>{t('adminNoResults')}</AppText> : null}
  </View>;
}

function CampCard({ camp, colors, t, isRTL, onStatusChange, onCoordinatesChange }: { camp: Camp; colors: any; t: any; isRTL: boolean; onStatusChange: Props['onStatusChange']; onCoordinatesChange: Props['onCoordinatesChange'] }) {
  const [lat, setLat] = useState(camp.coordinates?.lat?.toString() ?? '');
  const [lng, setLng] = useState(camp.coordinates?.lng?.toString() ?? '');
  const saveCoordinates = async () => {
    const coordinates = { lat: Number(lat), lng: Number(lng) };
    if (!Number.isFinite(coordinates.lat) || coordinates.lat < -90 || coordinates.lat > 90 || !Number.isFinite(coordinates.lng) || coordinates.lng < -180 || coordinates.lng > 180) {
      Alert.alert(t('adminInvalidCoordinates')); return;
    }
    await onCoordinatesChange(camp, coordinates);
  };
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <AppText variant="label" weight="bold">{camp.title}</AppText>
    <AppText variant="labelSm" color={colors.mutedForeground}>{camp.location} · {camp.hostName || t('adminUnknown')}</AppText>
    <AppText variant="labelSm" color={colors.primary}>{camp.rating?.toFixed(1) ?? '0.0'} ({camp.reviews ?? 0})</AppText>
    <View style={[styles.actions, isRTL && styles.rtl]}>{(['active', 'pending', 'inactive'] as const).map(next => <PressableScale key={next} onPress={() => onStatusChange(camp, next)} style={[styles.chip, { borderColor: camp.status === next ? colors.primary : colors.border }]}><AppText variant="labelSm">{t(`adminStatus${next[0].toUpperCase()}${next.slice(1)}`)}</AppText></PressableScale>)}</View>
    <AppText variant="labelSm" color={colors.mutedForeground}>{t('adminCoordinates')}</AppText>
    <View style={[styles.actions, isRTL && styles.rtl]}><TextInput keyboardType="decimal-pad" value={lat} onChangeText={setLat} placeholder={t('adminLatitude')} placeholderTextColor={colors.mutedForeground} style={[styles.smallInput, { color: colors.foreground, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]} /><TextInput keyboardType="decimal-pad" value={lng} onChangeText={setLng} placeholder={t('adminLongitude')} placeholderTextColor={colors.mutedForeground} style={[styles.smallInput, { color: colors.foreground, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]} /><PressableScale onPress={saveCoordinates} style={[styles.chip, styles.touch, { backgroundColor: colors.primary }]}><AppText variant="labelSm" color={colors.primaryForeground}>{t('adminSave')}</AppText></PressableScale></View>
  </View>;
}

const styles = { input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 }, filters: { flexDirection: 'row' as const, gap: 7, flexWrap: 'wrap' as const, marginBottom: 10 }, chip: { minHeight: 44, justifyContent: 'center' as const, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }, touch: { minHeight: 44 }, action: { minHeight: 46, borderRadius: 10, padding: 12, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 10 }, card: { borderWidth: 1, borderRadius: 14, padding: 13, gap: 7, marginBottom: 10 }, rtl: { flexDirection: 'row-reverse' as const }, actions: { flexDirection: 'row' as const, gap: 7, flexWrap: 'wrap' as const, alignItems: 'center' as const }, smallInput: { borderWidth: 1, borderRadius: 8, padding: 9, flex: 1, minWidth: 85 }, empty: { textAlign: 'center' as const, padding: 24 } };