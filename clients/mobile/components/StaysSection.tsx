import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { useFavorites } from '@/hooks/useFavorites';
import { getCamps, Camp } from '@/lib/firestore';
import { getLocationLabel } from '@/lib/locations';
import { AppText } from './AppText';
import { PageHero } from './PageHero';
import { FilterChip } from './FilterChip';
import { StayCard } from './StayCard';
import { SaduBand } from './SaduBand';
import { PageLoader } from './PageLoader';

interface StaysSectionProps {
  listingType: 'camp' | 'kashta';
  banner: any;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  titleKey: string;
  taglineKey: string;
  emptyIcon: keyof typeof Ionicons.glyphMap;
  testPrefix: string;
}

/** Price bands in BD per night (non-overlapping):
 *  all | under 30 | 30–60 inclusive | above 60. */
const PRICE_BANDS: ((price: number) => boolean)[] = [
  () => true,
  price => price < 30,
  price => price >= 30 && price <= 60,
  price => price > 60,
];

const GUEST_STEPS = [0, 4, 6, 8, 10, 15, 20];

/** Shared section screen for Desert Camps and Beach Kashtas: themed hero with
 *  search, sort + price + guests filter bands, and full-width stay cards. */
export function StaysSection({
  listingType, banner, icon, accent, titleKey, taglineKey, emptyIcon, testPrefix,
}: StaysSectionProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useScreenInsets();
  const { isRTL } = useI18n();
  const { favorites, toggleFavorite } = useFavorites();

  const [stays, setStays] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [sortIdx, setSortIdx] = useState(0);
  const [bandIdx, setBandIdx] = useState(0);
  const [guestsMin, setGuestsMin] = useState(0);

  const load = async () => {
    try {
      const all = await getCamps();
      setStays(all.filter(c => (c.listingType === 'kashta') === (listingType === 'kashta')));
    } catch (e) {
      console.error('Failed to load stays', e);
      setStays([]);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingType]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const band = PRICE_BANDS[bandIdx];
    const list = stays.filter(c => {
      if (q !== '') {
        const loc = (getLocationLabel(c.location) || c.location || '').toLowerCase();
        const hit =
          c.title.toLowerCase().includes(q) ||
          loc.includes(q) ||
          (c.location || '').toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (!band(c.pricePerNight)) return false;
      if (guestsMin > 0 && c.maxGuests < guestsMin) return false;
      return true;
    });
    const sorted = [...list];
    if (sortIdx === 0) sorted.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    else if (sortIdx === 1) sorted.sort((a, b) => a.pricePerNight - b.pricePerNight);
    else if (sortIdx === 2) sorted.sort((a, b) => b.pricePerNight - a.pricePerNight);
    else if (sortIdx === 3) sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return sorted;
  }, [stays, query, sortIdx, bandIdx, guestsMin]);

  const sortChips: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: t('sortNewest'), icon: 'time-outline' },
    { label: t('sortPriceLow'), icon: 'arrow-down-outline' },
    { label: t('sortPriceHigh'), icon: 'arrow-up-outline' },
    { label: t('topRated'), icon: 'star-outline' },
  ];

  const bandLabels = [
    t('all'),
    t('bandUnder', { n: 30 }),
    t('bandRange', { a: 30, b: 60 }),
    t('bandOver', { n: 60 }),
  ];

  if (loading) return <PageLoader />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHero
        banner={banner}
        icon={icon}
        accent={accent}
        title={t(titleKey)}
        tagline={t(taglineKey)}
        count={visible.length}
        searchPlaceholder={t('search')}
        query={query}
        onQueryChange={setQuery}
        testPrefix={testPrefix}
      />

      <SaduBand />

      {/* Filter bands */}
      <View style={[styles.filtersBand, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipsRow, isRTL ? styles.rtlRow : null]}
        >
          {sortChips.map((c, i) => (
            <FilterChip
              key={c.label}
              testID={`${testPrefix}-sort-${i}`}
              label={c.label}
              icon={c.icon}
              accent={accent}
              selected={sortIdx === i}
              onPress={() => setSortIdx(i)}
            />
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipsRow, { paddingTop: 0 }, isRTL ? styles.rtlRow : null]}
        >
          {bandLabels.map((label, i) => (
            <FilterChip
              key={`band-${i}`}
              testID={`${testPrefix}-band-${i}`}
              label={label}
              accent={accent}
              selected={bandIdx === i}
              onPress={() => setBandIdx(i)}
            />
          ))}
          <View style={[styles.vDivider, { backgroundColor: colors.border }]} />
          {GUEST_STEPS.map(n => (
            <FilterChip
              key={`guests-${n}`}
              testID={`${testPrefix}-guests-${n}`}
              label={n === 0 ? t('all') : `${n}+`}
              icon="people-outline"
              accent={accent}
              selected={guestsMin === n}
              onPress={() => setGuestsMin(n)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
          data={visible}
          keyExtractor={c => c.id}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 20 }}>
              <StayCard
                testID={`${testPrefix}-card-${item.id}`}
                camp={item}
                accent={accent}
                isFavorite={favorites.includes(item.id)}
                onToggleFavorite={toggleFavorite}
              />
            </View>
          )}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 28 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
                <Ionicons name={emptyIcon} size={26} color={colors.mutedForeground} />
              </View>
              <AppText variant="h3" weight="bold" style={{ marginTop: 14 }}>{t('noResults')}</AppText>
              <AppText variant="body" color={colors.mutedForeground} style={{ marginTop: 6, textAlign: 'center' }}>
                {t('noResultsDesc')}
              </AppText>
            </View>
          }
          ListFooterComponent={
            visible.length > 0 ? <SaduBand style={{ marginTop: 10, marginBottom: 8 }} /> : null
          }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  rtlRow: { flexDirection: 'row-reverse' },
  filtersBand: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chipsRow: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  vDivider: {
    width: 1,
    height: 22,
    marginHorizontal: 4,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 70,
  },
  emptyIcon: {
    width: 64, height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
