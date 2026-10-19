import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { deleteField } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { CampfireLoader } from '@/components/CampfireLoader';
import { HostGate, HostHeader } from '@/components/host/HostGuard';
import { ListingPhotos, ListingImage } from '@/components/host/ListingPhotos';
import { TentBuilder } from '@/components/host/TentBuilder';
import { LocationPickerModal } from '@/components/host/LocationPickerModal';
import { LocationPreviewMap } from '@/components/host/LocationPreviewMap';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { goBack } from '@/lib/nav';
import { notify } from '@/lib/payments';
import {
  CampData,
  CancellationPolicy,
  TentConfig,
  ListingType,
  DEFAULT_PARTIAL_REFUND_RULES,
  createCampListing,
  updateCampListing,
  getCampRawForEdit,
  NotListingOwnerError,
} from '@/lib/hostListings';
import {
  CAMP_AMENITIES,
  KASHTA_AMENITIES,
  AMENITY_CATEGORY_KEYS,
  WATER_ACTIVITIES,
  SHADE_TYPES,
  VIEW_TYPES,
  TentFeatureKey,
  amenityLabel,
} from '@/lib/hostLabels';
import { BAHRAIN_CAMPING_LOCATIONS, getLocationLabel } from '@/lib/locations';
import {
  pickListingImages,
  uploadListingImage,
  MAX_LISTING_IMAGES,
} from '@/lib/listingImages';
import {
  extractCoordinatesFromUrl,
  resolveShortGoogleUrl,
  isGoogleShortLink,
} from '@/lib/mapsUrl';

const ARBOON_OPTIONS = [10, 20, 25, 30, 40, 50];
const STEP_COUNT = 5;
const DRAFT_KEY = 'listing-draft-mobile';

// ── Step indicator ─────────────────────────────────────────────────────────

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: Set<number>;
  colors: ReturnType<typeof useColors>;
}

function StepIndicator({ currentStep, totalSteps, completedSteps, colors }: StepIndicatorProps) {
  return (
    <View style={siStyles.container}>
      {/* Progress bar */}
      <View style={[siStyles.track, { backgroundColor: colors.muted }]}>
        <View
          style={[
            siStyles.fill,
            {
              backgroundColor: colors.primary,
              width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
            },
          ]}
        />
      </View>
      {/* Circles */}
      <View style={siStyles.circles}>
        {Array.from({ length: totalSteps }, (_, i) => {
          const n = i + 1;
          const isDone = completedSteps.has(n);
          const isCurrent = n === currentStep;
          return (
            <View
              key={n}
              style={[
                siStyles.circle,
                {
                  backgroundColor: isCurrent
                    ? colors.primary
                    : isDone
                    ? '#22c55e'
                    : colors.muted,
                  borderColor: isCurrent ? colors.primary : isDone ? '#22c55e' : colors.border,
                },
              ]}
            >
              {isDone && !isCurrent ? (
                <Ionicons name="checkmark" size={12} color="#fff" />
              ) : (
                <AppText variant="labelSm" weight="bold" color={isCurrent || isDone ? '#fff' : colors.mutedForeground}>
                  {n}
                </AppText>
              )}
            </View>
          );
        })}
      </View>
      <AppText variant="label" weight="bold" color={colors.primary} align="center" style={{ marginTop: 4 }}>
        Step {currentStep} of {totalSteps}
      </AppText>
    </View>
  );
}

const siStyles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 10 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  circles: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ── Field error ────────────────────────────────────────────────────────────

function FieldError({ message, colors }: { message?: string; colors: ReturnType<typeof useColors> }) {
  if (!message) return null;
  return (
    <AppText variant="labelSm" color="#ef4444" style={{ marginTop: 2 }}>
      {message}
    </AppText>
  );
}

// ── Main form body ─────────────────────────────────────────────────────────

function ListingFormBody() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const { isRTL } = useI18n();
  const { user, userData } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const campId = typeof params.id === 'string' ? params.id : undefined;
  const isEdit = Boolean(campId);

  // ── Step state ──────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Form state ──────────────────────────────────────────────────────────
  const [listingType, setListingType] = useState<ListingType>('camp');
  const [title, setTitle] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [price, setPrice] = useState('');
  const [weekendPricingEnabled, setWeekendPricingEnabled] = useState(false);
  const [weekendPrice, setWeekendPrice] = useState('');
  const [holidayPrice, setHolidayPrice] = useState('');
  const [description, setDescription] = useState('');
  const [maxGuests, setMaxGuests] = useState('');
  const [campArea, setCampArea] = useState('');
  const [checkInTime, setCheckInTime] = useState('08:00 AM');
  const [checkOutTime, setCheckOutTime] = useState('03:00 AM');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [specialFeatures, setSpecialFeatures] = useState('');
  const [rules, setRules] = useState('');
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy>({
    type: 'full_refundable',
  });
  const [tents, setTents] = useState<TentConfig[]>([]);
  const [seatingCapacity, setSeatingCapacity] = useState('');
  const [beachfrontAccess, setBeachfrontAccess] = useState(false);
  const [shadeType, setShadeType] = useState<'' | 'tent' | 'umbrella' | 'pergola' | 'natural'>('');
  const [viewType, setViewType] = useState<'' | 'beach' | 'mixed'>('');
  const [waterActivities, setWaterActivities] = useState<string[]>([]);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [instantBook, setInstantBook] = useState(false);

  const [locationModal, setLocationModal] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [resolvingUrl, setResolvingUrl] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [draftLoaded, setDraftLoaded] = useState(isEdit); // skip draft on edit

  // ── Draft: load on mount (create mode only) ──────────────────────────────

  useEffect(() => {
    if (isEdit) { setDraftLoaded(true); return; }
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (!raw) { setDraftLoaded(true); return; }
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
        if (typeof d.instantBook === 'boolean') setInstantBook(d.instantBook);
      } catch { /* ignore */ }
      setDraftLoaded(true);
    })();
  }, []);

  // ── Draft: autosave on change ────────────────────────────────────────────

  useEffect(() => {
    if (!draftLoaded || isEdit) return;
    const draft = {
      listingType, title, description, selectedLocation, latitude, longitude,
      googleMapsUrl, price, weekendPricingEnabled, weekendPrice, holidayPrice,
      checkInTime, checkOutTime, maxGuests, campArea,
      tents, seatingCapacity, beachfrontAccess, shadeType, viewType,
      waterActivities, selectedAmenities, specialFeatures, rules, cancellationPolicy,
      instantBook,
    };
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => {/* ignore */});
  }, [
    draftLoaded, isEdit,
    listingType, title, description, selectedLocation, latitude, longitude,
    googleMapsUrl, price, weekendPricingEnabled, weekendPrice, holidayPrice,
    checkInTime, checkOutTime, maxGuests, campArea,
    tents, seatingCapacity, beachfrontAccess, shadeType, viewType,
    waterActivities, selectedAmenities, specialFeatures, rules, cancellationPolicy,
    instantBook,
  ]);

  // ── Edit prefill ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isEdit || !user) return;
    let alive = true;
    (async () => {
      try {
        const raw = await getCampRawForEdit(campId as string, user.uid);
        if (!alive) return;
        if (!raw) {
          notify(t('hostListingNotFound'));
          goBack('/host/listings');
          return;
        }
        setListingType(raw.listingType === 'kashta' ? 'kashta' : 'camp');
        setTitle(raw.title || '');
        const locationValue =
          BAHRAIN_CAMPING_LOCATIONS.find((loc) => loc.label === raw.location)?.value || '';
        setSelectedLocation(locationValue);
        setLatitude(raw.coordinates?.lat?.toString() || '');
        setLongitude(raw.coordinates?.lng?.toString() || '');
        setPrice(raw.price?.toString() || '');
        const rawWeekend = Number(raw.weekendPrice);
        const rawHoliday = Number(raw.holidayPrice);
        const hasWeekend = rawWeekend > 0;
        const hasHoliday = rawHoliday > 0;
        setWeekendPricingEnabled(hasWeekend || hasHoliday);
        setWeekendPrice(hasWeekend ? rawWeekend.toString() : '');
        setHolidayPrice(hasHoliday ? rawHoliday.toString() : '');
        setDescription(raw.description || '');
        setMaxGuests(raw.maxGuests?.toString() || '');
        setCampArea(raw.campArea?.toString() || '');
        setTents(
          Array.isArray(raw.tents)
            ? raw.tents.map((tent: TentConfig) => ({ ...tent, description: tent.description || '' }))
            : []
        );
        setSelectedAmenities(Array.isArray(raw.amenities) ? raw.amenities : []);
        setSpecialFeatures(typeof raw.specialFeatures === 'string' ? raw.specialFeatures : '');
        setRules(typeof raw.rules === 'string' ? raw.rules : '');
        setCancellationPolicy(
          raw.cancellationPolicy && typeof raw.cancellationPolicy === 'object'
            ? raw.cancellationPolicy
            : { type: 'full_refundable' }
        );
        setCheckInTime(raw.checkInTime || '08:00 AM');
        setCheckOutTime(raw.checkOutTime || '03:00 AM');
        setSeatingCapacity(raw.seatingCapacity?.toString() || '');
        setBeachfrontAccess(Boolean(raw.beachfrontAccess));
        setInstantBook(Boolean(raw.instantBook));
        setShadeType(raw.shadeType || '');
        setViewType(raw.viewType || '');
        setWaterActivities(Array.isArray(raw.waterActivities) ? raw.waterActivities : []);

        const prefill: ListingImage[] = [];
        if (raw.photo) {
          prefill.push({ id: 'main', url: raw.photo, isMain: true, uploading: false, progress: 100 });
        }
        if (Array.isArray(raw.photos)) {
          raw.photos.forEach((photoUrl: string, index: number) => {
            prefill.push({ id: `additional-${index}`, url: photoUrl, isMain: false, uploading: false, progress: 100 });
          });
        }
        setImages(prefill);
      } catch (e) {
        console.error('[host] edit prefill failed', e);
        if (e instanceof NotListingOwnerError) {
          notify(t('hostNotOwner'));
        } else {
          notify(t('hostLoadListingFailed'));
        }
        goBack('/host/listings');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [isEdit, campId, user?.uid]);

  // ── Location helpers ─────────────────────────────────────────────────────

  const useMyLocation = async () => {
    try {
      setGettingLocation(true);
      if (Platform.OS !== 'web') {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) { notify(t('hostLocationFailed')); return; }
        const pos = await Location.getCurrentPositionAsync({});
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setErrors(prev => ({ ...prev, coordinates: '' }));
        notify(t('hostLocationCaptured'));
      } else if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLatitude(position.coords.latitude.toFixed(6));
            setLongitude(position.coords.longitude.toFixed(6));
            setErrors(prev => ({ ...prev, coordinates: '' }));
            notify(t('hostLocationCaptured'));
            setGettingLocation(false);
          },
          () => { notify(t('hostLocationFailed')); setGettingLocation(false); }
        );
        return;
      } else {
        notify(t('hostLocationFailed'));
      }
    } catch (e) {
      console.error('[host] geolocation failed', e);
      notify(t('hostLocationFailed'));
    } finally {
      if (Platform.OS !== 'web') setGettingLocation(false);
    }
  };

  const handleMapsUrl = async (url: string) => {
    setGoogleMapsUrl(url);
    if (!url.trim()) return;
    let parseTarget = url.trim();
    if (isGoogleShortLink(parseTarget)) {
      setResolvingUrl(true);
      const resolved = await resolveShortGoogleUrl(parseTarget);
      setResolvingUrl(false);
      if (resolved?.lat && resolved?.lng) {
        setLatitude(resolved.lat);
        setLongitude(resolved.lng);
        setErrors(prev => ({ ...prev, coordinates: '' }));
        notify(t('hostMapsExtracted'));
        return;
      }
      if (resolved?.resolvedUrl) parseTarget = resolved.resolvedUrl;
    }
    const coords = extractCoordinatesFromUrl(parseTarget);
    if (coords) {
      setLatitude(coords.lat);
      setLongitude(coords.lng);
      setErrors(prev => ({ ...prev, coordinates: '' }));
      notify(t('hostMapsExtracted'));
    } else {
      notify(t('hostMapsParseError'));
    }
  };

  // ── Tent helpers ─────────────────────────────────────────────────────────

  const addTent = (type: TentConfig['type']) => {
    const newTent: TentConfig = {
      id: `${type}-${Date.now()}-${Math.random()}`, type,
      furnished: false, carpeted: false, tv: false, sofas: false, teaSets: false,
      pingPongTable: false, foosballTable: false, airHockeyTable: false,
      volleyballField: false, footballField: false, description: '',
    };
    setTents(prev => [...prev, newTent]);
    setErrors(prev => ({ ...prev, tents: '' }));
  };
  const removeTent = (id: string) => setTents(prev => prev.filter(tent => tent.id !== id));
  const toggleTentFeature = (id: string, feature: TentFeatureKey) =>
    setTents(prev => prev.map(tent => tent.id === id ? { ...tent, [feature]: !tent[feature] } : tent));
  const setTentNotes = (id: string, text: string) =>
    setTents(prev => prev.map(tent => tent.id === id ? { ...tent, description: text } : tent));

  const getTentCounts = () => ({
    large: tents.filter(tent => tent.type === 'large').length,
    small: tents.filter(tent => tent.type === 'small').length,
    entertainment: tents.filter(tent => tent.type === 'entertainment').length,
  });

  // ── Amenities ────────────────────────────────────────────────────────────

  const toggleAmenity = (name: string) =>
    setSelectedAmenities(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]);
  const toggleWaterActivity = (value: string) =>
    setWaterActivities(prev => prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value]);

  // ── Photos ───────────────────────────────────────────────────────────────

  const addPhotos = async () => {
    if (!user) return;
    const remaining = MAX_LISTING_IMAGES - images.length;
    if (remaining <= 0) { notify(t('hostMaxPhotosMsg', { count: MAX_LISTING_IMAGES })); return; }
    const result = await pickListingImages(remaining);
    if (result.kind === 'permission-denied') { notify(t('hostPhotoPermission')); return; }
    if (result.kind === 'cancelled') return;

    const newImages: ListingImage[] = result.images.map((img, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      localUri: img.uri, isMain: false, uploading: true, progress: 0,
    }));

    setImages(prev => {
      const merged = [...prev, ...newImages];
      if (!merged.some(m => m.isMain) && merged.length > 0) merged[0] = { ...merged[0], isMain: true };
      return merged;
    });
    setErrors(prev => ({ ...prev, photos: '' }));

    for (let i = 0; i < newImages.length; i++) {
      const imgId = newImages[i].id;
      const picked = result.images[i];
      try {
        const uploaded = await uploadListingImage(user.uid, picked.uri, picked.width, pct => {
          setImages(prev => prev.map(m => m.id === imgId ? { ...m, progress: pct } : m));
        });
        setImages(prev => prev.map(m => m.id === imgId ? { ...m, url: uploaded.url, uploading: false, progress: 100 } : m));
      } catch (e) {
        console.error('[host] photo upload failed', e);
        notify(t('hostPhotoUploadFailed'));
        setImages(prev => prev.filter(m => m.id !== imgId));
      }
    }
  };

  const removePhoto = (id: string) => {
    setImages(prev => {
      const next = prev.filter(m => m.id !== id);
      if (next.length > 0 && !next.some(m => m.isMain)) next[0] = { ...next[0], isMain: true };
      return next;
    });
  };

  const setMainPhoto = (id: string) => setImages(prev => prev.map(m => ({ ...m, isMain: m.id === id })));

  // ── Step validation ───────────────────────────────────────────────────────

  const validateStep = useCallback((s: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (s === 1) {
      if (!title.trim()) newErrors.title = t('valTitle', { defaultValue: 'Listing name is required' });
    }
    if (s === 2) {
      if (!selectedLocation) newErrors.location = t('valLocation', { defaultValue: 'Please select a location' });
      if (!latitude || !longitude || isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
        newErrors.coordinates = t('valCoordinates', { defaultValue: 'Please set coordinates' });
      }
    }
    if (s === 3) {
      if (!maxGuests || parseInt(maxGuests) < 1) newErrors.maxGuests = t('valMaxGuests', { defaultValue: 'Max guests must be at least 1' });
      if (listingType === 'camp' && tents.length === 0) newErrors.tents = t('valTents', { defaultValue: 'Add at least one tent' });
      if (listingType === 'kashta' && (!seatingCapacity || parseInt(seatingCapacity) < 1)) {
        newErrors.seatingCapacity = t('valSeating', { defaultValue: 'Seating capacity must be at least 1' });
      }
      if (!checkInTime.trim()) newErrors.checkInTime = t('valCheckIn', { defaultValue: 'Check-in time is required' });
      if (!checkOutTime.trim()) newErrors.checkOutTime = t('valCheckOut', { defaultValue: 'Check-out time is required' });
    }
    if (s === 4) {
      const uploaded = images.filter(img => img.url);
      if (uploaded.length === 0) newErrors.photos = t('valImages', { defaultValue: 'Add at least one photo' });
      if (images.some(img => img.uploading)) newErrors.photos = t('valUploading', { defaultValue: 'Please wait for photos to finish uploading' });
    }
    if (s === 5) {
      if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) newErrors.price = t('valPrice', { defaultValue: 'Price per night is required' });
      if (weekendPricingEnabled && (!weekendPrice || isNaN(parseFloat(weekendPrice)) || parseFloat(weekendPrice) <= 0)) {
        newErrors.weekendPrice = t('valWeekendPrice', { defaultValue: 'Weekend price is required' });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, selectedLocation, latitude, longitude, maxGuests, listingType, tents, seatingCapacity, checkInTime, checkOutTime, images, price, weekendPricingEnabled, weekendPrice, t]);

  const goNext = () => {
    if (!validateStep(currentStep)) return;
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    setCurrentStep(s => s + 1);
  };

  const goPrev = () => {
    setErrors({});
    setCurrentStep(s => s - 1);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!user || submitting) return;

    // Validate all steps before submitting
    for (let s = 1; s <= STEP_COUNT; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
    }

    if (!title.trim()) return notify(t('valTitle'));
    if (!selectedLocation) return notify(t('valLocation'));
    if (!latitude || !longitude) return notify(t('valCoordinates'));
    if (!maxGuests || parseInt(maxGuests) < 1) return notify(t('valMaxGuests'));
    if (listingType === 'camp' && tents.length === 0) return notify(t('valTents'));
    if (listingType === 'kashta' && (!seatingCapacity || parseInt(seatingCapacity) < 1)) return notify(t('valSeating'));
    if (!checkInTime.trim() || !checkOutTime.trim()) return notify(t('valTimes'));
    const uploadedImages = images.filter(img => img.url);
    if (uploadedImages.length === 0) return notify(t('valImages'));
    if (images.some(img => img.uploading)) return notify(t('valUploading'));
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) return notify(t('valPrice'));
    if (weekendPricingEnabled && (!weekendPrice || isNaN(parseFloat(weekendPrice)) || parseFloat(weekendPrice) <= 0)) {
      return notify(t('valWeekendPrice', { defaultValue: 'Weekend price is required' }));
    }

    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const counts = getTentCounts();
    const mainImage = uploadedImages.find(img => img.isMain) || uploadedImages[0];
    const additionalImages = uploadedImages.filter(img => img !== mainImage).map(img => img.url as string);

    const campData: CampData = {
      slug, title,
      location: getLocationLabel(selectedLocation),
      coordinates: { lat: parseFloat(latitude), lng: parseFloat(longitude) },
      price: parseFloat(price),
      photo: mainImage.url as string,
      photos: additionalImages,
      description,
      maxGuests: parseInt(maxGuests),
      campArea: campArea ? parseFloat(campArea) : undefined,
      amenities: selectedAmenities,
      specialFeatures, rules, cancellationPolicy,
      checkInTime, checkOutTime,
      hostName: userData?.displayName || user.email || 'Host',
      listingType,
      instantBook,
    };

    // Peak-night pricing. Only write positive rates; when the toggle is off (or
    // a rate cleared) remove any previously-stored value on edit via
    // deleteField(). On create we simply omit the key (stripUndefined).
    const weekendNum = parseFloat(weekendPrice);
    const holidayNum = parseFloat(holidayPrice);
    if (weekendPricingEnabled && !isNaN(weekendNum) && weekendNum > 0) {
      campData.weekendPrice = weekendNum;
    } else if (isEdit) {
      campData.weekendPrice = deleteField();
    }
    if (weekendPricingEnabled && !isNaN(holidayNum) && holidayNum > 0) {
      campData.holidayPrice = holidayNum;
    } else if (isEdit) {
      campData.holidayPrice = deleteField();
    }

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

    try {
      setSubmitting(true);
      if (isEdit) {
        await updateCampListing(campId as string, campData);
        notify(t('hostUpdatedMsg'));
      } else {
        await createCampListing(campData, user.uid);
        // Clear draft on success
        await AsyncStorage.removeItem(DRAFT_KEY).catch(() => {/* ignore */});
        notify(t('hostCreatedTitle'), t('hostCreatedMsg'));
      }
      router.replace('/host/listings' as never);
    } catch (e) {
      console.error('[host] submit failed', e);
      notify(isEdit ? t('hostUpdateFailed') : t('hostCreateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── UI helpers ────────────────────────────────────────────────────────────

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
      color: colors.foreground,
      textAlign: (isRTL ? 'right' : 'left') as 'right' | 'left',
      fontFamily: i18n.language === 'ar' ? 'Cairo_400Regular' : 'PlusJakartaSans_400Regular',
    },
  ];

  const sectionStyle = [styles.section, { backgroundColor: colors.card, borderColor: colors.border }];

  const fieldLabel = (text: string, required = false) => (
    <AppText variant="labelSm" color={colors.mutedForeground} align={isRTL ? 'right' : 'left'} style={styles.fieldLabel}>
      {text}{required ? <AppText variant="labelSm" color="#ef4444"> *</AppText> : null}
    </AppText>
  );

  const renderAmenityCategories = (catalog: Record<string, string[]>) => (
    <View style={styles.amenityGroups}>
      {Object.entries(catalog).map(([category, items]) => (
        <View key={category} style={styles.amenityGroup}>
          <AppText variant="labelSm" weight="bold" color={colors.mutedForeground} align={isRTL ? 'right' : 'left'}>
            {t(AMENITY_CATEGORY_KEYS[category] || 'amenCatOther')}
          </AppText>
          <View style={[styles.chipsWrap, isRTL ? styles.rtlRow : null]}>
            {items.map(item => {
              const active = selectedAmenities.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => toggleAmenity(item)}
                  style={[styles.amenityChip, { backgroundColor: active ? colors.primary : colors.muted, borderColor: active ? colors.primary : colors.border }]}
                >
                  <AppText variant="labelSm" weight={active ? 'bold' : 'regular'} color={active ? colors.primaryForeground : colors.foreground}>
                    {amenityLabel(item, i18n.language)}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading || !draftLoaded) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <HostHeader title={isEdit ? t('hostEditListing') : t('hostCreateListing')} fallback="/host/listings" />
        <View style={styles.loadingWrap}>
          <CampfireLoader size="lg" />
        </View>
      </View>
    );
  }

  // ── Step content ──────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <>
      {/* Listing type */}
      <View style={sectionStyle}>
        <AppText variant="h3" align={isRTL ? 'right' : 'left'}>{t('hostListingType')}</AppText>
        {isEdit ? (
          <AppText variant="bodySm" color={colors.mutedForeground} align={isRTL ? 'right' : 'left'}>{t('hostTypeLocked')}</AppText>
        ) : null}
        <View style={[styles.typeRow, isRTL ? styles.rtlRow : null]}>
          {([
            { value: 'camp', icon: 'bonfire-outline', titleKey: 'hostTypeCamp', descKey: 'hostTypeCampDesc', tint: colors.primary },
            { value: 'kashta', icon: 'umbrella-outline', titleKey: 'hostTypeKashta', descKey: 'hostTypeKashtaDesc', tint: colors.kashta },
          ] as const).map(option => {
            const active = listingType === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                disabled={isEdit}
                onPress={() => setListingType(option.value)}
                style={[styles.typeCard, { borderColor: active ? option.tint : colors.border, backgroundColor: active ? option.tint + '14' : colors.background, opacity: isEdit && !active ? 0.4 : 1 }]}
              >
                <Ionicons name={option.icon} size={22} color={active ? option.tint : colors.mutedForeground} />
                <AppText variant="label" weight="bold" color={active ? option.tint : colors.foreground}>{t(option.titleKey)}</AppText>
                <AppText variant="labelSm" color={colors.mutedForeground} align="center">{t(option.descKey)}</AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Basic info */}
      <View style={sectionStyle}>
        <AppText variant="h3" align={isRTL ? 'right' : 'left'}>{t('hostBasicInfo')}</AppText>

        {fieldLabel(t('hostTitleLabel'), true)}
        <TextInput
          value={title}
          onChangeText={v => { setTitle(v); if (errors.title) setErrors(prev => ({ ...prev, title: '' })); }}
          onBlur={() => { if (!title.trim()) setErrors(prev => ({ ...prev, title: t('valTitle', { defaultValue: 'Listing name is required' }) })); }}
          placeholder={t('hostTitlePlaceholder')}
          placeholderTextColor={colors.mutedForeground}
          style={[...inputStyle, errors.title ? { borderColor: '#ef4444' } : null]}
        />
        <FieldError message={errors.title} colors={colors} />

        {fieldLabel(t('hostDescriptionLabel'))}
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t('hostDescriptionPlaceholder')}
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[...inputStyle, styles.textArea]}
        />
      </View>

      {/* Instant Book toggle */}
      <View style={[sectionStyle, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }]}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <View style={[styles.instantBookIcon, { backgroundColor: colors.primary + '1A', borderColor: colors.primary + '26' }]}>
            <Ionicons name="flash" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="label" weight="bold" align={isRTL ? 'right' : 'left'}>
              {t('hostInstantBook', { defaultValue: 'Instant Book' })}
            </AppText>
            <AppText variant="labelSm" color={colors.mutedForeground} align={isRTL ? 'right' : 'left'} style={{ marginTop: 2 }}>
              {t('hostInstantBookDesc', { defaultValue: 'Guests can book instantly without waiting for your approval' })}
            </AppText>
          </View>
        </View>
        <Switch
          value={instantBook}
          onValueChange={setInstantBook}
          trackColor={{ false: colors.muted, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>
    </>
  );

  const renderStep2 = () => (
    <>
      <View style={sectionStyle}>
        <AppText variant="h3" align={isRTL ? 'right' : 'left'}>{t('hostCoordinates')}</AppText>
        <AppText variant="bodySm" color={colors.mutedForeground} align={isRTL ? 'right' : 'left'}>{t('hostCoordinatesDesc')}</AppText>

        {fieldLabel(t('hostSelectLocation'), true)}
        <TouchableOpacity
          onPress={() => setLocationModal(true)}
          style={[styles.selectRow, { backgroundColor: colors.card, borderColor: errors.location ? '#ef4444' : colors.border }, isRTL ? styles.rtlRow : null]}
        >
          <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
          <AppText variant="body" color={selectedLocation ? colors.foreground : colors.mutedForeground} style={styles.selectText} align={isRTL ? 'right' : 'left'} numberOfLines={1}>
            {selectedLocation ? getLocationLabel(selectedLocation) : t('hostSelectLocation')}
          </AppText>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        <FieldError message={errors.location} colors={colors} />

        <PressableScale
          onPress={useMyLocation}
          disabled={gettingLocation}
          style={[styles.locationBtn, { backgroundColor: colors.kashta + '14', borderColor: colors.kashta + '55' }, gettingLocation ? { opacity: 0.6 } : null]}
        >
          <Ionicons name="navigate-outline" size={18} color={colors.kashta} />
          <AppText variant="label" weight="bold" color={colors.kashta}>
            {gettingLocation ? t('hostGettingLocation') : t('hostUseMyLocation')}
          </AppText>
        </PressableScale>

        {fieldLabel(t('hostPasteMapsUrl'))}
        <TextInput
          value={googleMapsUrl}
          onChangeText={handleMapsUrl}
          placeholder={t('hostMapsUrlPlaceholder')}
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          style={inputStyle}
        />
        {resolvingUrl ? <AppText variant="labelSm" color={colors.mutedForeground}>{t('hostGettingLocation')}</AppText> : null}

        <View style={[styles.timesRow, isRTL ? styles.rtlRow : null]}>
          <View style={styles.timeCol}>
            {fieldLabel(t('hostLatitude'))}
            <TextInput value={latitude} onChangeText={v => { setLatitude(v); if (errors.coordinates) setErrors(prev => ({ ...prev, coordinates: '' })); }} placeholder="26.0667" placeholderTextColor={colors.mutedForeground} keyboardType="numbers-and-punctuation" style={inputStyle} />
          </View>
          <View style={styles.timeCol}>
            {fieldLabel(t('hostLongitude'))}
            <TextInput value={longitude} onChangeText={v => { setLongitude(v); if (errors.coordinates) setErrors(prev => ({ ...prev, coordinates: '' })); }} placeholder="50.5577" placeholderTextColor={colors.mutedForeground} keyboardType="numbers-and-punctuation" style={inputStyle} />
          </View>
        </View>
        <FieldError message={errors.coordinates} colors={colors} />

        {Number.isFinite(parseFloat(latitude)) && Number.isFinite(parseFloat(longitude)) ? (
          <LocationPreviewMap
            lat={parseFloat(latitude)}
            lng={parseFloat(longitude)}
            onChange={(la, ln) => { setLatitude(la.toFixed(6)); setLongitude(ln.toFixed(6)); }}
          />
        ) : null}
      </View>
    </>
  );

  const renderStep3 = () => (
    <>
      {/* Capacity */}
      <View style={sectionStyle}>
        <AppText variant="h3" align={isRTL ? 'right' : 'left'}>{t('hostBasicInfo')}</AppText>

        {fieldLabel(t('hostMaxGuestsLabel'), true)}
        <TextInput
          value={maxGuests}
          onChangeText={v => { setMaxGuests(v); if (errors.maxGuests) setErrors(prev => ({ ...prev, maxGuests: '' })); }}
          onBlur={() => { if (!maxGuests || parseInt(maxGuests) < 1) setErrors(prev => ({ ...prev, maxGuests: t('valMaxGuests', { defaultValue: 'Max guests must be at least 1' }) })); }}
          placeholder="10"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="number-pad"
          style={[...inputStyle, errors.maxGuests ? { borderColor: '#ef4444' } : null]}
        />
        <FieldError message={errors.maxGuests} colors={colors} />

        {listingType === 'camp' ? (
          <>
            {fieldLabel(t('hostCampAreaLabel'))}
            <TextInput value={campArea} onChangeText={setCampArea} placeholder="500" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" style={inputStyle} />
          </>
        ) : null}

        <View style={[styles.timesRow, isRTL ? styles.rtlRow : null]}>
          <View style={styles.timeCol}>
            {fieldLabel(t('hostCheckInTime'), true)}
            <TextInput
              value={checkInTime}
              onChangeText={v => { setCheckInTime(v); if (errors.checkInTime) setErrors(prev => ({ ...prev, checkInTime: '' })); }}
              onBlur={() => { if (!checkInTime.trim()) setErrors(prev => ({ ...prev, checkInTime: t('valCheckIn', { defaultValue: 'Check-in time is required' }) })); }}
              placeholder="08:00 AM"
              placeholderTextColor={colors.mutedForeground}
              style={[...inputStyle, errors.checkInTime ? { borderColor: '#ef4444' } : null]}
            />
            <FieldError message={errors.checkInTime} colors={colors} />
          </View>
          <View style={styles.timeCol}>
            {fieldLabel(t('hostCheckOutTime'), true)}
            <TextInput
              value={checkOutTime}
              onChangeText={v => { setCheckOutTime(v); if (errors.checkOutTime) setErrors(prev => ({ ...prev, checkOutTime: '' })); }}
              onBlur={() => { if (!checkOutTime.trim()) setErrors(prev => ({ ...prev, checkOutTime: t('valCheckOut', { defaultValue: 'Check-out time is required' }) })); }}
              placeholder="03:00 AM"
              placeholderTextColor={colors.mutedForeground}
              style={[...inputStyle, errors.checkOutTime ? { borderColor: '#ef4444' } : null]}
            />
            <FieldError message={errors.checkOutTime} colors={colors} />
          </View>
        </View>
      </View>

      {/* Camp tents */}
      {listingType === 'camp' ? (
        <View style={sectionStyle}>
          <AppText variant="h3" align={isRTL ? 'right' : 'left'}>{t('hostTentsSection')}</AppText>
          <AppText variant="bodySm" color={colors.mutedForeground} align={isRTL ? 'right' : 'left'}>{t('hostTentsDesc')}</AppText>
          <FieldError message={errors.tents} colors={colors} />
          <TentBuilder tents={tents} onAdd={addTent} onRemove={removeTent} onToggleFeature={toggleTentFeature} onNotesChange={setTentNotes} />
        </View>
      ) : null}

      {/* Kashta details */}
      {listingType === 'kashta' ? (
        <View style={sectionStyle}>
          <AppText variant="h3" align={isRTL ? 'right' : 'left'}>{t('hostKashtaDetails')}</AppText>

          {fieldLabel(t('hostSeatingCapacity'), true)}
          <TextInput
            value={seatingCapacity}
            onChangeText={v => { setSeatingCapacity(v); if (errors.seatingCapacity) setErrors(prev => ({ ...prev, seatingCapacity: '' })); }}
            onBlur={() => { if (!seatingCapacity || parseInt(seatingCapacity) < 1) setErrors(prev => ({ ...prev, seatingCapacity: t('valSeating', { defaultValue: 'Seating capacity must be at least 1' }) })); }}
            placeholder="15"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            style={[...inputStyle, errors.seatingCapacity ? { borderColor: '#ef4444' } : null]}
          />
          <FieldError message={errors.seatingCapacity} colors={colors} />

          <View style={[styles.switchRow, isRTL ? styles.rtlRow : null]}>
            <AppText variant="label">{t('hostBeachfront')}</AppText>
            <Switch value={beachfrontAccess} onValueChange={setBeachfrontAccess} trackColor={{ false: colors.muted, true: colors.kashta }} thumbColor="#FFFFFF" />
          </View>

          {fieldLabel(t('hostShadeType'))}
          <View style={[styles.chipsWrap, isRTL ? styles.rtlRow : null]}>
            {SHADE_TYPES.map(option => {
              const active = shadeType === option.value;
              return (
                <TouchableOpacity key={option.value} onPress={() => setShadeType(active ? '' : option.value)}
                  style={[styles.amenityChip, { backgroundColor: active ? colors.kashta : colors.muted, borderColor: active ? colors.kashta : colors.border }]}>
                  <AppText variant="labelSm" weight={active ? 'bold' : 'regular'} color={active ? '#FFFFFF' : colors.foreground}>{t(option.i18nKey)}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {fieldLabel(t('hostViewType'))}
          <View style={[styles.chipsWrap, isRTL ? styles.rtlRow : null]}>
            {VIEW_TYPES.map(option => {
              const active = viewType === option.value;
              return (
                <TouchableOpacity key={option.value} onPress={() => setViewType(active ? '' : option.value)}
                  style={[styles.amenityChip, { backgroundColor: active ? colors.kashta : colors.muted, borderColor: active ? colors.kashta : colors.border }]}>
                  <AppText variant="labelSm" weight={active ? 'bold' : 'regular'} color={active ? '#FFFFFF' : colors.foreground}>{t(option.i18nKey)}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {fieldLabel(t('hostWaterActivities'))}
          <View style={[styles.chipsWrap, isRTL ? styles.rtlRow : null]}>
            {WATER_ACTIVITIES.map(option => {
              const active = waterActivities.includes(option.value);
              return (
                <TouchableOpacity key={option.value} onPress={() => toggleWaterActivity(option.value)}
                  style={[styles.amenityChip, { backgroundColor: active ? colors.kashta : colors.muted, borderColor: active ? colors.kashta : colors.border }]}>
                  <AppText variant="labelSm" weight={active ? 'bold' : 'regular'} color={active ? '#FFFFFF' : colors.foreground}>{t(option.i18nKey)}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {renderAmenityCategories(KASHTA_AMENITIES)}
        </View>
      ) : null}

      {/* General amenities */}
      <View style={sectionStyle}>
        <AppText variant="h3" align={isRTL ? 'right' : 'left'}>{t('hostAmenitiesSection')}</AppText>
        {renderAmenityCategories(CAMP_AMENITIES)}
      </View>
    </>
  );

  const renderStep4 = () => (
    <View style={sectionStyle}>
      <AppText variant="h3" align={isRTL ? 'right' : 'left'}>{t('hostPhotos')}</AppText>
      <AppText variant="bodySm" color={colors.mutedForeground} align={isRTL ? 'right' : 'left'}>{t('hostPhotosDesc', { count: MAX_LISTING_IMAGES })}</AppText>
      <FieldError message={errors.photos} colors={colors} />
      <ListingPhotos images={images} onAdd={addPhotos} onRemove={removePhoto} onSetMain={setMainPhoto} disabled={submitting} />
    </View>
  );

  const renderStep5 = () => (
    <>
      {/* Price */}
      <View style={sectionStyle}>
        <AppText variant="h3" align={isRTL ? 'right' : 'left'}>{t('hostPriceLabel', { defaultValue: 'Price' })}</AppText>

        {fieldLabel(t('hostPriceLabel'), true)}
        <View style={[styles.timesRow, isRTL ? styles.rtlRow : null]}>
          <TextInput
            value={price}
            onChangeText={v => { setPrice(v); if (errors.price) setErrors(prev => ({ ...prev, price: '' })); }}
            onBlur={() => { if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) setErrors(prev => ({ ...prev, price: t('valPrice', { defaultValue: 'Price per night is required' }) })); }}
            placeholder="25"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
            style={[...inputStyle, styles.priceInput, errors.price ? { borderColor: '#ef4444' } : null]}
          />
          <View style={[styles.priceUnit, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <AppText variant="labelSm" color={colors.mutedForeground} numberOfLines={1}>
              BHD / {t('hostPriceNight', { defaultValue: 'night' })}
            </AppText>
          </View>
        </View>
        <FieldError message={errors.price} colors={colors} />
        {(() => {
          const p = parseFloat(price);
          if (!isNaN(p) && p > 0) {
            const ex = (p * 3).toFixed(3);
            return (
              <AppText variant="bodySm" color={colors.mutedForeground} align={isRTL ? 'right' : 'left'}>
                {t('hostPriceExample', { nights: 3, total: ex, defaultValue: `A guest booking 3 nights pays BHD ${ex}` })}
              </AppText>
            );
          }
          return null;
        })()}
      </View>

      {/* Weekend / holiday pricing */}
      <View style={sectionStyle}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" weight="bold" align={isRTL ? 'right' : 'left'}>
              {t('hostWeekendPricing', { defaultValue: 'Weekend pricing' })}
            </AppText>
            <AppText variant="labelSm" color={colors.mutedForeground} align={isRTL ? 'right' : 'left'} style={{ marginTop: 2 }}>
              {t('hostWeekendPricingDesc', { defaultValue: 'Charge a different rate on Thursday & Friday nights' })}
            </AppText>
          </View>
          <Switch
            value={weekendPricingEnabled}
            onValueChange={(v) => {
              setWeekendPricingEnabled(v);
              if (!v && errors.weekendPrice) setErrors(prev => ({ ...prev, weekendPrice: '' }));
            }}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {weekendPricingEnabled ? (
          <>
            {fieldLabel(t('hostWeekendPriceLabel', { defaultValue: 'Weekend price (Thu & Fri)' }), true)}
            <View style={[styles.timesRow, isRTL ? styles.rtlRow : null]}>
              <TextInput
                value={weekendPrice}
                onChangeText={v => { setWeekendPrice(v); if (errors.weekendPrice) setErrors(prev => ({ ...prev, weekendPrice: '' })); }}
                onBlur={() => { if (weekendPricingEnabled && (!weekendPrice || isNaN(parseFloat(weekendPrice)) || parseFloat(weekendPrice) <= 0)) setErrors(prev => ({ ...prev, weekendPrice: t('valWeekendPrice', { defaultValue: 'Weekend price is required' }) })); }}
                placeholder="35"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
                style={[...inputStyle, styles.priceInput, errors.weekendPrice ? { borderColor: '#ef4444' } : null]}
              />
              <View style={[styles.priceUnit, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <AppText variant="labelSm" color={colors.mutedForeground} numberOfLines={1}>
                  BHD / {t('hostPriceNight', { defaultValue: 'night' })}
                </AppText>
              </View>
            </View>
            <FieldError message={errors.weekendPrice} colors={colors} />

            {fieldLabel(t('hostHolidayPriceLabel', { defaultValue: 'Holiday price (optional)' }))}
            <View style={[styles.timesRow, isRTL ? styles.rtlRow : null]}>
              <TextInput
                value={holidayPrice}
                onChangeText={setHolidayPrice}
                placeholder="45"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
                style={[...inputStyle, styles.priceInput]}
              />
              <View style={[styles.priceUnit, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <AppText variant="labelSm" color={colors.mutedForeground} numberOfLines={1}>
                  BHD / {t('hostPriceNight', { defaultValue: 'night' })}
                </AppText>
              </View>
            </View>
            <AppText variant="bodySm" color={colors.mutedForeground} align={isRTL ? 'right' : 'left'}>
              {t('hostHolidayPriceDesc', { defaultValue: 'Applied on Bahrain public holidays' })}
            </AppText>
          </>
        ) : null}
      </View>

      {/* Cancellation policy */}
      <View style={sectionStyle}>
        <AppText variant="h3" align={isRTL ? 'right' : 'left'}>{t('hostPolicySection')}</AppText>

        {([
          { type: 'full_refundable', titleKey: 'policyFullTitle', descKey: 'policyFullDesc' },
          { type: 'partial_refundable', titleKey: 'policyPartialTitle', descKey: 'policyPartialDesc' },
        ] as const).map(option => {
          const active = cancellationPolicy.type === option.type;
          return (
            <TouchableOpacity key={option.type}
              onPress={() => setCancellationPolicy(
                option.type === 'full_refundable'
                  ? { type: 'full_refundable' }
                  : { type: 'partial_refundable', arboonPercentage: cancellationPolicy.arboonPercentage || 20, refundRules: DEFAULT_PARTIAL_REFUND_RULES }
              )}
              style={[styles.policyCard, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + '10' : colors.background }]}
            >
              <View style={[styles.policyHeader, isRTL ? styles.rtlRow : null]}>
                <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={18} color={active ? colors.primary : colors.mutedForeground} />
                <AppText variant="label" weight="bold" style={styles.policyTitle} align={isRTL ? 'right' : 'left'}>{t(option.titleKey)}</AppText>
              </View>
              <AppText variant="bodySm" color={colors.mutedForeground} align={isRTL ? 'right' : 'left'}>{t(option.descKey)}</AppText>
            </TouchableOpacity>
          );
        })}

        {cancellationPolicy.type === 'partial_refundable' ? (
          <>
            {fieldLabel(t('hostArboonLabel'))}
            <View style={[styles.chipsWrap, isRTL ? styles.rtlRow : null]}>
              {ARBOON_OPTIONS.map(value => {
                const active = (cancellationPolicy.arboonPercentage || 20) === value;
                return (
                  <TouchableOpacity key={value}
                    onPress={() => setCancellationPolicy({ type: 'partial_refundable', arboonPercentage: value, refundRules: DEFAULT_PARTIAL_REFUND_RULES })}
                    style={[styles.amenityChip, { backgroundColor: active ? colors.primary : colors.muted, borderColor: active ? colors.primary : colors.border }]}
                  >
                    <AppText variant="labelSm" weight={active ? 'bold' : 'regular'} color={active ? colors.primaryForeground : colors.foreground}>{`${value}%`}</AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
            <AppText variant="bodySm" color={colors.mutedForeground} align={isRTL ? 'right' : 'left'}>{t('hostArboonValue', { value: cancellationPolicy.arboonPercentage || 20 })}</AppText>
          </>
        ) : null}
      </View>

      {/* Details */}
      <View style={sectionStyle}>
        <AppText variant="h3" align={isRTL ? 'right' : 'left'}>{t('hostDetailsSection')}</AppText>

        {fieldLabel(t('hostSpecialFeatures'))}
        <TextInput value={specialFeatures} onChangeText={setSpecialFeatures} placeholder={t('hostSpecialFeaturesPlaceholder')} placeholderTextColor={colors.mutedForeground} multiline style={[...inputStyle, styles.textArea]} />

        {fieldLabel(t('hostRulesLabel'))}
        <TextInput value={rules} onChangeText={setRules} placeholder={t('hostRulesPlaceholder')} placeholderTextColor={colors.mutedForeground} multiline style={[...inputStyle, styles.textArea]} />
      </View>
    </>
  );

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HostHeader title={isEdit ? t('hostEditListing') : t('hostCreateListing')} fallback="/host/listings" />

      <StepIndicator currentStep={currentStep} totalSteps={STEP_COUNT} completedSteps={completedSteps} colors={colors} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {stepRenderers[currentStep - 1]()}

          {/* Navigation buttons */}
          <View style={[styles.navRow, isRTL ? styles.rtlRow : null]}>
            {currentStep > 1 ? (
              <PressableScale onPress={goPrev} style={[styles.navBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={18} color={colors.foreground} />
                <AppText variant="label" weight="bold" color={colors.foreground}>{t('hostBack', { defaultValue: 'Back' })}</AppText>
              </PressableScale>
            ) : <View style={styles.navBtnPlaceholder} />}

            {currentStep < STEP_COUNT ? (
              <PressableScale onPress={goNext} style={[styles.navBtn, styles.navBtnPrimary, { backgroundColor: colors.primary }]}>
                <AppText variant="label" weight="bold" color={colors.primaryForeground}>{t('hostNext', { defaultValue: 'Next' })}</AppText>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.primaryForeground} />
              </PressableScale>
            ) : (
              <PressableScale onPress={handleSubmit} disabled={submitting} style={[styles.navBtn, styles.navBtnPrimary, { backgroundColor: colors.primary }, submitting ? { opacity: 0.6 } : null]}>
                <AppText variant="label" weight="bold" color={colors.primaryForeground}>
                  {submitting ? t('hostSubmitting') : isEdit ? t('hostSaveChanges') : t('hostSubmitCreate')}
                </AppText>
              </PressableScale>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LocationPickerModal
        visible={locationModal}
        selected={selectedLocation}
        onSelect={loc => { setSelectedLocation(loc); if (errors.location) setErrors(prev => ({ ...prev, location: '' })); }}
        onClose={() => setLocationModal(false)}
      />
    </View>
  );
}

export default function ListingFormScreen() {
  return (
    <HostGate>
      <ListingFormBody />
    </HostGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  rtlRow: { flexDirection: 'row-reverse' },
  loadingWrap: { flex: 1, justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 64, gap: 16 },
  section: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  fieldLabel: { marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium' },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  selectText: { flex: 1 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeCard: { flex: 1, borderWidth: 2, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  timesRow: { flexDirection: 'row', gap: 10 },
  timeCol: { flex: 1 },
  locationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 12 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  amenityChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  amenityGroups: { gap: 12, marginTop: 4 },
  amenityGroup: { gap: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  instantBookIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  policyCard: { borderWidth: 2, borderRadius: 14, padding: 12, gap: 6 },
  policyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  policyTitle: { flex: 1 },
  priceInput: { flex: 1, minWidth: 0 },
  priceUnit: {
    maxWidth: '42%',
    flexShrink: 0,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 8 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20 },
  navBtnPrimary: { borderWidth: 0, flex: 1, justifyContent: 'center' },
  navBtnPlaceholder: { flex: 0, width: 0 },
});
