/**
 * Data Compatibility Layer
 * Handles conversion between old (v1.1.1) and new data structures
 * Now supports BOTH field name formats from database
 */

import { Camp as NewCamp, Booking as NewBooking } from './firestore';
import { Timestamp } from 'firebase/firestore';

// Legacy Camp structure (v1.1.1)
export interface LegacyCamp {
  id: string;
  title: string;
  photo: string;  // Single photo
  price: number;  // Direct price field
  location: string;
  tentConfiguration: { large: number; small: number; entertainment: number };
  tents?: Array<{
    id?: string;
    type: 'large' | 'small' | 'entertainment';
    furnished?: boolean;
    carpeted?: boolean;
    tv?: boolean;
    sofas?: boolean;
    teaSets?: boolean;
    pingPongTable?: boolean;
    foosballTable?: boolean;
    airHockeyTable?: boolean;
    volleyballField?: boolean;
    footballField?: boolean;
    description?: string;
    [key: string]: unknown;
  }>;
  maxGuests: number;
  hostId: string;
  hostName?: string;
  createdAt: string;
  averageRating?: number;
  reviewCount?: number;
  ratingDistribution?: { 5: number; 4: number; 3: number; 2: number; 1: number };
  refundPolicy?: 'refundable' | 'non-refundable' | 'flexible' | 'moderate' | 'strict';
  slug?: string;
  description?: string;
  amenities?: string[];
  rules?: string[];
  status?: 'active' | 'inactive' | 'pending';
  checkInTime?: string;
  checkOutTime?: string;
}
// Legacy Booking structure (v1.1.1)
export interface LegacyBooking {
  id: string;
  campId: string;
  campTitle: string;
  campPhoto: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  totalPrice: number;
  userId: string;
  userName: string;
  userEmail: string;
  hostId: string;
  hostName: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'partially_refunded';
  createdAt: string;
}

/**
 * Safely convert Timestamp or string to ISO string
 */
function toISOString(value: string | Timestamp | Date | undefined): string {
  console.log('[ERR_COMPAT_002] Converting timestamp:', typeof value);
  
  try {
    if (!value) {
      console.log('[ERR_COMPAT_002] Value is undefined/null, using current date');
      return new Date().toISOString();
    }
    
    if (typeof value === 'string') {
      console.log('[ERR_COMPAT_002] Value is already a string:', value);
      return value;
    }
    
    if (value instanceof Date) {
      console.log('[ERR_COMPAT_002] Value is a Date object');
      return value.toISOString();
    }
    
    if (value && typeof value === 'object' && 'toDate' in value) {
      console.log('[ERR_COMPAT_002] Value is a Firestore Timestamp');
      return (value as Timestamp).toDate().toISOString();
    }
    
    console.warn('[ERR_COMPAT_002] Unknown timestamp format, using current date');
    return new Date().toISOString();
  } catch (error) {
    console.error('[ERR_COMPAT_002] Error converting timestamp:', error);
    console.error('[ERR_COMPAT_002] Value that caused error:', value);
    return new Date().toISOString();
  }
}

/**
 * Convert new Camp structure to legacy format for backward compatibility
 */
export function convertCampToLegacyFormat(camp: NewCamp): LegacyCamp {
  console.log('[ERR_COMPAT_003] Converting camp to legacy format:', camp.id);
  
  try {
    const legacyCamp: LegacyCamp = {
      id: camp.id,
      title: camp.title,
      photo: camp.images && camp.images.length > 0 ? camp.images[0] : '',
      price: camp.pricePerNight || 0,
      location: camp.location,
      tentConfiguration: {
        large: camp.tentConfig?.largeTents || 0,
        small: camp.tentConfig?.smallTents || 0,
        entertainment: camp.tentConfig?.entertainmentTents || 0
      },
      tents: (camp as unknown as { tents?: LegacyCamp['tents'] }).tents,
      maxGuests: camp.maxGuests,
      hostId: camp.hostId,
      hostName: camp.hostName,
      createdAt: toISOString(camp.createdAt),
      averageRating: camp.rating,
      reviewCount: camp.reviewCount,
      refundPolicy: camp.cancellationPolicy || 'refundable',
      slug: camp.id,
      description: camp.description,
      amenities: camp.amenities,
      rules: camp.rules,
      status: camp.status,
      checkInTime: camp.checkInTime,
      checkOutTime: camp.checkOutTime,
    };
    
    console.log('[ERR_COMPAT_003] Successfully converted camp:', camp.id);
    return legacyCamp;
  } catch (error) {
    console.error('[ERR_COMPAT_003] Error converting camp to legacy format:', error);
    console.error('[ERR_COMPAT_003] Camp data:', JSON.stringify(camp, null, 2));
    throw error;
  }
}

/**
 * Convert legacy Camp structure to new format
 */
export function convertLegacyCampToNewFormat(legacyCamp: LegacyCamp): Partial<NewCamp> {
  console.log('[ERR_COMPAT_003] Converting legacy camp to new format:', legacyCamp.id);
  
  try {
    const newCamp: Partial<NewCamp> = {
      id: legacyCamp.id,
      title: legacyCamp.title,
      images: legacyCamp.photo ? [legacyCamp.photo] : [],
      pricePerNight: legacyCamp.price || 0,
      location: legacyCamp.location,
      tentConfig: {
        largeTents: legacyCamp.tentConfiguration?.large || 0,
        smallTents: legacyCamp.tentConfiguration?.small || 0,
        entertainmentTents: legacyCamp.tentConfiguration?.entertainment || 0
      },
      pricing: {
        largeTent: legacyCamp.price || 0,
        smallTent: legacyCamp.price || 0,
        entertainmentTent: legacyCamp.price || 0
      },
      maxGuests: legacyCamp.maxGuests,
      hostId: legacyCamp.hostId,
      hostName: legacyCamp.hostName || '',
      description: legacyCamp.description || '',
      amenities: legacyCamp.amenities || [],
      rules: legacyCamp.rules || [],
      status: legacyCamp.status || 'active',
      rating: legacyCamp.averageRating,
      reviewCount: legacyCamp.reviewCount,
      cancellationPolicy: legacyCamp.refundPolicy === 'refundable' ? 'flexible' : 
                          legacyCamp.refundPolicy === 'non-refundable' ? 'strict' : 
                          (legacyCamp.refundPolicy as 'flexible' | 'moderate' | 'strict') || 'moderate',
      createdAt: legacyCamp.createdAt,
      checkInTime: legacyCamp.checkInTime,
      checkOutTime: legacyCamp.checkOutTime,
    };
    
    console.log('[ERR_COMPAT_003] Successfully converted legacy camp:', legacyCamp.id);
    return newCamp;
  } catch (error) {
    console.error('[ERR_COMPAT_003] Error converting legacy camp to new format:', error);
    console.error('[ERR_COMPAT_003] Legacy camp data:', JSON.stringify(legacyCamp, null, 2));
    throw error;
  }
}

/**
 * Convert new Booking structure to legacy format
 */
export function convertBookingToLegacyFormat(booking: NewBooking): LegacyBooking {
  console.log('[ERR_COMPAT_004] Converting booking to legacy format:', booking.id);
  
  try {
    const legacyBooking: LegacyBooking = {
      id: booking.id,
      campId: booking.campId,
      campTitle: booking.campTitle,
      campPhoto: booking.campImages && booking.campImages.length > 0 ? booking.campImages[0] : '',
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      guests: booking.guests,
      totalPrice: booking.totalPrice,
      userId: booking.userId,
      userName: booking.userName,
      userEmail: booking.userEmail,
      hostId: booking.hostId,
      hostName: booking.hostName,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      createdAt: toISOString(booking.createdAt)
    };
    
    console.log('[ERR_COMPAT_004] Successfully converted booking:', booking.id);
    return legacyBooking;
  } catch (error) {
    console.error('[ERR_COMPAT_004] Error converting booking to legacy format:', error);
    console.error('[ERR_COMPAT_004] Booking data:', JSON.stringify(booking, null, 2));
    throw error;
  }
}

/**
 * Detect if a camp object is using legacy or new structure
 * Updated to handle BOTH field name formats
 */
export function isLegacyCamp(camp: LegacyCamp | NewCamp): camp is LegacyCamp {
  // Check for legacy format: has 'photo' OR 'price' OR 'tentConfiguration'
  const hasLegacyPhoto = 'photo' in camp && typeof camp.photo === 'string';
  const hasLegacyPrice = 'price' in camp && typeof camp.price === 'number';
  const hasLegacyTentConfig = 'tentConfiguration' in camp;
  
  // If it has any legacy field and doesn't have corresponding new fields, it's legacy
  if (hasLegacyPhoto || hasLegacyPrice || hasLegacyTentConfig) {
    const hasNewImages = 'images' in camp && Array.isArray(camp.images);
    const hasNewPrice = 'pricePerNight' in camp;
    const hasNewTentConfig = 'tentConfig' in camp;
    
    // If it has legacy fields but not new fields, it's legacy
    if (!hasNewImages && !hasNewPrice && !hasNewTentConfig) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detect if a camp object is using new structure
 * Updated to handle BOTH field name formats
 */
export function isNewCamp(camp: LegacyCamp | NewCamp): camp is NewCamp {
  // Check for new format: has 'images' OR 'pricePerNight' OR 'tentConfig'
  const hasNewImages = 'images' in camp && Array.isArray(camp.images);
  const hasNewPrice = 'pricePerNight' in camp && typeof camp.pricePerNight === 'number';
  const hasNewTentConfig = 'tentConfig' in camp;
  
  // If it has any new field, it's new format
  return hasNewImages || hasNewPrice || hasNewTentConfig;
}

/**
 * Normalize camp data to legacy format regardless of source structure
 * Updated to handle BOTH field name formats from database
 */
export function normalizeCampToLegacy(camp: LegacyCamp | NewCamp | Partial<LegacyCamp & NewCamp>): LegacyCamp {
  console.log('[ERR_COMPAT_001] Normalizing camp to legacy format');
  
  const campWithId = camp as { id?: string };
  console.log('[ERR_COMPAT_001] Camp ID:', campWithId.id);
  console.log('[ERR_COMPAT_001] Camp structure check:', {
    hasPhoto: 'photo' in camp,
    hasImages: 'images' in camp,
    hasPrice: 'price' in camp,
    hasPricePerNight: 'pricePerNight' in camp,
    hasTentConfiguration: 'tentConfiguration' in camp,
    hasTentConfig: 'tentConfig' in camp
  });
  
  try {
    // Check if it's already in legacy format
    if (isLegacyCamp(camp) && !isNewCamp(camp)) {
      console.log('[ERR_COMPAT_001] Camp is already in legacy format');
      return camp as LegacyCamp;
    }
    
    // Check if it's in new format
    if (isNewCamp(camp) && !isLegacyCamp(camp)) {
      console.log('[ERR_COMPAT_001] Camp is in new format, converting...');
      return convertCampToLegacyFormat(camp as NewCamp);
    }
    
    // Handle mixed or partial structure (database has old field names)
    console.log('[ERR_COMPAT_001] Camp has partial/mixed structure, normalizing...');
    const partialCamp = camp as Partial<LegacyCamp & NewCamp>;
    
    // Determine photo: prefer 'photo' field, fallback to first image
    let photo = '';
    if (partialCamp.photo && typeof partialCamp.photo === 'string') {
      photo = partialCamp.photo;
    } else if (partialCamp.images && Array.isArray(partialCamp.images) && partialCamp.images.length > 0) {
      photo = partialCamp.images[0];
    }
    
    // Determine price: prefer 'price' field, fallback to 'pricePerNight'
    let price = 0;
    if (typeof partialCamp.price === 'number') {
      price = partialCamp.price;
    } else if (typeof partialCamp.pricePerNight === 'number') {
      price = partialCamp.pricePerNight;
    }
    
    // Determine tent configuration: prefer 'tentConfiguration', fallback to 'tentConfig'
    let tentConfiguration = { large: 0, small: 0, entertainment: 0 };
    if (partialCamp.tentConfiguration) {
      tentConfiguration = {
        large: partialCamp.tentConfiguration.large || 0,
        small: partialCamp.tentConfiguration.small || 0,
        entertainment: partialCamp.tentConfiguration.entertainment || 0
      };
    } else if (partialCamp.tentConfig) {
      tentConfiguration = {
        large: partialCamp.tentConfig.largeTents || 0,
        small: partialCamp.tentConfig.smallTents || 0,
        entertainment: partialCamp.tentConfig.entertainmentTents || 0
      };
    }
    
    const normalized: LegacyCamp = {
      id: partialCamp.id || '',
      title: partialCamp.title || 'Untitled Camp',
      photo: photo,
      price: price,
      location: partialCamp.location || '',
      tentConfiguration: tentConfiguration,
      maxGuests: partialCamp.maxGuests || 0,
      hostId: partialCamp.hostId || '',
      hostName: partialCamp.hostName || '',
      createdAt: toISOString(partialCamp.createdAt),
      averageRating: partialCamp.averageRating || partialCamp.rating,
      reviewCount: partialCamp.reviewCount,
      refundPolicy: partialCamp.refundPolicy || partialCamp.cancellationPolicy || 'refundable',
      slug: partialCamp.slug || partialCamp.id,
      description: partialCamp.description,
      amenities: partialCamp.amenities,
      rules: partialCamp.rules,
      status: partialCamp.status,
      checkInTime: partialCamp.checkInTime,
      checkOutTime: partialCamp.checkOutTime,
    };
    
    console.log('[ERR_COMPAT_001] Successfully normalized partial camp');
    console.log('[ERR_COMPAT_001] Normalized data:', {
      id: normalized.id,
      photo: normalized.photo,
      price: normalized.price,
      tentConfiguration: normalized.tentConfiguration
    });
    
    return normalized;
  } catch (error) {
    console.error('[ERR_COMPAT_001] Error normalizing camp to legacy format:', error);
    console.error('[ERR_COMPAT_001] Camp data:', JSON.stringify(camp, null, 2));
    console.error('[ERR_COMPAT_001] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

/**
 * Normalize booking data to legacy format regardless of source structure
 */
export function normalizeBookingToLegacy(booking: LegacyBooking | NewBooking | Partial<LegacyBooking & NewBooking>): LegacyBooking {
  console.log('[ERR_COMPAT_004] Normalizing booking to legacy format');
  
  const bookingWithId = booking as { id?: string };
  console.log('[ERR_COMPAT_004] Booking ID:', bookingWithId.id);
  
  try {
    const partialBooking = booking as Partial<LegacyBooking & NewBooking>;
    
    const normalized: LegacyBooking = {
      id: partialBooking.id || '',
      campId: partialBooking.campId || '',
      campTitle: partialBooking.campTitle || '',
      campPhoto: partialBooking.campPhoto || (partialBooking.campImages && partialBooking.campImages[0]) || '',
      checkInDate: partialBooking.checkInDate || '',
      checkOutDate: partialBooking.checkOutDate || '',
      guests: partialBooking.guests || 0,
      totalPrice: partialBooking.totalPrice || 0,
      userId: partialBooking.userId || '',
      userName: partialBooking.userName || '',
      userEmail: partialBooking.userEmail || '',
      hostId: partialBooking.hostId || '',
      hostName: partialBooking.hostName || '',
      status: partialBooking.status || 'pending',
      paymentStatus: partialBooking.paymentStatus || 'pending',
      createdAt: toISOString(partialBooking.createdAt)
    };
    
    console.log('[ERR_COMPAT_004] Successfully normalized booking');
    return normalized;
  } catch (error) {
    console.error('[ERR_COMPAT_004] Error normalizing booking to legacy format:', error);
    console.error('[ERR_COMPAT_004] Booking data:', JSON.stringify(booking, null, 2));
    console.error('[ERR_COMPAT_004] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}
