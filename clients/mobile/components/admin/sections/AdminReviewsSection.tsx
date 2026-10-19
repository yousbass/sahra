import React, { useMemo, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import type { AdminReview } from '@/lib/adminContentApi';

type Props = { reviews: AdminReview[]; onFlag: (review: AdminReview, reason: string) => Promise<void>; onDelete: (review: AdminReview) => Promise<void> };
export function AdminReviewsSection({ reviews, onFlag, onDelete }: Props) {
  const colors = useColors(); const { t } = useTranslation(); const { isRTL } = useI18n(); const [query, setQuery] = useState(''); const [rating, setRating] = useState('all'); const [flagged, setFlagged] = useState('all');
  const filtered = useMemo(() => reviews.filter(r => (!query.trim() || `${r.userName} ${r.reviewText}`.toLowerCase().includes(query.trim().toLowerCase())) && (rating === 'all' || String(r.rating) === rating) && (flagged === 'all' || (flagged === 'flagged' ? r.flagged : !r.flagged))), [reviews, query, rating, flagged]);
  return <View>
    <TextInput value={query} onChangeText={setQuery} placeholder={t('adminReviewSearch')} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]} />
    <View style={styles.filters}>{['all', '5', '4', '3', '2', '1'].map(value => <PressableScale key={value} onPress={() => setRating(value)} style={[styles.chip, { borderColor: rating === value ? colors.primary : colors.border }]}><AppText variant="labelSm">{value === 'all' ? t('adminAllRatings') : `${value} ★`}</AppText></PressableScale>)}{['all', 'active', 'flagged'].map(value => <PressableScale key={value} onPress={() => setFlagged(value)} style={[styles.chip, { borderColor: flagged === value ? colors.primary : colors.border }]}><AppText variant="labelSm">{t(value === 'all' ? 'adminAll' : value === 'active' ? 'adminActive' : 'adminFlagged')}</AppText></PressableScale>)}</View>
    {filtered.map(review => <ReviewCard key={review.id} review={review} colors={colors} t={t} isRTL={isRTL} onFlag={onFlag} onDelete={onDelete} />)}
    {!filtered.length ? <AppText color={colors.mutedForeground} style={styles.empty}>{t('adminNoResults')}</AppText> : null}
  </View>;
}
function ReviewCard({ review, colors, t, isRTL, onFlag, onDelete }: { review: AdminReview; colors: any; t: any; isRTL: boolean; onFlag: Props['onFlag']; onDelete: Props['onDelete'] }) {
  const [reason, setReason] = useState('');
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><AppText variant="label" weight="bold">{review.userName} · {'★'.repeat(Math.max(0, Math.min(5, review.rating)))}</AppText><AppText variant="bodySm">{review.reviewText}</AppText><AppText variant="labelSm" color={review.flagged ? colors.destructive : colors.mutedForeground}>{review.flagged ? t('adminFlagged') : t('adminActive')}</AppText>{!review.flagged ? <><TextInput value={reason} onChangeText={setReason} placeholder={t('adminFlagReason')} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]} /><PressableScale disabled={!reason.trim()} onPress={() => onFlag(review, reason.trim())} style={[styles.chip, { backgroundColor: colors.primary }]}><AppText variant="labelSm" color={colors.primaryForeground}>{t('adminFlagReview')}</AppText></PressableScale></> : null}<PressableScale onPress={() => Alert.alert(t('adminDeleteReview'), t('adminDeleteWarning'), [{ text: t('cancel'), style: 'cancel' }, { text: t('delete'), style: 'destructive', onPress: () => onDelete(review) }])} style={[styles.chip, { borderColor: colors.destructive }]}><AppText variant="labelSm" color={colors.destructive}>{t('delete')}</AppText></PressableScale></View>;
}
const styles = { input: { minHeight: 44, borderWidth: 1, borderRadius: 10, padding: 11, marginBottom: 9 }, filters: { flexDirection: 'row' as const, gap: 7, flexWrap: 'wrap' as const, marginBottom: 10 }, chip: { minHeight: 44, justifyContent: 'center' as const, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, alignSelf: 'flex-start' as const }, card: { borderWidth: 1, borderRadius: 14, padding: 13, gap: 8, marginBottom: 10 }, rtl: { flexDirection: 'row-reverse' as const }, empty: { textAlign: 'center' as const, padding: 24 } };