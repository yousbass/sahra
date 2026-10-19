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
import { Star, Sparkles, MapPin as MapPinIcon, Search as SearchIcon, MapPin, Users, Tent, SlidersHorizontal, Calendar as CalendarIcon, Waves, X, Grid3x3, List, Heart } from 'lucide-react';
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

import { SaduBand } from '@/components/SaduBand';
import { PatternSadu } from '@/components/BackgroundPatterns';
import { useFavorites } from '@/hooks/useFavorites';

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

export default function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { isFavorite, toggleFavorite } = useFavorites();
  
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
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Read URL params
  useEffect(() => {
    const typeParam = searchParams.get('type');
    const favParam = searchParams.get('favorites');
    
    // URL is the source of truth on navigation: absent params reset to defaults
    setSelectedListingType(typeParam === 'camp' || typeParam === 'kashta' ? typeParam : 'all');
    setShowFavorites(favParam === '1');
    const fromUrl = searchParams.getAll('amenities').filter(Boolean);
    setFilters(prev => {
      const same = fromUrl.length === prev.amenities.length && fromUrl.every(a => prev.amenities.includes(a));
      return same ? prev : { ...prev, amenities: fromUrl };
    });
  }, [searchParams]);

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
    setShowFavorites(false);
  };

  const filteredCamps = camps.filter(
    (camp) =>
      (!showFavorites || isFavorite(camp.id)) &&
      (camp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getTotalTents = (config?: { large: number; small: number; entertainment: number }) => {
    if (!config) return 0;
    return config.large + config.small + config.entertainment;
  };

  const handleCampClick = (campId: string) => {
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
    (showFavorites ? 1 : 0);

  // Get type-specific counts
  const campCount = filteredCamps.filter(c => ((c as any).listingType || 'camp') === 'camp').length;
  const kashtaCount = filteredCamps.filter(c => (c as any).listingType === 'kashta').length;

  // Editorial split: first listing becomes "Tonight's Pick", rest fill the ledger grid
  const featuredCamp = filteredCamps.length > 0 ? filteredCamps[0] : null;
  const restCamps = filteredCamps.length > 1 ? filteredCamps.slice(1) : [];

  const isRTL = i18n.language === 'ar';

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Search top band */}
      <div className="relative overflow-hidden bg-card/40 border-b border-border/60 pb-6 pt-6">
        <PatternSadu color="currentColor" className="text-foreground" opacity={0.05} />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Listing Type Selector */}
          <div className="mb-6">
            <ListingTypeSelector
              value={selectedListingType}
              onChange={setSelectedListingType}
              variant="cards"
              campCount={campCount}
              kashtaCount={kashtaCount}
            />
          </div>

          {/* Search Bar */}
          <div className="mb-6 flex gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary w-6 h-6" />
              <Input
                type="text"
                placeholder={t('home.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-14 h-16 bg-background/50 border border-border/80 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-lg text-foreground placeholder:text-muted-foreground transition-all"
              />
            </div>
          </div>

          {/* Quick Filters Row */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Favorites Toggle */}
            <Button
              type="button"
              variant={showFavorites ? 'default' : 'outline'}
              onClick={() => setShowFavorites(!showFavorites)}
              className={`h-12 px-5 rounded-xl font-medium transition-all ${
                showFavorites 
                  ? 'bg-red-500 hover:bg-red-600 text-white border-transparent' 
                  : 'bg-background/50 border-border/80 hover:bg-secondary text-foreground hover:border-red-400'
              }`}
            >
              <Heart className={`mr-2 h-5 w-5 ${showFavorites ? 'fill-white' : 'text-red-500'}`} />
              {t('home.favoritesFilter')}
            </Button>
            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 px-5 bg-background/50 border border-border/80 hover:border-primary/50 hover:bg-secondary rounded-xl font-medium text-foreground transition-all"
                >
                  <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
                  {filters.bookingDate ? filters.bookingDate.toLocaleDateString(i18n.language === 'ar' ? 'ar-BH' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : t('home.datePlaceholder')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-2 border border-border rounded-2xl shadow-xl w-auto bg-card" align="start">
                <Calendar
                  mode="single"
                  selected={filters.bookingDate}
                  onSelect={(date) => handleBookingDateChange(date instanceof Date ? date : undefined)}
                  disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                  initialFocus
                  variant="compact"
                  hideLegend
                />
                <div className="flex justify-between items-center pt-2 px-1">
                  <p className="text-xs text-muted-foreground">
                    {filters.bookingDate ? filters.bookingDate.toLocaleDateString(i18n.language === 'ar' ? 'ar-BH' : 'en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : t('home.datePickedLabel')}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-primary/10"
                    onClick={() => handleBookingDateChange(undefined)}
                  >
                    {t('home.clear')}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Guests Selector */}
            <Select 
              value={filters.minGuests.toString()} 
              onValueChange={(value) => setFilters({ ...filters, minGuests: parseInt(value) })}
            >
              <SelectTrigger className="h-12 w-40 bg-background/50 border border-border/80 rounded-xl font-medium text-foreground">
                <Users className="w-5 h-5 mr-2 text-primary" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 8, 10, 15, 20].map(num => (
                  <SelectItem key={num} value={num.toString()}>
                    {t('home.upToGuests', { count: num })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Mobile Filters Button */}
            <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  className="lg:hidden h-12 px-5 bg-background/50 border border-border/80 hover:bg-secondary hover:border-primary/50 rounded-xl font-medium text-foreground transition-all"
                >
                  <SlidersHorizontal className="w-5 h-5 mr-2" />
                  {t('home.filters')}
                  {activeFilterCount > 0 && (
                    <Badge className="ml-2 bg-primary text-primary-foreground">
                      {activeFilterCount}
                    </Badge>
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

            {/* Search Button */}
            <Button 
              onClick={() => loadCamps()}
              className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all duration-300"
            >
              <SearchIcon className="w-5 h-5 mr-2" />
              {t('home.searchButton')}
            </Button>
          </div>

          {/* Active Filters Chips */}
          {activeFilterCount > 0 && (
            <div className="mt-6 flex flex-wrap gap-2 items-center p-3 bg-secondary/30 rounded-xl border border-border/50">
              <span className="text-sm font-semibold text-muted-foreground mr-2">{t('home.activeFilters')}</span>
              
              {showFavorites && (
                <Badge 
                  variant="secondary" 
                  className="h-8 px-3 cursor-pointer bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20"
                  onClick={() => setShowFavorites(false)}
                >
                  <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 fill-red-500" /> {t('home.favoritesFilter')}</span>
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              )}

              {filters.listingType && filters.listingType !== 'all' && (
                <Badge 
                  variant="secondary" 
                  className={`h-8 px-3 cursor-pointer ${
                    filters.listingType === 'kashta' 
                      ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/90' 
                      : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                  }`}
                  onClick={() => removeFilter('listingType')}
                >
                  <span className="flex items-center gap-1.5">{filters.listingType === 'camp' ? <Tent className="w-4 h-4"/> : <Waves className="w-4 h-4"/>} {filters.listingType === 'camp' ? t('listingType.camp.title') : t('listingType.kashta.title')}</span>
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              )}
              
              {filters.locations.map(location => (
                <Badge 
                  key={location}
                  variant="secondary" 
                  className="h-8 px-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 cursor-pointer hover:bg-blue-500/20"
                  onClick={() => removeFilter('location', location)}
                >
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {location}</span>
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
              
              {filters.amenities.map(amenity => (
                <Badge 
                  key={amenity}
                  variant="secondary" 
                  className="h-8 px-3 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30 cursor-pointer hover:bg-green-500/20"
                  onClick={() => removeFilter('amenity', amenity)}
                >
                  <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> {amenity}</span>
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
              
              {filters.minRating > 0 && (
                <Badge 
                  variant="secondary" 
                  className="h-8 px-3 bg-primary text-primary-foreground border border-primary cursor-pointer hover:bg-primary/90"
                  onClick={() => removeFilter('rating')}
                >
                  <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> {filters.minRating}+ {t('filters.minRating')}</span>
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              )}
              
              {filters.bookingDate && (
                <Badge 
                  variant="secondary" 
                  className="h-8 px-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 cursor-pointer hover:bg-purple-500/20"
                  onClick={() => removeFilter('date')}
                >
                  <span className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> {filters.bookingDate.toLocaleDateString(i18n.language === 'ar' ? 'ar-BH' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              )}
              
              {(filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) && (
                <Badge 
                  variant="secondary" 
                  className="h-8 px-3 bg-primary text-primary-foreground border border-primary cursor-pointer hover:bg-primary/90"
                  onClick={() => removeFilter('price')}
                >
                  <span>{filters.priceRange[0]} - {filters.priceRange[1]} BHD</span>
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10 font-medium ml-auto"
                onClick={clearAllFilters}
              >
                {t('home.clearAll')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Cultural strip — one thin line of seasonal texture copy, static (not live data) */}
      <div className="border-b border-border/60 bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3 overflow-hidden">
          <span className="text-primary/70 text-xs shrink-0">✦</span>
          <p className="text-xs text-muted-foreground font-light truncate rtl:text-right">
            {t('home.stripLine')}
          </p>
        </div>
      </div>

      <SaduBand />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filters Sidebar */}
          <div className="hidden lg:block lg:w-80 flex-shrink-0">
            <div className="sticky top-4">
              <FilterSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                locations={locations}
                amenities={amenities}
              />
            </div>
          </div>

          {/* Results Section */}
          <div className="flex-1">
            {/* Results Header — ledger index entry, not a marketing heading */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 pb-4 border-b border-border/60">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground font-sans mb-1.5 uppercase tracking-wider">
                  <span>{t('home.indexLabel')}</span>
                  <span className="text-border">·</span>
                  <span className="text-primary/80">
                    {selectedListingType === 'kashta'
                      ? t('home.indexScopeKashta')
                      : selectedListingType === 'camp'
                      ? t('home.indexScopeCamp')
                      : t('home.indexScopeAll')}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-foreground font-sans tracking-tight tabular-nums">
                  {loading
                    ? '…'
                    : t('home.entryCount', { count: filteredCamps.length })}
                </h2>
                {filters.bookingDate && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-primary/80">
                    <CalendarIcon className="w-4 h-4" />
                    <span>
                      {t('home.availableOn')} {filters.bookingDate.toLocaleDateString(i18n.language === 'ar' ? 'ar-BH' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Select value={filters.sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-48 h-11 bg-background/50 border border-border/80 rounded-2xl font-medium text-foreground">
                    <SelectValue placeholder={t('home.sortBy')} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border rounded-2xl">
                    <SelectItem value="newest" className="rounded-xl">{t('home.sortNewest')}</SelectItem>
                    <SelectItem value="price_asc" className="rounded-xl">{t('home.sortPriceAsc')}</SelectItem>
                    <SelectItem value="price_desc" className="rounded-xl">{t('home.sortPriceDesc')}</SelectItem>
                    <SelectItem value="rating" className="rounded-xl">{t('home.sortRating')}</SelectItem>
                  </SelectContent>
                </Select>

                <div className="hidden sm:flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="icon"
                    className={viewMode === 'grid' ? 'bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl' : 'bg-background/50 border border-border/80 text-foreground rounded-2xl'}
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3x3 className="w-5 h-5" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="icon"
                    className={viewMode === 'list' ? 'bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl' : 'bg-background/50 border border-border/80 text-foreground rounded-2xl'}
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Listings Grid/List */}
            {loading ? (
              <div className="py-24 flex items-center justify-center">
                <div className="text-center">
                  <CampfireLoader size="lg" className="mb-4" />
                  <p className="text-muted-foreground font-medium text-lg font-sans">
                    {filters.bookingDate ? t('home.checkingAvailability') : t('home.loadingCamps')}
                  </p>
                </div>
              </div>
            ) : filteredCamps.length === 0 ? (
              <div className="text-center py-20 bg-card/30 backdrop-blur-sm rounded-2xl border border-border/50">
                {selectedListingType === 'kashta' ? (
                  <Waves className="w-20 h-20 text-muted-foreground mx-auto mb-4 opacity-50" />
                ) : (
                  <Tent className="w-20 h-20 text-muted-foreground mx-auto mb-4 opacity-50" />
                )}
                {(() => {
                  const hasDateFilter = !!filters.bookingDate;
                  const hasOtherFilters = !!(filters.amenities?.length || (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) || filters.minGuests > 1 || filters.locations.length);
                  const hasAnyFilter = hasDateFilter || hasOtherFilters;
                  return (
                    <>
                      <h3 className="text-2xl font-bold text-foreground mb-3 font-sans">
                        {hasAnyFilter ? t('home.noCampsFiltered', 'No results for these filters') : t('home.noCampsTitle')}
                      </h3>
                      <p className="text-muted-foreground text-lg mb-8 font-medium max-w-md mx-auto">
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
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 px-8 shadow-[0_0_20px_rgba(212,175,55,0.2)] rounded-2xl"
                        >
                          {t('home.clearAll')}
                        </Button>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <>
                {/* Tonight's Pick — asymmetric editorial feature for the first listing */}
                {featuredCamp && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary font-sans">
                        {t('home.tonightsPick')}
                      </span>
                      <span className="flex-1 h-px bg-border/60" />
                      <span className="text-xs text-muted-foreground font-display tabular-nums font-semibold">01</span>
                    </div>

                    {(() => {
                      const camp = featuredCamp;
                      const campAny = camp as any;
                      const listingType = (campAny.listingType || 'camp') as ListingType;

                      if (listingType === 'kashta') {
                        return (
                          <div className="lg:grid lg:grid-cols-5">
                            <div className="lg:col-span-5">
                              <KashtaListingCard
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
                            </div>
                          </div>
                        );
                      }

                      return (
                        <Card
                          className="group cursor-pointer overflow-hidden bg-card/60 border border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm md:grid md:grid-cols-5 rounded-3xl"
                          onClick={() => handleCampClick(camp.id)}
                        >
                          {/* Camp Image */}
                          <div className="relative h-72 md:h-full md:col-span-3 overflow-hidden rounded-t-3xl md:rounded-tr-none md:rounded-l-3xl rtl:md:rounded-tr-3xl rtl:md:rounded-l-none rtl:md:rounded-r-3xl">
                            <img
                              src={camp.photo}
                              alt={camp.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent md:bg-gradient-to-r opacity-80" />

                            <div className="absolute top-4 right-4 flex gap-2 items-center rtl:right-auto rtl:left-4 z-20">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  toggleFavorite(camp.id);
                                }}
                                className="p-1.5 rounded-full bg-background/50 backdrop-blur-md border border-border/50 hover:bg-background transition-colors"
                              >
                                <Heart className={`w-5 h-5 transition-colors ${isFavorite(camp.id) ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
                              </button>
                              {(camp.refundPolicy === 'refundable' || camp.refundPolicy === 'non-refundable') && (
                                <RefundPolicyBadge policy={camp.refundPolicy} />
                              )}
                            </div>
                            <div className="absolute top-4 left-4 rtl:left-auto rtl:right-4 flex gap-2">
                              <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm font-semibold px-3 py-1 border border-primary/20 rounded-xl">
                                <Tent className="w-4 h-4 mr-1" />
                                {t('listingType.camp.badge')}
                              </Badge>
                            </div>
                          </div>

                          {/* Camp Details */}
                          <div className="p-6 md:p-8 relative md:col-span-2 flex flex-col justify-center">
                            <div className="flex items-center text-muted-foreground text-sm font-medium mb-3">
                              <MapPin className="w-4 h-4 mr-2 text-primary" />
                              {camp.location}
                            </div>
                            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors font-sans">
                              {camp.title}
                            </h3>

                            {/* Rating */}
                            <div className="flex items-center gap-2 mb-4">
                              <RatingStars rating={camp.averageRating || 0} size="lg" />
                              <span className="text-base font-medium text-muted-foreground">
                                ({t('home.reviewCount', { count: camp.reviewCount || 0 })})
                              </span>
                            </div>

                            {/* Camp Info */}
                            <div className="flex items-center gap-6 text-base text-muted-foreground mb-5 font-medium">
                              <div className="flex items-center">
                                <Users className="w-5 h-5 mr-2 text-primary" />
                                {t('home.upToGuests', { count: camp.maxGuests })}
                              </div>
                              <div className="flex items-center">
                                <Tent className="w-5 h-5 mr-2 text-primary" />
                                {t('home.tentsCount', { count: getTotalTents(camp.tentConfiguration) })}
                              </div>
                            </div>

                            {/* Price */}
                            <div className="flex items-center justify-between pt-5 border-t border-border/50">
                              <div>
                                {hasPeakPricing(camp) && (
                                  <span className="text-base text-muted-foreground ltr:mr-1 rtl:ml-1 font-medium lowercase">{t('common.from')}</span>
                                )}
                                <span className="text-3xl font-bold text-primary font-display tracking-tight tabular-nums">
                                  {hasPeakPricing(camp) ? getStartingRate(camp) : camp.price} BHD
                                </span>
                                <span className="text-base text-muted-foreground ltr:ml-2 rtl:mr-2 font-medium">{t('home.perDay')}</span>
                                <span className="block text-xs text-muted-foreground/60 mt-0.5">{t('home.serviceFeeNote')}</span>
                              </div>
                              <Button
                                size="lg"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 px-6 shadow-[0_0_15px_rgba(212,175,55,0.2)] rounded-2xl"
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
                    })()}
                  </div>
                )}

                {/* Rest of the ledger */}
                {restCamps.length > 0 && (
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans">
                      {t('home.theRest')}
                    </span>
                    <span className="flex-1 h-px bg-border/60" />
                  </div>
                )}

                <div className={viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" 
                  : "space-y-6"
                }>
                  {restCamps.map((camp, idx) => {
                    const campAny = camp as any;
                    const listingType = (campAny.listingType || 'camp') as ListingType;
                    
                    // Render Kashta card for kashta listings
                    if (listingType === 'kashta') {
                      return (
                        <div key={camp.id} className="relative">
                          <span className="absolute -top-3 -left-3 z-10 w-8 h-8 rounded-full bg-background border border-border/60 flex items-center justify-center text-xs text-muted-foreground font-display font-semibold tabular-nums rtl:-left-auto rtl:-right-3 shadow-sm">
                            {String(idx + 2).padStart(2, '0')}
                          </span>
                          <KashtaListingCard
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
                        </div>
                      );
                    }
                    
                    // Render regular camp card
                    return (
                      <Card
                        key={camp.id}
                        className="group cursor-pointer overflow-hidden bg-card/60 border border-border/50 hover:border-primary/50 transition-all duration-500 hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:-translate-y-1 backdrop-blur-sm relative rounded-3xl"
                        onClick={() => handleCampClick(camp.id)}
                      >
                        <span className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm border border-border/60 flex items-center justify-center text-xs text-muted-foreground font-display font-semibold tabular-nums rtl:left-auto rtl:right-3 shadow-sm">
                          {String(idx + 2).padStart(2, '0')}
                        </span>
                        {/* Camp Image */}
                        <div className="relative h-64 overflow-hidden rounded-t-3xl">
                          <img
                            src={camp.photo}
                            alt={camp.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-80" />
                          
                          <div className="absolute top-4 right-4 flex gap-2 items-center rtl:right-auto rtl:left-4 z-20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                toggleFavorite(camp.id);
                              }}
                              className="p-1.5 rounded-full bg-background/50 backdrop-blur-md border border-border/50 hover:bg-background transition-colors"
                            >
                              <Heart className={`w-5 h-5 transition-colors ${isFavorite(camp.id) ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
                            </button>
                            {(camp.refundPolicy === 'refundable' || camp.refundPolicy === 'non-refundable') && (
                              <RefundPolicyBadge policy={camp.refundPolicy} />
                            )}
                          </div>
                          <div className="absolute bottom-4 left-4 right-4">
                            <div className="flex items-center text-white text-base font-semibold drop-shadow-md">
                              <MapPin className="w-5 h-5 mr-2 text-primary" />
                              {camp.location}
                            </div>
                          </div>
                        </div>

                        {/* Camp Details */}
                        <div className="p-6 relative">
                          <h3 className="text-xl font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors font-sans">
                            {camp.title}
                          </h3>

                          {/* Rating */}
                          <div className="flex items-center gap-2 mb-4">
                            <RatingStars rating={camp.averageRating || 0} size="lg" />
                            <span className="text-base font-medium text-muted-foreground">
                              ({t('home.reviewCount', { count: camp.reviewCount || 0 })})
                            </span>
                          </div>

                          {/* Camp Info */}
                          <div className="flex items-center gap-6 text-base text-muted-foreground mb-5 font-medium">
                            <div className="flex items-center">
                              <Users className="w-5 h-5 mr-2 text-primary" />
                              {t('home.upToGuests', { count: camp.maxGuests })}
                            </div>
                            <div className="flex items-center">
                              <Tent className="w-5 h-5 mr-2 text-primary" />
                              {t('home.tentsCount', { count: getTotalTents(camp.tentConfiguration) })}
                            </div>
                          </div>

                          {/* Price */}
                          <div className="flex items-center justify-between pt-5 border-t border-border/50">
                            <div>
                              {hasPeakPricing(camp) && (
                                <span className="text-base text-muted-foreground ltr:mr-1 rtl:ml-1 font-medium lowercase">{t('common.from')}</span>
                              )}
                              <span className="text-3xl font-bold text-primary font-display tracking-tight tabular-nums">
                                {hasPeakPricing(camp) ? getStartingRate(camp) : camp.price} BHD
                              </span>
                              <span className="text-base text-muted-foreground ltr:ml-2 rtl:mr-2 font-medium">{t('home.perDay')}</span>
                              <span className="block text-xs text-muted-foreground/60 mt-0.5">{t('home.serviceFeeNote')}</span>
                            </div>
                            <Button 
                              size="lg"
                              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 px-6 shadow-[0_0_15px_rgba(212,175,55,0.2)] rounded-2xl"
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}