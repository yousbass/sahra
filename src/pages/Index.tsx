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
import { Search, MapPin, Users, Tent, Loader2, SlidersHorizontal, Calendar as CalendarIcon } from 'lucide-react';
import { getCampsWithFilters, getCampAmenities, FilterState } from '@/lib/firestore';
import { toast } from 'sonner';
import FilterSidebar from '@/components/FilterSidebar';
import RatingStars from '@/components/RatingStars';
import { RefundPolicyBadge } from '@/components/RefundPolicyBadge';
import { BAHRAIN_CAMPING_LOCATIONS } from '@/lib/locations';
import { LegacyCamp, normalizeCampToLegacy } from '@/lib/dataCompatibility';
import { format } from 'date-fns';

const DEFAULT_FILTERS: FilterState = {
  priceRange: [0, 1000],
  locations: [],
  minGuests: 1,
  amenities: [],
  tentTypes: [],
  minRating: 0,
  sortBy: 'newest'
};

export default function Index() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [camps, setCamps] = useState<LegacyCamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [locations, setLocations] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadCamps();
  }, [filters]);

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

  // UPDATED: Changed from dateRange to bookingDate
  const activeFilterCount = 
    (filters.locations.length > 0 ? 1 : 0) +
    (filters.minGuests > 1 ? 1 : 0) +
    (filters.amenities.length > 0 ? 1 : 0) +
    (filters.tentTypes.length > 0 ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000 ? 1 : 0) +
    (filters.bookingDate ? 1 : 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-terracotta-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-medium">
            {filters.bookingDate ? 'Checking availability...' : 'Loading camps...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-terracotta-500 via-terracotta-600 to-terracotta-700 text-white">
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
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <div className="text-center px-2">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
              Discover Your Perfect
              <span className="block text-sand-100 mt-2 text-3xl sm:text-5xl">Desert Escape</span>
            </h1>
            <p className="text-base sm:text-xl text-sand-100 mb-6 sm:mb-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 delay-200 duration-700 px-2">
              Experience authentic Bahraini camping with luxury tents, stunning locations, and unforgettable memories
            </p>
            
            {/* Search Bar */}
            <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 delay-300 duration-700">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-3 sm:p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      type="text"
                      placeholder="Search by location or camp name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 h-12 border-2 border-sand-200 focus:border-terracotta-500 rounded-xl text-gray-900"
                    />
                  </div>
                  <div className="w-full sm:w-64">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-left h-12 border-2 border-sand-200 hover:border-terracotta-400 hover:bg-terracotta-50 rounded-xl font-semibold text-gray-900"
                        >
                          <CalendarIcon className="mr-2 h-5 w-5 text-terracotta-600" />
                          {filters.bookingDate ? format(filters.bookingDate, 'EEE, MMM d, yyyy') : 'Select a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-2 border-2 border-sand-200 rounded-2xl shadow-xl w-[320px] sm:w-[360px] max-w-[95vw]" align="start">
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
                            {filters.bookingDate ? format(filters.bookingDate, 'EEE, MMM d, yyyy') : 'Pick a date'}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-terracotta-600 hover:bg-terracotta-50"
                            onClick={() => handleBookingDateChange(undefined)}
                          >
                            Clear
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button 
                    onClick={() => loadCamps()}
                    className="h-12 px-8 bg-terracotta-600 hover:bg-terracotta-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
                  >
                    <Search className="w-5 h-5 mr-2" />
                    Search
                  </Button>
                </div>
                <p className="text-xs text-gray-600 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-terracotta-500" />
                  Pick a date to instantly filter camps with availability checks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filters Sidebar */}
          <div className="hidden lg:block lg:w-80 flex-shrink-0">
            <div className="sticky top-24">
              <FilterSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                locations={locations}
                amenities={amenities}
              />
            </div>
          </div>

          {/* Mobile Filters */}
          <div className="lg:hidden">
            <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full border-2 border-sand-300 hover:bg-sand-50 h-12 text-base font-medium"
                >
                  <SlidersHorizontal className="w-5 h-5 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge className="ml-2 bg-terracotta-600 text-white">
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
          </div>

          {/* Camps Grid */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {filteredCamps.length} {filteredCamps.length === 1 ? 'Camp' : 'Camps'} Available
                </h2>
                {filters.bookingDate && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                    <CalendarIcon className="w-4 h-4" />
                    <span>
                      {format(filters.bookingDate, 'EEEE, MMM dd, yyyy')}
                    </span>
                  </div>
                )}
                {activeFilterCount > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} applied
                  </p>
                )}
              </div>
              
              <Select value={filters.sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-full sm:w-48 border-2 border-sand-300">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Camps Grid */}
            {filteredCamps.length === 0 ? (
              <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-2xl border-2 border-sand-200">
                <Tent className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No camps found</h3>
                <p className="text-gray-600 mb-6">
                  {filters.bookingDate 
                    ? 'No camps available for the selected date. Try a different date or adjust your filters.'
                    : 'Try adjusting your filters or search terms'}
                </p>
                <Button
                  onClick={() => {
                    setFilters(DEFAULT_FILTERS);
                    setSearchQuery('');
                  }}
                  variant="outline"
                  className="border-2 border-terracotta-600 text-terracotta-600 hover:bg-terracotta-50"
                >
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCamps.map((camp) => (
                  <Card
                    key={camp.id}
                    className="group cursor-pointer overflow-hidden bg-white/95 backdrop-blur-sm border-2 border-sand-200 hover:border-terracotta-400 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                    onClick={() => handleCampClick(camp.id)}
                  >
                    {/* Camp Image */}
                    <div className="relative h-56 overflow-hidden">
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
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                        <div className="flex items-center text-white text-sm">
                          <MapPin className="w-4 h-4 mr-1" />
                          {camp.location}
                        </div>
                      </div>
                    </div>

                    {/* Camp Details */}
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-terracotta-600 transition-colors">
                        {camp.title}
                      </h3>

                      {/* Rating */}
                      <div className="flex items-center gap-2 mb-3">
                        <RatingStars rating={camp.averageRating || 0} />
                        <span className="text-sm text-gray-600">
                          ({camp.reviewCount || 0} {camp.reviewCount === 1 ? 'review' : 'reviews'})
                        </span>
                      </div>

                      {/* Camp Info */}
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          Up to {camp.maxGuests} guests
                        </div>
                        <div className="flex items-center">
                          <Tent className="w-4 h-4 mr-1" />
                          {getTotalTents(camp.tentConfiguration)} tents
                        </div>
                      </div>

                      {/* Price - UPDATED: Changed from "per night" to "per day" */}
                      <div className="flex items-center justify-between pt-4 border-t border-sand-200">
                        <div>
                          <span className="text-2xl font-bold text-terracotta-600">
                            {camp.price} BD
                          </span>
                          <span className="text-sm text-gray-600 ml-1">/ day</span>
                        </div>
                        <Button 
                          size="sm"
                          className="bg-terracotta-600 hover:bg-terracotta-700 text-white font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCampClick(camp.id);
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
