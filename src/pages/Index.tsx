import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Search, MapPin, Users, Tent, Loader2, SlidersHorizontal, Calendar as CalendarIcon, Waves, X, Grid3x3, List } from 'lucide-react';
import { getCampsWithFilters, getCampAmenities, FilterState } from '@/lib/firestore';
import { toast } from 'sonner';
import FilterSidebar from '@/components/FilterSidebar';
import RatingStars from '@/components/RatingStars';
import { RefundPolicyBadge } from '@/components/RefundPolicyBadge';
import { ListingTypeSelector } from '@/components/ListingTypeSelector';
import { KashtaListingCard } from '@/components/KashtaListingCard';
import { BAHRAIN_CAMPING_LOCATIONS } from '@/lib/locations';
import { LegacyCamp, normalizeCampToLegacy } from '@/lib/dataCompatibility';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { ListingType } from '@/types/listing';

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

export default function Index() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [camps, setCamps] = useState<LegacyCamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedListingType, setSelectedListingType] = useState<'all' | 'camp' | 'kashta'>('all');
  const [locations, setLocations] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadCamps();
  }, [filters]);

  // Update filters when listing type changes
  useEffect(() => {
    setFilters({ ...filters, listingType: selectedListingType });
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
        setCamps([]);
        
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
        setCamps(legacyCamps);
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
      setCamps([]);
    } finally {
      setLoading(false);
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
  };

  const filteredCamps = camps.filter(
    (camp) =>
      camp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.location.toLowerCase().includes(searchQuery.toLowerCase())
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
      state: { from: '/' }
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
    (filters.listingType && filters.listingType !== 'all' ? 1 : 0);

  // Get type-specific counts
  const campCount = filteredCamps.filter(c => (c.listingType || 'camp') === 'camp').length;
  const kashtaCount = filteredCamps.filter(c => c.listingType === 'kashta').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#6B4423] animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-medium text-lg">
            {filters.bookingDate ? t('home.checkingAvailability') : t('home.loadingCamps')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200">
      {/* Hero Section - Fixed with dark background and white text */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#8B5A3C] via-[#6B4423] to-[#5A3820] text-white">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="desert-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M0 50 Q25 30, 50 50 T100 50" fill="none" stroke="currentColor" strokeWidth="2"/>
                <circle cx="25" cy="30" r="3" fill="currentColor"/>
                <circle cx="75" cy="30" r="3" fill="currentColor"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#desert-pattern)"/>
          </svg>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 text-white animate-in fade-in slide-in-from-bottom-8 duration-700">
              {t('home.heroTitleTop')}
              <span className="block text-orange-200 mt-2">{t('home.heroTitleBottom')}</span>
            </h1>
            <p className="text-lg sm:text-xl text-orange-100 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 delay-200 duration-700">
              {t('home.heroSubtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar - NEW PROMINENT SECTION */}
      <div className="relative z-40 bg-white shadow-lg border-b-2 border-orange-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Listing Type Selector */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              {t('listingType.sectionTitle')}
            </h3>
            <ListingTypeSelector
              value={selectedListingType}
              onChange={setSelectedListingType}
              variant="cards"
              campCount={campCount}
              kashtaCount={kashtaCount}
            />
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
              <Input
                type="text"
                placeholder={t('home.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-14 h-14 border-2 border-orange-300 focus:border-[#8B5A3C] rounded-xl text-lg text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Quick Filters Row */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 px-4 border-2 border-orange-300 hover:border-orange-400 hover:bg-orange-50 rounded-xl font-semibold text-gray-900"
                >
                  <CalendarIcon className="mr-2 h-5 w-5 text-[#6B4423]" />
                  {filters.bookingDate ? format(filters.bookingDate, 'MMM d, yyyy') : t('home.datePlaceholder')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-2 border-2 border-orange-200 rounded-2xl shadow-xl w-auto" align="start">
                <Calendar
                  mode="single"
                  selected={filters.bookingDate}
                  onSelect={(date) => handleBookingDateChange(date || undefined)}
                  disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                  initialFocus
                  variant="compact"
                  hideLegend
                />
                <div className="flex justify-between items-center pt-2 px-1">
                  <p className="text-xs text-gray-600">
                    {filters.bookingDate ? format(filters.bookingDate, 'EEE, MMM d, yyyy') : t('home.datePickedLabel')}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#6B4423] hover:bg-orange-50"
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
              <SelectTrigger className="h-12 w-40 border-2 border-orange-300 rounded-xl font-semibold">
                <Users className="w-5 h-5 mr-2 text-[#6B4423]" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 8, 10, 15, 20].map(num => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? t('home.guestLabel') : t('home.guestsLabel')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Advanced Filters Button - Desktop */}
            <Button
              variant="outline"
              className="hidden lg:flex h-12 px-4 border-2 border-orange-300 hover:bg-orange-50 rounded-xl font-semibold"
              onClick={() => setShowMobileFilters(true)}
            >
              <SlidersHorizontal className="w-5 h-5 mr-2" />
              {t('home.filters')}
              {activeFilterCount > 0 && (
                <Badge className="ml-2 bg-[#6B4423] text-white">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            {/* Mobile Filters Button */}
            <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  className="lg:hidden h-12 px-4 border-2 border-orange-300 hover:bg-orange-50 rounded-xl font-semibold"
                >
                  <SlidersHorizontal className="w-5 h-5 mr-2" />
                  {t('home.filters')}
                  {activeFilterCount > 0 && (
                    <Badge className="ml-2 bg-[#6B4423] text-white">
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
              className="h-12 px-6 bg-[#6B4423] hover:bg-[#5A3820] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Search className="w-5 h-5 mr-2" />
              {t('home.searchButton')}
            </Button>
          </div>

          {/* Active Filters Chips */}
          {activeFilterCount > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-sm font-semibold text-gray-700">{t('home.activeFilters')}</span>
              
              {filters.listingType && filters.listingType !== 'all' && (
                <Badge 
                  variant="secondary" 
                  className="h-8 px-3 bg-orange-100 text-orange-900 border border-orange-300 cursor-pointer hover:bg-orange-200"
                  onClick={() => removeFilter('listingType')}
                >
                  {filters.listingType === 'camp' ? '🏕️ ' + t('listingType.camp.title') : '🏖️ ' + t('listingType.kashta.title')}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              )}
              
              {filters.locations.map(location => (
                <Badge 
                  key={location}
                  variant="secondary" 
                  className="h-8 px-3 bg-blue-100 text-blue-900 border border-blue-300 cursor-pointer hover:bg-blue-200"
                  onClick={() => removeFilter('location', location)}
                >
                  📍 {location}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
              
              {filters.amenities.map(amenity => (
                <Badge 
                  key={amenity}
                  variant="secondary" 
                  className="h-8 px-3 bg-green-100 text-green-900 border border-green-300 cursor-pointer hover:bg-green-200"
                  onClick={() => removeFilter('amenity', amenity)}
                >
                  ✨ {amenity}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
              
              {filters.minRating > 0 && (
                <Badge 
                  variant="secondary" 
                  className="h-8 px-3 bg-yellow-100 text-yellow-900 border border-yellow-300 cursor-pointer hover:bg-yellow-200"
                  onClick={() => removeFilter('rating')}
                >
                  ⭐ {filters.minRating}+ {t('filters.minRating')}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              )}
              
              {filters.bookingDate && (
                <Badge 
                  variant="secondary" 
                  className="h-8 px-3 bg-purple-100 text-purple-900 border border-purple-300 cursor-pointer hover:bg-purple-200"
                  onClick={() => removeFilter('date')}
                >
                  📅 {format(filters.bookingDate, 'MMM d, yyyy')}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              )}
              
              {(filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) && (
                <Badge 
                  variant="secondary" 
                  className="h-8 px-3 bg-orange-100 text-orange-900 border border-orange-300 cursor-pointer hover:bg-orange-200"
                  onClick={() => removeFilter('price')}
                >
                  💰 {filters.priceRange[0]} - {filters.priceRange[1]} BD
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold"
                onClick={clearAllFilters}
              >
                {t('home.clearAll')}
              </Button>
            </div>
          )}
        </div>
      </div>

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
            {/* Results Header */}
            <div className="bg-white rounded-xl shadow-md border-2 border-orange-200 p-6 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedListingType === 'all' 
                      ? `${t('home.showingListings', { count: filteredCamps.length })}${filteredCamps.length !== 1 ? '' : ''} ${t('home.listingsInBahrain')}`
                      : selectedListingType === 'camp'
                      ? campCount === 1 ? t('home.campsAvailableCount', { count: campCount }) : t('home.campsAvailableCountPlural', { count: campCount })
                      : kashtaCount === 1 ? t('home.kashtasAvailableCount', { count: kashtaCount }) : t('home.kashtasAvailableCountPlural', { count: kashtaCount })
                    }
                  </h2>
                  {filters.bookingDate && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      <CalendarIcon className="w-4 h-4" />
                      <span>
                        {t('home.availableOn')} {format(filters.bookingDate, 'EEEE, MMMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <Select value={filters.sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-48 h-11 border-2 border-orange-300 rounded-xl font-semibold">
                      <SelectValue placeholder={t('home.sortBy')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">{t('home.sortNewest')}</SelectItem>
                      <SelectItem value="price_asc">{t('home.sortPriceAsc')}</SelectItem>
                      <SelectItem value="price_desc">{t('home.sortPriceDesc')}</SelectItem>
                      <SelectItem value="rating">{t('home.sortRating')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="hidden sm:flex gap-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="icon"
                      className={viewMode === 'grid' ? 'bg-[#6B4423] hover:bg-[#5A3820]' : 'border-2 border-orange-300'}
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid3x3 className="w-5 h-5" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="icon"
                      className={viewMode === 'list' ? 'bg-[#6B4423] hover:bg-[#5A3820]' : 'border-2 border-orange-300'}
                      onClick={() => setViewMode('list')}
                    >
                      <List className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Listings Grid/List */}
            {filteredCamps.length === 0 ? (
              <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-2xl border-2 border-orange-200">
                {selectedListingType === 'kashta' ? (
                  <Waves className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                ) : (
                  <Tent className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                )}
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">{t('home.noCampsTitle')}</h3>
                <p className="text-gray-600 text-lg mb-8">
                  {filters.bookingDate 
                    ? t('home.noCampsDate')
                    : t('home.noCampsGeneral')}
                </p>
                <Button
                  onClick={clearAllFilters}
                  size="lg"
                  className="bg-[#6B4423] hover:bg-[#5A3820] text-white font-semibold h-12 px-8"
                >
                  {t('home.clearAll')}
                </Button>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" 
                : "space-y-6"
              }>
                {filteredCamps.map((camp) => {
                  const listingType = (camp.listingType || 'camp') as ListingType;
                  
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
                          pricePerNight: camp.price,
                          images: camp.photo ? [{ url: camp.photo, isMain: true }] : [],
                          status: 'active',
                          hostId: camp.hostId || '',
                          hostName: camp.hostName || '',
                          createdAt: camp.createdAt || new Date().toISOString(),
                          listingType: 'kashta',
                          seatingCapacity: camp.seatingCapacity || 10,
                          beachfrontAccess: camp.beachfrontAccess || false,
                          shadeType: camp.shadeType,
                          viewType: camp.viewType,
                          waterActivities: camp.waterActivities || [],
                          amenities: camp.amenities || [],
                          rating: camp.averageRating,
                          reviewCount: camp.reviewCount,
                          cancellationPolicy: camp.refundPolicy,
                          views: camp.views
                        }}
                        onClick={() => handleCampClick(camp.id)}
                      />
                    );
                  }
                  
                  // Render regular camp card
                  return (
                    <Card
                      key={camp.id}
                      className="group cursor-pointer overflow-hidden bg-white border-2 border-orange-200 hover:border-orange-400 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
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
                        <div className="absolute top-4 right-4 flex gap-2">
                          <RefundPolicyBadge policy={camp.refundPolicy} />
                        </div>
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-[#6B4423] hover:bg-[#5A3820] text-white font-semibold px-3 py-1">
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
                        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-[#6B4423] transition-colors">
                          {camp.title}
                        </h3>

                        {/* Rating */}
                        <div className="flex items-center gap-2 mb-4">
                          <RatingStars rating={camp.averageRating || 0} size="lg" />
                          <span className="text-base font-semibold text-gray-700">
                            ({camp.reviewCount || 0} {camp.reviewCount === 1 ? t('home.reviewLabel') : t('home.reviewsLabel')})
                          </span>
                        </div>

                        {/* Camp Info */}
                        <div className="flex items-center gap-6 text-base text-gray-700 mb-5 font-medium">
                          <div className="flex items-center">
                            <Users className="w-5 h-5 mr-2 text-[#6B4423]" />
                            {t('home.upToGuests', { count: camp.maxGuests })}
                          </div>
                          <div className="flex items-center">
                            <Tent className="w-5 h-5 mr-2 text-[#6B4423]" />
                            {getTotalTents(camp.tentConfiguration)} {getTotalTents(camp.tentConfiguration) === 1 ? t('home.tentLabel') : t('home.tentsLabel')}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex items-center justify-between pt-5 border-t-2 border-orange-200">
                          <div>
                            <span className="text-3xl font-bold text-[#6B4423]">
                              {camp.price} BD
                            </span>
                            <span className="text-base text-gray-600 ml-2 font-medium">{t('home.perDay')}</span>
                          </div>
                          <Button 
                            size="lg"
                            className="bg-[#6B4423] hover:bg-[#5A3820] text-white font-semibold h-11 px-6"
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