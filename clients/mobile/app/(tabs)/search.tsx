import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, RefreshControl, ScrollView,
  Animated, ImageBackground, TextInput, Dimensions, Modal, Platform, Share,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { getCamps, Camp, isCampAvailableOnDate } from '@/lib/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { SectionHeader } from '@/components/SectionHeader';
import { Skeleton } from '@/components/Skeleton';
import { PageLoader } from '@/components/PageLoader';
import { useFavorites } from '@/hooks/useFavorites';
import { useLocalSearchParams } from 'expo-router';
import { BAHRAIN_CAMPING_LOCATIONS, getRegions, getRegionLabel, getLocationsByRegion } from '@/lib/locations';
import { CAMP_AMENITIES, KASHTA_AMENITIES, AMENITY_CATEGORY_KEYS, amenityLabel } from '@/lib/hostLabels';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ListingCard } from '@/components/ListingCard';
import { ListingCardGrid } from '@/components/ListingCardGrid';
import { PatternSadu } from '@/components/BackgroundPatterns';
import { CampMapView } from '@/components/CampMapView';
import { MapPreviewSheet } from '@/components/MapPreviewSheet';
import { useMapPermission } from '@/hooks/useMapPermission';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const nightTexture = require('../../assets/images/texture-night.jpg');

const HEADER_ABSOLUTE_HEIGHT = 148;
const SCROLL_DISTANCE = 84;

const isWeb = Platform.OS === 'web';

const VIEW_MODE_KEY = 'mukhymat.exploreViewMode';
// Web parity: FilterSidebar guest tiers (1 = Any, then 4+ … 20+)
const GUEST_TIERS = [1, 4, 6, 8, 10, 15, 20];

// Union of camp + kashta amenity catalogs, used when type filter is "All".
const MERGED_AMENITIES: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const src of [CAMP_AMENITIES, KASHTA_AMENITIES]) {
    for (const [cat, items] of Object.entries(src)) {
      out[cat] = Array.from(new Set([...(out[cat] || []), ...items]));
    }
  }
  return out;
})();

export default function ExploreScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useScreenInsets();
  const { isRTL } = useI18n();
  const { isFavorite, toggleFavorite } = useFavorites();
  const params = useLocalSearchParams<{
    type?: string;
    favorites?: string;
    ts?: string;
    view?: string;
    filters?: string;
    // Deep-link share params
    price?: string;
    guests?: string;
    locs?: string;
    amenities?: string;
    sort?: string;
    rating?: string;
    loc?: string;
  }>();

  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Map / list toggle — web always stays list
  const [mapMode, setMapMode] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);
  const { status: locationStatus, request: requestLocation } = useMapPermission();

  // List / grid view density
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Filter sheet
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeLocation, setActiveLocation] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<0 | 1 | 2>(0);
  const [priceFilter, setPriceFilter] = useState<number>(0);
  const [guestsFilter, setGuestsFilter] = useState(1);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [sortFilter, setSortFilter] = useState<number>(0);
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [bookingDateFilter, setBookingDateFilter] = useState<Date | null>(null);
  const [dateAvailableCampIds, setDateAvailableCampIds] = useState<Set<string> | null>(null);
  const [dateChecking, setDateChecking] = useState(false);

  // Apply presets from Home navigation / deep links
  useEffect(() => {
    if (params.type === 'camp') setTypeFilter(1);
    else if (params.type === 'kashta') setTypeFilter(2);
    if (params.favorites === '1') setFavoritesOnly(true);
    if (params.view === 'grid' || params.view === 'list') setViewMode(params.view);
    if (params.filters === '1') openFilters();
    // Extra params encoded by the share deep link
    if (params.price !== undefined) setPriceFilter(Number(params.price) || 0);
    if (params.guests !== undefined) setGuestsFilter(Number(params.guests) || 1);
    if (params.locs) setSelectedLocations(params.locs.split(',').filter(Boolean));
    if (params.amenities) setSelectedAmenities(params.amenities.split(',').filter(Boolean));
    if (params.sort !== undefined) setSortFilter(Number(params.sort) || 0);
    if (params.rating !== undefined) setRatingFilter(Number(params.rating) || 0);
    if (params.loc) setActiveLocation(params.loc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.type, params.favorites, params.ts, params.view, params.filters,
      params.price, params.guests, params.locs, params.amenities, params.sort,
      params.rating, params.loc]);

  // Build and share a deep link that encodes the current filter state
  const shareSearch = useCallback(async () => {
    const p = new URLSearchParams();
    if (typeFilter === 1) p.set('type', 'camp');
    else if (typeFilter === 2) p.set('type', 'kashta');
    if (favoritesOnly) p.set('favorites', '1');
    if (viewMode !== 'list') p.set('view', viewMode);
    if (priceFilter !== 0) p.set('price', String(priceFilter));
    if (guestsFilter !== 1) p.set('guests', String(guestsFilter));
    if (selectedLocations.length > 0) p.set('locs', selectedLocations.join(','));
    if (selectedAmenities.length > 0) p.set('amenities', selectedAmenities.join(','));
    if (sortFilter !== 0) p.set('sort', String(sortFilter));
    if (ratingFilter !== 0) p.set('rating', String(ratingFilter));
    if (activeLocation) p.set('loc', activeLocation);
    // Add a timestamp so expo-router treats repeated shares as distinct navigations
    p.set('ts', String(Date.now()));

    const query = p.toString();
    const deepLink = `mukhymat-mobile:///(tabs)/search${query ? `?${query}` : ''}`;

    try {
      await Share.share({ message: `${t('shareSearchMessage')}\n${deepLink}`, url: deepLink });
    } catch {
      // user cancelled or Share not available — silently ignore
    }
  }, [
    t, typeFilter, favoritesOnly, viewMode, priceFilter, guestsFilter,
    selectedLocations, selectedAmenities, sortFilter, ratingFilter, activeLocation,
  ]);

  // Remember the user's preferred view density
  useEffect(() => {
    if (params.view) return;
    AsyncStorage.getItem(VIEW_MODE_KEY)
      .then(v => {
        if (v === 'grid' || v === 'list') setViewMode(v);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const load = async () => {
    setNetworkError(false);
    try {
      const data = await getCamps();
      setCamps(data);
    } catch (e) {
      console.log('Error loading camps', e);
      setNetworkError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openFilters = () => {
    setFilterVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  };

  const closeFilters = () => {
    Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true })
      .start(() => setFilterVisible(false));
  };

  const resetFilters = () => {
    setTypeFilter(0);
    setPriceFilter(0);
    setGuestsFilter(1);
    setSortFilter(0);
    setRatingFilter(0);
    setActiveLocation(null);
    setFavoritesOnly(false);
    setSelectedLocations([]);
    setSelectedAmenities([]);
    setBookingDateFilter(null);
  };

  // Re-check availability whenever the date filter or camp list changes
  useEffect(() => {
    if (!bookingDateFilter || camps.length === 0) {
      setDateAvailableCampIds(null);
      setDateChecking(false);
      return;
    }
    let cancelled = false;
    setDateChecking(true);

    const d = bookingDateFilter;
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    Promise.all(
      camps.map(async (camp) => {
        try {
          const available = await isCampAvailableOnDate(camp.id, dateStr);
          return available ? camp.id : null;
        } catch {
          return null; // exclude on failure — no silent include
        }
      })
    ).then((results) => {
      if (!cancelled) {
        setDateAvailableCampIds(
          new Set(results.filter((id): id is string => id !== null))
        );
        setDateChecking(false);
      }
    });

    return () => { cancelled = true; };
  }, [bookingDateFilter, camps]);

  const toggleViewMode = () => {
    const next = viewMode === 'list' ? 'grid' : 'list';
    setViewMode(next);
    AsyncStorage.setItem(VIEW_MODE_KEY, next).catch(() => {});
  };

  const toggleLocation = (value: string) =>
    setSelectedLocations(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );

  const toggleAmenity = (value: string) =>
    setSelectedAmenities(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );

  const toggleMapMode = () => {
    const next = !mapMode;
    setMapMode(next);
    setSelectedCamp(null);
    if (next && locationStatus === 'undetermined') requestLocation();
  };

  const renderListing = useCallback(
    ({ item, index }: { item: Camp; index: number }) => {
      if (viewMode === 'grid') {
        if (item.id === '__filler__') return <View style={styles.gridItem} />;
        return (
          <View style={styles.gridItem}>
            <ListingCardGrid
              item={item}
              isFavorite={isFavorite(item.id)}
              onToggleFavorite={() => toggleFavorite(item.id)}
            />
          </View>
        );
      }
      return (
        <ListingCard
          item={item}
          index={index}
          isFavorite={isFavorite(item.id)}
          onToggleFavorite={() => toggleFavorite(item.id)}
        />
      );
    },
    [isFavorite, toggleFavorite, viewMode]
  );

  // Helper: format a date for display
  const formatDateLabel = (date: Date): string =>
    date.toLocaleDateString(isRTL ? 'ar-BH' : 'en-BH', { month: 'short', day: 'numeric' });

  // --- Filtering & sorting ---
  let filteredSpots = camps.filter(c => {
    if (favoritesOnly && !isFavorite(c.id)) return false;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      if (!c.title.toLowerCase().includes(q) && !c.location.toLowerCase().includes(q)) return false;
    }
    if (activeLocation) {
      const loc = BAHRAIN_CAMPING_LOCATIONS.find(l => l.value === c.location);
      if (activeLocation !== c.location && loc?.region !== activeLocation) return false;
    }
    if (typeFilter === 1 && c.listingType !== 'camp') return false;
    if (typeFilter === 2 && c.listingType !== 'kashta') return false;
    if (priceFilter === 1 && c.pricePerNight >= 25) return false;
    if (priceFilter === 2 && (c.pricePerNight < 25 || c.pricePerNight > 50)) return false;
    if (priceFilter === 3 && (c.pricePerNight < 50 || c.pricePerNight > 100)) return false;
    if (priceFilter === 4 && c.pricePerNight <= 100) return false;
    // Web parity: treat missing maxGuests as 0 so camps with unknown capacity don't pass the filter
    if (guestsFilter > 1 && (c.maxGuests || 0) < guestsFilter) return false;
    if (selectedLocations.length > 0 && !selectedLocations.includes(c.location)) return false;
    if (selectedAmenities.length > 0 && !selectedAmenities.every(a => (c.amenities || []).includes(a))) return false;
    if (ratingFilter > 0 && (c.rating || 0) < ratingFilter) return false;
    // Date availability: if we have results, exclude unavailable camps.
    // While dateChecking we pass all camps through (loading state).
    if (bookingDateFilter && dateAvailableCampIds !== null && !dateAvailableCampIds.has(c.id)) return false;
    return true;
  });

  if (sortFilter === 1) filteredSpots.sort((a, b) => a.pricePerNight - b.pricePerNight);
  else if (sortFilter === 2) filteredSpots.sort((a, b) => b.pricePerNight - a.pricePerNight);
  else if (sortFilter === 3) filteredSpots.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else filteredSpots.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const activeFiltersCount =
    (typeFilter !== 0 ? 1 : 0) + (priceFilter !== 0 ? 1 : 0) +
    (guestsFilter !== 1 ? 1 : 0) + (sortFilter !== 0 ? 1 : 0) +
    (ratingFilter !== 0 ? 1 : 0) + (activeLocation ? 1 : 0) + (favoritesOnly ? 1 : 0) +
    (selectedLocations.length > 0 ? 1 : 0) + (selectedAmenities.length > 0 ? 1 : 0) +
    (bookingDateFilter ? 1 : 0);

  // Amenity catalog follows the selected listing type
  const amenityCatalog: Record<string, string[]> =
    typeFilter === 2 ? KASHTA_AMENITIES : typeFilter === 1 ? CAMP_AMENITIES : MERGED_AMENITIES;

  // Grid rows need an even item count so a lone last card doesn't stretch
  const listData =
    viewMode === 'grid' && filteredSpots.length % 2 === 1
      ? [...filteredSpots, { id: '__filler__' } as Camp]
      : filteredSpots;

  const mappableCamps = filteredSpots.filter(
    c => typeof c.coordinates?.lat === 'number' && typeof c.coordinates?.lng === 'number'
  );

  // --- Animated header interpolations (only used in list mode) ---
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE],
    outputRange: [0, -SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  const textOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const textTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE],
    outputRange: [0, -40],
    extrapolate: 'clamp',
  });

  // In map mode the header is pinned (no scroll animation)
  const headerAnimStyle = mapMode
    ? { height: HEADER_ABSOLUTE_HEIGHT + insets.top }
    : { height: HEADER_ABSOLUTE_HEIGHT + insets.top, transform: [{ translateY: headerTranslateY }] };

  const searchBarAnimStyle = mapMode
    ? { top: insets.top + 64 }
    : { top: insets.top + 64, transform: [{ translateY: headerTranslateY }] };

  if (loading) return <PageLoader />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/*
        ── LAYER ORDER ───────────────────────────────────────────────────────────
        React Native paints siblings in order: later = higher.
        Map must be rendered FIRST so the header and preview sheet paint over it.
        ─────────────────────────────────────────────────────────────────────────
      */}

      {/* 1. Map layer (map mode only, native only) */}
      {mapMode && !isWeb && (
        <View style={StyleSheet.absoluteFill}>
          <CampMapView
            camps={filteredSpots}
            selectedCampId={selectedCamp?.id ?? null}
            onCampSelect={setSelectedCamp}
            showUserLocation={locationStatus === 'granted'}
          />
        </View>
      )}

      {/* 2. Dark header background */}
      <Animated.View style={[styles.headerBg, headerAnimStyle]}>
        <ImageBackground source={nightTexture} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.9 }} />
        <LinearGradient
          colors={['rgba(10,17,40,0.6)', 'rgba(10,17,40,1)']}
          style={StyleSheet.absoluteFill}
        />
        <PatternSadu color="#FDFBF7" opacity={0.08} />
      </Animated.View>

      {/* 3. Header title — fades out as you scroll (list mode only) */}
      <Animated.View
        style={[
          styles.headerTextContainer,
          isRTL ? styles.rtlRow : null,
          {
            top: insets.top + 16,
            opacity: mapMode ? 1 : textOpacity,
            transform: mapMode ? [] : [{ translateY: textTranslateY }],
          },
        ]}
      >
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <AppText variant="h1" color="#FFF" weight="bold" style={{ fontSize: 28 }}>
            {t('exploreTab')}
          </AppText>
        </View>
      </Animated.View>

      {/* 4. Search bar row — pill + standalone action buttons */}
      <Animated.View style={[styles.searchBarWrapper, searchBarAnimStyle, isRTL ? styles.rtlRow : null]}>
        {/* Search pill */}
        <View style={[
          styles.searchBar,
          { backgroundColor: colors.card, borderColor: colors.border },
          isRTL ? styles.rtlRow : null,
        ]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={t('search')}
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>

        {/* Filter button — standalone circle */}
        <TouchableOpacity
          onPress={openFilters}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="options" size={20} color={colors.foreground} />
          {activeFiltersCount > 0 ? (
            <View
              style={[
                styles.filterBadge,
                isRTL ? { left: -3 } : { right: -3 },
                { backgroundColor: colors.primary },
              ]}
            >
              <AppText variant="labelSm" color={colors.primaryForeground} style={{ fontSize: 11 }}>
                {activeFiltersCount}
              </AppText>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Share deep link — standalone circle */}
        <TouchableOpacity
          onPress={shareSearch}
          accessibilityLabel={t('shareSearch')}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="share-outline" size={18} color={colors.foreground} />
        </TouchableOpacity>

        {/* List / grid density toggle — standalone circle */}
        {(!mapMode || isWeb) && (
          <TouchableOpacity
            onPress={toggleViewMode}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons
              name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
              size={18}
              color={colors.foreground}
            />
          </TouchableOpacity>
        )}

        {/* Map / list toggle — standalone circle, hidden on web */}
        {!isWeb && (
          <TouchableOpacity
            onPress={toggleMapMode}
            style={[
              styles.iconBtn,
              {
                backgroundColor: mapMode ? colors.primary : colors.card,
                borderColor: mapMode ? colors.primary : colors.border,
              },
            ]}
          >
            <Ionicons
              name={mapMode ? 'list-outline' : 'map-outline'}
              size={18}
              color={mapMode ? colors.primaryForeground : colors.foreground}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* 5a. List mode: region chips + results FlatList */}
      {(!mapMode || isWeb) && (
        <Animated.FlatList
          key={viewMode}
          data={listData}
          renderItem={renderListing}
          keyExtractor={item => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
          contentContainerStyle={{
            paddingTop: HEADER_ABSOLUTE_HEIGHT + insets.top + 20,
            paddingBottom: insets.bottom + 100,
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              progressViewOffset={HEADER_ABSOLUTE_HEIGHT + insets.top}
            />
          }
          ListHeaderComponent={
            <>
              {/* Active filter chips */}
              {activeFiltersCount > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[styles.activeFilters, isRTL ? { flexDirection: 'row-reverse' } : null]}
                >
                  {typeFilter !== 0 ? (
                    <TouchableOpacity onPress={() => setTypeFilter(0)} style={[styles.activeFilterChip, { backgroundColor: colors.muted }]}>
                      <AppText variant="labelSm">{typeFilter === 1 ? t('desertCamps') : t('beachSpots')}</AppText>
                      <Ionicons name="close" size={14} color={colors.foreground} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ) : null}
                  {activeLocation ? (
                    <TouchableOpacity onPress={() => setActiveLocation(null)} style={[styles.activeFilterChip, { backgroundColor: colors.muted }]}>
                      <AppText variant="labelSm">{activeLocation}</AppText>
                      <Ionicons name="close" size={14} color={colors.foreground} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ) : null}
                  {priceFilter !== 0 ? (
                    <TouchableOpacity onPress={() => setPriceFilter(0)} style={[styles.activeFilterChip, { backgroundColor: colors.muted }]}>
                      <AppText variant="labelSm">{t('priceFilterChip')}</AppText>
                      <Ionicons name="close" size={14} color={colors.foreground} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ) : null}
                  {guestsFilter !== 1 ? (
                    <TouchableOpacity onPress={() => setGuestsFilter(1)} style={[styles.activeFilterChip, { backgroundColor: colors.muted }]}>
                      <AppText variant="labelSm">{t('guestsChip', { count: guestsFilter })}</AppText>
                      <Ionicons name="close" size={14} color={colors.foreground} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ) : null}
                  {selectedLocations.length > 0 ? (
                    <TouchableOpacity onPress={() => setSelectedLocations([])} style={[styles.activeFilterChip, { backgroundColor: colors.muted }]}>
                      <Ionicons name="location" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                      <AppText variant="labelSm">{t('locationsChip', { count: selectedLocations.length })}</AppText>
                      <Ionicons name="close" size={14} color={colors.foreground} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ) : null}
                  {selectedAmenities.length > 0 ? (
                    <TouchableOpacity onPress={() => setSelectedAmenities([])} style={[styles.activeFilterChip, { backgroundColor: colors.muted }]}>
                      <Ionicons name="sparkles" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                      <AppText variant="labelSm">{t('amenitiesChip', { count: selectedAmenities.length })}</AppText>
                      <Ionicons name="close" size={14} color={colors.foreground} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ) : null}
                  {ratingFilter !== 0 ? (
                    <TouchableOpacity onPress={() => setRatingFilter(0)} style={[styles.activeFilterChip, { backgroundColor: colors.muted }]}>
                      <Ionicons name="star" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                      <AppText variant="labelSm">{t('ratingChip', { value: ratingFilter })}</AppText>
                      <Ionicons name="close" size={14} color={colors.foreground} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ) : null}
                  {favoritesOnly ? (
                    <TouchableOpacity onPress={() => setFavoritesOnly(false)} style={[styles.activeFilterChip, { backgroundColor: colors.muted }]}>
                      <Ionicons name="heart" size={12} color={colors.destructive} style={{ marginRight: 4 }} />
                      <AppText variant="labelSm">{t('favorites')}</AppText>
                      <Ionicons name="close" size={14} color={colors.foreground} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ) : null}
                  {bookingDateFilter ? (
                    <TouchableOpacity onPress={() => setBookingDateFilter(null)} style={[styles.activeFilterChip, { backgroundColor: colors.muted }]}>
                      <Ionicons name="calendar-outline" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                      <AppText variant="labelSm">{formatDateLabel(bookingDateFilter)}</AppText>
                      {dateChecking
                        ? <Ionicons name="hourglass-outline" size={12} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
                        : <Ionicons name="close" size={14} color={colors.foreground} style={{ marginLeft: 4 }} />}
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity onPress={resetFilters} style={[styles.activeFilterChip, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
                    <AppText variant="labelSm" color={colors.primary}>{t('resetFilters')}</AppText>
                  </TouchableOpacity>
                </ScrollView>
              ) : null}

              {/* Region chips */}
              <SectionHeader
                title={t('location')}
                actionText={activeLocation ? t('resetFilters') : undefined}
                onAction={() => setActiveLocation(null)}
                style={{ marginTop: 12 }}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.chipsContainer, isRTL ? { flexDirection: 'row-reverse' } : null]}
              >
                <TouchableOpacity
                  onPress={() => setFavoritesOnly(!favoritesOnly)}
                  style={[
                    styles.chip,
                    {
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      backgroundColor: favoritesOnly ? colors.primary : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={favoritesOnly ? 'heart' : 'heart-outline'}
                    size={14}
                    color={favoritesOnly ? colors.primaryForeground : colors.destructive}
                  />
                  <AppText
                    variant="label"
                    color={favoritesOnly ? colors.primaryForeground : colors.foreground}
                    style={{ marginHorizontal: 5 }}
                  >
                    {t('favorites')}
                  </AppText>
                </TouchableOpacity>
                {getRegions().map(region => (
                  <TouchableOpacity
                    key={region}
                    onPress={() => setActiveLocation(activeLocation === region ? null : region)}
                    style={[
                      styles.chip,
                      { backgroundColor: activeLocation === region ? colors.primary : colors.card, borderColor: colors.border },
                    ]}
                  >
                    <AppText variant="label" color={activeLocation === region ? colors.primaryForeground : colors.foreground}>
                      {getRegionLabel(region, isRTL ? 'ar' : 'en')}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Results count */}
              <View style={[styles.listHeaderRow, isRTL ? styles.rtlRow : null]}>
                <AppText variant="h2" weight="bold">{t('allSpots')}</AppText>
                <View style={[styles.countBadge, { backgroundColor: colors.muted }]}>
                  <AppText variant="labelSm" weight="bold">{filteredSpots.length}</AppText>
                </View>
              </View>
            </>
          }
          ListFooterComponent={
            <>
              {loading ? (
                viewMode === 'grid' ? (
                  <View style={{ paddingHorizontal: 14 }}>
                    {[0, 1].map(row => (
                      <View key={row} style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                        {[0, 1].map(col => (
                          <View key={col} style={[styles.skeletonCard, { flex: 1 }]}>
                            <Skeleton height={120} borderRadius={16} />
                            <View style={{ padding: 10, gap: 8 }}>
                              <Skeleton height={14} width="80%" />
                              <Skeleton height={12} width="55%" />
                            </View>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.skeletonList}>
                    {[1, 2, 3].map(i => (
                      <View key={i} style={styles.skeletonCard}>
                        <Skeleton height={260} borderRadius={24} />
                        <View style={{ padding: 20, gap: 12 }}>
                          <View style={[styles.row, { justifyContent: 'space-between' }]}>
                            <Skeleton height={24} width="60%" />
                            <Skeleton height={24} width="20%" borderRadius={12} />
                          </View>
                          <Skeleton height={16} width="40%" />
                          <View style={[styles.row, { justifyContent: 'space-between', marginTop: 12 }]}>
                            <Skeleton height={36} width="30%" borderRadius={16} />
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )
              ) : null}

              {!loading && (filteredSpots.length === 0 || (networkError && camps.length === 0)) ? (
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: colors.muted }]}>
                    <Ionicons
                      name={networkError ? 'cloud-offline-outline' : activeFiltersCount > 0 ? 'funnel-outline' : 'search'}
                      size={32}
                      color={colors.mutedForeground}
                    />
                  </View>
                  <AppText variant="h3" weight="bold" style={{ marginTop: 24, textAlign: 'center' }}>
                    {networkError
                      ? t('noResultsNetworkError')
                      : activeFiltersCount > 0
                      ? t('noResultsFiltered')
                      : t('noResults')}
                  </AppText>
                  <AppText
                    variant="body"
                    color={colors.mutedForeground}
                    style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}
                  >
                    {networkError
                      ? t('noResultsNetworkErrorDesc')
                      : activeFiltersCount > 0
                      ? t('noResultsFilteredDesc')
                      : t('noResultsDesc')}
                  </AppText>
                  {networkError ? (
                    <PressableScale onPress={() => { setLoading(true); load(); }} style={[styles.resetEmptyBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                      <AppText variant="label" color={colors.primaryForeground} weight="semibold">{t('retry')}</AppText>
                    </PressableScale>
                  ) : activeFiltersCount > 0 ? (
                    <PressableScale onPress={resetFilters} style={[styles.resetEmptyBtn, { borderColor: colors.border }]}>
                      <AppText variant="label" weight="semibold">{t('resetFilters')}</AppText>
                    </PressableScale>
                  ) : null}
                </View>
              ) : null}
            </>
          }
        />
      )}

      {/* 5b. Map mode overlay elements (sheet + stats chip) */}
      {mapMode && !isWeb && (
        <MapPreviewSheet
          camp={selectedCamp}
          onClose={() => setSelectedCamp(null)}
          filteredCount={filteredSpots.length}
          mappableCount={mappableCamps.length}
        />
      )}

      {/* 6. Filter bottom sheet modal */}
      <Modal visible={filterVisible} transparent animationType="none" onRequestClose={closeFilters}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeFilters} activeOpacity={1} />
          <Animated.View
            style={[
              styles.bottomSheet,
              { transform: [{ translateY: slideAnim }], backgroundColor: colors.card },
            ]}
          >
            <View style={styles.sheetHeader}>
              <AppText variant="h3" weight="bold">{t('filters')}</AppText>
              <TouchableOpacity onPress={closeFilters} style={[styles.sheetCloseBtn, { backgroundColor: colors.muted }]}>
                <Ionicons name="close" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.sheetContent}
              contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            >
              <View style={styles.filterSection}>
                <AppText variant="label" style={styles.filterTitle}>{t('filterByType')}</AppText>
                <SegmentedControl
                  values={[t('all'), t('camps'), t('kashtas')]}
                  selectedIndex={typeFilter}
                  onChange={idx => setTypeFilter(idx as 0 | 1 | 2)}
                />
              </View>

              <View style={styles.filterSection}>
                <AppText variant="label" style={styles.filterTitle}>{t('pricePerNightLabel')}</AppText>
                <View style={[styles.priceChips, isRTL ? styles.rtlRow : null]}>
                  {[t('priceAny'), t('priceUnder25'), '25 - 50', '50 - 100', t('price100plus')].map((lbl, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setPriceFilter(i)}
                      style={[
                        styles.priceChip,
                        { backgroundColor: priceFilter === i ? colors.primary : colors.muted },
                      ]}
                    >
                      <AppText
                        variant="labelSm"
                        color={priceFilter === i ? colors.primaryForeground : colors.foreground}
                      >
                        {lbl}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <AppText variant="label" style={styles.filterTitle}>{t('guests')}</AppText>
                <View style={[styles.priceChips, isRTL ? styles.rtlRow : null]}>
                  {GUEST_TIERS.map(tier => (
                    <TouchableOpacity
                      key={tier}
                      onPress={() => setGuestsFilter(tier)}
                      style={[
                        styles.priceChip,
                        { backgroundColor: guestsFilter === tier ? colors.primary : colors.muted },
                      ]}
                    >
                      <AppText
                        variant="labelSm"
                        color={guestsFilter === tier ? colors.primaryForeground : colors.foreground}
                      >
                        {tier === 1 ? t('guestsAnyTier') : `${tier}+`}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <AppText variant="label" style={styles.filterTitle}>{t('location')}</AppText>
                {getRegions().map(region => (
                  <View key={region} style={styles.subGroup}>
                    <AppText
                      variant="labelSm"
                      color={colors.mutedForeground}
                      style={{ marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}
                    >
                      {getRegionLabel(region, isRTL ? 'ar' : 'en')}
                    </AppText>
                    <View style={[styles.priceChips, isRTL ? styles.rtlRow : null]}>
                      {getLocationsByRegion(region).map(loc => {
                        const selected = selectedLocations.includes(loc.value);
                        return (
                          <TouchableOpacity
                            key={loc.value}
                            onPress={() => toggleLocation(loc.value)}
                            style={[
                              styles.priceChip,
                              { backgroundColor: selected ? colors.primary : colors.muted },
                            ]}
                          >
                            <AppText
                              variant="labelSm"
                              color={selected ? colors.primaryForeground : colors.foreground}
                            >
                              {loc.label}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.filterSection}>
                <AppText variant="label" style={styles.filterTitle}>{t('amenities')}</AppText>
                {Object.entries(amenityCatalog).map(([cat, items]) => (
                  <View key={cat} style={styles.subGroup}>
                    <AppText
                      variant="labelSm"
                      color={colors.mutedForeground}
                      style={{ marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}
                    >
                      {t(AMENITY_CATEGORY_KEYS[cat] || cat)}
                    </AppText>
                    <View style={[styles.priceChips, isRTL ? styles.rtlRow : null]}>
                      {items.map(name => {
                        const selected = selectedAmenities.includes(name);
                        return (
                          <TouchableOpacity
                            key={name}
                            onPress={() => toggleAmenity(name)}
                            style={[
                              styles.priceChip,
                              { backgroundColor: selected ? colors.primary : colors.muted },
                            ]}
                          >
                            <AppText
                              variant="labelSm"
                              color={selected ? colors.primaryForeground : colors.foreground}
                            >
                              {amenityLabel(name, isRTL ? 'ar' : 'en')}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.filterSection}>
                <AppText variant="label" style={styles.filterTitle}>{t('minRatingLabel')}</AppText>
                <View style={[styles.priceChips, isRTL ? styles.rtlRow : null]}>
                  {[
                    { value: 0, label: t('ratingAny') },
                    { value: 3, label: '3+' },
                    { value: 4, label: '4+' },
                    { value: 4.5, label: '4.5+' },
                  ].map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setRatingFilter(opt.value)}
                      style={[
                        styles.priceChip,
                        {
                          backgroundColor: ratingFilter === opt.value ? colors.primary : colors.muted,
                          flexDirection: 'row',
                          alignItems: 'center',
                        },
                      ]}
                    >
                      {opt.value > 0 ? (
                        <Ionicons
                          name="star"
                          size={12}
                          color={ratingFilter === opt.value ? colors.primaryForeground : colors.primary}
                          style={{ marginRight: 4 }}
                        />
                      ) : null}
                      <AppText
                        variant="labelSm"
                        color={ratingFilter === opt.value ? colors.primaryForeground : colors.foreground}
                      >
                        {opt.label}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Availability date filter */}
              <View style={styles.filterSection}>
                <AppText variant="label" style={styles.filterTitle}>{t('availabilityFilter')}</AppText>
                <View style={[styles.dateStepperRow, isRTL ? { flexDirection: 'row-reverse' } : null]}>
                  <TouchableOpacity
                    onPress={() => {
                      const base = bookingDateFilter ? new Date(bookingDateFilter) : new Date();
                      const prev = new Date(base);
                      prev.setDate(prev.getDate() - 1);
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      if (prev >= today) setBookingDateFilter(prev);
                      else setBookingDateFilter(today);
                    }}
                    style={[styles.dateStepBtn, { backgroundColor: colors.muted }]}
                  >
                    <Ionicons name="chevron-back" size={18} color={colors.foreground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      setBookingDateFilter(today);
                    }}
                    style={[
                      styles.dateDisplay,
                      {
                        backgroundColor: bookingDateFilter ? colors.primary : colors.muted,
                        flex: 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={15}
                      color={bookingDateFilter ? colors.primaryForeground : colors.mutedForeground}
                      style={{ marginRight: 6 }}
                    />
                    <AppText
                      variant="labelSm"
                      color={bookingDateFilter ? colors.primaryForeground : colors.mutedForeground}
                    >
                      {bookingDateFilter ? formatDateLabel(bookingDateFilter) : t('availabilityAny')}
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const base = bookingDateFilter ? new Date(bookingDateFilter) : new Date();
                      const next = new Date(base);
                      next.setDate(next.getDate() + 1);
                      setBookingDateFilter(next);
                    }}
                    style={[styles.dateStepBtn, { backgroundColor: colors.muted }]}
                  >
                    <Ionicons name="chevron-forward" size={18} color={colors.foreground} />
                  </TouchableOpacity>
                  {bookingDateFilter ? (
                    <TouchableOpacity
                      onPress={() => setBookingDateFilter(null)}
                      style={[styles.dateStepBtn, { backgroundColor: colors.muted, marginLeft: 4 }]}
                    >
                      <Ionicons name="close" size={18} color={colors.foreground} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View style={styles.filterSection}>
                <AppText variant="label" style={styles.filterTitle}>{t('sortBy')}</AppText>
                <SegmentedControl
                  values={[t('sortNewest'), t('sortPriceLow'), t('sortPriceHigh'), t('topRated')]}
                  selectedIndex={sortFilter}
                  onChange={idx => setSortFilter(idx as number)}
                />
              </View>
            </ScrollView>

            <View
              style={[
                styles.sheetFooter,
                {
                  backgroundColor: colors.card,
                  borderTopColor: colors.border,
                  paddingBottom: Math.max(insets.bottom, 20),
                },
                isRTL ? styles.rtlRow : null,
              ]}
            >
              <TouchableOpacity onPress={resetFilters} style={styles.resetBtn}>
                <AppText variant="label" weight="semibold" style={{ textDecorationLine: 'underline' }}>
                  {t('resetFilters')}
                </AppText>
              </TouchableOpacity>
              <PressableScale
                onPress={closeFilters}
                style={[styles.showResultsBtn, { backgroundColor: colors.primary }]}
              >
                <AppText variant="label" color={colors.primaryForeground} weight="bold">
                  {t('showResults', { count: filteredSpots.length })}
                </AppText>
              </PressableScale>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    overflow: 'hidden',
    zIndex: 9,
  },
  headerTextContainer: {
    position: 'absolute',
    left: 20, right: 20,
    zIndex: 9,
  },
  searchBarWrapper: {
    position: 'absolute',
    left: 16, right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
  },
  searchInput: { flex: 1, marginHorizontal: 10, fontSize: 16 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  filterBadge: {
    position: 'absolute',
    top: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  rtlRow: { flexDirection: 'row-reverse' },
  row: { flexDirection: 'row', alignItems: 'center' },
  activeFilters: { paddingHorizontal: 20, marginTop: 16, gap: 8 },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  chipsContainer: { paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 8,
  },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 12 },
  skeletonList: { paddingHorizontal: 20, paddingBottom: 40, gap: 24 },
  gridRow: { paddingHorizontal: 14, gap: 12, marginBottom: 12 },
  gridItem: { flex: 1 },
  subGroup: { marginBottom: 14 },
  skeletonCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetEmptyBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.8,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  sheetCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  sheetContent: { flex: 1, padding: 24 },
  filterSection: { marginBottom: 32 },
  filterTitle: { marginBottom: 16 },
  priceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  priceChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 16,
  },
  stepperBtn: { padding: 12 },
  dateStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateStepBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
  },
  sheetFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  resetBtn: { padding: 12, marginRight: 16 },
  showResultsBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
