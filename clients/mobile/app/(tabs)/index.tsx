import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ScrollView, Animated, ImageBackground } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { getCamps, getBookingsByUser, Camp, Booking } from '@/lib/firestore';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { SectionHeader } from '@/components/SectionHeader';
import { PageLoader } from '@/components/PageLoader';
import { useFavorites } from '@/hooks/useFavorites';
import { TopRatedCard } from '@/components/TopRatedCard';
import { SaduBand } from '@/components/SaduBand';
import { PatternSadu } from '@/components/BackgroundPatterns';
import { MarketItem, marketItemsByCategory } from '@/lib/marketplace';
import { MarketItemModal } from '@/components/MarketItemModal';
import { getDepartureDate } from '@/lib/bookingDates';

const desertBanner = require('../../assets/images/banner-desert.jpg');
const beachBanner = require('../../assets/images/banner-beach.jpg');
const nightTexture = require('../../assets/images/texture-night.jpg');

const HEADER_ABSOLUTE_HEIGHT = 180;
const SCROLL_DISTANCE = 84;

/** Camping season in Bahrain runs Oct 15 – Apr 15. */
function isSeasonOpen(now: Date): boolean {
  const m = now.getMonth() + 1;
  const d = now.getDate();
  if (m > 10 || (m === 10 && d >= 15)) return true;
  if (m < 4 || (m === 4 && d <= 15)) return true;
  return false;
}

const FOOD_ITEMS = marketItemsByCategory('food');
const SUPPLY_ITEMS = [...marketItemsByCategory('firewood'), ...marketItemsByCategory('gear')];

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useScreenInsets();
  const { isRTL } = useI18n();
  const { user } = useAuth();
  const { favorites } = useFavorites();

  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campsError, setCampsError] = useState(false);
  const [upcoming, setUpcoming] = useState<Booking | null>(null);
  const [upcomingError, setUpcomingError] = useState(false);
  const [activeItem, setActiveItem] = useState<MarketItem | null>(null);
  const isAr = (i18n.language || 'en').startsWith('ar');

  const scrollY = useRef(new Animated.Value(0)).current;

  const loadCamps = async () => {
    try {
      const data = await getCamps();
      setCamps(data);
      setCampsError(false);
    } catch (e) {
      console.log('Error loading camps', e);
      // getCamps() only throws when Firestore has no cached data to serve,
      // so showing the error banner is always correct here.
      setCampsError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUpcoming = useCallback(async () => {
    if (!user?.uid) {
      setUpcoming(null);
      setUpcomingError(false);
      return;
    }
    try {
      const bookings = await getBookingsByUser(user.uid);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const next = bookings
        .filter(b => b.status === 'confirmed' && getDepartureDate(b) >= startOfToday)
        .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate))[0];
      setUpcoming(next || null);
      setUpcomingError(false);
    } catch (e) {
      console.log('Error loading upcoming booking', e);
      setUpcomingError(true);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadCamps();
  }, []);

  useEffect(() => {
    loadUpcoming();
  }, [loadUpcoming]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCamps();
    loadUpcoming();
  };

  const goSearch = () => router.navigate('/(tabs)/search');
  const goType = (type: 'camp' | 'kashta') =>
    router.push(type === 'kashta' ? '/kashtas' : '/camps');
  const goFavorites = () =>
    router.navigate({ pathname: '/(tabs)/search', params: { favorites: '1', ts: String(Date.now()) } });

  const topRated = camps
    .filter(c => (c.rating || 0) > 0)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5);

  const favoriteCamps = camps.filter(c => favorites.includes(c.id)).slice(0, 10);

  const renderTopRated = useCallback(
    ({ item }: { item: Camp }) => (
      <TopRatedCard item={item} style={{ marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }} />
    ),
    [isRTL]
  );

  const renderMarketItem = useCallback(
    ({ item }: { item: MarketItem }) => (
      <PressableScale
        onPress={() => setActiveItem(item)}
        style={[
          styles.marketCard,
          { backgroundColor: colors.card, borderColor: colors.border, marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 },
        ]}
      >
        <View style={styles.marketImageWrap}>
          <Image source={item.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          <View style={[styles.marketBadge, isRTL ? styles.marketBadgeRtl : null]}>
            <AppText variant="labelSm" color="#FFF" weight="semibold" style={{ fontSize: 12 }}>{t('comingSoon')}</AppText>
          </View>
        </View>
        <View style={{ padding: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <AppText variant="label" weight="semibold" numberOfLines={1}>{isAr ? item.nameAr : item.nameEn}</AppText>
          <View style={[styles.priceRow, isRTL ? styles.rtlRow : null]}>
            <AppText variant="label" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
              {item.price} {isAr ? 'د.ب' : 'BD'}
            </AppText>
            <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginHorizontal: 4 }}>
              / {isAr ? item.unitAr : item.unitEn}
            </AppText>
          </View>
          {item.category !== 'food' ? (
            <View style={[styles.marketCatChip, { backgroundColor: colors.muted }]}>
              <AppText variant="labelSm" color={colors.mutedForeground} weight="semibold" style={{ fontSize: 12 }}>
                {t(item.category === 'firewood' ? 'serviceFirewood' : 'serviceGear')}
              </AppText>
            </View>
          ) : null}
        </View>
      </PressableScale>
    ),
    [isRTL, isAr, colors, t]
  );

  const seasonOpen = isSeasonOpen(new Date());

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE],
    outputRange: [0, -SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  const textTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE],
    outputRange: [0, -40],
    extrapolate: 'clamp',
  });

  const textOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const checkInDate = upcoming ? new Date(upcoming.checkInDate) : null;

  if (loading) return <PageLoader />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <Animated.View style={[styles.headerBg, { height: HEADER_ABSOLUTE_HEIGHT + insets.top, transform: [{ translateY: headerTranslateY }] }]}>
        <ImageBackground source={nightTexture} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.9 }} />
        <LinearGradient colors={['rgba(10,17,40,0.6)', 'rgba(10,17,40,1)']} style={StyleSheet.absoluteFill} />
        <PatternSadu color="#FDFBF7" opacity={0.08} />
      </Animated.View>

      <Animated.View style={[
        styles.headerTextContainer,
        isRTL ? styles.rtlRow : null,
        { top: insets.top + 16, opacity: textOpacity, transform: [{ translateY: textTranslateY }] }
      ]}>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <AppText variant="label" color={colors.primary} weight="bold" style={{ letterSpacing: 2 }}>{t('greeting').toUpperCase()}</AppText>
          <AppText variant="h1" color="#FFF" weight="bold" style={{ fontSize: 32, marginTop: 4 }}>MUKHYMAT</AppText>
        </View>
      </Animated.View>

      <Animated.View style={[
        styles.searchBarWrapper,
        { top: insets.top + 100, transform: [{ translateY: headerTranslateY }] }
      ]}>
        <PressableScale
          onPress={goSearch}
          style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }, isRTL ? styles.rtlRow : null]}
        >
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <AppText variant="body" color={colors.mutedForeground} style={{ flex: 1, marginHorizontal: 10 }} numberOfLines={1}>
            {t('search')}
          </AppText>
          <View style={[styles.searchGoBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={16} color={colors.primaryForeground} />
          </View>
        </PressableScale>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={{ paddingTop: HEADER_ABSOLUTE_HEIGHT + insets.top + 20, paddingBottom: insets.bottom + 110 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} progressViewOffset={HEADER_ABSOLUTE_HEIGHT + insets.top} />
        }
      >
        <View style={[styles.seasonRow, isRTL ? styles.rtlRow : null, { backgroundColor: colors.muted, alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
          <View style={[styles.seasonDot, { backgroundColor: seasonOpen ? '#4C9F70' : colors.mutedForeground }]} />
          <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginHorizontal: 6 }}>
            {seasonOpen ? t('seasonOpenLine') : t('seasonClosedLine')}
          </AppText>
        </View>

        {upcomingError ? (
          <View style={[styles.upcomingCard, styles.upcomingErrorCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <View style={[styles.upcomingInner, isRTL ? styles.rtlRow : null]}>
              <Ionicons name="cloud-offline-outline" size={22} color={colors.mutedForeground} />
              <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginHorizontal: 12, flex: 1 }}>
                {t('upcomingTripLoadError')}
              </AppText>
              <PressableScale onPress={loadUpcoming}>
                <AppText variant="labelSm" weight="bold" color={colors.primary}>{t('retry')}</AppText>
              </PressableScale>
            </View>
          </View>
        ) : upcoming && checkInDate ? (
          <PressableScale
            onPress={() => router.navigate('/(tabs)/bookings')}
            style={[styles.upcomingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.upcomingInner, isRTL ? styles.rtlRow : null]}>
              <View style={[styles.upcomingDateBox, { backgroundColor: colors.primary }]}>
                <AppText variant="h2" color="#0A1128" weight="bold">{checkInDate.getDate()}</AppText>
                <AppText variant="labelSm" color="#0A1128" weight="semibold">
                  {checkInDate.toLocaleString(i18n.language, { month: 'short' })}
                </AppText>
              </View>
              <View style={{ flex: 1, marginHorizontal: 14, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <AppText variant="labelSm" color={colors.primary} weight="bold" style={{ letterSpacing: 1 }}>
                  {t('upcomingTrip').toUpperCase()}
                </AppText>
                <AppText variant="h3" weight="bold" numberOfLines={1} style={{ marginTop: 4 }}>{upcoming.campTitle}</AppText>
                <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginTop: 2 }}>
                  {checkInDate.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}
                </AppText>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.mutedForeground} />
            </View>
          </PressableScale>
        ) : null}

        <SectionHeader title={t('bookNow')} style={{ marginTop: 8 }} />

        <View style={[styles.categories, isRTL ? styles.rtlRow : null]}>
          <PressableScale onPress={() => goType('camp')} style={styles.categoryCard}>
            <Image source={desertBanner} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={['transparent', 'rgba(10,17,40,0.9)']} style={StyleSheet.absoluteFill} />
            <View style={styles.categoryContent}>
              <View style={styles.iconCircle}>
                <Ionicons name="bonfire" size={24} color={colors.primary} />
              </View>
              <View>
                <AppText variant="h3" color="#FFF" weight="bold">{t('desertCamps')}</AppText>
                <AppText variant="labelSm" color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }}>
                  {camps.filter(c => c.listingType === 'camp').length} {t('camps')}
                </AppText>
              </View>
            </View>
          </PressableScale>

          <PressableScale onPress={() => goType('kashta')} style={styles.categoryCard}>
            <Image source={beachBanner} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={['transparent', 'rgba(10,17,40,0.9)']} style={StyleSheet.absoluteFill} />
            <View style={styles.categoryContent}>
              <View style={styles.iconCircle}>
                <Ionicons name="water" size={24} color={colors.kashta} />
              </View>
              <View>
                <AppText variant="h3" color="#FFF" weight="bold">{t('beachSpots')}</AppText>
                <AppText variant="labelSm" color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }}>
                  {camps.filter(c => c.listingType === 'kashta').length} {t('kashtas')}
                </AppText>
              </View>
            </View>
          </PressableScale>
        </View>

        <View style={[styles.catTileRow, isRTL ? styles.rtlRow : null]}>
          {([
            { cat: 'food', icon: 'fast-food-outline', labelKey: 'serviceCampFood' },
            { cat: 'firewood', icon: 'flame-outline', labelKey: 'serviceFirewood' },
            { cat: 'gear', icon: 'bag-handle-outline', labelKey: 'serviceGear' },
          ] as const).map(tile => (
            <PressableScale
              key={tile.cat}
              testID={`home-market-tile-${tile.cat}`}
              onPress={() => router.push(`/market/${tile.cat}`)}
              style={[styles.catTile, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.catTileIcon, { backgroundColor: 'rgba(240, 160, 60, 0.16)' }]}>
                <Ionicons name={tile.icon} size={20} color={colors.primary} />
              </View>
              <AppText variant="labelSm" weight="semibold" numberOfLines={1} style={{ marginTop: 8 }}>
                {t(tile.labelKey)}
              </AppText>
            </PressableScale>
          ))}
        </View>

        <View style={{ marginTop: 10 }}>
          <View style={[styles.railHeader, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <AppText variant="h3" weight="bold">{t('hungryTitle')}</AppText>
            <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginTop: 3 }}>{t('hungrySubtitle')}</AppText>
            <View style={[styles.noteChip, isRTL ? styles.rtlRow : null, { backgroundColor: colors.muted }]}>
              <Ionicons name="eye-outline" size={12} color={colors.mutedForeground} />
              <AppText variant="labelSm" color={colors.mutedForeground} weight="semibold" style={{ marginHorizontal: 5, fontSize: 12 }}>
                {t('marketplaceNote')}
              </AppText>
            </View>
          </View>
          <FlatList
            horizontal
            data={FOOD_ITEMS}
            renderItem={renderMarketItem}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.horizontalList, isRTL ? { flexDirection: 'row-reverse' } : null]}
          />
        </View>

        <View style={{ marginTop: 18 }}>
          <View style={[styles.railHeader, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <AppText variant="h3" weight="bold">{t('suppliesTitle')}</AppText>
            <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginTop: 3 }}>{t('suppliesSubtitle')}</AppText>
            <View style={[styles.noteChip, isRTL ? styles.rtlRow : null, { backgroundColor: colors.muted }]}>
              <Ionicons name="eye-outline" size={12} color={colors.mutedForeground} />
              <AppText variant="labelSm" color={colors.mutedForeground} weight="semibold" style={{ marginHorizontal: 5, fontSize: 12 }}>
                {t('marketplaceNote')}
              </AppText>
            </View>
          </View>
          <FlatList
            horizontal
            data={SUPPLY_ITEMS}
            renderItem={renderMarketItem}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.horizontalList, isRTL ? { flexDirection: 'row-reverse' } : null]}
          />
        </View>

        <SaduBand style={{ marginHorizontal: 20, marginTop: 18, marginBottom: 2 }} />

        {favoriteCamps.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            <SectionHeader title={t('yourFavorites')} actionText={t('seeAll')} onAction={goFavorites} />
            <FlatList
              horizontal
              data={favoriteCamps}
              renderItem={renderTopRated}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.horizontalList, isRTL ? { flexDirection: 'row-reverse' } : null]}
            />
          </View>
        ) : null}

        {campsError && !loading ? (
          <View style={[styles.campsErrorBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.campsErrorInner, isRTL ? styles.rtlRow : null]}>
              <View style={[styles.campsErrorIcon, { backgroundColor: colors.muted }]}>
                <Ionicons name="cloud-offline-outline" size={24} color={colors.mutedForeground} />
              </View>
              <View style={{ flex: 1, marginHorizontal: 14, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <AppText variant="label" weight="bold">{t('campsLoadError')}</AppText>
                <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginTop: 3 }}>
                  {t('campsLoadErrorDesc')}
                </AppText>
              </View>
              <PressableScale
                onPress={() => { setLoading(true); loadCamps(); }}
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              >
                <AppText variant="labelSm" weight="bold" color={colors.primaryForeground}>{t('retry')}</AppText>
              </PressableScale>
            </View>
          </View>
        ) : topRated.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            <SectionHeader title={t('topRated')} actionText={t('browseAll')} onAction={goSearch} />
            <FlatList
                horizontal
                data={topRated}
                renderItem={renderTopRated}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.horizontalList, isRTL ? { flexDirection: 'row-reverse' } : null]}
            />
          </View>
        ) : null}
      </Animated.ScrollView>

      <MarketItemModal item={activeItem} onClose={() => setActiveItem(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  rtlRow: { flexDirection: 'row-reverse' },
  headerBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 1,
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: '#0A1128',
  },
  headerTextContainer: {
    position: 'absolute',
    left: 20, right: 20,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBarWrapper: {
    position: 'absolute',
    left: 20, right: 20,
    zIndex: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  searchGoBtn: {
    width: 28, height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  seasonDot: {
    width: 8, height: 8,
    borderRadius: 4,
  },
  upcomingCard: {
    marginHorizontal: 20,
    marginBottom: 6,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  upcomingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  upcomingDateBox: {
    width: 58, height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categories: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 12,
  },
  categoryCard: {
    flex: 1,
    height: 170,
    borderRadius: 24,
    overflow: 'hidden',
  },
  categoryContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
  },
  iconCircle: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(253, 251, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  railHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  noteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  marketCard: {
    width: 190,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  marketImageWrap: {
    height: 120,
    overflow: 'hidden',
  },
  marketBadge: {
    position: 'absolute',
    top: 8, right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(10,17,40,0.55)',
  },
  marketBadgeRtl: {
    right: undefined,
    left: 8,
  },
  marketCatChip: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  catTileRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 4,
  },
  catTile: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  catTileIcon: {
    width: 38, height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalList: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  upcomingErrorCard: {
    // override the shadow from upcomingCard for this lighter variant
    shadowOpacity: 0,
    elevation: 0,
  },
  campsErrorBanner: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  campsErrorInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  campsErrorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
