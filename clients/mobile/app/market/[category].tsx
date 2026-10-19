import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { AppText } from '@/components/AppText';
import { PageHero } from '@/components/PageHero';
import { FilterChip } from '@/components/FilterChip';
import { MarketItemCard } from '@/components/MarketItemCard';
import { MarketItemModal } from '@/components/MarketItemModal';
import { SaduBand } from '@/components/SaduBand';
import { marketItemsByCategory, MarketCategory, MarketItem } from '@/lib/marketplace';

/** Per-category personality: hero photo, icon and tagline. */
const CONFIG: Record<MarketCategory, {
  banner: any;
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  taglineKey: string;
}> = {
  food: {
    banner: require('../../assets/images/marketplace/karak-set.jpg'),
    icon: 'restaurant',
    titleKey: 'serviceCampFood',
    taglineKey: 'foodTagline',
  },
  firewood: {
    banner: require('../../assets/images/marketplace/firewood-bundle.jpg'),
    icon: 'bonfire',
    titleKey: 'serviceFirewood',
    taglineKey: 'firewoodTagline',
  },
  gear: {
    banner: require('../../assets/images/marketplace/string-lights.jpg'),
    icon: 'basket',
    titleKey: 'serviceGear',
    taglineKey: 'gearTagline',
  },
};

/** Price bands in BD for marketplace items (non-overlapping):
 *  all | under 5 | 5–15 inclusive | above 15. */
const PRICE_BANDS: ((price: number) => boolean)[] = [
  () => true,
  price => price < 5,
  price => price >= 5 && price <= 15,
  price => price > 15,
];

const matchesQuery = (item: MarketItem, q: string): boolean =>
  item.nameEn.toLowerCase().includes(q) ||
  item.nameAr.includes(q) ||
  item.descEn.toLowerCase().includes(q) ||
  item.descAr.includes(q);

const toRows = (items: MarketItem[]): MarketItem[][] => {
  const rows: MarketItem[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
};

/** One marketplace category as its own page: themed hero, sort + price
 *  filters, and the browse-only grid. */
export default function MarketCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useScreenInsets();
  const { isRTL } = useI18n();

  const [query, setQuery] = useState('');
  const [sortIdx, setSortIdx] = useState(0);
  const [bandIdx, setBandIdx] = useState(0);
  const [activeItem, setActiveItem] = useState<MarketItem | null>(null);

  const isValidCategory = category === 'food' || category === 'firewood' || category === 'gear';
  // Hooks must run unconditionally — fall back to 'food' until the redirect below.
  const cat: MarketCategory = isValidCategory ? (category as MarketCategory) : 'food';

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const band = PRICE_BANDS[bandIdx];
    const list = marketItemsByCategory(cat).filter(i =>
      (q === '' || matchesQuery(i, q)) && band(i.price)
    );
    const sorted = [...list];
    if (sortIdx === 1) sorted.sort((a, b) => a.price - b.price);
    else if (sortIdx === 2) sorted.sort((a, b) => b.price - a.price);
    return sorted;
  }, [cat, query, sortIdx, bandIdx]);

  if (!isValidCategory) return <Redirect href="/market" />;
  const cfg = CONFIG[cat];

  const sortChips: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: t('sortFeatured'), icon: 'sparkles-outline' },
    { label: t('sortPriceLow'), icon: 'arrow-down-outline' },
    { label: t('sortPriceHigh'), icon: 'arrow-up-outline' },
  ];

  const bandLabels = [
    t('all'),
    t('bandUnder', { n: 5 }),
    t('bandRange', { a: 5, b: 15 }),
    t('bandOver', { n: 15 }),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHero
        banner={cfg.banner}
        icon={cfg.icon}
        accent={colors.primary}
        title={t(cfg.titleKey)}
        tagline={t(cfg.taglineKey)}
        count={items.length}
        searchPlaceholder={t('marketSearchPlaceholder')}
        query={query}
        onQueryChange={setQuery}
        testPrefix={`market-${cat}`}
        backFallback="/market"
      />

      <SaduBand />

      {/* Sort + price filter band */}
      <View style={[styles.filtersBand, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipsRow, isRTL ? styles.rtlRow : null]}
        >
          {sortChips.map((c, i) => (
            <FilterChip
              key={c.label}
              testID={`market-${cat}-sort-${i}`}
              label={c.label}
              icon={c.icon}
              accent={colors.primary}
              selected={sortIdx === i}
              onPress={() => setSortIdx(i)}
            />
          ))}
          <View style={[styles.vDivider, { backgroundColor: colors.border }]} />
          {bandLabels.map((label, i) => (
            <FilterChip
              key={`band-${i}`}
              testID={`market-${cat}-band-${i}`}
              label={label}
              accent={colors.primary}
              selected={bandIdx === i}
              onPress={() => setBandIdx(i)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Browse-only notice */}
      <View style={[styles.noticeStrip, isRTL ? styles.rtlRow : null, { backgroundColor: 'rgba(240,160,60,0.12)', borderBottomColor: colors.border }]}>
        <Ionicons name="eye-outline" size={13} color={colors.primary} />
        <AppText variant="labelSm" color={colors.foreground} style={{ marginHorizontal: 6, opacity: 0.75 }} numberOfLines={1}>
          {t('marketplaceNote')}
        </AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 28 }}
      >
        {items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Ionicons name="search-outline" size={26} color={colors.mutedForeground} />
            </View>
            <AppText variant="h3" weight="bold" style={{ marginTop: 14 }}>{t('marketNoResults')}</AppText>
            <AppText variant="body" color={colors.mutedForeground} style={{ marginTop: 6, textAlign: 'center' }}>
              {t('marketNoResultsDesc')}
            </AppText>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            {toRows(items).map((row, ri) => (
              <View key={ri} style={[styles.gridRow, isRTL ? styles.rtlRow : null]}>
                {row.map(item => (
                  <MarketItemCard key={item.id} item={item} onPress={setActiveItem} />
                ))}
                {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
              </View>
            ))}
          </View>
        )}
        {items.length > 0 ? <SaduBand style={{ marginTop: 12, marginBottom: 8 }} /> : null}
      </ScrollView>

      <MarketItemModal item={activeItem} onClose={() => setActiveItem(null)} />
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
  noticeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
