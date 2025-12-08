import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FilterState } from '@/lib/firestore';
import { X, SlidersHorizontal, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import RatingStars from './RatingStars';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  locations: string[];
  amenities: string[];
  onClose?: () => void;
}

export default function FilterSidebar({
  filters,
  onFilterChange,
  locations,
  amenities,
  onClose
}: FilterSidebarProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    filters.bookingDate ? filters.bookingDate : undefined
  );
  const { t } = useTranslation();

  useEffect(() => {
    setLocalFilters(filters);
    setSelectedDate(filters.bookingDate ? filters.bookingDate : undefined);
  }, [filters]);

  const handlePriceChange = (value: number[]) => {
    setLocalFilters({ ...localFilters, priceRange: [value[0], value[1]] });
  };

  const handleLocationToggle = (location: string) => {
    const newLocations = localFilters.locations.includes(location)
      ? localFilters.locations.filter(l => l !== location)
      : [...localFilters.locations, location];
    setLocalFilters({ ...localFilters, locations: newLocations });
  };

  const handleAmenityToggle = (amenity: string) => {
    const newAmenities = localFilters.amenities.includes(amenity)
      ? localFilters.amenities.filter(a => a !== amenity)
      : [...localFilters.amenities, amenity];
    setLocalFilters({ ...localFilters, amenities: newAmenities });
  };

  const handleTentTypeToggle = (type: 'large' | 'small' | 'entertainment') => {
    const newTentTypes = localFilters.tentTypes.includes(type)
      ? localFilters.tentTypes.filter(t => t !== type)
      : [...localFilters.tentTypes, type];
    setLocalFilters({ ...localFilters, tentTypes: newTentTypes });
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setLocalFilters({
        ...localFilters,
        bookingDate: date
      });
    } else {
      const { bookingDate: _, ...rest } = localFilters;
      setLocalFilters(rest as FilterState);
    }
  };

  const handleClearDate = () => {
    setSelectedDate(undefined);
    const { bookingDate: _, ...rest } = localFilters;
    setLocalFilters(rest as FilterState);
  };

  const handleApply = () => {
    onFilterChange(localFilters);
    if (onClose) onClose();
  };

  const handleReset = () => {
    const defaultFilters: FilterState = {
      priceRange: [0, 1000],
      locations: [],
      minGuests: 1,
      amenities: [],
      tentTypes: [],
      minRating: 0,
      sortBy: 'newest'
    };
    setLocalFilters(defaultFilters);
    setSelectedDate(undefined);
    onFilterChange(defaultFilters);
  };

  const activeFilterCount = 
    (localFilters.locations.length > 0 ? 1 : 0) +
    (localFilters.minGuests > 1 ? 1 : 0) +
    (localFilters.amenities.length > 0 ? 1 : 0) +
    (localFilters.tentTypes.length > 0 ? 1 : 0) +
    (localFilters.minRating > 0 ? 1 : 0) +
    (localFilters.priceRange[0] > 0 || localFilters.priceRange[1] < 1000 ? 1 : 0) +
    (localFilters.bookingDate ? 1 : 0);

  return (
    <Card className="p-6 bg-white/95 backdrop-blur-sm border-2 border-orange-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-#6B4423" />
          <h3 className="text-lg font-bold text-gray-900">{t('filters.apply')}</h3>
          {activeFilterCount > 0 && (
            <span className="bg-terracotta-100 text-#5A3820 text-xs font-semibold px-2 py-1 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* Single Date Filter - UPDATED FOR DAILY BOOKINGS */}
        <div>
          <Label className="text-sm font-semibold text-gray-900 mb-3 block">
            {t('filters.bookingDate')}
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal border-2 border-orange-300",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "EEEE, MMM dd, yyyy")
                ) : (
                  <span>{t('filters.selectDate')}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {selectedDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearDate}
              className="w-full mt-2 text-#6B4423 hover:text-#5A3820 hover:bg-orange-50"
            >
              {t('filters.clearDate')}
            </Button>
          )}
          <p className="text-xs text-gray-600 mt-2">
            {t('filters.findAvailable')}
          </p>
        </div>

        {/* Price Range */}
        <div>
          <Label className="text-sm font-semibold text-gray-900 mb-3 block">
            {t('filters.priceRange')}
          </Label>
          <div className="px-2">
            <Slider
              value={localFilters.priceRange}
              onValueChange={handlePriceChange}
              min={0}
              max={1000}
              step={10}
              className="mb-4"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-#6B4423">{localFilters.priceRange[0]} BD</span>
              <span className="text-gray-400">to</span>
              <span className="font-semibold text-#6B4423">{localFilters.priceRange[1]} BD</span>
            </div>
          </div>
        </div>

        {/* Location */}
        {locations.length > 0 && (
          <div>
            <Label className="text-sm font-semibold text-gray-900 mb-3 block">
              {t('filters.location')}
            </Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {locations.map((location) => (
                <div key={location} className="flex items-center space-x-2">
                  <Checkbox
                    id={`location-${location}`}
                    checked={localFilters.locations.includes(location)}
                    onCheckedChange={() => handleLocationToggle(location)}
                  />
                  <Label
                    htmlFor={`location-${location}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {location}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guest Capacity */}
        <div>
          <Label className="text-sm font-semibold text-gray-900 mb-3 block">
            {t('filters.minGuests')}
          </Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocalFilters({ ...localFilters, minGuests: Math.max(1, localFilters.minGuests - 1) })}
              disabled={localFilters.minGuests <= 1}
              className="border-orange-300"
            >
              -
            </Button>
            <span className="text-sm font-medium w-12 text-center">
              {localFilters.minGuests}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocalFilters({ ...localFilters, minGuests: Math.min(50, localFilters.minGuests + 1) })}
              disabled={localFilters.minGuests >= 50}
              className="border-orange-300"
            >
              +
            </Button>
          </div>
        </div>

        {/* Tent Types */}
        <div>
          <Label className="text-sm font-semibold text-gray-900 mb-3 block">
            {t('filters.tentTypes')}
          </Label>
          <div className="space-y-2">
              {[
              { value: 'large' as const, label: t('filters.largeTents') },
              { value: 'small' as const, label: t('filters.smallTents') },
              { value: 'entertainment' as const, label: t('filters.entertainmentTents') }
            ].map(({ value, label }) => (
              <div key={value} className="flex items-center space-x-2">
                <Checkbox
                  id={`tent-${value}`}
                  checked={localFilters.tentTypes.includes(value)}
                  onCheckedChange={() => handleTentTypeToggle(value)}
                />
                <Label
                  htmlFor={`tent-${value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div>
            <Label className="text-sm font-semibold text-gray-900 mb-3 block">
              {t('filters.amenities')}
            </Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {amenities.map((amenity) => (
                <div key={amenity} className="flex items-center space-x-2">
                  <Checkbox
                    id={`amenity-${amenity}`}
                    checked={localFilters.amenities.includes(amenity)}
                    onCheckedChange={() => handleAmenityToggle(amenity)}
                  />
                  <Label
                    htmlFor={`amenity-${amenity}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {amenity}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Minimum Rating */}
        <div>
          <Label className="text-sm font-semibold text-gray-900 mb-3 block">
            {t('filters.minRating')}
          </Label>
          <div className="space-y-2">
            {[0, 3, 4, 5].map((rating) => (
              <div key={rating} className="flex items-center space-x-2">
                <Checkbox
                  id={`rating-${rating}`}
                  checked={localFilters.minRating === rating}
                  onCheckedChange={() => setLocalFilters({ ...localFilters, minRating: rating })}
                />
                <Label
                  htmlFor={`rating-${rating}`}
                  className="text-sm font-normal cursor-pointer flex items-center gap-2"
                >
                  {rating === 0 ? (
                    t('filters.allRatings')
                  ) : (
                    <>
                      <RatingStars rating={rating} size="sm" />
                      <span>{t('filters.up')}</span>
                    </>
                  )}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 pt-6 border-t border-orange-200 space-y-3">
        <Button
          onClick={handleApply}
          className="w-full bg-gradient-to-r from-#8B5A3C to-#6B4423 hover:from-#6B4423 hover:to-#5A3820 text-white font-semibold shadow-lg"
        >
          {t('filters.apply')}
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          className="w-full border-2 border-orange-300 hover:bg-orange-50"
        >
          {t('filters.reset')}
        </Button>
      </div>
    </Card>
  );
}
