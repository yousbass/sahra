import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ShadeType, ViewType } from '@/types/listing';
import { KASHTA_AMENITIES } from '@/types/listing';

interface KashtaSpecificFormProps {
  seatingCapacity: string;
  beachfrontAccess: boolean;
  shadeType: ShadeType | '';
  viewType: ViewType | '';
  kashtaAmenities: string[];
  waterActivities: string[];
  onSeatingCapacityChange: (value: string) => void;
  onBeachfrontAccessChange: (value: boolean) => void;
  onShadeTypeChange: (value: ShadeType) => void;
  onViewTypeChange: (value: ViewType) => void;
  onKashtaAmenitiesChange: (amenities: string[]) => void;
  onWaterActivitiesChange: (activities: string[]) => void;
}

export function KashtaSpecificForm({
  seatingCapacity,
  beachfrontAccess,
  shadeType,
  viewType,
  kashtaAmenities,
  waterActivities,
  onSeatingCapacityChange,
  onBeachfrontAccessChange,
  onShadeTypeChange,
  onViewTypeChange,
  onKashtaAmenitiesChange,
  onWaterActivitiesChange,
}: KashtaSpecificFormProps) {
  const { t } = useTranslation();

  const handleAmenityToggle = (amenity: string) => {
    if (kashtaAmenities.includes(amenity)) {
      onKashtaAmenitiesChange(kashtaAmenities.filter(a => a !== amenity));
    } else {
      onKashtaAmenitiesChange([...kashtaAmenities, amenity]);
    }
  };

  const handleActivityToggle = (activity: string) => {
    if (waterActivities.includes(activity)) {
      onWaterActivitiesChange(waterActivities.filter(a => a !== activity));
    } else {
      onWaterActivitiesChange([...waterActivities, activity]);
    }
  };

  const waterActivityOptions = [
    { value: 'swimming', label: t('kashta.activities.swimming') },
    { value: 'fishing', label: t('kashta.activities.fishing') },
    { value: 'snorkeling', label: t('kashta.activities.snorkeling') },
    { value: 'boating', label: t('kashta.activities.boating') }
  ];

  return (
    <div className="space-y-6">
      {/* Seating Capacity */}
      <div>
        <Label htmlFor="seatingCapacity">
          {t('kashta.form.seatingCapacity')} *
        </Label>
        <Input
          id="seatingCapacity"
          type="number"
          min="1"
          max="50"
          value={seatingCapacity}
          onChange={(e) => onSeatingCapacityChange(e.target.value)}
          placeholder={t('kashta.form.seatingCapacityPlaceholder')}
          className="mt-1"
        />
        <p className="text-sm text-gray-500 mt-1">
          {t('kashta.form.seatingCapacityHelper')}
        </p>
      </div>

      {/* Beachfront Access */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex-1">
          <Label htmlFor="beachfrontAccess" className="text-base">
            {t('kashta.form.beachfrontAccess')}
          </Label>
          <p className="text-sm text-gray-500 mt-1">
            {t('kashta.form.beachfrontAccessHelper')}
          </p>
        </div>
        <Switch
          id="beachfrontAccess"
          checked={beachfrontAccess}
          onCheckedChange={onBeachfrontAccessChange}
        />
      </div>

      {/* Shade Type */}
      <div>
        <Label htmlFor="shadeType">
          {t('kashta.form.shadeType')} *
        </Label>
        <Select
          value={shadeType}
          onValueChange={(value) => onShadeTypeChange(value as ShadeType)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={t('kashta.form.shadeTypePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tent">{t('kashta.shade.tent')}</SelectItem>
            <SelectItem value="umbrella">{t('kashta.shade.umbrella')}</SelectItem>
            <SelectItem value="pergola">{t('kashta.shade.pergola')}</SelectItem>
            <SelectItem value="natural">{t('kashta.shade.natural')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* View Type */}
      <div>
        <Label>{t('kashta.form.viewType')} *</Label>
        <RadioGroup
          value={viewType}
          onValueChange={(value) => onViewTypeChange(value as ViewType)}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="beach" id="beach" />
            <Label htmlFor="beach" className="font-normal cursor-pointer">
              {t('kashta.view.beach')}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="mixed" id="mixed" />
            <Label htmlFor="mixed" className="font-normal cursor-pointer">
              {t('kashta.view.mixed')}
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Kashta Amenities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('kashta.form.amenities')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(KASHTA_AMENITIES).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-medium text-sm text-gray-700 mb-2 capitalize">
                {t(`amenityCategories.${category}`)}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {items.map((amenity) => (
                  <div key={amenity} className="flex items-center space-x-2">
                    <Checkbox
                      id={`amenity-${amenity}`}
                      checked={kashtaAmenities.includes(amenity)}
                      onCheckedChange={() => handleAmenityToggle(amenity)}
                    />
                    <Label
                      htmlFor={`amenity-${amenity}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {/* Try to translate the amenity item, fallback to English string */}
                      {t(`createListing.amenityItems.${amenity}`, { defaultValue: amenity })}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Water Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('kashta.form.waterActivities')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {waterActivityOptions.map((activity) => (
              <div key={activity.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`activity-${activity.value}`}
                  checked={waterActivities.includes(activity.value)}
                  onCheckedChange={() => handleActivityToggle(activity.value)}
                />
                <Label
                  htmlFor={`activity-${activity.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {activity.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}