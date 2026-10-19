import { CampfireLoader } from "@/components/CampfireLoader";

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Star, Sparkles, MapPin as MapPinIcon, Search, MapPin, Users, Tent, SlidersHorizontal, Calendar as CalendarIcon, Waves, X, Grid3x3, List, Heart } from 'lucide-react';
import { getCampsWithFilters, getCampAmenities, FilterState } from '@/lib/firestore';
import { toast } from 'sonner';
import FilterSidebar from '@/components/FilterSidebar';
import RatingStars from '@/components/RatingStars';
import { RefundPolicyBadge } from '@/components/RefundPolicyBadge';
import { ListingTypeSelector } from '@/components/ListingTypeSelector';
import { KashtaListingCard } from '@/components/KashtaListingCard';
import { BAHRAIN_CAMPING_LOCATIONS } from '@/lib/locations';
import { LegacyCamp, normalizeCampToLegacy } from '@/lib/dataCompatibility';
import { hasPeakPricing, getStartingRate } from '@/lib/peakPricing';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { ListingType } from '@/types/listing';
import { PatternSadu } from '@/components/BackgroundPatterns';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoriteButton } from '@/components/FavoriteButton';

const DEFAULT_FILTERS: FilterState = {
  priceRange: [0, 1000],
  locations: [],
  minGuests: 1,
  amenities: [],
  tentTypes: [],
  minRating: 0,
  sortBy: 'newest',
  listingType: 'all'
};

export default function SearchPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [camps, setCamps] = useState<LegacyCamp[]>([]);
  const [loading, setLoading] = useState(true);
  const loadSeqRef = useRef(0); // discard out-of-order fetch results
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedListingType, setSelectedListingType] = useState<'all' | 'camp' | 'kashta'>('all');
  const [locations, setLocations] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { isFavorite } = useFavorites();
  const [searchParams] = useSearchParams();

  // Presets applied when Home tiles / favorites rail navigate here.
  // Home links append a changing `ts` param so repeat clicks re-apply.
  useEffect(() => {
    const type = searchParams.get('type');
    // URL is the source of truth on navigation: absent params reset to defaults
    setSelectedListingType(type === 'camp' || type === 'kashta' ? type : 'all');
    setFavoritesOnly(searchParams.get('favorites') === '1');
    const fromUrl = searchParams.getAll('amenities').filter(Boolean);
    setFilters(prev => {
      const same = fromUrl.length === prev.amenities.length && fromUrl.every(a => prev.amenities.includes(a));
      return same ? prev : { ...prev, amenities: fromUrl };
    });
  }, [searchParams]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadCamps();
  }, [filters]);

  // Update filters when listing type changes
  useEffect(() => {
    setFilters(prev => (prev.listingType === selectedListingType ? prev : { ...prev, listingType: selectedListingType }));
  }, [selectedListingType]);

  const loadInitialData = async () => {
    console.log('=== [ERR_INDEX_001] loadInitialData() START ===');
    
    try {
      // Use centralized location list instead of fetching from Firestore
      console.log('[ERR_INDEX_001] Loading location list from BAHRAIN_CAMPING_LOCATIONS');
      const locationLabels = BAHRAIN_CAMPING_LOCATIONS.map(loc => loc.label);
      console.log(`[ERR_INDEX_001] Loaded ${locationLabels.length} locations:`, locationLabels);
      setLocations(locationLabels);

      console.log('[ERR_INDEX_001] Fetching amenities...');
      const fetchedAmenities = await getCampAmenities();
      console.log(`[ERR_INDEX_001] Fetched ${fetchedAmenities.length} amenities:`, fetchedAmenities);
      setAmenities(fetchedAmenities);
      
      console.log('[ERR_INDEX_001] loadInitialData() completed successfully');
    } catch (error) {
      console.error('[ERR_INDEX_001] Error in loadInitialData():', error);
      console.error('[ERR_INDEX_001] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
    }
  };

  const loadCamps = async () => {
    const seq = ++loadSeqRef.current;
    console.log('=== [ERR_INDEX_002] loadCamps() START ===');
    console.log('[ERR_INDEX_002] Current filters:', JSON.stringify(filters, null, 2));
    
    try {
      setLoading(true);
      
      console.log('[ERR_INDEX_002] Calling getCampsWithFilters()');
      console.log('[ERR_INDEX_002] Filters being passed:', JSON.stringify(filters, null, 2));
      
      let filteredCamps;
      try {
        filteredCamps = await getCampsWithFilters(filters);
        console.log(`[ERR_INDEX_002] getCampsWithFilters() returned ${filteredCamps.length} camps`);
      } catch (firestoreError) {
        console.error('[ERR_INDEX_002] Error calling getCampsWithFilters():', firestoreError);
        console.error('[ERR_INDEX_002] Firestore error details:', {
          message: firestoreError instanceof Error ? firestoreError.message : 'Unknown error',
          stack: firestoreError instanceof Error ? firestoreError.stack : 'No stack trace',
          filters: filters
        });
        throw firestoreError;
      }
      
      if (!filteredCamps || filteredCamps.length === 0) {
        console.warn('[ERR_INDEX_004] No camps returned from Firestore');
        console.warn('[ERR_INDEX_004] This could mean:');
        console.warn('[ERR_INDEX_004] 1. No camps exist in Firestore');
        console.warn('[ERR_INDEX_004] 2. No camps match the current filters');
        console.warn('[ERR_INDEX_004] 3. All camps have status != "active"');
        if (seq === loadSeqRef.current) setCamps([]);
        
        if (filters.bookingDate) {
          toast.info('No camps available for the selected date. Try a different date.');
        } else {
          toast.info('No camps found. Try adjusting your filters.');
        }
        return;
      }
      
      console.log('[ERR_INDEX_003] Converting camps to legacy format...');
      try {
        const legacyCamps = filteredCamps.map((camp, index) => {
          console.log(`[ERR_INDEX_003] Normalizing camp ${index + 1}/${filteredCamps.length}: ${camp.id}`);
          try {
            const normalized = normalizeCampToLegacy(camp);
            console.log(`[ERR_INDEX_003] Camp ${camp.id} normalized successfully`);
            return normalized;
          } catch (normError) {
            console.error(`[ERR_INDEX_003] Error normalizing camp ${camp.id}:`, normError);
            console.error(`[ERR_INDEX_003] Camp data:`, JSON.stringify(camp, null, 2));
            throw normError;
          }
        });
        
        console.log(`[ERR_INDEX_003] Successfully normalized ${legacyCamps.length} camps`);
        if (seq === loadSeqRef.current) setCamps(legacyCamps);
      } catch (normalizationError) {
        console.error('[ERR_INDEX_003] Error during camp normalization:', normalizationError);
        console.error('[ERR_INDEX_003] Normalization error details:', {
          message: normalizationError instanceof Error ? normalizationError.message : 'Unknown error',
          stack: normalizationError instanceof Error ? normalizationError.stack : 'No stack trace'
        });
        throw normalizationError;
      }
      
      console.log(`=== [ERR_INDEX_002] loadCamps() SUCCESS: Set ${camps.length} camps ===`);
    } catch (error) {
      console.error('[ERR_INDEX_002] Error in loadCamps():', error);
      console.error('[ERR_INDEX_002] Complete error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown',
        filters: filters
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to load camps';
      toast.error(errorMessage);
      if (seq === loadSeqRef.current) setCamps([]);
    } finally {
      if (seq === loadSeqRef.current) {
        setLoading(false);
      }
      console.log('[ERR_INDEX_002] loadCamps() completed, loading state set to false');
    }
  };

  const handleFilterChange = (newFilters: FilterState) => {
    console.log('[ERR_INDEX_002] Filter change requested:', JSON.stringify(newFilters, null, 2));
    setFilters(newFilters);
  };

  const handleSortChange = (sortBy: string) => {
    console.log('[ERR_INDEX_002] Sort change requested:', sortBy);
    setFilters({ ...filters, sortBy: sortBy as FilterState['sortBy'] });
  };

  const handleBookingDateChange = (value?: Date) => {
    setFilters({ ...filters, bookingDate: value || undefined });
  };

  const removeFilter = (filterType: 'location' | 'amenity' | 'tentType' | 'rating' | 'price' | 'date' | 'listingType', value?: string) => {
    const newFilters = { ...filters };
    
    switch (filterType) {
      case 'location':
        newFilters.locations = newFilters.locations.filter(l => l !== value);
        break;
      case 'amenity':
        newFilters.amenities = newFilters.amenities.filter(a => a !== value);
        break;
      case 'tentType':
        newFilters.tentTypes = newFilters.tentTypes.filter(t => t !== value);
        break;
      case 'rating':
        newFilters.minRating = 0;
        break;
      case 'price':
        newFilters.priceRange = [0, 1000];
        break;
      case 'date':
        newFilters.bookingDate = undefined;
        break;
      case 'listingType':
        newFilters.listingType = 'all';
        setSelectedListingType('all');
        break;
    }
    
    setFilters(newFilters);
  };

  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSelectedListingType('all');
    setSearchQuery('');
    setFavoritesOnly(false);
  };

  const filteredCamps = camps.filter(
    (camp) =>
      (!favoritesOnly || isFavorite(camp.id)) &&
      (camp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        camp.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getTotalTents = (config?: { large: number; small: number; entertainment: number }) => {
    if (!config) return 0;
    return config.large + config.small + config.entertainment;
  };

  const handleCampClick = (campId: string) => {
    console.log('=== CAMP CLICKED ===');
    console.log('Camp ID:', campId);
    console.log('Navigating to:', `/camp/${campId}`);
    
    navigate(`/camp/${campId}`, {
      state: { from: '/search' }
    });
  };

  // Calculate active filter count
  const activeFilterCount = 
    (filters.locations.length > 0 ? filters.locations.length : 0) +
    (filters.amenities.length > 0 ? filters.amenities.length : 0) +
    (filters.tentTypes.length > 0 ? filters.tentTypes.length : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000 ? 1 : 0) +
    (filters.bookingDate ? 1 : 0) +
    (filters.listingType && filters.listingType !== 'all' ? 1 : 0) +
    (favoritesOnly ? 1 : 0);

  // Get type-specific counts
  const campCount = filteredCamps.filter(c => ((c as any).listingType || 'camp') === 'camp').length;
  const kashtaCount = filteredCamps.filter(c => (c as any).listingType === 'kashta').length;

  return (
    <div className="min-h-screen bg-background">
      {/* The Season Ledger - Compact Top Band */}
      <div className="bg-white border-b border-border sticky top-16 z-30 shadow-sm overflow-hidden">
        <PatternSadu color="#0A1128" opacity={0.04} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
            
            {/* Page Title */}
            <h1 className="text-lg font-bold text-gray-900 whitespace-nowrap">{t('home.searchTitle')}</h1>

            {/* Integrated Search */}
            <div className="flex-1 max-w-xl md:mx-auto">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-gray-700 transition-colors" />
                <Input
                  type="text"
                  placeholder={t('home.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-sm transition-all"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 rtl:flex-row-reverse">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFavoritesOnly(!favoritesOnly)}
                className={`h-11 font-medium ${favoritesOnly ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90' : 'border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <Heart className={`w-4 h-4 ltr:mr-2 rtl:ml-2 ${favoritesOnly ? 'fill-red-500 text-red-500' : ''}`} />
                {t('home.favoritesFilter')}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 border-gray-200 text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {filters.bookingDate ? filters.bookingDate.toLocaleDateString(i18n.language === 'ar' ? 'ar-BH' : 'en-US', { month: 'short', day: 'numeric' }) : t('home.datePlaceholder')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-2 w-auto" align="end">
                  <Calendar
                    mode="single"
                    selected={filters.bookingDate}
                    onSelect={(date) => handleBookingDateChange(date instanceof Date ? date : undefined)}
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                    initialFocus
                  />
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBookingDateChange(undefined)}
                      className="text-gray-700"
                    >
                      {t('home.clear')}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="lg:hidden h-11 border-gray-200 text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    {t('home.filters')}
                    {activeFilterCount > 0 && (
                      <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
                  <FilterSidebar
                    filters={filters}
                    onFilterChange={(newFilters) => {
                      handleFilterChange(newFilters);
                      setShowMobileFilters(false);
                    }}
                    locations={locations}
                    amenities={amenities}
                  />
                </SheetContent>
              </Sheet>
            </div>
            
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Ledger Type Selector */}
        <div className="mb-8 max-w-xl">
          <ListingTypeSelector
            value={(selectedListingType === 'all' ? 'camp' : selectedListingType) as import('@/types/listing').ListingType}
            onChange={(type) => setSelectedListingType(type)}
            variant="tabs"
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Desktop Filters */}
          <div className="hidden lg:block lg:w-64 flex-shrink-0">
            <div className="sticky top-40">
              <div className="mb-4 pb-2 border-b border-border">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500">{t('home.filters')}</h3>
              </div>
              <FilterSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                locations={locations}
                amenities={amenities}
              />
            </div>
          </div>

          {/* Ledger / Results */}
          <div className="flex-1">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 mb-6 pb-4 border-b border-border/50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                  {selectedListingType === 'all' 
                    ? t('home.ledgerTitleAll')
                    : selectedListingType === 'camp'
                    ? t('home.ledgerTitleCamp')
                    : t('home.ledgerTitleKashta')
                  }
                </h2>
                <div className="text-sm text-gray-500 mt-1 font-medium flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${loading ? 'bg-gray-300' : 'bg-green-500'}`}></span>
                  {loading
                    ? '…'
                    : selectedListingType === 'all'
                    ? t('home.campsAvailable', { count: filteredCamps.length })
                    : selectedListingType === 'camp'
                    ? t('home.campsAvailable', { count: campCount })
                    : t('home.kashtasAvailable', { count: kashtaCount })
                  }
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Select value={filters.sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-40 h-9 bg-white border-gray-200 text-sm">
                    <SelectValue placeholder={t('home.sortBy')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t('home.sortNewest')}</SelectItem>
                    <SelectItem value="price_asc">{t('home.sortPriceAsc')}</SelectItem>
                    <SelectItem value="price_desc">{t('home.sortPriceDesc')}</SelectItem>
                    <SelectItem value="rating">{t('home.sortRating')}</SelectItem>
                  </SelectContent>
                </Select>

                <div className="hidden sm:flex bg-white rounded-md border border-gray-200 p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-sm transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-sm transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filters Micro-chips */}
            {activeFilterCount > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {filters.locations.map(location => (
                  <span key={location} onClick={() => removeFilter('location', location)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-gray-200 bg-white text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-50 hover:text-gray-900 transition-colors">
                    {location} <X className="w-3 h-3" />
                  </span>
                ))}
                {filters.amenities.map(amenity => (
                  <span key={amenity} onClick={() => removeFilter('amenity', amenity)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-gray-200 bg-white text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-50 hover:text-gray-900 transition-colors">
                    {amenity} <X className="w-3 h-3" />
                  </span>
                ))}
                {(filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) && (
                  <span onClick={() => removeFilter('price')} className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-gray-200 bg-white text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-50 hover:text-gray-900 transition-colors">
                    {filters.priceRange[0]}-{filters.priceRange[1]} BHD <X className="w-3 h-3" />
                  </span>
                )}
                {filters.minRating > 0 && (
                  <span onClick={() => removeFilter('rating')} className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-gray-200 bg-white text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-50 hover:text-gray-900 transition-colors">
                    {filters.minRating}+ {t('filters.minRating')} <X className="w-3 h-3" />
                  </span>
                )}
                {favoritesOnly && (
                  <span onClick={() => setFavoritesOnly(false)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-gray-200 bg-white text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-50 hover:text-gray-900 transition-colors">
                    <Heart className="w-3 h-3 fill-red-500 text-red-500" /> {t('home.favoritesFilter')} <X className="w-3 h-3" />
                  </span>
                )}
                <button onClick={clearAllFilters} className="text-xs text-gray-700 hover:text-gray-700/80 font-medium px-2 py-1">
                  {t('home.clearAll')}
                </button>
              </div>
            )}
{/* Listings Grid/List */}
            {loading ? (
              <div className="py-24 flex items-center justify-center">
                <div className="text-center">
                  <CampfireLoader size="lg" className="mb-4" />
                  <p className="text-gray-700 font-medium text-lg">
                    {filters.bookingDate ? t('home.checkingAvailability') : t('home.loadingCamps')}
                  </p>
                </div>
              </div>
            ) : filteredCamps.length === 0 ? (
              <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-200">
                {selectedListingType === 'kashta' ? (
                  <Waves className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                ) : (
                  <Tent className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                )}
                {(() => {
                  const hasDateFilter = !!filters.bookingDate;
                  const hasOtherFilters = !!(filters.amenities?.length || (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) || filters.minGuests > 1 || filters.locations.length);
                  const hasAnyFilter = hasDateFilter || hasOtherFilters;
                  return (
                    <>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                        {hasAnyFilter ? t('home.noCampsFiltered', 'No results for these filters') : t('home.noCampsTitle')}
                      </h3>
                      <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                        {hasDateFilter
                          ? t('home.noCampsDate')
                          : hasOtherFilters
                          ? t('home.noCampsFilters', 'Try removing a few filters — there might be camps that match a broader search.')
                          : t('home.noCampsGeneral')}
                      </p>
                      {hasAnyFilter && (
                        <Button
                          onClick={clearAllFilters}
                          size="lg"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 px-8"
                        >
                          {t('home.clearAll')}
                        </Button>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" 
                : "space-y-6"
              }>
                {filteredCamps.map((camp) => {
                  const campAny = camp as any;
                  const listingType = (campAny.listingType || 'camp') as ListingType;
                  
                  // Render Kashta card for kashta listings
                  if (listingType === 'kashta') {
                    return (
                      <KashtaListingCard
                        key={camp.id}
                        listing={{
                          id: camp.id,
                          title: camp.title,
                          description: camp.description || '',
                          location: camp.location,
                          latitude: 0,
                          longitude: 0,
                          price: camp.price,
                                  weekendPrice: camp.weekendPrice,
                                  holidayPrice: camp.holidayPrice,
                          images: camp.photo ? [{ id: camp.id, url: camp.photo, isMain: true }] : [],
                          status: 'active',
                          hostId: camp.hostId || '',
                          hostName: camp.hostName || '',
                          maxGuests: camp.maxGuests,
                          checkInTime: camp.checkInTime || '15:00',
                          checkOutTime: camp.checkOutTime || '11:00',
                          rules: '',
                          specialFeatures: '',
                          createdAt: camp.createdAt || new Date().toISOString(),
                          listingType: 'kashta',
                          seatingCapacity: campAny.seatingCapacity ?? 10,
                          beachfrontAccess: campAny.beachfrontAccess ?? false,
                          shadeType: campAny.shadeType,
                          viewType: campAny.viewType,
                          waterActivities: campAny.waterActivities ?? [],
                          kashtaAmenities: camp.amenities || [],
                          rating: camp.averageRating,
                          reviewCount: camp.reviewCount,
                          cancellationPolicy: campAny.cancellationPolicy ?? { type: 'full_refundable' as const },
                          views: campAny.views
                        }}
                        onClick={() => handleCampClick(camp.id)}
                      />
                    );
                  }
                  
                  // Render regular camp card
                  return (
                    <Card
                      key={camp.id}
                      className="group cursor-pointer overflow-hidden bg-white border border-gray-200 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                      onClick={() => handleCampClick(camp.id)}
                    >
                      {/* Camp Image */}
                      <div className="relative h-64 overflow-hidden">
                        <img
                          src={camp.photo}
                          alt={camp.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
                          }}
                        />
                        <div className="absolute top-4 right-4 flex items-center gap-2">
                          {(camp.refundPolicy === 'refundable' || camp.refundPolicy === 'non-refundable') && (
                            <RefundPolicyBadge policy={camp.refundPolicy} />
                          )}
                          <FavoriteButton campId={camp.id} />
                        </div>
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-3 py-1">
                            <Tent className="w-4 h-4 mr-1" />
                            {t('listingType.camp.badge')}
                          </Badge>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                          <div className="flex items-center text-white text-base font-semibold">
                            <MapPin className="w-5 h-5 mr-2" />
                            {camp.location}
                          </div>
                        </div>
                      </div>

                      {/* Camp Details */}
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-gray-600 transition-colors">
                          {camp.title}
                        </h3>

                        {/* Rating */}
                        <div className="flex items-center gap-2 mb-4">
                          <RatingStars rating={camp.averageRating || 0} size="lg" />
                          <span className="text-base font-semibold text-gray-700">
                            ({t('home.reviewCount', { count: camp.reviewCount || 0 })})
                          </span>
                        </div>

                        {/* Camp Info */}
                        <div className="flex items-center gap-6 text-base text-gray-700 mb-5 font-medium">
                          <div className="flex items-center">
                            <Users className="w-5 h-5 mr-2 text-gray-700" />
                            {t('home.upToGuests', { count: camp.maxGuests })}
                          </div>
                          <div className="flex items-center">
                            <Tent className="w-5 h-5 mr-2 text-gray-700" />
                            {t('home.tentsCount', { count: getTotalTents(camp.tentConfiguration) })}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex items-center justify-between pt-5 border-t-2 border-border">
                          <div>
                            <span className="text-xl font-bold text-gray-900 tabular-nums tracking-tight">
                              {hasPeakPricing(camp) ? `${t('common.from')} ${getStartingRate(camp)}` : camp.price} BHD
                            </span>
                            <span className="text-base text-gray-600 ltr:ml-2 rtl:mr-2 font-medium">{t('home.perDay')}</span>
                            <span className="block text-xs text-gray-500 mt-0.5">{t('home.serviceFeeNote')}</span>
                          </div>
                          <Button 
                            size="lg"
                            className="bg-gray-900 hover:bg-gray-800 text-white font-medium h-9 px-4 text-sm rounded-md"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCampClick(camp.id);
                            }}
                          >
                            {t('home.viewDetails')}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}