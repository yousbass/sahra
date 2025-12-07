import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Save, Loader2, Check, Tent, Users, Plus, X, MapPin, Navigation, Link as LinkIcon, ChevronsUpDown, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createCamp } from '@/lib/firestore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BAHRAIN_CAMPING_LOCATIONS, getLocationLabel } from '@/lib/locations';
import { CancellationPolicySelector } from '@/components/CancellationPolicySelector';
import { ImageUploadManager } from '@/components/ImageUploadManager';
import { ListingTypeSelector } from '@/components/ListingTypeSelector';
import { KashtaSpecificForm } from '@/components/KashtaSpecificForm';
import type { CancellationPolicy } from '@/lib/refundCalculator';
import type { ListingType, ShadeType, ViewType } from '@/types/listing';
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

interface TentConfig {
  id: string;
  type: 'large' | 'small' | 'entertainment';
  furnished: boolean;
  carpeted: boolean;
  tv: boolean;
  sofas: boolean;
  teaSets: boolean;
  pingPongTable: boolean;
  foosballTable: boolean;
  airHockeyTable: boolean;
  volleyballField: boolean;
  footballField: boolean;
  description?: string;
}

interface ImageData {
  id: string;
  url: string;
  file?: File;
  isMain: boolean;
  uploading?: boolean;
  progress?: number;
}

interface CampDataBase {
  slug: string;
  title: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  price: number;
  photo: string;
  photos: string[];
  description: string;
  maxGuests: number;
  campArea?: number;
  amenities: string[];
  specialFeatures: string;
  rules: string;
  cancellationPolicy: CancellationPolicy;
  checkInTime: string;
  checkOutTime: string;
  hostName: string;
  listingType: ListingType;
}

interface CampData extends CampDataBase {
  tents?: TentConfig[];
  tentConfiguration?: {
    large: number;
    small: number;
    entertainment: number;
  };
  seatingCapacity?: number;
  beachfrontAccess?: boolean;
  shadeType?: ShadeType;
  viewType?: ViewType;
  waterActivities?: string[];
}

export default function CreateListing() {
  const navigate = useNavigate();
  const { user, userData, loading } = useAuth();
  const { t } = useTranslation();
  
  // Listing Type - NEW
  const [listingType, setListingType] = useState<ListingType>('camp');
  
  // Basic Information
  const [title, setTitle] = useState('');
  const [locationOpen, setLocationOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  
  // Check-in/Check-out Times
  const [checkInTime, setCheckInTime] = useState('08:00 AM');
  const [checkOutTime, setCheckOutTime] = useState('03:00 AM');
  
  // Image Upload - using new ImageUploadManager
  const [uploadedImages, setUploadedImages] = useState<ImageData[]>([]);
  
  // Camp Capacity
  const [maxGuests, setMaxGuests] = useState('');
  const [campArea, setCampArea] = useState('');
  
  // Tent Configuration - Individual tents (for camps only)
  const [tents, setTents] = useState<TentConfig[]>([]);
  
  // Kashta-specific fields - NEW
  const [seatingCapacity, setSeatingCapacity] = useState('');
  const [beachfrontAccess, setBeachfrontAccess] = useState(false);
  const [shadeType, setShadeType] = useState<ShadeType | ''>('');
  const [viewType, setViewType] = useState<ViewType | ''>('');
  const [waterActivities, setWaterActivities] = useState<string[]>([]);
  
  // Amenities
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  
  // Additional Details
  const [specialFeatures, setSpecialFeatures] = useState('');
  const [rules, setRules] = useState('');
  
  // Cancellation Policy
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy>('moderate');
  
  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user || !userData) {
      toast.error(t('createListing.signInRequired'));
      navigate('/signin');
    } else if (!userData.isHost) {
      toast.error(t('createListing.hostRequired'));
      navigate('/profile');
    }
  }, [user, userData, loading, navigate]);

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
          toast.error(t('createListing.locationFailed'));
          setGettingLocation(false);
        }
      );
    } else {
      toast.error(t('createListing.geoUnsupported'));
      setGettingLocation(false);
    }
  };

  const extractCoordinatesFromUrl = (url: string) => {
    if (!url) return null;

    const decoded = decodeURIComponent(url);

    // Use URL search params when possible
    try {
      const parsed = new URL(decoded);
      const searchLatLng = parsed.searchParams.get('q') || parsed.searchParams.get('query') || parsed.searchParams.get('ll') || parsed.searchParams.get('center') || parsed.searchParams.get('sll');
      if (searchLatLng) {
        const parts = searchLatLng.split(',');
        if (parts.length >= 2) {
          const [lat, lng] = parts;
          if (!Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))) {
            return { lat, lng };
          }
        }
      }
    } catch {
      // Ignore URL parsing failures and fall back to regexes below
    }

    // ?q=lat,lng or &q=lat,lng (e.g., share link)
    const matchQuery = decoded.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (matchQuery) return { lat: matchQuery[1], lng: matchQuery[2] };

    // ?query=lat,lng (Google Maps API param)
    const matchQueryParam = decoded.match(/[?&]query=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (matchQueryParam) return { lat: matchQueryParam[1], lng: matchQueryParam[2] };

    // @lat,lng,zoom (standard map URL)
    const matchAt = decoded.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*),/);
    if (matchAt) return { lat: matchAt[1], lng: matchAt[2] };

    // ...!3dlat!4dlng (place URLs)
    const matchBang = decoded.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (matchBang) return { lat: matchBang[1], lng: matchBang[2] };

    // place/.../@lat,lng (sometimes without zoom)
    const matchPlace = decoded.match(/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (matchPlace) return { lat: matchPlace[1], lng: matchPlace[2] };

    // Fallback: first lat,lng pair in the string
    const matchAnyPair = decoded.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (matchAnyPair) return { lat: matchAnyPair[1], lng: matchAnyPair[2] };

    return null;
  };

  const resolveShortGoogleUrl = async (url: string): Promise<{ resolvedUrl?: string; lat?: string; lng?: string } | null> => {
    const devApiBase =
      import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.includes('localhost')
        ? import.meta.env.VITE_API_URL
        : 'http://localhost:3001';
    const targets = import.meta.env.DEV
      ? [`${devApiBase}/api/maps/resolve`, '/api/maps/resolve']
      : ['/api/maps/resolve'];

    for (const target of targets) {
      try {
        const response = await fetch(target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        if (!response.ok) continue;
        const data = await response.json();
        if (data?.resolvedUrl || data?.resolvedLat) return { resolvedUrl: data.resolvedUrl, lat: data.resolvedLat, lng: data.resolvedLng };
      } catch (error) {
        console.warn(`Failed to resolve short Google Maps URL via ${target}:`, error);
      }
    }

    // Fallback: try GET with query param (some mobile browsers/extensions block POST)
    for (const target of targets) {
      try {
        const response = await fetch(`${target}?url=${encodeURIComponent(url)}`, {
          method: 'GET'
        });
        if (!response.ok) continue;
        const data = await response.json();
        if (data?.resolvedUrl || data?.resolvedLat) return { resolvedUrl: data.resolvedUrl, lat: data.resolvedLat, lng: data.resolvedLng };
      } catch (error) {
        console.warn(`Failed to resolve short Google Maps URL via GET ${target}:`, error);
      }
    }

    return null;
  };

  const handleGoogleMapsUrlChange = async (url: string) => {
    setGoogleMapsUrl(url);
    
    if (!url.trim()) return;

    let parseTarget = url.trim();

    // If it's a Google short link, try to resolve it to the long URL to extract coordinates.
    if (/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl)\/.+/i.test(url.trim())) {
      const resolved = await resolveShortGoogleUrl(url.trim());
      if (resolved?.lat && resolved?.lng) {
        setLatitude(resolved.lat);
        setLongitude(resolved.lng);
        toast.success('Coordinates extracted from URL!');
        return;
      }
      if (resolved?.resolvedUrl) {
        parseTarget = resolved.resolvedUrl;
      }
    }

    const coords = extractCoordinatesFromUrl(parseTarget);
    if (coords) {
      setLatitude(coords.lat);
      setLongitude(coords.lng);
      toast.success('Coordinates extracted from URL!');
    } else {
      toast.error(t('createListing.map.parseError', { defaultValue: 'Could not extract coordinates from URL. Please check the format.' }));
    }
  };

  const addTent = (type: 'large' | 'small' | 'entertainment') => {
    const newTent: TentConfig = {
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

  const updateTentFeature = (id: string, feature: keyof Omit<TentConfig, 'id' | 'type' | 'description'>) => {
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
      case 'large': return 'Large Tent (Main/Gathering)';
      case 'small': return 'Small Tent (Sleeping)';
      case 'entertainment': return 'Entertainment Tent';
      default: return 'Tent';
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
    
    if (!user) {
      toast.error('You must be signed in to create a listing');
      return;
    }
    
    setSubmitting(true);

    try {
      console.log('=== Starting listing creation ===');
      console.log('User ID:', user.uid);
      console.log('Listing Type:', listingType);
      
      if (!selectedLocation) {
        toast.error('Please select a location from the dropdown');
        setSubmitting(false);
        return;
      }

      if (!latitude || !longitude) {
      toast.error(t('createListing.locationRequired', { defaultValue: 'Please set your location using "Use My Current Location" or paste a Google Maps URL' }));
        setSubmitting(false);
        return;
      }

      if (!maxGuests || parseInt(maxGuests) < 1) {
        toast.error('Please specify maximum number of guests');
        setSubmitting(false);
        return;
      }

      // Type-specific validation
      if (listingType === 'camp') {
        if (tents.length === 0) {
          toast.error('Please add at least one tent');
          setSubmitting(false);
          return;
        }
      } else if (listingType === 'kashta') {
        if (!seatingCapacity || parseInt(seatingCapacity) < 1) {
          toast.error('Please specify seating capacity for kashta');
          setSubmitting(false);
          return;
        }
      }

      if (uploadedImages.length === 0) {
        toast.error('Please upload at least one image');
        setSubmitting(false);
        return;
      }

      // Check if any images are still uploading
      const stillUploading = uploadedImages.some(img => img.uploading);
      if (stillUploading) {
        toast.error('Please wait for all images to finish uploading');
        setSubmitting(false);
        return;
      }

      const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const counts = getTentCounts();

      // Get main image and additional images
      const mainImage = uploadedImages.find(img => img.isMain) || uploadedImages[0];
      const additionalImages = uploadedImages.filter(img => !img.isMain).map(img => img.url);

      const campData: CampData = {
        slug,
        title,
        location: getLocationLabel(selectedLocation),
        coordinates: {
          lat: parseFloat(latitude),
          lng: parseFloat(longitude),
        },
        price: parseFloat(price),
        photo: mainImage.url, // Main cover image (Firebase Storage URL)
        photos: additionalImages, // Additional images (Firebase Storage URLs)
        description,
        maxGuests: parseInt(maxGuests),
        campArea: campArea ? parseFloat(campArea) : undefined,
        amenities: selectedAmenities,
        specialFeatures,
        rules,
        cancellationPolicy,
        checkInTime,
        checkOutTime,
        hostName: userData?.displayName || user.email || 'Host',
        listingType, // NEW: Add listing type
      };

      // Add type-specific fields
      if (listingType === 'camp') {
        campData.tents = tents;
        campData.tentConfiguration = {
          large: counts.large,
          small: counts.small,
          entertainment: counts.entertainment,
        };
      } else if (listingType === 'kashta') {
        campData.seatingCapacity = parseInt(seatingCapacity);
        campData.beachfrontAccess = beachfrontAccess;
        campData.shadeType = shadeType || undefined;
        campData.viewType = viewType || undefined;
        campData.waterActivities = waterActivities;
        // Set empty tent configuration for kashta
        campData.tentConfiguration = {
          large: 0,
          small: 0,
          entertainment: 0,
        };
      }

      console.log('Listing data prepared:', campData);
      console.log('Calling createCamp with hostId:', user.uid);

      const campId = await createCamp(campData, user.uid);
      
      console.log('Listing created successfully with ID:', campId);
      toast.success(`${listingType === 'kashta' ? 'Kashta' : 'Camp'} listing created successfully!`);
      navigate('/host/listings');
    } catch (error) {
      const err = error as Error;
      console.error('=== Error in handleSubmit ===');
      console.error('Error object:', error);
      console.error('Error message:', err?.message);
      console.error('Error stack:', err?.stack);
      
      const errorMessage = err?.message || 'Unknown error occurred';
      toast.error(`Failed to create listing: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200 p-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-terracotta-600 animate-spin" />
      </div>
    );
  }

  if (!user || !userData || !userData.isHost) {
    return null;
  }

  const counts = getTentCounts();
  const hasCoordinates = latitude && longitude;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200 p-4">
      <div className="max-w-4xl mx-auto pt-8 pb-20">
        <Button
          onClick={() => navigate('/host')}
          variant="ghost"
          className="mb-6 text-gray-900 hover:text-gray-950 hover:bg-sand-100 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('hostListings.backToDashboard')}
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{t('createListing.title')}</h1>
          <p className="text-gray-700 font-medium">{t('createListing.subtitle')}</p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6 md:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Listing Type Selector - NEW SECTION */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">🏕️</span>
                {t('listingType.sectionTitle')}
              </h3>
              <p className="text-sm text-gray-600 font-medium mb-4">
                {t('listingType.sectionDescription')}
              </p>
              <ListingTypeSelector
                value={listingType}
                onChange={setListingType}
                variant="cards"
              />
            </div>

            {/* Basic Information */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">📋</span>
                {t('createListing.basicInfo')}
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-gray-900 font-semibold">
                    {listingType === 'kashta' ? t('listingType.kashta.nameLabel') : t('createListing.campName')} <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder={listingType === 'kashta' ? t('listingType.kashta.nameLabel') : t('createListing.campName')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="border-sand-300 focus:border-terracotta-500 text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-gray-900 font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-terracotta-600" />
                    {t('createListing.campLocation')} <span className="text-red-600">*</span>
                  </Label>
                  <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={locationOpen}
                        className="w-full justify-between border-sand-300 hover:border-terracotta-500 text-gray-900 h-11"
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
                                  <span className="text-xs text-gray-500">{location.region}</span>
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
                  <p className="text-sm text-gray-600 font-medium">{t('createListing.locationHelper', { defaultValue: "Select your camp's official location" })}</p>
                </div>

                {/* Location Coordinates */}
                  <div className="space-y-3 p-4 bg-sand-50 border-2 border-sand-300 rounded-lg">
                    <Label className="text-gray-900 font-semibold flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-terracotta-600" />
                      {t('createListing.map.setCoordinates')} <span className="text-red-600">*</span>
                    </Label>
                    <p className="text-sm text-gray-600 font-medium mb-3">
                      {t('createListing.map.chooseMethod')}
                    </p>

                  <Button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="w-full h-12 bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white font-semibold shadow-lg"
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
                      <span className="w-full border-t border-sand-300" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-sand-50 px-2 text-gray-600 font-semibold">{t('createListing.or', { defaultValue: 'Or' })}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="googleMapsUrl" className="text-sm text-gray-700 font-semibold flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      {t('createListing.map.pasteLink')}
                    </Label>
                    <Input
                      id="googleMapsUrl"
                      type="url"
                      placeholder={t('createListing.googleMapsUrl')}
                      value={googleMapsUrl}
                      onChange={(e) => handleGoogleMapsUrlChange(e.target.value)}
                      className="border-sand-300 focus:border-terracotta-500 text-gray-900 placeholder:text-gray-400"
                    />
                    <p className="text-xs text-gray-600 font-medium">
                      {t('createListing.map.pasteHelper')}
                    </p>
                  </div>

                  {hasCoordinates && (
                    <div className="p-3 bg-green-50 border border-green-300 rounded-lg">
                      <p className="text-sm font-semibold text-green-900 mb-1 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {t('createListing.map.locationSet')}
                      </p>
                      <p className="text-xs text-green-800 font-medium">
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
                  <Label htmlFor="price" className="text-gray-900 font-semibold">
                    {t('createListing.pricing.perDay')} <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder={t('createListing.price')}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    className="border-sand-300 focus:border-terracotta-500 text-gray-900 placeholder:text-gray-400"
                  />
                  <p className="text-sm text-gray-600 font-medium">{t('createListing.pricing.helper')}</p>
                </div>

                {/* Check-in and Check-out Times */}
                <div className="space-y-3 p-4 bg-terracotta-50 border-2 border-terracotta-200 rounded-lg">
                  <Label className="text-gray-900 font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-terracotta-600" />
                    {t('createListing.checkIn')} & {t('createListing.checkOut')} <span className="text-red-600">*</span>
                  </Label>
                  <p className="text-sm text-gray-700 font-medium mb-3">
                    {t('createListing.times.helper')}
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="checkInTime" className="text-gray-900 font-semibold">
                        {t('createListing.checkIn')} <span className="text-red-600">*</span>
                      </Label>
                      <Input
                        id="checkInTime"
                        type="text"
                        placeholder="08:00 AM"
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        required
                        className="border-sand-300 focus:border-terracotta-500 text-gray-900 placeholder:text-gray-400"
                      />
                      <p className="text-xs text-gray-600 font-medium">{t('createListing.times.checkInHelper')}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="checkOutTime" className="text-gray-900 font-semibold">
                        {t('createListing.checkOut')} ( {t('createListing.nextDay', { defaultValue: 'Next Day' })} ) <span className="text-red-600">*</span>
                      </Label>
                      <Input
                        id="checkOutTime"
                        type="text"
                        placeholder="03:00 AM"
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                        required
                        className="border-sand-300 focus:border-terracotta-500 text-gray-900 placeholder:text-gray-400"
                      />
                      <p className="text-xs text-gray-600 font-medium">{t('createListing.times.checkOutHelper')}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-terracotta-300 rounded-lg">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      📅 {t('createListing.map.fullDay')}
                    </p>
                    <p className="text-sm text-gray-700">
                      {t('createListing.checkIn')}: <span className="font-bold text-terracotta-700">{checkInTime}</span> → {t('createListing.checkOut')}: <span className="font-bold text-terracotta-700">{checkOutTime} ({t('createListing.nextDay', { defaultValue: 'next day' })})</span>
                    </p>
                  </div>
                </div>

                {/* Image Upload Section */}
                <div className="space-y-3">
                  <Label className="text-gray-900 font-semibold flex items-center gap-2">
                    <span className="text-2xl">📸</span>
                    {t('createListing.photosTitle')} <span className="text-red-600">*</span>
                  </Label>
                  <p className="text-sm text-gray-600 font-medium">
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
                  <Label htmlFor="description" className="text-gray-900 font-semibold">{t('createListing.description')}</Label>
                  <Textarea
                    id="description"
                    placeholder={t('createListing.descriptionPlaceholder')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="border-sand-300 focus:border-terracotta-500 resize-none text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Camp Capacity & Size */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-terracotta-600" />
                {t('createListing.capacity.title')}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxGuests" className="text-gray-900 font-semibold">
                    {t('createListing.maxGuests')} <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="maxGuests"
                    type="number"
                    placeholder={t('createListing.maxGuestsPlaceholder')}
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(e.target.value)}
                    required
                    min="1"
                    className="border-sand-300 focus:border-terracotta-500 text-gray-900 placeholder:text-gray-400"
                  />
                  <p className="text-sm text-gray-600 font-medium">{t('createListing.capacity.maxGuestsHelper')}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campArea" className="text-gray-900 font-semibold">
                    {t('createListing.campArea')}
                  </Label>
                  <Input
                    id="campArea"
                    type="number"
                    placeholder={t('createListing.campAreaPlaceholder')}
                    value={campArea}
                    onChange={(e) => setCampArea(e.target.value)}
                    min="0"
                    className="border-sand-300 focus:border-terracotta-500 text-gray-900 placeholder:text-gray-400"
                  />
                  <p className="text-sm text-gray-600 font-medium">{t('createListing.capacity.areaHelper')}</p>
                </div>
              </div>
            </div>

            {/* Conditional: Tent Configuration (for camps) OR Kashta-Specific Form */}
            {listingType === 'camp' ? (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Tent className="w-6 h-6 text-terracotta-600" />
                  {t('createListing.capacityTents')}
                </h3>
                <p className="text-sm text-gray-600 font-medium mb-4">
                  {t('createListing.tents.helper', { defaultValue: 'Add tents and configure each one individually with amenities' })}
                </p>

                <div className="flex flex-wrap gap-3 mb-6">
                  <Button
                    type="button"
                    onClick={() => addTent('large')}
                    variant="outline"
                    className="border-2 border-sand-300 text-gray-900 hover:bg-sand-50 font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('createListing.tents.addLarge')}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => addTent('small')}
                    variant="outline"
                    className="border-2 border-sand-300 text-gray-900 hover:bg-sand-50 font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('createListing.tents.addSmall')}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => addTent('entertainment')}
                    variant="outline"
                    className="border-2 border-sand-300 text-gray-900 hover:bg-sand-50 font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('createListing.tents.addEntertainment')}
                  </Button>
                </div>

                {tents.length > 0 ? (
                  <div className="space-y-4">
                    {tents.map((tent, index) => (
                      <Card key={tent.id} className="bg-sand-50 border-2 border-sand-300 p-4">
                        <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Tent className="w-5 h-5 text-terracotta-600" />
                          <h4 className="font-semibold text-gray-900">
                            {t(
                              tent.type === 'large'
                                ? 'createListing.tents.largeLabel'
                                : tent.type === 'small'
                                ? 'createListing.tents.smallLabel'
                                : 'createListing.tents.entertainmentLabel'
                            )} #{index + 1}
                          </h4>
                        </div>
                        <Button
                          type="button"
                          onClick={() => removeTent(tent.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                        
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2">Basic Features:</p>
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
                                      ? 'bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white border-0 font-semibold'
                                      : 'border-2 border-sand-300 text-gray-800 hover:bg-sand-100 font-semibold'
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
                            <p className="text-xs font-semibold text-gray-700 mb-2">Entertainment & Sports:</p>
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
                                      ? 'bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white border-0 font-semibold'
                                      : 'border-2 border-sand-300 text-gray-800 hover:bg-sand-100 font-semibold'
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
                            <Label className="text-xs font-semibold text-gray-700 mb-2 block">{t('createListing.tents.descriptionLabel', { defaultValue: 'Description (optional)' })}</Label>
                            <Textarea
                              value={tent.description || ''}
                              onChange={(e) => updateTentDescription(tent.id, e.target.value)}
                              placeholder={t('createListing.tents.descriptionPlaceholder')}
                              rows={2}
                              className="text-sm border-sand-300 focus:border-terracotta-500"
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 bg-sand-50 border-2 border-sand-300 rounded-lg">
                    <Tent className="w-12 h-12 text-sand-400 mx-auto mb-3" />
                    <p className="text-gray-700 font-medium">{t('createListing.tents.none', { defaultValue: 'No tents added yet. Click the buttons above to add tents.' })}</p>
                  </div>
                )}

                {tents.length > 0 && (
                  <div className="mt-4 p-4 bg-terracotta-50 border-2 border-terracotta-200 rounded-lg">
                    <p className="font-semibold text-gray-900 mb-2">{t('createListing.tents.sectionTitle')}</p>
                    <p className="text-gray-800">
                      <span className="font-bold">{counts.total}</span> {t('createListing.tents.sectionTitle')}
                      {counts.large > 0 && <span> • {counts.large} {t('createListing.tents.largeLabel')}</span>}
                      {counts.small > 0 && <span> • {counts.small} {t('createListing.tents.smallLabel')}</span>}
                      {counts.entertainment > 0 && <span> • {counts.entertainment} {t('createListing.tents.entertainmentLabel')}</span>}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <KashtaSpecificForm
                seatingCapacity={seatingCapacity}
                onSeatingCapacityChange={setSeatingCapacity}
                beachfrontAccess={beachfrontAccess}
                onBeachfrontAccessChange={setBeachfrontAccess}
                shadeType={shadeType}
                onShadeTypeChange={setShadeType}
                viewType={viewType}
                onViewTypeChange={setViewType}
                kashtaAmenities={selectedAmenities}
                onKashtaAmenitiesChange={setSelectedAmenities}
                waterActivities={waterActivities}
                onWaterActivitiesChange={setWaterActivities}
              />
            )}

            {/* Facilities & Amenities */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-2xl">✨</span>
                {t('createListing.amenitiesSection')}
              </h3>
              <p className="text-sm text-gray-600 font-medium mb-4">
                {t('createListing.amenitiesHelper', { defaultValue: 'Select all facilities and amenities available at your camp' })}
              </p>

              {Object.entries(AMENITIES).map(([category, items]) => (
                <div key={category} className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 capitalize">
                    {category === 'essential' && t('createListing.amenityCategories.essential', { defaultValue: '🏕️ Essential Facilities' })}
                    {category === 'cooking' && t('createListing.amenityCategories.cooking', { defaultValue: '🍖 Cooking & Dining' })}
                    {category === 'entertainment' && t('createListing.amenityCategories.entertainment', { defaultValue: '🎉 Entertainment' })}
                    {category === 'comfort' && t('createListing.amenityCategories.comfort', { defaultValue: '🛋️ Comfort & Furnishing' })}
                    {category === 'activities' && t('createListing.amenityCategories.activities', { defaultValue: '🏜️ Activities' })}
                    {category === 'other' && t('createListing.amenityCategories.other', { defaultValue: '📌 Other' })}
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
                              ? 'bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white border-0 font-semibold'
                              : 'border-2 border-sand-300 text-gray-800 hover:bg-sand-50 font-semibold'
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

              {selectedAmenities.length > 0 && (
                <div className="mt-4 p-4 bg-sand-50 border-2 border-sand-300 rounded-lg">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    {t('createListing.selectedAmenities', { count: selectedAmenities.length, defaultValue: `Selected Amenities (${selectedAmenities.length})` })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAmenities.map((amenity) => (
                      <Badge
                        key={amenity}
                        variant="secondary"
                        className="bg-terracotta-100 text-terracotta-900 border border-terracotta-300 font-medium"
                      >
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cancellation Policy */}
            <CancellationPolicySelector
              selectedPolicy={cancellationPolicy}
              onPolicyChange={setCancellationPolicy}
            />

            {/* Additional Details - UPDATED: Conditional label based on listing type */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">📝</span>
                {t('createListing.sections.details')}
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="specialFeatures" className="text-gray-900 font-semibold">
                    {listingType === 'kashta' ? t('kashta.kashtaDescription', { defaultValue: 'Description' }) : t('createListing.specialFeatures')}
                  </Label>
                  <Textarea
                    id="specialFeatures"
                    placeholder={listingType === 'kashta' ? t('kashta.kashtaDescriptionPlaceholder', { defaultValue: 'Describe your kashta...' }) : t('createListing.specialFeatures')}
                    value={specialFeatures}
                    onChange={(e) => setSpecialFeatures(e.target.value)}
                    rows={3}
                    className="border-sand-300 focus:border-terracotta-500 resize-none text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rules" className="text-gray-900 font-semibold">
                    {t('createListing.rules')}
                  </Label>
                  <Textarea
                    id="rules"
                    placeholder={t('createListing.rules')}
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    rows={3}
                    className="border-sand-300 focus:border-terracotta-500 resize-none text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-14 bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white font-semibold text-lg shadow-lg disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t('createListing.submitting')}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    {t('createListing.createListing')}
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