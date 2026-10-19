import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { EmptyState } from '@/components/EmptyState';
import { PageLoader } from '@/components/PageLoader';
import { HostGate, HostHeader } from '@/components/host/HostGuard';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { deleteCampListing } from '@/lib/hostListings';
import { Camp, subscribeToHostListings } from '@/lib/firestore';
import { getLocationLabel } from '@/lib/locations';
import { formatPrice } from '@/lib/priceCalculations';
import { amenityLabel } from '@/lib/hostLabels';
import { notify, confirmDialog } from '@/lib/payments';

// Same fallback the web MyListings page uses for photo-less docs.
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';

function ListingsBody() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const { isRTL } = useI18n();
  const { user } = useAuth();
  const [camps, setCamps] = useState<Camp[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToHostListings(
      user.uid,
      (data) => setCamps(data),
      (err) => {
        console.error('[host] listings subscription error', err);
        notify(t('hostLoadError'));
        setCamps([]);
      }
    );
    return unsub;
  }, [user?.uid, t]);

  const onRefresh = useCallback(async () => {
    // The listener keeps data live; pull-to-refresh is a visual affordance only.
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const handleDelete = async (camp: Camp) => {
    const ok = await confirmDialog({
      title: t('hostDeleteTitle'),
      message: t('hostDeleteMsg', { title: camp.title }),
      confirmLabel: t('hostDeleteConfirm'),
      cancelLabel: t('hostKeepListing'),
    });
    if (!ok) return;
    try {
      setDeletingId(camp.id);
      await deleteCampListing(camp.id);
      notify(t('hostDeleted'));
    } catch (e) {
      console.error('[host] delete failed', e);
      notify(t('hostDeleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'active') return { text: t('statusActive'), bg: colors.successBg, fg: colors.success };
    if (status === 'pending') return { text: t('statusPendingReview'), bg: colors.primary + '22', fg: colors.primary };
    return { text: t('statusInactive'), bg: colors.muted, fg: colors.mutedForeground };
  };

  const renderItem = ({ item }: { item: Camp }) => {
    const badge = statusBadge(item.status || 'pending');
    const tentTotal =
      (item.tentConfiguration?.large || 0) +
      (item.tentConfiguration?.small || 0) +
      (item.tentConfiguration?.entertainment || 0);
    const isKashta = item.listingType === 'kashta';
    const amenities = item.amenities || [];

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View>
          <Image
            source={{ uri: item.images?.[0] || FALLBACK_IMAGE }}
            style={styles.cardImage}
            contentFit="cover"
            transition={150}
          />
          <View
            style={[
              styles.badge,
              { backgroundColor: badge.bg },
              isRTL ? { left: 10 } : { right: 10 },
            ]}
          >
            <AppText variant="labelSm" weight="bold" color={badge.fg}>
              {badge.text}
            </AppText>
          </View>
          {isKashta ? (
            <View style={[styles.typeBadge, { backgroundColor: colors.kashta }, isRTL ? { right: 10 } : { left: 10 }]}>
              <AppText variant="labelSm" weight="bold" color="#FFFFFF">{t('hostTypeKashta')}</AppText>
            </View>
          ) : null}
        </View>

        <View style={styles.cardBody}>
          <AppText variant="h3" numberOfLines={1} align={isRTL ? 'right' : 'left'}>
            {item.title}
          </AppText>
          <View style={[styles.metaRow, isRTL ? styles.rtlRow : null]}>
            <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
            <AppText variant="bodySm" color={colors.mutedForeground} numberOfLines={1}>
              {getLocationLabel(item.location)}
            </AppText>
          </View>
          {(item.rating || item.reviews) ? (
            <View style={[styles.metaRow, isRTL ? styles.rtlRow : null]}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <AppText variant="bodySm" weight="bold">
                {typeof item.rating === 'number' ? item.rating.toFixed(1) : '—'}
              </AppText>
              <AppText variant="bodySm" color={colors.mutedForeground}>
                ({item.reviews ?? 0})
              </AppText>
            </View>
          ) : null}
          <View style={[styles.metaRow, isRTL ? styles.rtlRow : null]}>
            <View style={[styles.metaChip, isRTL ? styles.rtlRow : null]}>
              <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
              <AppText variant="bodySm" color={colors.mutedForeground}>{String(item.maxGuests || 0)}</AppText>
            </View>
            {isKashta ? (
              <View style={[styles.metaChip, isRTL ? styles.rtlRow : null]}>
                <Ionicons name="grid-outline" size={14} color={colors.mutedForeground} />
                <AppText variant="bodySm" color={colors.mutedForeground}>
                  {String((item as unknown as { seatingCapacity?: number }).seatingCapacity || 0)}
                </AppText>
              </View>
            ) : (
              <View style={[styles.metaChip, isRTL ? styles.rtlRow : null]}>
                <Ionicons name="home-outline" size={14} color={colors.mutedForeground} />
                <AppText variant="bodySm" color={colors.mutedForeground}>{String(tentTotal)}</AppText>
              </View>
            )}
            <AppText variant="label" weight="bold" color={colors.primary}>
              {formatPrice(item.pricePerNight)}
            </AppText>
          </View>

          {amenities.length > 0 ? (
            <View style={[styles.amenityRow, isRTL ? styles.rtlRow : null]}>
              {amenities.slice(0, 3).map((a) => (
                <View key={a} style={[styles.amenityChip, { backgroundColor: colors.muted }]}>
                  <AppText variant="labelSm" color={colors.mutedForeground} numberOfLines={1}>
                    {amenityLabel(a, i18n.language)}
                  </AppText>
                </View>
              ))}
              {amenities.length > 3 ? (
                <AppText variant="labelSm" color={colors.mutedForeground}>
                  {t('hostMoreAmenities', { count: amenities.length - 3 })}
                </AppText>
              ) : null}
            </View>
          ) : null}

          <View style={[styles.actionsRow, { borderTopColor: colors.border }, isRTL ? styles.rtlRow : null]}>
            <PressableScale
              onPress={() => router.push(`/camp/${item.id}` as never)}
              style={[styles.actionBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="eye-outline" size={16} color={colors.foreground} />
              <AppText variant="labelSm">{t('hostView')}</AppText>
            </PressableScale>
            <PressableScale
              onPress={() => router.push(`/host/listing-form?id=${item.id}` as never)}
              style={[styles.actionBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="create-outline" size={16} color={colors.foreground} />
              <AppText variant="labelSm">{t('edit')}</AppText>
            </PressableScale>
            <PressableScale
              onPress={() => router.push(`/host/availability?campId=${item.id}` as never)}
              style={[styles.actionBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="time-outline" size={16} color={colors.foreground} />
              <AppText variant="labelSm">{t('hostActionAvailability')}</AppText>
            </PressableScale>
            <PressableScale
              onPress={() => handleDelete(item)}
              disabled={deletingId === item.id}
              style={[styles.actionBtn, { borderColor: colors.destructive + '55' }, deletingId === item.id ? { opacity: 0.5 } : null]}
            >
              <Ionicons name="trash-outline" size={16} color={colors.destructive} />
            </PressableScale>
          </View>
        </View>
      </View>
    );
  };

  if (camps === null) return <PageLoader />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HostHeader
        title={t('hostMyListings')}
        right={
          <PressableScale
            onPress={() => router.push('/host/listing-form' as never)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={22} color={colors.primaryForeground} />
          </PressableScale>
        }
      />
      {camps.length === 0 ? (
        <EmptyState
          icon="business-outline"
          title={t('hostNoListingsTitle')}
          description={t('hostNoListingsDesc')}
          action={
            <PressableScale
              onPress={() => router.push('/host/listing-form' as never)}
              style={[styles.createBtn, { backgroundColor: colors.primary }]}
            >
              <AppText variant="label" weight="bold" color={colors.primaryForeground}>
                {t('hostNewListing')}
              </AppText>
            </PressableScale>
          }
        />
      ) : (
        <FlatList
          data={camps}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}
    </View>
  );
}

export default function HostListingsScreen() {
  return (
    <HostGate>
      <ListingsBody />
    </HostGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  rtlRow: { flexDirection: 'row-reverse' },
  list: { padding: 16, paddingBottom: 48, gap: 16 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 150,
  },
  badge: {
    position: 'absolute',
    top: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  typeBadge: {
    position: 'absolute',
    top: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cardBody: {
    padding: 14,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginEnd: 4,
  },
  amenityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  amenityChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 120,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
