import { CampfireLoader } from '@/components/CampfireLoader';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, ArrowRight, Save, Loader2, Check, Tent, Users, Plus, X, MapPin, Navigation, Link as LinkIcon, ChevronsUpDown, Clock, ChevronLeft, Zap } from 'lucide-react';
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
  weekendPrice?: number;
  holidayPrice?: number;
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

// ── Step Progress Component ──────────────────────────────────────────────────

const STEP_COUNT = 5;

const STEP_KEYS = [
  'createListing.steps.typeBasics',
  'createListing.steps.location',
  'createListing.steps.capacityAmenities',
  'createListing.steps.photos',
  'createListing.steps.pricePolicy',
];

const STEP_DEFAULTS = [
  'Type & Basics',
  'Location',
  'Capacity & Amenities',
  'Photos',
  'Price & Policy',
];

interface StepProgressProps {
  currentStep: number; // 1-based
  completedSteps: Set<number>;
}

function StepProgress({ currentStep, completedSteps }: StepProgressProps) {
  const { t } = useTranslation();
  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (STEP_COUNT - 1)) * 100}%` }}
        />
      </div>
      {/* Step labels */}
      <div className="flex items-start justify-between gap-1">
        {STEP_KEYS.map((key, index) => {
          const stepNum = index + 1;
          const isDone = completedSteps.has(stepNum);
          const isCurrent = stepNum === currentStep;
          const isFuture = stepNum > currentStep;
          return (
            <div key={stepNum} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                  isCurrent ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30' :
                  isDone ? 'bg-green-500 text-white' :
                  'bg-gray-200 text-gray-500'
                )}
              >
                {isDone && !isCurrent ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              <span
                className={cn(
                  'text-xs text-center font-medium leading-tight hidden sm:block',
                  isCurrent ? 'text-primary' : isDone ? 'text-green-600' : 'text-gray-400'
                )}
              >
                {t(key, { defaultValue: STEP_DEFAULTS[index] })}
              </span>
            </div>
          );
        })}
      </div>
      {/* Mobile current step label */}
      <p className="sm:hidden text-sm font-semibold text-primary mt-2 text-center">
        {t('createListing.steps.label', { step: currentStep, total: STEP_COUNT, defaultValue: `Step ${currentStep} of ${STEP_COUNT}` })}: {t(STEP_KEYS[currentStep - 1], { defaultValue: STEP_DEFAULTS[currentStep - 1] })}
      </p>
    </div>
  );
}

// ── Field Error Component ─────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-600 font-medium mt-1">{message}</p>;
}

// ── Draft Key ──────────────────────────────────────────────────────────────

const DRAFT_KEY = 'listing-draft';

// ── Main Component ───────────────────────────────────────────────────────────

export default function CreateListing() {
  const navigate = useNavigate();
  const { user, userData, loading } = useAuth();
  const { t } = useTranslation();

  // Step state
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Field errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Listing Type
  const [listingType, setListingType] = useState<ListingType>('camp');

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

  // Check-in/Check-out Times
  const [checkInTime, setCheckInTime] = useState('08:00 AM');
  const [checkOutTime, setCheckOutTime] = useState('03:00 AM');

  // Image Upload
  const [uploadedImages, setUploadedImages] = useState<ImageData[]>([]);

  // Camp Capacity
  const [maxGuests, setMaxGuests] = useState('');
  const [campArea, setCampArea] = useState('');

  // Tent Configuration
  const [tents, setTents] = useState<TentConfig[]>([]);

  // Kashta-specific fields
  const [seatingCapacity, setSeatingCapacity] = useState('');
  const [beachfrontAccess, setBeachfrontAccess] = useState(false);
  const [shadeType, setShadeType] = useState<ShadeType | ''>('');
  const [viewType, setViewType] = useState<ViewType | ''>('');
  const [waterActivities, setWaterActivities] = useState<string[]>([]);
  const [instantBook, setInstantBook] = useState(false);

  // Amenities
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Additional Details
  const [specialFeatures, setSpecialFeatures] = useState('');
  const [rules, setRules] = useState('');

  // Cancellation Policy
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy>({ type: 'full_refundable' });

  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // ── Draft: load on mount ──────────────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.listingType) setListingType(d.listingType);
      if (d.title) setTitle(d.title);
      if (d.description) setDescription(d.description);
      if (d.selectedLocation) setSelectedLocation(d.selectedLocation);
      if (d.latitude) setLatitude(d.latitude);
      if (d.longitude) setLongitude(d.longitude);
      if (d.googleMapsUrl) setGoogleMapsUrl(d.googleMapsUrl);
      if (d.price) setPrice(d.price);
      if (typeof d.weekendPricingEnabled === 'boolean') setWeekendPricingEnabled(d.weekendPricingEnabled);
      if (d.weekendPrice) setWeekendPrice(d.weekendPrice);
      if (d.holidayPrice) setHolidayPrice(d.holidayPrice);
      if (d.checkInTime) setCheckInTime(d.checkInTime);
      if (d.checkOutTime) setCheckOutTime(d.checkOutTime);
      if (d.maxGuests) setMaxGuests(d.maxGuests);
      if (d.campArea) setCampArea(d.campArea);
      if (d.tents) setTents(d.tents);
      if (d.seatingCapacity) setSeatingCapacity(d.seatingCapacity);
      if (typeof d.beachfrontAccess === 'boolean') setBeachfrontAccess(d.beachfrontAccess);
      if (d.shadeType) setShadeType(d.shadeType);
      if (d.viewType) setViewType(d.viewType);
      if (d.waterActivities) setWaterActivities(d.waterActivities);
      if (d.selectedAmenities) setSelectedAmenities(d.selectedAmenities);
      if (d.specialFeatures) setSpecialFeatures(d.specialFeatures);
      if (d.rules) setRules(d.rules);
      if (d.cancellationPolicy) setCancellationPolicy(d.cancellationPolicy);
    } catch {
      // ignore malformed draft
    }
  }, []);

  // ── Draft: save on every change ──────────────────────────────────────────

  useEffect(() => {
    const draft = {
      listingType, title, description, selectedLocation, latitude, longitude,
      googleMapsUrl, price, weekendPricingEnabled, weekendPrice, holidayPrice,
      checkInTime, checkOutTime, maxGuests, campArea,
      tents, seatingCapacity, beachfrontAccess, shadeType, viewType,
      waterActivities, selectedAmenities, specialFeatures, rules, cancellationPolicy,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // storage full — ignore
    }
  }, [
    listingType, title, description, selectedLocation, latitude, longitude,
    googleMapsUrl, price, weekendPricingEnabled, weekendPrice, holidayPrice,
    checkInTime, checkOutTime, maxGuests, campArea,
    tents, seatingCapacity, beachfrontAccess, shadeType, viewType,
    waterActivities, selectedAmenities, specialFeatures, rules, cancellationPolicy,
  ]);

  // ── Auth guard ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (loading) return;
    if (!user || !userData) {
      toast.error(t('createListing.signInRequired'));
      navigate('/signin');
    } else if (!userData.isHost) {
      toast.error(t('createListing.hostRequired'));
      navigate('/profile');
    }
  }, [user, userData, loading, navigate, t]);

  // ── Step validation ───────────────────────────────────────────────────────

  const validateStep = useCallback((s: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (s === 1) {
      if (!title.trim()) newErrors.title = t('createListing.validation.titleRequired', { defaultValue: 'Listing name is required' });
    }

    if (s === 2) {
      if (!selectedLocation) newErrors.location = t('createListing.validation.selectLocation', { defaultValue: 'Please select a location' });
      if (!latitude || !longitude) newErrors.coordinates = t('createListing.validation.locationRequired', { defaultValue: 'Please set coordinates for your listing' });
    }

    if (s === 3) {
      if (!maxGuests || parseInt(maxGuests) < 1) newErrors.maxGuests = t('createListing.validation.maxGuests', { defaultValue: 'Max guests must be at least 1' });
      if (listingType === 'camp' && tents.length === 0) newErrors.tents = t('createListing.validation.tents', { defaultValue: 'Add at least one tent' });
      if (listingType === 'kashta' && (!seatingCapacity || parseInt(seatingCapacity) < 1)) newErrors.seatingCapacity = t('createListing.validation.kashtaCapacity', { defaultValue: 'Seating capacity must be at least 1' });
      if (!checkInTime.trim()) newErrors.checkInTime = t('createListing.validation.checkInRequired', { defaultValue: 'Check-in time is required' });
      if (!checkOutTime.trim()) newErrors.checkOutTime = t('createListing.validation.checkOutRequired', { defaultValue: 'Check-out time is required' });
    }

    if (s === 4) {
      if (uploadedImages.length === 0) newErrors.photos = t('createListing.validation.images', { defaultValue: 'Add at least one photo' });
      if (uploadedImages.some(img => img.uploading)) newErrors.photos = t('createListing.validation.uploading', { defaultValue: 'Please wait for photos to finish uploading' });
    }

    if (s === 5) {
      if (!price || parseFloat(price) <= 0) newErrors.price = t('createListing.validation.priceRequired', { defaultValue: 'Price per night is required' });
      if (weekendPricingEnabled && (!weekendPrice || parseFloat(weekendPrice) <= 0)) {
        newErrors.weekendPrice = t('createListing.pricing.weekendPriceRequired', { defaultValue: 'Weekend price must be greater than 0' });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, selectedLocation, latitude, longitude, maxGuests, listingType, tents, seatingCapacity, checkInTime, checkOutTime, uploadedImages, price, weekendPricingEnabled, weekendPrice, t]);

  const goNext = () => {
    if (!validateStep(step)) return;
    setCompletedSteps(prev => new Set([...prev, step]));
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setErrors({});
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Location helpers ──────────────────────────────────────────────────────

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
    try {
      const parsed = new URL(decoded);
      const searchLatLng = parsed.searchParams.get('q') || parsed.searchParams.get('query') || parsed.searchParams.get('ll') || parsed.searchParams.get('center') || parsed.searchParams.get('sll');
      if (searchLatLng) {
        const parts = searchLatLng.split(',');
        if (parts.length >= 2) {
          const [lat, lng] = parts;
          if (!Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))) return { lat, lng };
        }
      }
    } catch { /* ignore */ }
    const matchQuery = decoded.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (matchQuery) return { lat: matchQuery[1], lng: matchQuery[2] };
    const matchQueryParam = decoded.match(/[?&]query=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (matchQueryParam) return { lat: matchQueryParam[1], lng: matchQueryParam[2] };
    const matchAt = decoded.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*),/);
    if (matchAt) return { lat: matchAt[1], lng: matchAt[2] };
    const matchBang = decoded.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (matchBang) return { lat: matchBang[1], lng: matchBang[2] };
    const matchPlace = decoded.match(/place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (matchPlace) return { lat: matchPlace[1], lng: matchPlace[2] };
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
        const response = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
        if (!response.ok) continue;
        const data = await response.json();
        if (data?.resolvedUrl || data?.resolvedLat) return { resolvedUrl: data.resolvedUrl, lat: data.resolvedLat, lng: data.resolvedLng };
      } catch { /* ignore */ }
    }
    for (const target of targets) {
      try {
        const response = await fetch(`${target}?url=${encodeURIComponent(url)}`, { method: 'GET' });
        if (!response.ok) continue;
        const data = await response.json();
        if (data?.resolvedUrl || data?.resolvedLat) return { resolvedUrl: data.resolvedUrl, lat: data.resolvedLat, lng: data.resolvedLng };
      } catch { /* ignore */ }
    }
    return null;
  };

  const handleGoogleMapsUrlChange = async (url: string) => {
    setGoogleMapsUrl(url);
    if (!url.trim()) return;
    let parseTarget = url.trim();
    if (/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl)\/.+/i.test(url.trim())) {
      const resolved = await resolveShortGoogleUrl(url.trim());
      if (resolved?.lat && resolved?.lng) {
        setLatitude(resolved.lat);
        setLongitude(resolved.lng);
        toast.success(t('createListing.map.extracted'));
        return;
      }
      if (resolved?.resolvedUrl) parseTarget = resolved.resolvedUrl;
    }
    const coords = extractCoordinatesFromUrl(parseTarget);
    if (coords) {
      setLatitude(coords.lat);
      setLongitude(coords.lng);
      toast.success(t('createListing.map.extracted'));
    } else {
      toast.error(t('createListing.map.parseError', { defaultValue: 'Could not extract coordinates from URL. Please check the format.' }));
    }
  };

  // ── Tent helpers ──────────────────────────────────────────────────────────

  const addTent = (type: 'large' | 'small' | 'entertainment') => {
    const newTent: TentConfig = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type, furnished: false, carpeted: false, tv: false, sofas: false,
      teaSets: false, pingPongTable: false, foosballTable: false,
      airHockeyTable: false, volleyballField: false, footballField: false,
      description: '',
    };
    setTents([...tents, newTent]);
  };

  const removeTent = (id: string) => setTents(tents.filter(tent => tent.id !== id));

  const updateTentFeature = (id: string, feature: keyof Omit<TentConfig, 'id' | 'type' | 'description'>) => {
    setTents(tents.map(tent => tent.id === id ? { ...tent, [feature]: !tent[feature] } : tent));
  };

  const updateTentDescription = (id: string, value: string) => {
    setTents(tents.map(tent => tent.id === id ? { ...tent, description: value } : tent));
  };

  const getTentCounts = () => {
    const large = tents.filter(t => t.type === 'large').length;
    const small = tents.filter(t => t.type === 'small').length;
    const entertainment = tents.filter(t => t.type === 'entertainment').length;
    return { large, small, entertainment, total: large + small + entertainment };
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!user) { toast.error(t('createListing.signInRequired')); return; }

    // Final validation of all steps
    for (let s = 1; s <= STEP_COUNT; s++) {
      if (!validateStep(s)) {
        setStep(s);
        return;
      }
    }

    setSubmitting(true);
    try {
      const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const counts = getTentCounts();
      const mainImage = uploadedImages.find(img => img.isMain) || uploadedImages[0];
      const additionalImages = uploadedImages.filter(img => !img.isMain).map(img => img.url);

      const campData: CampData = {
        slug, title,
        location: getLocationLabel(selectedLocation),
        coordinates: { lat: parseFloat(latitude), lng: parseFloat(longitude) },
        price: parseFloat(price),
        photo: mainImage.url,
        photos: additionalImages,
        description,
        maxGuests: parseInt(maxGuests),
        campArea: campArea ? parseFloat(campArea) : undefined,
        amenities: selectedAmenities,
        specialFeatures, rules, cancellationPolicy,
        checkInTime, checkOutTime,
        hostName: userData?.displayName || user.email || 'Host',
        listingType,
        ...(instantBook ? { instantBook: true } : {}),
        ...(weekendPricingEnabled && parseFloat(weekendPrice) > 0 ? { weekendPrice: parseFloat(weekendPrice) } : {}),
        ...(weekendPricingEnabled && parseFloat(holidayPrice) > 0 ? { holidayPrice: parseFloat(holidayPrice) } : {}),
      };

      if (listingType === 'camp') {
        campData.tents = tents;
        campData.tentConfiguration = { large: counts.large, small: counts.small, entertainment: counts.entertainment };
      } else if (listingType === 'kashta') {
        campData.seatingCapacity = parseInt(seatingCapacity);
        campData.beachfrontAccess = beachfrontAccess;
        campData.shadeType = shadeType || undefined;
        campData.viewType = viewType || undefined;
        campData.waterActivities = waterActivities;
        campData.tentConfiguration = { large: 0, small: 0, entertainment: 0 };
      }

      // campData uses the legacy field shape (price/photo/photos) that createCamp
      // normalises internally; cast avoids the structural mismatch with Camp.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await createCamp(campData as any, user.uid);
      // Clear draft on success
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      toast.success(listingType === 'kashta' ? t('createListing.validation.kashtaSuccess') : t('createListing.validation.campSuccess'));
      navigate('/host/listings');
    } catch (error) {
      const err = error as Error;
      toast.error(t('createListing.validation.failed', { error: err?.message || 'Unknown error occurred' }));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b desert-bg p-4 flex items-center justify-center">
        <CampfireLoader size="md" className="mx-auto my-4" />
      </div>
    );
  }

  if (!user || !userData || !userData.isHost) return null;

  const counts = getTentCounts();
  const hasCoordinates = latitude && longitude;
  const priceNum = parseFloat(price);
  const exampleNights = 3;
  const exampleTotal = !isNaN(priceNum) && priceNum > 0 ? (priceNum * exampleNights).toFixed(3) : null;

  // ── Step content ──────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Tent className="w-6 h-6 text-primary" />
          {t('listingType.sectionTitle', { defaultValue: 'Listing Type' })}
        </h3>
        <p className="text-sm text-gray-600 font-medium mb-4">{t('listingType.sectionDescription', { defaultValue: 'Choose the type of listing you want to create' })}</p>
        <ListingTypeSelector value={listingType} onChange={setListingType} variant="cards" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="title" className="text-gray-900 font-semibold">
          {listingType === 'kashta' ? t('listingType.kashta.nameLabel', { defaultValue: 'Kashta Name' }) : t('createListing.campName', { defaultValue: 'Camp Name' })} <span className="text-red-600">*</span>
        </Label>
        <Input
          id="title"
          type="text"
          placeholder={listingType === 'kashta' ? t('listingType.kashta.nameLabel', { defaultValue: 'Kashta Name' }) : t('createListing.campName', { defaultValue: 'Camp Name' })}
          value={title}
          onChange={e => { setTitle(e.target.value); if (errors.title) setErrors(prev => ({ ...prev, title: '' })); }}
          onBlur={() => { if (!title.trim()) setErrors(prev => ({ ...prev, title: t('createListing.validation.titleRequired', { defaultValue: 'Listing name is required' }) })); }}
          className={cn('border-border/80 focus:border-primary text-gray-900 placeholder:text-gray-400', errors.title && 'border-red-400 focus:border-red-500')}
        />
        <FieldError message={errors.title} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-gray-900 font-semibold">{t('createListing.description', { defaultValue: 'Description' })}</Label>
        <Textarea
          id="description"
          placeholder={t('createListing.descriptionPlaceholder', { defaultValue: 'Describe your listing...' })}
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          className="border-border/80 focus:border-primary resize-none text-gray-900 placeholder:text-gray-400"
        />
      </div>

      {/* Instant Book toggle */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border/80 bg-secondary/30">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-[#0A1128]" />
          </span>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{t('createListing.instantBook', { defaultValue: 'Instant Book' })}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t('createListing.instantBookDesc', { defaultValue: 'Guests can book instantly without waiting for your approval' })}</p>
          </div>
        </div>
        <Switch checked={instantBook} onCheckedChange={setInstantBook} />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="location" className="text-gray-900 font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          {t('createListing.campLocation', { defaultValue: 'Location' })} <span className="text-red-600">*</span>
        </Label>
        <Popover open={locationOpen} onOpenChange={setLocationOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={locationOpen}
              className={cn('w-full justify-between border-border/80 hover:border-primary text-gray-900 h-11', errors.location && 'border-red-400')}
            >
              {selectedLocation ? getLocationLabel(selectedLocation) : t('createListing.selectLocation', { defaultValue: 'Select location...' })}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder={t('createListing.searchLocations', { defaultValue: 'Search locations...' })} className="h-9" />
              <CommandList>
                <CommandEmpty>{t('createListing.noLocation', { defaultValue: 'No location found.' })}</CommandEmpty>
                <CommandGroup>
                  {BAHRAIN_CAMPING_LOCATIONS.map(location => (
                    <CommandItem
                      key={location.value}
                      value={location.value}
                      onSelect={currentValue => {
                        setSelectedLocation(currentValue === selectedLocation ? '' : currentValue);
                        setLocationOpen(false);
                        if (errors.location) setErrors(prev => ({ ...prev, location: '' }));
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{location.label}</span>
                        <span className="text-xs text-gray-500">{location.region}</span>
                      </div>
                      <Check className={cn('ml-auto h-4 w-4', selectedLocation === location.value ? 'opacity-100' : 'opacity-0')} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <FieldError message={errors.location} />
      </div>

      <div className="space-y-3 p-4 bg-secondary/50 border-2 border-border/80 rounded-lg">
        <Label className={cn('text-gray-900 font-semibold flex items-center gap-2', errors.coordinates && 'text-red-600')}>
          <Navigation className="w-4 h-4 text-primary" />
          {t('createListing.map.setCoordinates', { defaultValue: 'Set Coordinates' })} <span className="text-red-600">*</span>
        </Label>
        <p className="text-sm text-gray-600 font-medium">{t('createListing.map.chooseMethod', { defaultValue: 'Use your current location or paste a Google Maps link' })}</p>

        <Button
          type="button"
          onClick={getCurrentLocation}
          disabled={gettingLocation}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg lantern-halo"
        >
          {gettingLocation ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{t('createListing.gettingLocation', { defaultValue: 'Getting location...' })}</> : <><Navigation className="w-5 h-5 mr-2" />{t('createListing.useMyLocation', { defaultValue: 'Use My Location' })}</>}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/80" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-secondary px-2 text-gray-600 font-semibold">{t('createListing.or', { defaultValue: 'Or' })}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="googleMapsUrl" className="text-sm text-gray-700 font-semibold flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />{t('createListing.map.pasteLink', { defaultValue: 'Paste Google Maps Link' })}
          </Label>
          <Input
            id="googleMapsUrl"
            type="url"
            placeholder={t('createListing.googleMapsUrl', { defaultValue: 'https://maps.app.goo.gl/...' })}
            value={googleMapsUrl}
            onChange={e => handleGoogleMapsUrlChange(e.target.value)}
            className="border-border/80 focus:border-primary text-gray-900 placeholder:text-gray-400"
          />
          <p className="text-xs text-gray-600 font-medium">{t('createListing.map.pasteHelper', { defaultValue: 'Share your location from Google Maps and paste the link here' })}</p>
        </div>

        <FieldError message={errors.coordinates} />

        {hasCoordinates && (
          <div className="p-3 bg-green-50 border border-green-300 rounded-lg">
            <p className="text-sm font-semibold text-green-900 mb-1 flex items-center gap-2">
              <Check className="w-4 h-4" />{t('createListing.map.locationSet', { defaultValue: 'Location Set' })}
            </p>
            <p className="text-xs text-green-800 font-medium">
              {t('createListing.map.coordinates', { lat: latitude, lng: longitude, defaultValue: `Lat: ${latitude}, Lng: ${longitude}` })}
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
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Capacity */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          {t('createListing.capacity.title', { defaultValue: 'Capacity' })}
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="maxGuests" className="text-gray-900 font-semibold">
              {t('createListing.maxGuests', { defaultValue: 'Max Guests' })} <span className="text-red-600">*</span>
            </Label>
            <Input
              id="maxGuests"
              type="number"
              placeholder={t('createListing.maxGuestsPlaceholder', { defaultValue: '10' })}
              value={maxGuests}
              onChange={e => { setMaxGuests(e.target.value); if (errors.maxGuests) setErrors(prev => ({ ...prev, maxGuests: '' })); }}
              onBlur={() => { if (!maxGuests || parseInt(maxGuests) < 1) setErrors(prev => ({ ...prev, maxGuests: t('createListing.validation.maxGuests', { defaultValue: 'Max guests must be at least 1' }) })); }}
              min="1"
              className={cn('border-border/80 focus:border-primary text-gray-900 placeholder:text-gray-400', errors.maxGuests && 'border-red-400')}
            />
            <FieldError message={errors.maxGuests} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campArea" className="text-gray-900 font-semibold">{t('createListing.campArea', { defaultValue: 'Area (sqm)' })}</Label>
            <Input
              id="campArea"
              type="number"
              placeholder={t('createListing.campAreaPlaceholder', { defaultValue: '500' })}
              value={campArea}
              onChange={e => setCampArea(e.target.value)}
              min="0"
              className="border-border/80 focus:border-primary text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Check-in / Check-out */}
      <div className="space-y-3 p-4 bg-secondary/50 border-2 border-border/80 rounded-lg">
        <Label className="text-gray-900 font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          {t('createListing.checkIn', { defaultValue: 'Check-in' })} &amp; {t('createListing.checkOut', { defaultValue: 'Check-out' })}
        </Label>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="checkInTime" className="text-gray-900 font-semibold">
              {t('createListing.checkIn', { defaultValue: 'Check-in' })} <span className="text-red-600">*</span>
            </Label>
            <Input
              id="checkInTime"
              type="text"
              placeholder="08:00 AM"
              value={checkInTime}
              onChange={e => { setCheckInTime(e.target.value); if (errors.checkInTime) setErrors(prev => ({ ...prev, checkInTime: '' })); }}
              onBlur={() => { if (!checkInTime.trim()) setErrors(prev => ({ ...prev, checkInTime: t('createListing.validation.checkInRequired', { defaultValue: 'Check-in time is required' }) })); }}
              className={cn('border-border/80 focus:border-primary text-gray-900 placeholder:text-gray-400', errors.checkInTime && 'border-red-400')}
            />
            <FieldError message={errors.checkInTime} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkOutTime" className="text-gray-900 font-semibold">
              {t('createListing.checkOut', { defaultValue: 'Check-out' })} ({t('createListing.nextDay', { defaultValue: 'Next Day' })}) <span className="text-red-600">*</span>
            </Label>
            <Input
              id="checkOutTime"
              type="text"
              placeholder="03:00 AM"
              value={checkOutTime}
              onChange={e => { setCheckOutTime(e.target.value); if (errors.checkOutTime) setErrors(prev => ({ ...prev, checkOutTime: '' })); }}
              onBlur={() => { if (!checkOutTime.trim()) setErrors(prev => ({ ...prev, checkOutTime: t('createListing.validation.checkOutRequired', { defaultValue: 'Check-out time is required' }) })); }}
              className={cn('border-border/80 focus:border-primary text-gray-900 placeholder:text-gray-400', errors.checkOutTime && 'border-red-400')}
            />
            <FieldError message={errors.checkOutTime} />
          </div>
        </div>
      </div>

      {/* Tents (camp) or Kashta details */}
      {listingType === 'camp' ? (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Tent className="w-6 h-6 text-primary" />
            {t('createListing.capacityTents', { defaultValue: 'Tent Configuration' })} <span className="text-red-600">*</span>
          </h3>
          <p className="text-sm text-gray-600 font-medium mb-4">{t('createListing.tents.helper', { defaultValue: 'Add tents and configure each one individually with amenities' })}</p>
          <FieldError message={errors.tents} />

          <div className="flex flex-wrap gap-3 mb-6">
            {(['large', 'small', 'entertainment'] as const).map(type => (
              <Button key={type} type="button" onClick={() => { addTent(type); setErrors(prev => ({ ...prev, tents: '' })); }} variant="outline" className="border-2 border-border/80 text-gray-900 hover:bg-secondary font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                {t(`createListing.tents.add${type.charAt(0).toUpperCase() + type.slice(1)}`, { defaultValue: `Add ${type.charAt(0).toUpperCase() + type.slice(1)} Tent` })}
              </Button>
            ))}
          </div>

          {tents.length > 0 ? (
            <div className="space-y-4">
              {tents.map((tent, index) => (
                <Card key={tent.id} className="bg-secondary/50 border-2 border-border/80 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Tent className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-gray-900">
                        {t(tent.type === 'large' ? 'createListing.tents.largeLabel' : tent.type === 'small' ? 'createListing.tents.smallLabel' : 'createListing.tents.entertainmentLabel', { defaultValue: tent.type })} #{index + 1}
                      </h4>
                    </div>
                    <Button type="button" onClick={() => removeTent(tent.id)} variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50"><X className="w-4 h-4" /></Button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">{t('createListing.tents.basicFeatures', { defaultValue: 'Basic Features' })}:</p>
                      <div className="flex flex-wrap gap-2">
                        {(['furnished', 'carpeted', 'tv', 'sofas', 'teaSets'] as const).map(feature => (
                          <Button key={feature} type="button" onClick={() => updateTentFeature(tent.id, feature)} variant={tent[feature] ? 'default' : 'outline'} size="sm"
                            className={tent[feature] ? 'bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-semibold' : 'border-2 border-border/80 text-gray-800 hover:bg-secondary font-semibold'}>
                            {tent[feature] && <Check className="w-3 h-3 mr-1" />}
                            {t(`createListing.tents.featureLabels.${feature}`, { defaultValue: feature })}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">{t('createListing.tents.entertainmentSports', { defaultValue: 'Entertainment & Sports' })}:</p>
                      <div className="flex flex-wrap gap-2">
                        {(['pingPongTable', 'foosballTable', 'airHockeyTable', 'volleyballField', 'footballField'] as const).map(feature => (
                          <Button key={feature} type="button" onClick={() => updateTentFeature(tent.id, feature)} variant={tent[feature] ? 'default' : 'outline'} size="sm"
                            className={tent[feature] ? 'bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-semibold' : 'border-2 border-border/80 text-gray-800 hover:bg-secondary font-semibold'}>
                            {tent[feature] && <Check className="w-3 h-3 mr-1" />}
                            {t(`createListing.tents.featureLabels.${feature}`, { defaultValue: feature })}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-700 mb-2 block">{t('createListing.tents.descriptionLabel', { defaultValue: 'Description (optional)' })}</Label>
                      <Textarea value={tent.description || ''} onChange={e => updateTentDescription(tent.id, e.target.value)} placeholder={t('createListing.tents.descriptionPlaceholder', { defaultValue: 'Describe this tent...' })} rows={2} className="text-sm border-border/80 focus:border-primary" />
                    </div>
                  </div>
                </Card>
              ))}
              <div className="p-4 bg-secondary/50 border-2 border-border/80 rounded-lg">
                <p className="font-semibold text-gray-900 mb-1">{t('createListing.tents.sectionTitle', { defaultValue: 'Tent Summary' })}</p>
                <p className="text-gray-800">
                  <span className="font-bold">{counts.total}</span> {t('createListing.tents.sectionTitle', { defaultValue: 'tents' })}
                  {counts.large > 0 && <span> • {counts.large} {t('createListing.tents.largeLabel', { defaultValue: 'Large' })}</span>}
                  {counts.small > 0 && <span> • {counts.small} {t('createListing.tents.smallLabel', { defaultValue: 'Small' })}</span>}
                  {counts.entertainment > 0 && <span> • {counts.entertainment} {t('createListing.tents.entertainmentLabel', { defaultValue: 'Entertainment' })}</span>}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 bg-secondary/50 border-2 border-dashed border-border rounded-lg">
              <Tent className="w-12 h-12 text-primary mx-auto mb-3" />
              <p className="text-gray-700 font-medium">{t('createListing.tents.empty', { defaultValue: 'No tents added yet. Click the buttons above to add tents.' })}</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <FieldError message={errors.seatingCapacity} />
          <KashtaSpecificForm
            seatingCapacity={seatingCapacity}
            onSeatingCapacityChange={v => { setSeatingCapacity(v); if (errors.seatingCapacity) setErrors(prev => ({ ...prev, seatingCapacity: '' })); }}
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
        </div>
      )}

      {/* Amenities */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <span className="text-2xl">✨</span>{t('createListing.amenitiesSection', { defaultValue: 'Amenities' })}
        </h3>
        <p className="text-sm text-gray-600 font-medium mb-4">{t('createListing.amenitiesHelper', { defaultValue: 'Select all facilities and amenities available' })}</p>
        {Object.entries(AMENITIES).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3 capitalize">{t(`createListing.amenityCategories.${category}`, { defaultValue: category })}</h4>
            <div className="flex flex-wrap gap-2">
              {items.map(amenity => {
                const isSelected = selectedAmenities.includes(amenity);
                return (
                  <Button key={amenity} type="button" onClick={() => toggleAmenity(amenity)} variant={isSelected ? 'default' : 'outline'} size="sm"
                    className={isSelected ? 'bg-primary hover:bg-primary/90 text-primary-foreground lantern-halo border-0 font-semibold' : 'border-2 border-border/80 text-gray-800 hover:bg-secondary font-semibold'}>
                    {isSelected && <Check className="w-3 h-3 mr-1" />}
                    {t(`createListing.amenityItems.${amenity}`, { defaultValue: amenity })}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
        {selectedAmenities.length > 0 && (
          <div className="mt-2 p-4 bg-secondary/50 border-2 border-border/80 rounded-lg">
            <p className="text-sm font-semibold text-gray-900 mb-2">{t('createListing.selectedAmenities', { count: selectedAmenities.length, defaultValue: `Selected (${selectedAmenities.length})` })}</p>
            <div className="flex flex-wrap gap-2">
              {selectedAmenities.map(amenity => (
                <Badge key={amenity} variant="secondary" className="bg-secondary text-gray-900 border border-border/80 font-medium">
                  {t(`createListing.amenityItems.${amenity}`, { defaultValue: amenity })}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <span className="text-2xl">📸</span>
          {t('createListing.photosTitle', { defaultValue: 'Photos' })} <span className="text-red-600">*</span>
        </h3>
        <p className="text-sm text-gray-600 font-medium mb-4">{t('createListing.photosHelper', { defaultValue: 'Add photos of your listing. The first photo will be the cover image.' })}</p>
        <FieldError message={errors.photos} />
      </div>
      <ImageUploadManager
        images={uploadedImages}
        onChange={imgs => { setUploadedImages(imgs); if (errors.photos) setErrors(prev => ({ ...prev, photos: '' })); }}
        userId={user.uid}
        maxImages={10}
        disabled={submitting}
      />
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      {/* Price */}
      <div className="space-y-2">
        <Label htmlFor="price" className="text-gray-900 font-semibold">
          {t('createListing.pricing.perDay', { defaultValue: 'Price per Night' })} <span className="text-red-600">*</span>
        </Label>
        <div className="flex items-center gap-3">
          <Input
            id="price"
            type="number"
            placeholder="25"
            value={price}
            onChange={e => { setPrice(e.target.value); if (errors.price) setErrors(prev => ({ ...prev, price: '' })); }}
            onBlur={() => { if (!price || parseFloat(price) <= 0) setErrors(prev => ({ ...prev, price: t('createListing.validation.priceRequired', { defaultValue: 'Price per night is required' }) })); }}
            min="0"
            step="0.001"
            className={cn('border-border/80 focus:border-primary text-gray-900 placeholder:text-gray-400 flex-1', errors.price && 'border-red-400')}
          />
          <span className="text-gray-700 font-semibold whitespace-nowrap">{t('createListing.pricing.bhdNight', { defaultValue: 'BHD / night' })}</span>
        </div>
        <FieldError message={errors.price} />
        {exampleTotal && (
          <p className="text-sm text-gray-600 font-medium">
            {t('createListing.pricing.example', { nights: exampleNights, total: exampleTotal, defaultValue: `A guest booking ${exampleNights} nights pays BHD ${exampleTotal}` })}
          </p>
        )}
      </div>

      {/* Weekend / Holiday pricing */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border/80 bg-secondary/30">
          <div>
            <p className="font-semibold text-gray-900 text-sm">{t('createListing.pricing.weekendToggle', { defaultValue: 'Weekend pricing' })}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t('createListing.pricing.weekendToggleDesc', { defaultValue: 'Charge a different rate on Thursday & Friday nights' })}</p>
          </div>
          <Switch
            checked={weekendPricingEnabled}
            onCheckedChange={(checked) => {
              setWeekendPricingEnabled(checked);
              if (!checked) {
                setWeekendPrice('');
                setHolidayPrice('');
                if (errors.weekendPrice) setErrors(prev => ({ ...prev, weekendPrice: '' }));
              }
            }}
          />
        </div>

        {weekendPricingEnabled && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weekendPrice" className="text-gray-900 font-semibold">
                {t('createListing.pricing.weekendPrice', { defaultValue: 'Weekend price (Thu & Fri)' })} <span className="text-red-600">*</span>
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="weekendPrice"
                  type="number"
                  placeholder="30"
                  value={weekendPrice}
                  onChange={e => { setWeekendPrice(e.target.value); if (errors.weekendPrice) setErrors(prev => ({ ...prev, weekendPrice: '' })); }}
                  min="0"
                  step="0.001"
                  className={cn('border-border/80 focus:border-primary text-gray-900 placeholder:text-gray-400 flex-1', errors.weekendPrice && 'border-red-400')}
                />
                <span className="text-gray-700 font-semibold whitespace-nowrap">{t('createListing.pricing.bhdNight', { defaultValue: 'BHD / night' })}</span>
              </div>
              <FieldError message={errors.weekendPrice} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="holidayPrice" className="text-gray-900 font-semibold">
                {t('createListing.pricing.holidayPrice', { defaultValue: 'Holiday price (optional)' })}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="holidayPrice"
                  type="number"
                  placeholder="40"
                  value={holidayPrice}
                  onChange={e => setHolidayPrice(e.target.value)}
                  min="0"
                  step="0.001"
                  className="border-border/80 focus:border-primary text-gray-900 placeholder:text-gray-400 flex-1"
                />
                <span className="text-gray-700 font-semibold whitespace-nowrap">{t('createListing.pricing.bhdNight', { defaultValue: 'BHD / night' })}</span>
              </div>
              <p className="text-sm text-gray-600 font-medium">{t('createListing.pricing.holidayHelper', { defaultValue: 'Applied on Bahrain public holidays' })}</p>
            </div>
          </div>
        )}
      </div>

      {/* Cancellation Policy */}
      <CancellationPolicySelector value={cancellationPolicy} onChange={setCancellationPolicy} />

      {/* Special features & rules */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">📝</span>{t('createListing.sections.details', { defaultValue: 'Additional Details' })}
        </h3>
        <div className="space-y-2">
          <Label htmlFor="specialFeatures" className="text-gray-900 font-semibold">
            {listingType === 'kashta' ? t('kashta.kashtaDescription', { defaultValue: 'Description' }) : t('createListing.specialFeatures', { defaultValue: 'Special Features' })}
          </Label>
          <Textarea
            id="specialFeatures"
            placeholder={listingType === 'kashta' ? t('kashta.kashtaDescriptionPlaceholder', { defaultValue: 'Describe your kashta...' }) : t('createListing.specialFeatures', { defaultValue: 'Special features...' })}
            value={specialFeatures}
            onChange={e => setSpecialFeatures(e.target.value)}
            rows={3}
            className="border-border/80 focus:border-primary resize-none text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rules" className="text-gray-900 font-semibold">{t('createListing.rules', { defaultValue: 'Rules' })}</Label>
          <Textarea
            id="rules"
            placeholder={t('createListing.rules', { defaultValue: 'House rules...' })}
            value={rules}
            onChange={e => setRules(e.target.value)}
            rows={3}
            className="border-border/80 focus:border-primary resize-none text-gray-900 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Review summary */}
      <div className="p-4 bg-secondary/50 border-2 border-border/80 rounded-lg">
        <h4 className="font-bold text-gray-900 mb-3">{t('createListing.steps.reviewSummary', { defaultValue: 'Review Summary' })}</h4>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-gray-600">{t('createListing.campName', { defaultValue: 'Name' })}:</dt><dd className="font-semibold text-gray-900">{title || '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-600">{t('createListing.campLocation', { defaultValue: 'Location' })}:</dt><dd className="font-semibold text-gray-900">{selectedLocation ? getLocationLabel(selectedLocation) : '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-600">{t('createListing.maxGuests', { defaultValue: 'Max Guests' })}:</dt><dd className="font-semibold text-gray-900">{maxGuests || '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-600">{t('createListing.pricing.perDay', { defaultValue: 'Price' })}:</dt><dd className="font-semibold text-gray-900">{price ? `BHD ${price} / night` : '—'}</dd></div>
          {weekendPricingEnabled && parseFloat(weekendPrice) > 0 && (
            <div className="flex justify-between"><dt className="text-gray-600">{t('createListing.pricing.weekendPrice', { defaultValue: 'Weekend price (Thu & Fri)' })}:</dt><dd className="font-semibold text-gray-900">{`BHD ${weekendPrice} / night`}</dd></div>
          )}
          {weekendPricingEnabled && parseFloat(holidayPrice) > 0 && (
            <div className="flex justify-between"><dt className="text-gray-600">{t('createListing.pricing.holidayPrice', { defaultValue: 'Holiday price (optional)' })}:</dt><dd className="font-semibold text-gray-900">{`BHD ${holidayPrice} / night`}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-gray-600">{t('createListing.photosTitle', { defaultValue: 'Photos' })}:</dt><dd className="font-semibold text-gray-900">{uploadedImages.length}</dd></div>
        </dl>
      </div>
    </div>
  );

  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  // ── Navigation buttons ────────────────────────────────────────────────────

  const renderNav = () => (
    <div className="flex items-center justify-between pt-6 border-t border-border/80 mt-6">
      <div className="flex items-center gap-3">
        {step > 1 && (
          <Button type="button" onClick={goBack} variant="outline" className="border-2 border-border/80 text-gray-900 font-semibold">
            <ChevronLeft className="w-4 h-4 mr-1" />{t('createListing.steps.back', { defaultValue: 'Back' })}
          </Button>
        )}
        <Button
          type="button"
          onClick={() => {
            try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ listingType, title, description, selectedLocation, latitude, longitude, googleMapsUrl, price, checkInTime, checkOutTime, maxGuests, campArea, tents, seatingCapacity, beachfrontAccess, shadeType, viewType, waterActivities, selectedAmenities, specialFeatures, rules, cancellationPolicy })); toast.success(t('createListing.draftSaved', { defaultValue: 'Draft saved' })); } catch { toast.error(t('createListing.draftFailed', { defaultValue: 'Could not save draft' })); }
          }}
          variant="ghost"
          className="text-gray-600 hover:text-gray-900 font-medium text-sm"
        >
          <Save className="w-3.5 h-3.5 mr-1" />{t('createListing.saveDraft', { defaultValue: 'Save draft' })}
        </Button>
      </div>

      {step < STEP_COUNT ? (
        <Button type="button" onClick={goNext} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md lantern-halo">
          {t('createListing.steps.next', { defaultValue: 'Next' })}<ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      ) : (
        <Button type="button" onClick={handleSubmit} disabled={submitting} className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base shadow-lg disabled:opacity-50 lantern-halo px-8">
          {submitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{t('createListing.submitting', { defaultValue: 'Creating...' })}</> : <><Save className="w-5 h-5 mr-2" />{t('createListing.createListing', { defaultValue: 'Create Listing' })}</>}
        </Button>
      )}
    </div>
  );

  // ── Page render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b desert-bg p-4">
      <div className="max-w-4xl mx-auto pt-8 pb-20">
        <Button onClick={() => navigate('/host')} variant="ghost" className="mb-6 text-gray-900 hover:text-gray-950 hover:bg-secondary font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" />{t('hostListings.backToDashboard', { defaultValue: 'Back to Dashboard' })}
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{t('createListing.title', { defaultValue: 'Create Listing' })}</h1>
          <p className="text-gray-700 font-medium">{t('createListing.subtitle', { defaultValue: 'Fill in your listing details' })}</p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm border-border/80 p-6 md:p-8 shadow-xl">
          <StepProgress currentStep={step} completedSteps={completedSteps} />
          {stepContent[step - 1]()}
          {renderNav()}
        </Card>
      </div>
    </div>
  );
}
