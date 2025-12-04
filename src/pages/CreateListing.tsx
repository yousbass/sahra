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
import type { CancellationPolicy } from '@/lib/refundCalculator';

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

export default function CreateListing() {
  const navigate = useNavigate();
  const { user, userData, loading } = useAuth();
  
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
  
  // Tent Configuration - Individual tents
  const [tents, setTents] = useState<TentConfig[]>([]);
  
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
      toast.error('Please sign in to create a listing');
      navigate('/signin');
    } else if (!userData.isHost) {
      toast.error('You need to become a host first');
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
          toast.success('Location captured successfully!');
          setGettingLocation(false);
        },
        () => {
          toast.error('Unable to get your location. Please use Google Maps URL instead.');
          setGettingLocation(false);
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
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
      toast.error('Could not extract coordinates from URL. Please check the format.');
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
      console.log('=== Starting camp creation ===');
      console.log('User ID:', user.uid);
      
      if (!selectedLocation) {
        toast.error('Please select a location from the dropdown');
        setSubmitting(false);
        return;
      }

      if (!latitude || !longitude) {
        toast.error('Please set your location using "Use My Current Location" button or paste a Google Maps URL');
        setSubmitting(false);
        return;
      }

      if (!maxGuests || parseInt(maxGuests) < 1) {
        toast.error('Please specify maximum number of guests');
        setSubmitting(false);
        return;
      }

      if (tents.length === 0) {
        toast.error('Please add at least one tent');
        setSubmitting(false);
        return;
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

      const campData = {
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
        hostName: userData?.displayName || user.email || 'Host',
      };

      console.log('Camp data prepared:', campData);
      console.log('Calling createCamp with hostId:', user.uid);

      const campId = await createCamp(campData, user.uid);
      
      console.log('Camp created successfully with ID:', campId);
      toast.success('Camp listing created successfully!');
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
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Create New Camp Listing</h1>
          <p className="text-gray-700 font-medium">Share your Bahrain desert camp with travelers</p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6 md:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">📋</span>
                Basic Information
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-gray-900 font-semibold">
                    Camp Name <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="e.g., Golden Dunes Desert Camp"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="border-sand-300 focus:border-terracotta-500 text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-gray-900 font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-terracotta-600" />
                    Camp Location <span className="text-red-600">*</span>
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
                          : "Select camp location..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search locations..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>No location found.</CommandEmpty>
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
                  <p className="text-sm text-gray-600 font-medium">Select your camp's official location in Bahrain (based on 2023-2024 season zones)</p>
                </div>

                {/* Location Coordinates */}
                <div className="space-y-3 p-4 bg-sand-50 border-2 border-sand-300 rounded-lg">
                  <Label className="text-gray-900 font-semibold flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-terracotta-600" />
                    Set Camp GPS Coordinates <span className="text-red-600">*</span>
                  </Label>
                  <p className="text-sm text-gray-600 font-medium mb-3">
                    Choose one of the following methods to set your camp's GPS coordinates:
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
                        Getting Your Location...
                      </>
                    ) : (
                      <>
                        <Navigation className="w-5 h-5 mr-2" />
                        Use My Current Location
                      </>
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-sand-300" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-sand-50 px-2 text-gray-600 font-semibold">Or</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="googleMapsUrl" className="text-sm text-gray-700 font-semibold flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      Paste Google Maps Link
                    </Label>
                    <Input
                      id="googleMapsUrl"
                      type="url"
                      placeholder="https://maps.google.com/?q=26.0667,50.5577"
                      value={googleMapsUrl}
                      onChange={(e) => handleGoogleMapsUrlChange(e.target.value)}
                      className="border-sand-300 focus:border-terracotta-500 text-gray-900 placeholder:text-gray-400"
                    />
                    <p className="text-xs text-gray-600 font-medium">
                      Open Google Maps, right-click on your camp location, and paste the link here
                    </p>
                  </div>

                  {hasCoordinates && (
                    <div className="p-3 bg-green-50 border border-green-300 rounded-lg">
                      <p className="text-sm font-semibold text-green-900 mb-1 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Location Set Successfully
                      </p>
                      <p className="text-xs text-green-800 font-medium">
                        Coordinates: {latitude}, {longitude}
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
                    Price per Day (BD) <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="e.g., 25"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    className="border-sand-300 focus:border-terracotta-500 text-gray-900 placeholder:text-gray-400"
                  />
                  <p className="text-sm text-gray-600 font-medium">Price for one full day reservation</p>
                </div>

                {/* Check-in and Check-out Times */}
                <div className="space-y-3 p-4 bg-terracotta-50 border-2 border-terracotta-200 rounded-lg">
                  <Label className="text-gray-900 font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-terracotta-600" />
                    Check-in & Check-out Times <span className="text-red-600">*</span>
                  </Label>
                  <p className="text-sm text-gray-700 font-medium mb-3">
                    Set your camp's check-in and check-out times. This is a full-day reservation from check-in to check-out the next day.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="checkInTime" className="text-gray-900 font-semibold">
                        Check-in Time <span className="text-red-600">*</span>
                      </Label>
                      <Input
                        id="checkInTime"
                        type="text"
                        placeholder="e.g., 08:00 AM"
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        required
                        className="border-sand-300 focus:border-terracotta-500 text-gray-900 placeholder:text-gray-400"
                      />
                      <p className="text-xs text-gray-600 font-medium">Format: HH:MM AM/PM (e.g., 08:00 AM)</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="checkOutTime" className="text-gray-900 font-semibold">
                        Check-out Time (Next Day) <span className="text-red-600">*</span>
                      </Label>
                      <Input
                        id="checkOutTime"
                        type="text"
                        placeholder="e.g., 03:00 AM"
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                        required
                        className="border-sand-300 focus:border-terracotta-500 text-gray-900 placeholder:text-gray-400"
                      />
                      <p className="text-xs text-gray-600 font-medium">Format: HH:MM AM/PM (e.g., 03:00 AM)</p>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-terracotta-300 rounded-lg">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      📅 Full Day Reservation
                    </p>
                    <p className="text-sm text-gray-700">
                      Check-in: <span className="font-bold text-terracotta-700">{checkInTime}</span> → Check-out: <span className="font-bold text-terracotta-700">{checkOutTime} (next day)</span>
                    </p>
                  </div>
                </div>

                {/* Image Upload Section - NEW */}
                <div className="space-y-3">
                  <Label className="text-gray-900 font-semibold flex items-center gap-2">
                    <span className="text-2xl">📸</span>
                    Camp Photos <span className="text-red-600">*</span>
                  </Label>
                  <p className="text-sm text-gray-600 font-medium">
                    Upload high-quality photos of your camp. Images are automatically compressed and optimized.
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
                  <Label htmlFor="description" className="text-gray-900 font-semibold">Camp Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your camp, its unique features, atmosphere, and what makes it special..."
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
                Camp Capacity & Size
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxGuests" className="text-gray-900 font-semibold">
                    Maximum Guests <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="maxGuests"
                    type="number"
                    placeholder="e.g., 20"
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(e.target.value)}
                    required
                    min="1"
                    className="border-sand-300 focus:border-terracotta-500 text-gray-900 placeholder:text-gray-400"
                  />
                  <p className="text-sm text-gray-600 font-medium">Total number of people your camp can accommodate</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campArea" className="text-gray-900 font-semibold">
                    Camp Area (sq meters)
                  </Label>
                  <Input
                    id="campArea"
                    type="number"
                    placeholder="e.g., 500"
                    value={campArea}
                    onChange={(e) => setCampArea(e.target.value)}
                    min="0"
                    className="border-sand-300 focus:border-terracotta-500 text-gray-900 placeholder:text-gray-400"
                  />
                  <p className="text-sm text-gray-600 font-medium">Optional: Total area of your camp</p>
                </div>
              </div>
            </div>

            {/* Tent Configuration */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Tent className="w-6 h-6 text-terracotta-600" />
                Tent Configuration
              </h3>
              <p className="text-sm text-gray-600 font-medium mb-4">
                Add tents and configure each one individually with amenities
              </p>

              <div className="flex flex-wrap gap-3 mb-6">
                <Button
                  type="button"
                  onClick={() => addTent('large')}
                  variant="outline"
                  className="border-2 border-sand-300 text-gray-900 hover:bg-sand-50 font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Large Tent
                </Button>
                <Button
                  type="button"
                  onClick={() => addTent('small')}
                  variant="outline"
                  className="border-2 border-sand-300 text-gray-900 hover:bg-sand-50 font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Small Tent
                </Button>
                <Button
                  type="button"
                  onClick={() => addTent('entertainment')}
                  variant="outline"
                  className="border-2 border-sand-300 text-gray-900 hover:bg-sand-50 font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entertainment Tent
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
                            {getTentTypeName(tent.type)} #{index + 1}
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
                                {feature === 'furnished' && 'Furnished'}
                                {feature === 'carpeted' && 'Carpeted'}
                                {feature === 'tv' && 'TV Available'}
                                {feature === 'sofas' && 'Sofas & Couches'}
                                {feature === 'teaSets' && 'Tea Sets'}
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
                                {feature === 'pingPongTable' && '🏓 Ping-Pong Table'}
                                {feature === 'foosballTable' && '⚽ Foosball Table'}
                                {feature === 'airHockeyTable' && '🏒 Air Hockey Table'}
                                {feature === 'volleyballField' && '🏐 Volleyball Field'}
                                {feature === 'footballField' && '⚽ Football Field'}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs font-semibold text-gray-700 mb-2 block">Description (optional)</Label>
                          <Textarea
                            value={tent.description || ''}
                            onChange={(e) => updateTentDescription(tent.id, e.target.value)}
                            placeholder="Add a short note about this tent (size, view, special setup, etc.)"
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
                  <p className="text-gray-700 font-medium">No tents added yet. Click the buttons above to add tents.</p>
                </div>
              )}

              {tents.length > 0 && (
                <div className="mt-4 p-4 bg-terracotta-50 border-2 border-terracotta-200 rounded-lg">
                  <p className="font-semibold text-gray-900 mb-2">Tent Summary:</p>
                  <p className="text-gray-800">
                    <span className="font-bold">{counts.total}</span> Total Tents
                    {counts.large > 0 && <span> • {counts.large} Large</span>}
                    {counts.small > 0 && <span> • {counts.small} Small</span>}
                    {counts.entertainment > 0 && <span> • {counts.entertainment} Entertainment</span>}
                  </p>
                </div>
              )}
            </div>

            {/* Facilities & Amenities */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-2xl">✨</span>
                Facilities & Amenities
              </h3>
              <p className="text-sm text-gray-600 font-medium mb-4">
                Select all facilities and amenities available at your camp
              </p>

              {Object.entries(AMENITIES).map(([category, items]) => (
                <div key={category} className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 capitalize">
                    {category === 'essential' && '🏕️ Essential Facilities'}
                    {category === 'cooking' && '🍖 Cooking & Dining'}
                    {category === 'entertainment' && '🎉 Entertainment'}
                    {category === 'comfort' && '🛋️ Comfort & Furnishing'}
                    {category === 'activities' && '🏜️ Activities'}
                    {category === 'other' && '📌 Other'}
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
                          {amenity}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {selectedAmenities.length > 0 && (
                <div className="mt-4 p-4 bg-sand-50 border-2 border-sand-300 rounded-lg">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    Selected Amenities ({selectedAmenities.length}):
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

            {/* Additional Details */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">📝</span>
                Additional Details
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="specialFeatures" className="text-gray-900 font-semibold">
                    Special Features or Highlights
                  </Label>
                  <Textarea
                    id="specialFeatures"
                    placeholder="Any unique features, special services, or highlights of your camp..."
                    value={specialFeatures}
                    onChange={(e) => setSpecialFeatures(e.target.value)}
                    rows={3}
                    className="border-sand-300 focus:border-terracotta-500 resize-none text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rules" className="text-gray-900 font-semibold">
                    Camp Rules & Restrictions
                  </Label>
                  <Textarea
                    id="rules"
                    placeholder="Any rules, restrictions, or important information guests should know..."
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
                    Creating Camp Listing...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Create Camp Listing
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
