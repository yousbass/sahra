import { CampfireLoader } from '@/components/CampfireLoader';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2, Check, Tent, Users, Plus, X, MapPin, Navigation, Link as LinkIcon, ChevronsUpDown, Clock, ClipboardList, Calendar, Camera, Sparkles, FileText } from 'lucide-react';
import { deleteField } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { getCamp, updateCamp, Camp } from '@/lib/firestore';
import type { TentConfig as TentConfigDetail } from '@/types/listing';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BAHRAIN_CAMPING_LOCATIONS, getLocationLabel } from '@/lib/locations';
import { CancellationPolicySelector } from '@/components/CancellationPolicySelector';
import { ImageUploadManager } from '@/components/ImageUploadManager';
import type { CancellationPolicy } from '@/lib/refundCalculator';
import { useTranslation } from 'react-i18next';

// Bahrain-specific camp amenities organized by category
const AMENITIES = {
  essential: ['Restrooms', 'Kitchen', 'Electricity', 'Lighting', 'Water Supply'],
  cooking: ['Fire Pit', 'BBQ Grill', 'Cooking Equipment', 'Dining Area'],
  entertainment: ['Sound System', 'TV Available', 'Volleyball Court', 'Soccer Court', 'Bouncy Castle'],
  comfort: ['Furnished Tents', 'Carpeted Tents', 'Sofas & Seating', 'Tea Sets', 'Air Conditioning'],
  activities: ['Dune Buggies', 'Desert Tours', 'Camel Rides', 'Stargazing Area', 'Biking'],
  other: ['Parking', 'Pet Friendly', 'Family Friendly', 'Security/Guards', 'Food Truck Access'],
};

interface ImageData {
  id: string;
  url: string;
  file?: File;
  isMain: boolean;
  uploading?: boolean;
  progress?: number;
}

export default function EditListing() {
  const navigate = useNavigate();
  const { campId } = useParams<{ campId: string }>();
  const { user, userData, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Camp data
  const [camp, setCamp] = useState<Camp | null>(null);
  
  // Basic Information
  const [title, setTitle] = useState('');
  const [locationOpen, setLocationOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [price, setPrice] = useState('');
  const [weekendPricingEnabled, setWeekendPricingEnabled] = useState(false);
  const [weekendPrice, setWeekendPrice] = useState('');
  const [holidayPrice, setHolidayPrice] = useState('');
  const [description, setDescription] = useState('');
  
  // Check-in/Check-out times
  const [checkInTime, setCheckInTime] = useState('08:00 AM');
  const [checkOutTime, setCheckOutTime] = useState('03:00 AM');
  
  // Image Upload - using new ImageUploadManager
  const [uploadedImages, setUploadedImages] = useState<ImageData[]>([]);
  
  // Camp Capacity
  const [maxGuests, setMaxGuests] = useState('');
  const [campArea, setCampArea] = useState('');
  
  // Tent Configuration
  type TentDetail = TentConfigDetail & { description?: string };
  const [tents, setTents] = useState<TentDetail[]>([]);
  
  // Amenities
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  
  // Additional Details
  const [specialFeatures, setSpecialFeatures] = useState('');
  const [rules, setRules] = useState('');
  
  // Cancellation Policy
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy>({ type: 'full_refundable' });
  
  const [gettingLocation, setGettingLocation] = useState(false);

  // Load camp data
  useEffect(() => {
    if (authLoading) return;

    if (!user || !userData) {
      toast.error(t('editListing.signInRequired'));
      navigate('/signin');
      return;
    }

    if (!userData.isHost) {
      toast.error(t('editListing.hostRequired'));
      navigate('/profile');
      return;
    }

    if (!campId) {
      toast.error(t('editListing.invalidId'));
      navigate('/host/listings');
      return;
    }

    loadCampData();
  }, [campId, user, userData, authLoading, navigate]);

  const loadCampData = async () => {
    if (!campId) return;

    try {
      setLoading(true);
      const campData = await getCamp(campId);

      if (!campData) {
        toast.error(t('editListing.notFound'));
        navigate('/host/listings');
        return;
      }

      // Verify ownership
      if (campData.hostId !== user?.uid) {
        toast.error(t('editListing.noPermission'));
        navigate('/host/listings');
        return;
      }

      setCamp(campData);

      // Use a permissive alias for legacy fields not on the Camp type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const legacyData = campData as any;

      // Populate form fields
      setTitle(campData.title || '');
      
      // Find location value from label
      const locationValue = BAHRAIN_CAMPING_LOCATIONS.find(loc => loc.label === campData.location)?.value || '';
      setSelectedLocation(locationValue);
      
      setLatitude(campData.coordinates?.lat?.toString() || '');
      setLongitude(campData.coordinates?.lng?.toString() || '');
      setPrice((legacyData.price ?? campData.pricePerNight)?.toString() || '');
      // Load peak-night pricing (weekend / holiday)
      const hasWeekend = typeof campData.weekendPrice === 'number' && campData.weekendPrice > 0;
      const hasHoliday = typeof campData.holidayPrice === 'number' && campData.holidayPrice > 0;
      setWeekendPricingEnabled(hasWeekend || hasHoliday);
      setWeekendPrice(hasWeekend ? String(campData.weekendPrice) : '');
      setHolidayPrice(hasHoliday ? String(campData.holidayPrice) : '');
      setDescription(campData.description || '');
      setMaxGuests(campData.maxGuests?.toString() || '');
      setCampArea(legacyData.campArea?.toString() || '');
      setTents(
        (legacyData.tents as TentDetail[] | undefined)?.map((t: TentDetail) => ({
          ...t,
          description: t.description || ''
        })) || []
      );
      setSelectedAmenities(campData.amenities || []);
      setSpecialFeatures(legacyData.specialFeatures || '');
      // rules may be stored as string (legacy) or string[] (new)
      const rawRules = legacyData.rules ?? campData.rules;
      setRules(Array.isArray(rawRules) ? rawRules.join('\n') : (rawRules || ''));
      // cancellationPolicy may be a string (legacy) or CancellationPolicy object
      const rawPolicy = campData.cancellationPolicy;
      if (rawPolicy && typeof rawPolicy === 'string') {
        setCancellationPolicy({ type: 'full_refundable' });
      } else {
        setCancellationPolicy((legacyData.cancellationPolicy as CancellationPolicy) || { type: 'full_refundable' });
      }
      
      // Load check-in/check-out times
      setCheckInTime(campData.checkInTime || '08:00 AM');
      setCheckOutTime(campData.checkOutTime || '03:00 AM');

      // Load images - convert to new format
      const images: ImageData[] = [];
      if (legacyData.photo) {
        images.push({
          id: 'main',
          url: legacyData.photo,
          isMain: true,
        });
      } else if (campData.images && campData.images.length > 0) {
        images.push({
          id: 'main',
          url: campData.images[0],
          isMain: true,
        });
      }
      if (legacyData.photos && Array.isArray(legacyData.photos)) {
        (legacyData.photos as string[]).forEach((photoUrl: string, index: number) => {
          images.push({
            id: `additional-${index}`,
            url: photoUrl,
            isMain: false,
          });
        });
      } else if (campData.images && campData.images.length > 1) {
        campData.images.slice(1).forEach((photoUrl: string, index: number) => {
          images.push({
            id: `additional-${index}`,
            url: photoUrl,
            isMain: false,
          });
        });
      }
      setUploadedImages(images);

    } catch (error) {
      console.error('Error loading camp:', error);
      toast.error(t('editListing.notFound'));
      navigate('/host/listings');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    setGettingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toFixed(6));
          setLongitude(position.coords.longitude.toFixed(6));
          setGoogleMapsUrl('');
          toast.success(t('createListing.locationCaptured'));
          setGettingLocation(false);
        },
        () => {
          toast.error(t('editListing.map.unableLocation'));
          setGettingLocation(false);
        }
      );
    } else {
      toast.error(t('editListing.map.geoUnsupported'));
      setGettingLocation(false);
    }
  };

  const extractCoordinatesFromUrl = (url: string) => {
    if (!url) return null;

    const decoded = decodeURIComponent(url);

    // ?q=lat,lng or &q=lat,lng
    const matchQuery = decoded.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (matchQuery) return { lat: matchQuery[1], lng: matchQuery[2] };

    // ?query=lat,lng (Google Maps API param)
    const matchQueryParam = decoded.match(/[?&]query=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (matchQueryParam) return { lat: matchQueryParam[1], lng: matchQueryParam[2] };

    // @lat,lng,zoom
    const matchAt = decoded.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*),/);
    if (matchAt) return { lat: matchAt[1], lng: matchAt[2] };

    // ...!3dlat!4dlng (place URLs)
    const matchBang = decoded.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (matchBang) return { lat: matchBang[1], lng: matchBang[2] };

    // place/.../@lat,lng
    const matchPlace = decoded.match(/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (matchPlace) return { lat: matchPlace[1], lng: matchPlace[2] };

    return null;
  };

  const resolveShortGoogleUrl = async (url: string): Promise<string | null> => {
    try {
      const apiBase =
        import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')
          ? import.meta.env.VITE_API_URL
          : '';
      const response = await fetch(`${apiBase}/api/maps/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.resolvedUrl || null;
    } catch (error) {
      console.warn('Failed to resolve short Google Maps URL:', error);
      return null;
    }
  };

  const handleGoogleMapsUrlChange = async (url: string) => {
    setGoogleMapsUrl(url);
    
    if (!url.trim()) return;

    let parseTarget = url.trim();

    if (/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl)\/.+/i.test(url.trim())) {
      const resolved = await resolveShortGoogleUrl(url.trim());
      if (resolved) {
        parseTarget = resolved;
      }
    }

    const coords = extractCoordinatesFromUrl(parseTarget);
    if (coords) {
      setLatitude(coords.lat);
      setLongitude(coords.lng);
      toast.success(t('createListing.locationCaptured'));
    } else {
      toast.error(t('editListing.map.parseError'));
    }
  };

  const addTent = (type: 'large' | 'small' | 'entertainment') => {
    const newTent: TentDetail = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      furnished: false,
      carpeted: false,
      tv: false,
      sofas: false,
      teaSets: false,
      pingPongTable: false,
      foosballTable: false,
      airHockeyTable: false,
      volleyballField: false,
      footballField: false,
      description: '',
    };
    setTents([...tents, newTent]);
  };

  const removeTent = (id: string) => {
    setTents(tents.filter(tent => tent.id !== id));
  };

  const updateTentFeature = (id: string, feature: keyof Omit<TentDetail, 'id' | 'type' | 'description'>) => {
    setTents(tents.map(tent => 
      tent.id === id ? { ...tent, [feature]: !tent[feature] } : tent
    ));
  };

  const updateTentDescription = (id: string, value: string) => {
    setTents(tents.map(tent => 
      tent.id === id ? { ...tent, description: value } : tent
    ));
  };

  const getTentTypeName = (type: string) => {
    switch(type) {
      case 'large': return t('createListing.tents.largeLabel');
      case 'small': return t('createListing.tents.smallLabel');
      case 'entertainment': return t('createListing.tents.entertainmentLabel');
      default: return t('createListing.tents.genericLabel');
    }
  };

  const getTentCounts = () => {
    const large = tents.filter(t => t.type === 'large').length;
    const small = tents.filter(t => t.type === 'small').length;
    const entertainment = tents.filter(t => t.type === 'entertainment').length;
    return { large, small, entertainment, total: large + small + entertainment };
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !campId) {
      toast.error(t('editListing.invalidId'));
      return;
    }
    
    setSubmitting(true);

    try {
      if (!selectedLocation) {
        toast.error(t('editListing.validations.locationRequired'));
        setSubmitting(false);
        return;
      }

      if (!latitude || !longitude) {
        toast.error(t('editListing.validations.coordinatesRequired'));
        setSubmitting(false);
        return;
      }

      if (!maxGuests || parseInt(maxGuests) < 1) {
        toast.error(t('editListing.validations.maxGuests'));
        setSubmitting(false);
        return;
      }

      if (tents.length === 0) {
        toast.error(t('editListing.validations.tents'));
        setSubmitting(false);
        return;
      }

      // Weekend pricing requires a valid weekend price when enabled
      if (weekendPricingEnabled && !(parseFloat(weekendPrice) > 0)) {
        toast.error(t('editListing.weekendPriceRequired'));
        setSubmitting(false);
        return;
      }

      if (uploadedImages.length === 0) {
        toast.error(t('editListing.validations.images'));
        setSubmitting(false);
        return;
      }

      // Check if any images are still uploading
      const stillUploading = uploadedImages.some(img => img.uploading);
      if (stillUploading) {
        toast.error(t('editListing.validations.uploading'));
        setSubmitting(false);
        return;
      }

      const counts = getTentCounts();
      
      // Get main image and additional images
      const mainImage = uploadedImages.find(img => img.isMain) || uploadedImages[0];
      const additionalImages = uploadedImages.filter(img => !img.isMain).map(img => img.url);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        title,
        location: getLocationLabel(selectedLocation),
        coordinates: {
          lat: parseFloat(latitude),
          lng: parseFloat(longitude),
        },
        price: parseFloat(price),
        pricePerNight: parseFloat(price),
        photo: mainImage.url, // Main cover image (Firebase Storage URL)
        photos: additionalImages, // Additional images (Firebase Storage URLs)
        images: mainImage ? [mainImage.url, ...additionalImages] : additionalImages,
        description,
        maxGuests: parseInt(maxGuests),
        campArea: campArea ? parseFloat(campArea) : undefined,
        tents: tents,
        tentConfiguration: {
          large: counts.large,
          small: counts.small,
          entertainment: counts.entertainment,
        },
        amenities: selectedAmenities,
        specialFeatures,
        rules,
        cancellationPolicy,
        checkInTime,
        checkOutTime,
      };

      // Peak-night pricing: write valid values, remove fields when disabled/invalid
      const weekendValid = weekendPricingEnabled && parseFloat(weekendPrice) > 0;
      const holidayValid = weekendPricingEnabled && parseFloat(holidayPrice) > 0;
      updateData.weekendPrice = weekendValid
        ? parseFloat(weekendPrice)
        : deleteField();
      updateData.holidayPrice = holidayValid
        ? parseFloat(holidayPrice)
        : deleteField();

      await updateCamp(campId, updateData);
      
      toast.success(t('editListing.success'));
      navigate('/host/listings');
    } catch (error) {
      const err = error as Error;
      console.error('Error updating camp:', error);
      toast.error(t('editListing.updateFail', { error: err?.message || 'Unknown error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (confirm(t('editListing.cancelConfirm', { defaultValue: 'Are you sure you want to cancel? Any unsaved changes will be lost.' }))) {
      navigate('/host/listings');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b desert-gradient p-4 flex items-center justify-center">
        <div className="text-center">
          <CampfireLoader size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">{t('editListing.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user || !userData || !userData.isHost || !camp) {
    return null;
  }

  const counts = getTentCounts();
  const hasCoordinates = latitude && longitude;

  return (
    <div className="min-h-screen bg-gradient-to-b desert-gradient p-4">
      <div className="max-w-4xl mx-auto pt-8 pb-20">
        <Button
          onClick={handleCancel}
          variant="ghost"
          className="mb-6 text-foreground hover:text-foreground hover:bg-secondary/60 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('editListing.back')}
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{t('editListing.title')}</h1>
          <p className="text-muted-foreground font-medium">{t('editListing.subtitle', { defaultValue: 'Update your camp information' })}</p>
        </div>

        <Card className="glass-card border-border/80 p-6 md:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div>
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-primary" />
                {t('createListing.basicInfo')}
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-foreground font-semibold">
                    {t('createListing.campName')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder={t('createListing.campName')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="border-border/80 focus:border-primary text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-foreground font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    {t('createListing.campLocation')} <span className="text-destructive">*</span>
                  </Label>
                  <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={locationOpen}
                        className="w-full justify-between border-border/80 hover:border-primary text-foreground h-11"
                      >
                        {selectedLocation
                          ? getLocationLabel(selectedLocation)
                          : t('createListing.selectLocation')}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder={t('createListing.searchLocations')} className="h-9" />
                        <CommandList>
                          <CommandEmpty>{t('createListing.noLocation', { defaultValue: 'No location found.' })}</CommandEmpty>
                          <CommandGroup>
                            {BAHRAIN_CAMPING_LOCATIONS.map((location) => (
                              <CommandItem
                                key={location.value}
                                value={location.value}
                                onSelect={(currentValue) => {
                                  setSelectedLocation(currentValue === selectedLocation ? "" : currentValue);
                                  setLocationOpen(false);
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{location.label}</span>
                                  <span className="text-xs text-muted-foreground">{location.region}</span>
                                </div>
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    selectedLocation === location.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Location Coordinates */}
                <div className="space-y-3 p-4 bg-secondary/40 border-2 border-border/80 rounded-lg">
                  <Label className="text-foreground font-semibold flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-primary" />
                    {t('createListing.map.setCoordinates')} <span className="text-destructive">*</span>
                  </Label>

                  {!hasCoordinates && (
                    <div className="p-3 bg-amber-500/10 border-2 border-amber-500/40 rounded-lg" data-testid="banner-no-coordinates">
                      <p className="text-sm font-bold text-amber-400 mb-1 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {t('editListing.map.noCoordinatesTitle')}
                      </p>
                      <p className="text-xs text-amber-400/90 font-medium">
                        {t('editListing.map.noCoordinatesHint')}
                      </p>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg"
                  >
                    {gettingLocation ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {t('createListing.gettingLocation')}
                      </>
                    ) : (
                      <>
                        <Navigation className="w-5 h-5 mr-2" />
                        {t('createListing.useMyLocation')}
                      </>
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/80" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-secondary/40 px-2 text-muted-foreground font-semibold">{t('createListing.or', { defaultValue: 'Or' })}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="googleMapsUrl" className="text-sm text-muted-foreground font-semibold flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      {t('createListing.map.pasteLink')}
                    </Label>
                    <Input
                      id="googleMapsUrl"
                      type="url"
                      placeholder={t('createListing.googleMapsUrl')}
                      value={googleMapsUrl}
                      onChange={(e) => handleGoogleMapsUrlChange(e.target.value)}
                      className="border-border/80 focus:border-primary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  {hasCoordinates && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-sm font-semibold text-green-400 mb-1 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {t('createListing.map.locationSet')}
                      </p>
                      <p className="text-xs text-green-400 font-medium">
                        {t('createListing.map.coordinates', { lat: latitude, lng: longitude })}
                      </p>
                    </div>
                  )}

                  {hasCoordinates && (
                    <div className="map-container mt-3">
                      <iframe
                        width="100%"
                        height="250"
                        frameBorder="0"
                        style={{ border: 0, borderRadius: '8px' }}
                        src={`https://www.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`}
                        allowFullScreen
                        title="Camp Location Map"
                      ></iframe>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price" className="text-foreground font-semibold">
                    {t('createListing.price')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder={t('createListing.pricePlaceholder')}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    className="border-border/80 focus:border-primary text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {/* Weekend / Holiday pricing */}
                <div className="space-y-3 p-4 rounded-xl border border-border/80 bg-secondary/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-10 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4 text-primary" />
                      </span>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{t('editListing.weekendPricingToggle')}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t('editListing.weekendPricingDesc')}</p>
                      </div>
                    </div>
                    <Switch checked={weekendPricingEnabled} onCheckedChange={setWeekendPricingEnabled} />
                  </div>

                  {weekendPricingEnabled && (
                    <div className="space-y-4 pt-1">
                      <div className="space-y-2">
                        <Label htmlFor="weekendPrice" className="text-foreground font-semibold">
                          {t('editListing.weekendPrice')} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="weekendPrice"
                          type="number"
                          placeholder={t('createListing.pricePlaceholder')}
                          value={weekendPrice}
                          onChange={(e) => setWeekendPrice(e.target.value)}
                          min="0"
                          step="0.01"
                          className="border-border/80 focus:border-primary text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="holidayPrice" className="text-foreground font-semibold">
                          {t('editListing.holidayPrice')}
                        </Label>
                        <Input
                          id="holidayPrice"
                          type="number"
                          placeholder={t('createListing.pricePlaceholder')}
                          value={holidayPrice}
                          onChange={(e) => setHolidayPrice(e.target.value)}
                          min="0"
                          step="0.01"
                          className="border-border/80 focus:border-primary text-foreground placeholder:text-muted-foreground"
                        />
                        <p className="text-sm text-muted-foreground font-medium">{t('editListing.holidayPriceDesc')}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Check-in and Check-out Times */}
                <div className="space-y-3 p-4 bg-secondary/40 border-2 border-border/80 rounded-lg">
                  <Label className="text-foreground font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    {t('createListing.checkIn')} & {t('createListing.checkOut')} <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground font-medium mb-3">
                    {t('createListing.times.helper')}
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="checkInTime" className="text-foreground font-semibold">
                        {t('createListing.checkIn')} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="checkInTime"
                        type="text"
                        placeholder={t('createListing.times.checkInHelper', { defaultValue: 'e.g., 08:00 AM' })}
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        required
                        className="border-border/80 focus:border-primary text-foreground placeholder:text-muted-foreground"
                      />
                      <p className="text-xs text-muted-foreground font-medium">{t('createListing.times.checkInHelper')}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="checkOutTime" className="text-foreground font-semibold">
                        {t('createListing.checkOut')} ({t('createListing.nextDay')}) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="checkOutTime"
                        type="text"
                        placeholder={t('createListing.times.checkOutHelper', { defaultValue: 'e.g., 03:00 AM' })}
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                        required
                        className="border-border/80 focus:border-primary text-foreground placeholder:text-muted-foreground"
                      />
                      <p className="text-xs text-muted-foreground font-medium">{t('createListing.times.checkOutHelper')}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-card border border-border/80 rounded-lg">
                    <p className="text-sm font-semibold text-foreground mb-1">
                      {t('createListing.map.fullDay')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('createListing.checkIn')}: <span className="font-bold text-primary">{checkInTime}</span> → {t('createListing.checkOut')}: <span className="font-bold text-primary">{checkOutTime} ({t('createListing.nextDay')})</span>
                    </p>
                  </div>
                </div>

                {/* Image Upload Section - NEW */}
                <div className="space-y-3">
                  <Label className="text-foreground font-semibold flex items-center gap-2">
                    <Camera className="w-6 h-6 text-primary" />
                    {t('createListing.photosTitle')} <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-sm text-muted-foreground font-medium">
                    {t('createListing.photosHelper')}
                  </p>

                  <ImageUploadManager
                    images={uploadedImages}
                    onChange={setUploadedImages}
                    userId={user.uid}
                    maxImages={10}
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-foreground font-semibold">{t('createListing.description')}</Label>
                  <Textarea
                    id="description"
                    placeholder={t('createListing.descriptionPlaceholder')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="border-border/80 focus:border-primary resize-none text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Camp Capacity & Size */}
            <div>
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                {t('createListing.capacity.title')}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxGuests" className="text-foreground font-semibold">
                    {t('createListing.maxGuests')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="maxGuests"
                    type="number"
                    placeholder={t('createListing.maxGuestsPlaceholder')}
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(e.target.value)}
                    required
                    min="1"
                    className="border-border/80 focus:border-primary text-foreground placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground font-medium">{t('createListing.capacity.maxGuestsHelper')}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campArea" className="text-foreground font-semibold">
                    {t('createListing.campArea')}
                  </Label>
                  <Input
                    id="campArea"
                    type="number"
                    placeholder={t('createListing.campAreaPlaceholder')}
                    value={campArea}
                    onChange={(e) => setCampArea(e.target.value)}
                    min="0"
                    className="border-border/80 focus:border-primary text-foreground placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground font-medium">{t('createListing.capacity.areaHelper')}</p>
                </div>
              </div>
            </div>

            {/* Tent Configuration */}
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                <Tent className="w-6 h-6 text-primary" />
                {t('createListing.tents.sectionTitle')}
              </h3>

              <div className="flex flex-wrap gap-3 mb-6">
                <Button
                  type="button"
                  onClick={() => addTent('large')}
                  variant="outline"
                  className="border-2 border-border/80 text-foreground hover:bg-secondary/40 font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('createListing.tents.addLarge')}
                </Button>
                <Button
                  type="button"
                  onClick={() => addTent('small')}
                  variant="outline"
                  className="border-2 border-border/80 text-foreground hover:bg-secondary/40 font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('createListing.tents.addSmall')}
                </Button>
                <Button
                  type="button"
                  onClick={() => addTent('entertainment')}
                  variant="outline"
                  className="border-2 border-border/80 text-foreground hover:bg-secondary/40 font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('createListing.tents.addEntertainment')}
                </Button>
              </div>

              {tents.length > 0 ? (
                <div className="space-y-4">
                  {tents.map((tent, index) => (
                    <Card key={tent.id} className="bg-secondary/40 border-2 border-border/80 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Tent className="w-5 h-5 text-primary" />
                          <h4 className="font-semibold text-foreground">
                            {getTentTypeName(tent.type)} #{index + 1}
                          </h4>
                        </div>
                        <Button
                          type="button"
                          onClick={() => removeTent(tent.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">{t('createListing.tents.featuresTitle')}:</p>
                          <div className="flex flex-wrap gap-2">
                            {(['furnished', 'carpeted', 'tv', 'sofas', 'teaSets'] as const).map((feature) => (
                              <Button
                                key={feature}
                                type="button"
                                onClick={() => updateTentFeature(tent.id, feature)}
                                variant={tent[feature] ? 'default' : 'outline'}
                                size="sm"
                                className={
                                  tent[feature]
                                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-semibold'
                                    : 'border-2 border-border/80 text-foreground hover:bg-secondary/60 font-semibold'
                                }
                              >
                                {tent[feature] && <Check className="w-3 h-3 mr-1" />}
                                {feature === 'furnished' && t('createListing.tents.featureLabels.furnished')}
                                {feature === 'carpeted' && t('createListing.tents.featureLabels.carpeted')}
                                {feature === 'tv' && t('createListing.tents.featureLabels.tv')}
                                {feature === 'sofas' && t('createListing.tents.featureLabels.sofas')}
                                {feature === 'teaSets' && t('createListing.tents.featureLabels.teaSets')}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">{t('createListing.tents.featuresTitle')}:</p>
                          <div className="flex flex-wrap gap-2">
                            {(['pingPongTable', 'foosballTable', 'airHockeyTable', 'volleyballField', 'footballField'] as const).map((feature) => (
                              <Button
                                key={feature}
                                type="button"
                                onClick={() => updateTentFeature(tent.id, feature)}
                                variant={tent[feature] ? 'default' : 'outline'}
                                size="sm"
                                className={
                                  tent[feature]
                                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-semibold'
                                    : 'border-2 border-border/80 text-foreground hover:bg-secondary/60 font-semibold'
                                }
                              >
                                {tent[feature] && <Check className="w-3 h-3 mr-1" />}
                                {feature === 'pingPongTable' && t('createListing.tents.featureLabels.pingPongTable')}
                                {feature === 'foosballTable' && t('createListing.tents.featureLabels.foosballTable')}
                                {feature === 'airHockeyTable' && t('createListing.tents.featureLabels.airHockeyTable')}
                                {feature === 'volleyballField' && t('createListing.tents.featureLabels.volleyballField')}
                                {feature === 'footballField' && t('createListing.tents.featureLabels.footballField')}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                            {t('createListing.tents.descriptionLabel')}
                          </Label>
                          <Textarea
                            value={tent.description || ''}
                            onChange={(e) => updateTentDescription(tent.id, e.target.value)}
                            placeholder={t('createListing.tents.descriptionPlaceholder')}
                            rows={2}
                            className="text-sm border-border/80 focus:border-primary"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 bg-secondary/40 border-2 border-border/80 rounded-lg">
                  <Tent className="w-12 h-12 text-primary/50 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">{t('createListing.tents.none')}</p>
                </div>
              )}

              {tents.length > 0 && (
                <div className="mt-4 p-4 bg-secondary/40 border-2 border-border/80 rounded-lg">
                  <p className="font-semibold text-foreground mb-2">{t('createListing.tents.sectionTitle')}:</p>
                  <p className="text-foreground">
                    <span className="font-bold">{counts.total}</span> {t('createListing.tents.sectionTitle')}
                    {counts.large > 0 && <span> • {counts.large} {t('createListing.tents.largeLabel')}</span>}
                    {counts.small > 0 && <span> • {counts.small} {t('createListing.tents.smallLabel')}</span>}
                    {counts.entertainment > 0 && <span> • {counts.entertainment} {t('createListing.tents.entertainmentLabel')}</span>}
                  </p>
                </div>
              )}
            </div>

            {/* Facilities & Amenities */}
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                {t('createListing.amenitiesSection')}
              </h3>
              <p className="text-sm text-muted-foreground font-medium mb-4">{t('createListing.amenitiesHelper')}</p>

              {Object.entries(AMENITIES).map(([category, items]) => (
                <div key={category} className="mb-6">
                  <h4 className="font-semibold text-foreground mb-3 capitalize">
                    {category === 'essential' && t('createListing.amenityCategories.essential')}
                    {category === 'cooking' && t('createListing.amenityCategories.cooking')}
                    {category === 'entertainment' && t('createListing.amenityCategories.entertainment')}
                    {category === 'comfort' && t('createListing.amenityCategories.comfort')}
                    {category === 'activities' && t('createListing.amenityCategories.activities')}
                    {category === 'other' && t('createListing.amenityCategories.other')}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {items.map((amenity) => {
                      const isSelected = selectedAmenities.includes(amenity);
                      return (
                        <Button
                          key={amenity}
                          type="button"
                          onClick={() => toggleAmenity(amenity)}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className={
                            isSelected
                              ? 'bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-semibold'
                              : 'border-2 border-border/80 text-foreground hover:bg-secondary/40 font-semibold'
                          }
                        >
                          {isSelected && <Check className="w-3 h-3 mr-1" />}
                          {t(`createListing.amenityItems.${amenity}`, { defaultValue: amenity })}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Cancellation Policy */}
            <CancellationPolicySelector
              value={cancellationPolicy}
              onChange={setCancellationPolicy}
            />

            {/* Additional Details */}
            <div>
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                {t('createListing.featuresRules')}
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="specialFeatures" className="text-foreground font-semibold">
                    {t('createListing.specialFeatures')}
                  </Label>
                  <Textarea
                    id="specialFeatures"
                    placeholder={t('createListing.specialFeatures', { defaultValue: 'Special features or highlights' })}
                    value={specialFeatures}
                    onChange={(e) => setSpecialFeatures(e.target.value)}
                    rows={3}
                    className="border-border/80 focus:border-primary resize-none text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rules" className="text-foreground font-semibold">
                    {t('createListing.rules')}
                  </Label>
                  <Textarea
                    id="rules"
                    placeholder={t('createListing.rules', { defaultValue: 'Any rules, restrictions, or important information guests should know...' })}
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    rows={3}
                    className="border-border/80 focus:border-primary resize-none text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex gap-4">
              <Button
                type="button"
                onClick={handleCancel}
                variant="outline"
                className="flex-1 h-14 border-2 border-border/80 text-foreground hover:bg-secondary/40 font-semibold text-lg"
              >
                {t('common.cancel', { defaultValue: t('editListing.back') })}
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg shadow-lg disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t('editListing.saving')}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    {t('editListing.saveChanges')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
