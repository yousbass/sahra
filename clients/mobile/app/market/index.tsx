import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { PageHero } from '@/components/PageHero';
import { MarketItemCard } from '@/components/MarketItemCard';
import { MarketItemModal } from '@/components/MarketItemModal';
import { SaduBand } from '@/components/SaduBand';
import { MARKET_ITEMS, MarketCategory, MarketItem } from '@/lib/marketplace';

const nightTexture = require('../../assets/images/texture-night.jpg');

const SECTIONS: { cat: MarketCategory; labelKey: string; tileIcon: keyof typeof Ionicons.glyphMap; tileImage: any }[] = [
  { cat: 'food', labelKey: 'serviceCampFood', tileIcon: 'restaurant', tileImage: require('../../assets/images/marketplace/karak-set.jpg') },
  { cat: 'firewood', labelKey: 'serviceFirewood', tileIcon: 'bonfire', tileImage: require('../../assets/images/marketplace/firewood-bundle.jpg') },
  { cat: 'gear', labelKey: 'serviceGear', tileIcon: 'basket', tileImage: require('../../assets/images/marketplace/string-lights.jpg') },
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

/** Marketplace hub: global search across everything, category tiles that open
 *  the dedicated section pages, and the full browse-only catalog. */
export default function MarketScreen() {
  const { cat: catParam } = useLocalSearchParams<{ cat?: string }>();
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useScreenInsets();
  const { isRTL } = useI18n();

  const [query, setQuery] = useState('');
  const [activeItem, setActiveItem] = useState<MarketItem | null>(null);

  // Legacy deep links (/market?cat=food) land on the dedicated category page.
  useEffect(() => {
    if (catParam === 'food' || catParam === 'firewood' || catParam === 'gear') {
      router.replace(`/market/${catParam}`);
    }
  }, [catParam]);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SECTIONS
      .map(s => ({
        ...s,
        items: MARKET_ITEMS.filter(i => i.category === s.cat && (q === '' || matchesQuery(i, q))),
      }))
      .filter(s => s.items.length > 0);
  }, [query]);

  const noResults = sections.length === 0;
  const total = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHero
        banner={nightTexture}
        icon="storefront"
        accent={colors.primary}
        title={t('marketTitle')}
        tagline={t('marketBrowseTagline')}
        count={total}
        searchPlaceholder={t('marketSearchPlaceholder')}
        query={query}
        onQueryChange={setQuery}
        testPrefix="market"
      />

      <SaduBand />

      {/* Category tiles — each opens its own page */}
      <View style={[styles.tilesBand, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.tilesRow, isRTL ? styles.rtlRow : null]}>
          {SECTIONS.map(s => (
            <PressableScale
              key={s.cat}
              testID={`market-tile-${s.cat}`}
              onPress={() => router.push(`/market/${s.cat}`)}
              style={[styles.tile, { borderColor: colors.border }]}
            >
              <Image source={s.tileImage} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
              <LinearGradient colors={['rgba(10,17,40,0.35)', 'rgba(10,17,40,0.85)']} style={StyleSheet.absoluteFill} />
              <View style={styles.tileContent}>
                <Ionicons name={s.tileIcon} size={18} color={colors.primary} />
                <AppText variant="labelSm" color="#FFF" weight="bold" numberOfLines={1} style={{ marginTop: 5 }}>
                  {t(s.labelKey)}
                </AppText>
              </View>
            </PressableScale>
          ))}
        </View>
      </View>

      {/* Browse-only notice strip */}
      <View style={[styles.noticeStrip, isRTL ? styles.rtlRow : null, { backgroundColor: 'rgba(240,160,60,0.12)', borderBottomColor: colors.border }]}>
        <Ionicons name="eye-outline" size={13} color={colors.primary} />
        <AppText variant="labelSm" color={colors.foreground} style={{ marginHorizontal: 6, opacity: 0.75 }} numberOfLines={1}>
          {t('marketplaceNote')}
        </AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
      >
        {noResults ? (
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
          sections.map(section => (
            <View key={section.cat}>
              <View style={[styles.sectionHeader, isRTL ? styles.rtlRow : null]}>
                <View style={[styles.sectionTitleRow, isRTL ? styles.rtlRow : null]}>
                  <AppText variant="h3" weight="bold">{t(section.labelKey)}</AppText>
                  <View style={[styles.countPill, { backgroundColor: colors.muted }]}>
                    <AppText variant="labelSm" color={colors.mutedForeground} weight="semibold">{section.items.length}</AppText>
                  </View>
                </View>
                <TouchableOpacity
                  testID={`market-seeall-${section.cat}`}
                  onPress={() => router.push(`/market/${section.cat}`)}
                  hitSlop={8}
                  style={[styles.seeAllBtn, isRTL ? styles.rtlRow : null]}
                >
                  <AppText variant="labelSm" color={colors.primary} weight="bold">{t('seeAll')}</AppText>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={13} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={{ paddingHorizontal: 20 }}>
                {toRows(section.items).map((row, ri) => (
                  <View key={ri} style={[styles.gridRow, isRTL ? styles.rtlRow : null]}>
                    {row.map(item => (
                      <MarketItemCard key={item.id} item={item} onPress={setActiveItem} />
                    ))}
                    {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
        {!noResults ? <SaduBand style={{ marginTop: 16, marginBottom: 8 }} /> : null}
      </ScrollView>

      <MarketItemModal item={activeItem} onClose={() => setActiveItem(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  rtlRow: { flexDirection: 'row-reverse' },
  tilesBand: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tilesRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  tile: {
    flex: 1,
    height: 84,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tileContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  noticeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countPill: {
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
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
