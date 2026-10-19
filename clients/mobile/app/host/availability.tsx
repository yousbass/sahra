import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { PageLoader } from '@/components/PageLoader';
import { HostGate, HostHeader } from '@/components/host/HostGuard';
import { HostCalendar } from '@/components/host/HostCalendar';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCampsByHost,
  getBookedDatesForCamp,
  blockDatesForCamp,
  unblockDatesForCamp,
  BookingConflictError,
  BlockReasonCategory,
} from '@/lib/hostListings';
import { getBlockedDates, Camp, BlockedDate } from '@/lib/firestore';
import { BLOCK_REASONS } from '@/lib/hostLabels';
import { notify, confirmDialog } from '@/lib/payments';

const startOfDay = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};
const endOfDay = (d: Date) => {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
};

function AvailabilityBody() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const { isRTL } = useI18n();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ campId?: string }>();

  const [camps, setCamps] = useState<Camp[] | null>(null);
  const [selectedCampId, setSelectedCampId] = useState<string | null>(
    typeof params.campId === 'string' ? params.campId : null
  );
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [blocks, setBlocks] = useState<BlockedDate[]>([]);
  const [calLoading, setCalLoading] = useState(false);

  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [category, setCategory] = useState<BlockReasonCategory>('maintenance');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const loadCamps = async () => {
        if (!user) return;
        try {
          const result = await getCampsByHost(user.uid);
          if (!alive) return;
          setCamps(result);
          setSelectedCampId((prev) => {
            if (prev && result.some((c) => c.id === prev)) return prev;
            return result.length > 0 ? result[0].id : null;
          });
        } catch (e) {
          console.error('[host] availability camps load failed', e);
          if (alive) {
            notify(t('hostLoadError'));
            setCamps([]);
          }
        }
      };
      loadCamps();
      return () => {
        alive = false;
      };
    }, [user?.uid, t])
  );

  const loadCalendar = useCallback(async (campId: string) => {
    try {
      setCalLoading(true);
      const [booked, blocked] = await Promise.all([
        getBookedDatesForCamp(campId),
        getBlockedDates(campId),
      ]);
      setBookedDates(booked);
      setBlocks(blocked);
    } catch (e) {
      console.error('[host] availability calendar load failed', e);
      notify(t('hostLoadError'));
    } finally {
      setCalLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      if (selectedCampId) loadCalendar(selectedCampId);
    }, [selectedCampId, loadCalendar])
  );

  const onDayPress = (date: Date) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
    } else if (date.getTime() < rangeStart.getTime()) {
      setRangeStart(date);
    } else {
      setRangeEnd(date);
    }
  };

  const clearSelection = () => {
    setRangeStart(null);
    setRangeEnd(null);
  };

  const dayCount =
    rangeStart && rangeEnd
      ? Math.round((startOfDay(rangeEnd).getTime() - startOfDay(rangeStart).getTime()) / 86400000) + 1
      : rangeStart
        ? 1
        : 0;

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);

  const handleBlock = async () => {
    if (!user || !selectedCampId || !rangeStart) return;
    const end = rangeEnd || rangeStart;
    const reasonDef = BLOCK_REASONS.find((r) => r.value === category);
    // Web parity: persisted reason is the raw English label (or the host's
    // custom text when category is Other); UI shows the translated label.
    const reason = category === 'other' ? customReason.trim() : reasonDef?.label || 'Not specified';
    if (category === 'other' && !reason) {
      notify(t('hostCustomReason'));
      return;
    }
    try {
      setSaving(true);
      await blockDatesForCamp(
        selectedCampId,
        user.uid,
        { startDate: startOfDay(rangeStart), endDate: startOfDay(end) },
        reason,
        category,
        notes.trim() || undefined
      );
      notify(t('hostBlockedOk'));
      setSheetOpen(false);
      setCustomReason('');
      setNotes('');
      clearSelection();
      await loadCalendar(selectedCampId);
    } catch (e) {
      console.error('[host] block failed', e);
      if (e instanceof BookingConflictError) {
        notify(t('hostBlockConflict'));
      } else {
        notify(t('hostBlockFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (block: BlockedDate) => {
    const ok = await confirmDialog({
      title: t('hostUnblockTitle'),
      message: t('hostUnblockMsg'),
      confirmLabel: t('hostUnblockConfirm'),
      cancelLabel: t('cancel'),
    });
    if (!ok || !selectedCampId) return;
    try {
      setUnblockingId(block.id);
      await unblockDatesForCamp(block.id);
      notify(t('hostUnblocked'));
      await loadCalendar(selectedCampId);
    } catch (e) {
      console.error('[host] unblock failed', e);
      notify(t('hostUnblockFailed'));
    } finally {
      setUnblockingId(null);
    }
  };

  const blockReasonLabel = (block: BlockedDate) => {
    const def = BLOCK_REASONS.find((r) => r.value === (block.reasonCategory || ''));
    if (def && def.value !== 'other') return t(def.i18nKey);
    return block.reason || t('reasonOther');
  };

  const blockedRanges = blocks.map((b) => ({
    start: startOfDay(new Date(b.startDate)),
    end: endOfDay(new Date(b.endDate)),
  }));

  if (camps === null) return <PageLoader />;

  if (camps !== null && camps.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <HostHeader title={t('hostAvailabilityTitle')} />
        <EmptyState
          icon="business-outline"
          title={t('hostNoListingsTitle')}
          description={t('hostNoListingsForAvailability')}
          action={
            <PressableScale
              onPress={() => router.push('/host/listing-form' as never)}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              <AppText variant="label" weight="bold" color={colors.primaryForeground}>
                {t('hostNewListing')}
              </AppText>
            </PressableScale>
          }
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HostHeader title={t('hostAvailabilityTitle')} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <>
            <AppText variant="labelSm" color={colors.mutedForeground}>
              {t('hostSelectListing')}
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.chipsRow, isRTL ? styles.rtlRow : null]}
            >
              {camps.map((camp) => {
                const active = camp.id === selectedCampId;
                return (
                  <PressableScale
                    key={camp.id}
                    onPress={() => {
                      setSelectedCampId(camp.id);
                      clearSelection();
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <AppText
                      variant="labelSm"
                      weight={active ? 'bold' : 'regular'}
                      color={active ? colors.primaryForeground : colors.foreground}
                      numberOfLines={1}
                    >
                      {camp.title}
                    </AppText>
                  </PressableScale>
                );
              })}
            </ScrollView>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {calLoading ? (
                <View style={styles.calSkeleton}>
                  <Skeleton height={300} borderRadius={12} />
                </View>
              ) : (
                <HostCalendar
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  onDayPress={onDayPress}
                  bookedDates={bookedDates}
                  blockedRanges={blockedRanges}
                />
              )}
            </View>

            <View style={[styles.legendRow, isRTL ? styles.rtlRow : null]}>
              <View style={[styles.legendItem, isRTL ? styles.rtlRow : null]}>
                <View style={[styles.legendSwatch, { borderColor: colors.border, borderWidth: 1 }]} />
                <AppText variant="labelSm" color={colors.mutedForeground}>{t('legendAvailable')}</AppText>
              </View>
              <View style={[styles.legendItem, isRTL ? styles.rtlRow : null]}>
                <View style={[styles.legendSwatch, { backgroundColor: colors.destructive }]} />
                <AppText variant="labelSm" color={colors.mutedForeground}>{t('legendBooked')}</AppText>
              </View>
              <View style={[styles.legendItem, isRTL ? styles.rtlRow : null]}>
                <View style={[styles.legendSwatch, { backgroundColor: colors.muted }]} />
                <AppText variant="labelSm" color={colors.mutedForeground}>{t('legendBlocked')}</AppText>
              </View>
              <View style={[styles.legendItem, isRTL ? styles.rtlRow : null]}>
                <View style={[styles.legendSwatch, { backgroundColor: colors.primary }]} />
                <AppText variant="labelSm" color={colors.mutedForeground}>{t('legendSelected')}</AppText>
              </View>
            </View>

            <AppText variant="bodySm" color={colors.mutedForeground}>
              {t('hostBlockHint')}
            </AppText>

            {rangeStart ? (
              <View style={[styles.selectionCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '40' }]}>
                <AppText variant="label" weight="bold">
                  {t('hostSelectedRange', {
                    start: fmtDate(rangeStart),
                    end: fmtDate(rangeEnd || rangeStart),
                  })}
                </AppText>
                <AppText variant="bodySm" color={colors.mutedForeground}>
                  {t('hostDayCount', { count: dayCount })}
                </AppText>
                <View style={[styles.selectionActions, isRTL ? styles.rtlRow : null]}>
                  <PressableScale
                    onPress={clearSelection}
                    style={[styles.outlineBtn, { borderColor: colors.border }]}
                  >
                    <AppText variant="labelSm">{t('hostClearSelection')}</AppText>
                  </PressableScale>
                  <PressableScale
                    onPress={() => setSheetOpen(true)}
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                  >
                    <AppText variant="labelSm" weight="bold" color={colors.primaryForeground}>
                      {t('hostBlockDatesBtn')}
                    </AppText>
                  </PressableScale>
                </View>
              </View>
            ) : null}

            <AppText variant="h3" style={styles.blockedTitle}>{t('hostBlockedList')}</AppText>
            {blocks.length === 0 ? (
              <AppText variant="bodySm" color={colors.mutedForeground}>
                {t('hostNoBlocks')}
              </AppText>
            ) : (
              <View style={styles.blockedList}>
                {blocks.map((block) => (
                  <View
                    key={block.id}
                    style={[styles.blockRow, { backgroundColor: colors.card, borderColor: colors.border }, isRTL ? styles.rtlRow : null]}
                  >
                    <View style={[styles.blockInfo, isRTL ? { alignItems: 'flex-end' } : null]}>
                      <AppText variant="label" weight="bold">
                        {fmtDate(new Date(block.startDate))} — {fmtDate(new Date(block.endDate))}
                      </AppText>
                      <AppText variant="bodySm" color={colors.mutedForeground}>
                        {blockReasonLabel(block)}
                      </AppText>
                      {block.notes ? (
                        <AppText variant="bodySm" color={colors.mutedForeground} numberOfLines={2}>
                          {block.notes}
                        </AppText>
                      ) : null}
                    </View>
                    <PressableScale
                      onPress={() => handleUnblock(block)}
                      disabled={unblockingId === block.id}
                      style={[
                        styles.outlineBtn,
                        { borderColor: colors.destructive + '55' },
                        unblockingId === block.id ? { opacity: 0.5 } : null,
                      ]}
                    >
                      <AppText variant="labelSm" color={colors.destructive}>
                        {t('hostUnblock')}
                      </AppText>
                    </PressableScale>
                  </View>
                ))}
              </View>
            )}
        </>
      </ScrollView>

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrap}
        >
          <View style={styles.modalBackdrop}>
            <PressableScale style={styles.backdropTouch} onPress={() => setSheetOpen(false)}>
              <View />
            </PressableScale>
            <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <AppText variant="h3">{t('hostBlockDatesBtn')}</AppText>
              {rangeStart ? (
                <AppText variant="bodySm" color={colors.mutedForeground}>
                  {t('hostSelectedRange', {
                    start: fmtDate(rangeStart),
                    end: fmtDate(rangeEnd || rangeStart),
                  })}
                </AppText>
              ) : null}

              <AppText variant="labelSm" color={colors.mutedForeground} style={styles.sheetLabel}>
                {t('hostBlockReason')}
              </AppText>
              <View style={[styles.reasonGrid, isRTL ? styles.rtlRow : null]}>
                {BLOCK_REASONS.map((r) => {
                  const active = category === r.value;
                  return (
                    <PressableScale
                      key={r.value}
                      onPress={() => setCategory(r.value)}
                      style={[
                        styles.reasonChip,
                        {
                          backgroundColor: active ? colors.primary : colors.card,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <AppText
                        variant="labelSm"
                        weight={active ? 'bold' : 'regular'}
                        color={active ? colors.primaryForeground : colors.foreground}
                      >
                        {t(r.i18nKey)}
                      </AppText>
                    </PressableScale>
                  );
                })}
              </View>

              {category === 'other' ? (
                <>
                  <AppText variant="labelSm" color={colors.mutedForeground} style={styles.sheetLabel}>
                    {t('hostCustomReason')}
                  </AppText>
                  <TextInput
                    value={customReason}
                    onChangeText={setCustomReason}
                    placeholder={t('hostCustomReasonPlaceholder')}
                    placeholderTextColor={colors.mutedForeground}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        color: colors.foreground,
                        textAlign: isRTL ? 'right' : 'left',
                      },
                    ]}
                  />
                </>
              ) : null}

              <AppText variant="labelSm" color={colors.mutedForeground} style={styles.sheetLabel}>
                {t('hostNotesLabel')}
              </AppText>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={t('hostNotesPlaceholder')}
                placeholderTextColor={colors.mutedForeground}
                multiline
                style={[
                  styles.input,
                  styles.notesInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                    textAlign: isRTL ? 'right' : 'left',
                  },
                ]}
              />

              <PressableScale
                onPress={handleBlock}
                disabled={saving}
                style={[styles.confirmBtn, { backgroundColor: colors.primary }, saving ? { opacity: 0.6 } : null]}
              >
                <AppText variant="label" weight="bold" color={colors.primaryForeground}>
                  {saving ? t('hostSubmitting') : t('hostConfirmBlock')}
                </AppText>
              </PressableScale>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

export default function HostAvailabilityScreen() {
  return (
    <HostGate>
      <AvailabilityBody />
    </HostGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  rtlRow: { flexDirection: 'row-reverse' },
  scroll: { padding: 16, paddingBottom: 64, gap: 12 },
  skeletons: { gap: 12 },
  chipsRow: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 200,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
  },
  calSkeleton: { padding: 12 },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  selectionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  outlineBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  blockedTitle: { marginTop: 8 },
  blockedList: { gap: 10 },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  blockInfo: { flex: 1, gap: 2 },
  modalWrap: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 17, 40, 0.55)',
    justifyContent: 'flex-end',
  },
  backdropTouch: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 36,
    gap: 8,
  },
  sheetLabel: { marginTop: 8 },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  notesInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  confirmBtn: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
