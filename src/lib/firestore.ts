import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
  DocumentSnapshot,
  writeBatch,
  increment,
  FieldValue,
  setDoc,
  runTransaction,
  deleteField,
  arrayUnion,
  arrayRemove,
  onSnapshot,
} from 'firebase/firestore';

export interface Camp {
  id: string;
  hostId: string;
  hostName: string;
  hostEmail?: string;
  hostPhone?: string;
  title: string;
  description: string;
  location: string;
  pricePerNight: number;
  weekendPrice?: number;
  holidayPrice?: number;
  maxGuests: number;
  images: string[];
  amenities: string[];
  rules: string[];
  status: 'active' | 'inactive' | 'pending';
  rating?: number;
  reviewCount?: number;
  lastReviewId?: string;
  createdAt: string | Timestamp;
  updatedAt?: string;
  featured?: boolean;
  instantBook?: boolean;
  minimumStay?: number;
  checkInTime?: string;
  checkOutTime?: string;
  cancellationPolicy?: 'flexible' | 'moderate' | 'strict';
  
  // Listing type - NEW
  listingType?: 'camp' | 'kashta';
  
  // Tent configuration (for camps)
  tentConfig: {
    largeTents: number;
    smallTents: number;
    entertainmentTents: number;
  };
  
  // Pricing per tent type (for camps)
  pricing: {
    largeTent: number;
    smallTent: number;
    entertainmentTent: number;
  };
  
  // Kashta-specific fields - NEW
  seatingCapacity?: number;
  beachfrontAccess?: boolean;
  shadeType?: 'tent' | 'umbrella' | 'pergola' | 'natural';
  viewType?: 'sea' | 'beach' | 'mixed';
  waterActivities?: string[];
  
  // Availability
  availability?: {
    startDate: string;
    endDate: string;
  };
  
  // Location details
  coordinates?: {
    lat: number;
    lng: number;
  };
  
  // Additional metadata
  views?: number;
  bookingCount?: number;
  responseTime?: string;
  responseRate?: number;
  
  // Admin fields
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  verificationNotes?: string;
  flagged?: boolean;
  flagReason?: string;
}

export interface TentConfig {
  largeTents: number;
  smallTents: number;
  entertainmentTents: number;
}

export interface TentSelection {
  large: number;
  small: number;
  entertainment: number;
}

export interface Booking {
  id: string;
  campId: string;
  campTitle: string;
  campLocation: string;
  campImages: string[];
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  hostId: string;
  hostName: string;
  hostEmail: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'pending_verification' | 'refunded' | 'partially_refunded' | 'cash_collected';
  collectedAt?: string;
  paymentMethod?: 'card' | 'apple_pay' | 'google_pay' | 'cash_on_arrival';
  paymentIntentId?: string;
  createdAt: string | Timestamp;
  updatedAt?: string;
  specialRequests?: string;
  
  // Tent selection
  tentSelection: TentSelection;
  
  // Pricing breakdown
  priceBreakdown: {
    basePrice: number;
    largeTentPrice: number;
    smallTentPrice: number;
    entertainmentTentPrice: number;
    serviceFee: number;
    tax: number;
    total: number;
  };
  
  // Cancellation details
  cancellationPolicy?: 'flexible' | 'moderate' | 'strict';
  cancelledAt?: string;
  cancelledBy?: 'guest' | 'host' | 'admin';
  cancellationReason?: string;
  cancellationId?: string;
  refundId?: string;
  refundAmount?: number;
  /** Refund tracking written by the server cancellation endpoint. */
  refundStatus?: 'pending' | 'processing' | 'refunded' | 'not_applicable';
  tapRefundId?: string;
  
  // Review status
  reviewSubmitted?: boolean;
  reviewId?: string;

  // Payment tracking
  checkIn?: string;      // display time string (e.g. "15:00")
  checkOut?: string;     // display time string
  arrivalTime?: string;
  authStatus?: string;
  failureReason?: string;
  tapChargeId?: string;
  /** Online-payment hold deadline (ms epoch); unpaid bookings past this are expired. */
  expiresAt?: number;
}

export interface Transaction {
  id: string;
  bookingId: string;
  userId: string;
  campId: string;
  hostId: string;
  
  // Transaction details
  type: 'payment' | 'refund';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: number;
  currency: string;
  
  // Stripe information
  stripePaymentIntentId?: string;
  stripeRefundId?: string;
  stripeChargeId?: string;
  
  // Payment method details
  paymentMethod: 'card' | 'apple_pay' | 'google_pay';
  cardLast4?: string;
  cardBrand?: string;
  
  // Metadata
  description: string;
  failureReason?: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  
  // Audit trail
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface Review {
  id: string;
  campId: string;
  userId: string;
  bookingId?: string; // Made optional
  rating: number;
  reviewText: string;
  userName: string;
  userPhoto?: string;
  checkInDate: string;
  checkOutDate: string;
  createdAt: string | Timestamp;
  updatedAt?: string;
  helpful: number;
  helpfulVoters: string[];
  reported: boolean;
  verified: boolean;
  flagged?: boolean;
  flagReason?: string;
  adminResponse?: string;
}

export interface UserProfile {
  id: string;

  email: string;

  displayName?: string;

  phone?: string;

  bio?: string;

  photoURL?: string;
  // Role flags are set server-side (admin only) and absent on new profiles.
  // Treat missing values as false everywhere: userData?.isHost ?? false.

  isHost?: boolean;

  isAdmin?: boolean;

  isSeller?: boolean;

  status?: 'active' | 'suspended';

  createdAt: string | Timestamp;

  lastLoginAt?: string;

  totalBookings?: number;

  totalSpent?: number;
  /** ISO timestamp of the last time the host visited their Reviews dashboard tab. */

  lastReviewsVisitAt?: string;
}

// UPDATED: Changed from dateRange to bookingDate for single-day bookings
export interface FilterState {
  priceRange: [number, number];
  locations: string[];
  minGuests: number;
  amenities: string[];
  tentTypes: ('large' | 'small' | 'entertainment')[];
  minRating: number;
  sortBy: 'price_asc' | 'price_desc' | 'rating' | 'newest';
  bookingDate?: Date;  // Changed from dateRange to single bookingDate
  listingType?: 'all' | 'camp' | 'kashta';  // NEW
}

// Admin Statistics Interface
export interface AdminStats {
  totalUsers: number;
  totalHosts: number;
  totalCamps: number;
  activeCamps: number;
  pendingCamps: number;
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalReviews: number;
  averageRating: number;
}

export interface RecentActivity {
  id: string;
  type: 'user' | 'camp' | 'booking' | 'review';
  message: string;
  time: string;
  timestamp: Date;
}

// Refund Interface
export interface Refund {
  id: string;
  bookingId: string;
  userId: string;
  campId: string;
  hostId: string;
  cancellationId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  refundMethod: 'original_payment' | 'bank_transfer' | 'other';
  stripeRefundId?: string;
  reason: string;
  adminNotes?: string;
  createdAt: Timestamp | string;
  processedAt?: Timestamp | string;
  completedAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export interface RefundRecord {
  id: string;
  bookingId: string;
  /** Firebase UID of the guest (stored as `userId` by the server). */
  guestId: string;
  campId?: string;
  /** Refund amount in BHD (stored as `refundAmountBHD` by the server). */
  amount: number;
  /**
   * Normalised status:
   *  server `refunded`          → `completed`
   *  server `failed_will_retry` → `failed`
   *  `not_applicable`           kept as-is
   */
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'not_applicable';
  initiatedAt: string | { toDate: () => Date };
  completedAt?: string | { toDate: () => Date };
  failureReason?: string;
  adminNotes?: string;
  tapRefundId?: string;
  tapChargeId?: string;
}
export interface HostPenalty {
  id: string;
  bookingId: string;
  hostId: string;
  penaltyAmount: number;
  penaltyPercentage: number;
  reason: string;
  appliedAt: Timestamp | string;
  cancellationId: string;
  createdAt: Timestamp | string;
}

// Blocked Date Interface
export interface BlockedDate {
  id: string;
  campId: string;
  hostId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  createdAt: Timestamp | string;
}

// Site Settings Interface
export interface SiteSettings {
  siteName: string;
  supportEmail: string;
  supportPhone: string;
  currency: string;
  language: string;
  timezone: string;
  updatedAt: string | Timestamp;
  updatedBy: string;
}

// Test Firestore connection
export const testFirestoreConnection = async (): Promise<{
  configured: boolean;
  canRead: boolean;
  canWrite: boolean;
  error?: string;
}> => {
  console.log('=== FIRESTORE CONNECTION TEST ===');
  
  const result = {
    configured: db !== undefined && db !== null,
    canRead: false,
    canWrite: false,
    error: undefined as string | undefined
  };

  if (!result.configured) {
    result.error = 'Firestore is not configured';
    console.log('❌ Firestore not configured');
    return result;
  }

  try {
    // Test read
    const testCollection = collection(db, 'camps');
    const testQuery = query(testCollection, limit(1));
    await getDocs(testQuery);
    result.canRead = true;
    console.log('✅ Read test passed');

    // Test write
    const testDoc = doc(collection(db, '_test'));
    await updateDoc(testDoc, { test: true }).catch(() => {
      // Document might not exist, which is fine for testing
    });
    result.canWrite = true;
    console.log('✅ Write test passed');

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Connection test failed:', error);
  }

  return result;
};

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
let app: FirebaseApp | undefined;
let db: ReturnType<typeof getFirestore> | undefined;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('✅ Firebase initialized successfully');
  } else {
    app = getApps()[0];
    db = getFirestore(app);
    console.log('✅ Using existing Firebase instance');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}

// Auth handle for authenticated API calls (booking cancellation, etc.).
const auth = app ? getAuth(app) : undefined;

export { db };

// Helper function to convert Firestore timestamp to string
const timestampToString = (timestamp: Timestamp | string | undefined): string => {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return timestamp;
  return timestamp.toDate().toISOString();
};

// Helper function to normalize and convert document data
// Handles BOTH old field names (photo, price, tentConfiguration) and new field names (images, pricePerNight, tentConfig)
const convertDocData = <T>(doc: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): T => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');
  
  console.log(`[ERR_FIRESTORE_NORMALIZE] Converting document ${doc.id}`);
  console.log(`[ERR_FIRESTORE_NORMALIZE] Raw data fields:`, Object.keys(data));
  
  // Normalize field names for Camp documents
  const normalized: Record<string, unknown> = {
    id: doc.id,
    ...data,
    createdAt: data.createdAt ? timestampToString(data.createdAt) : new Date().toISOString(),
    updatedAt: data.updatedAt ? timestampToString(data.updatedAt) : undefined,
  };
  
  // Handle listingType - default to 'camp' if not specified
  if (!('listingType' in data)) {
    normalized.listingType = 'camp';
  }
  
  // Handle photo -> images conversion
  if ('photo' in data && !('images' in data)) {
    console.log(`[ERR_FIRESTORE_NORMALIZE] Converting 'photo' to 'images'`);
    normalized.images = data.photo ? [data.photo] : [];
    delete normalized.photo;
  } else if (!('images' in data)) {
    normalized.images = [];
  }
  
  // Handle price -> pricePerNight conversion
  if ('price' in data && !('pricePerNight' in data)) {
    console.log(`[ERR_FIRESTORE_NORMALIZE] Converting 'price' to 'pricePerNight'`);
    normalized.pricePerNight = data.price || 0;
    delete normalized.price;
  } else if (!('pricePerNight' in data)) {
    normalized.pricePerNight = 0;
  }
  
  // Peak-night pricing (optional) — coerce with Number(...) when present and
  // drop the field entirely when it isn't a positive number.
  const weekendPriceNum = Number(data.weekendPrice);
  if ('weekendPrice' in data && isFinite(weekendPriceNum) && weekendPriceNum > 0) {
    normalized.weekendPrice = weekendPriceNum;
  } else {
    delete normalized.weekendPrice;
  }
  const holidayPriceNum = Number(data.holidayPrice);
  if ('holidayPrice' in data && isFinite(holidayPriceNum) && holidayPriceNum > 0) {
    normalized.holidayPrice = holidayPriceNum;
  } else {
    delete normalized.holidayPrice;
  }
  
  // Handle tentConfiguration -> tentConfig conversion
  if ('tentConfiguration' in data && !('tentConfig' in data)) {
    console.log(`[ERR_FIRESTORE_NORMALIZE] Converting 'tentConfiguration' to 'tentConfig'`);
    const tentConfiguration = data.tentConfiguration || {};
    normalized.tentConfig = {
      largeTents: tentConfiguration.large || 0,
      smallTents: tentConfiguration.small || 0,
      entertainmentTents: tentConfiguration.entertainment || 0
    };
    delete normalized.tentConfiguration;
  } else if (!('tentConfig' in data)) {
    normalized.tentConfig = {
      largeTents: 0,
      smallTents: 0,
      entertainmentTents: 0
    };
  }
  
  // Ensure pricing object exists
  if (!('pricing' in data)) {
    const basePrice = normalized.pricePerNight || 0;
    normalized.pricing = {
      largeTent: basePrice,
      smallTent: basePrice,
      entertainmentTent: basePrice
    };
  }
  
  // Ensure required arrays exist
  if (!normalized.amenities) normalized.amenities = [];
  if (!normalized.rules) normalized.rules = [];
  
  // Ensure required fields exist
  if (!normalized.description) normalized.description = '';
  if (!normalized.status) normalized.status = 'active';
  
  console.log(`[ERR_FIRESTORE_NORMALIZE] Normalized data for ${doc.id}:`, {
    hasImages: !!normalized.images,
    hasPricePerNight: !!normalized.pricePerNight,
    hasTentConfig: !!normalized.tentConfig,
    listingType: normalized.listingType,
    images: normalized.images,
    pricePerNight: normalized.pricePerNight,
    tentConfig: normalized.tentConfig
  });
  
  return normalized as T;
};

// Site Settings Operations
export const getSiteSettings = async (): Promise<SiteSettings | null> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const settingsDoc = doc(db, 'settings', 'general');
    const snapshot = await getDoc(settingsDoc);
    
    if (!snapshot.exists()) {
      console.log('No site settings found, returning default values');
      return null;
    }
    
    const data = snapshot.data();
    return {
      siteName: data.siteName || 'Sahra',
      supportEmail: data.supportEmail || 'support@sahra.com',
      supportPhone: data.supportPhone || '+973 XXXX XXXX',
      currency: data.currency || 'BHD',
      language: data.language || 'en',
      timezone: data.timezone || 'Asia/Bahrain',
      updatedAt: data.updatedAt ? timestampToString(data.updatedAt) : new Date().toISOString(),
      updatedBy: data.updatedBy || 'system'
    };
  } catch (error) {
    console.error('Error fetching site settings:', error);
    throw error;
  }
};

export const updateSiteSettings = async (settings: Omit<SiteSettings, 'updatedAt' | 'updatedBy'>, userId: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const settingsDoc = doc(db, 'settings', 'general');
    await setDoc(settingsDoc, {
      ...settings,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    }, { merge: true });
    
    console.log('✅ Site settings updated successfully');
  } catch (error) {
    console.error('❌ Error updating site settings:', error);
    throw error;
  }
};

// CRUD Operations for Camps
export const createCamp = async (campData: Omit<Camp, 'id' | 'createdAt'>, hostId: string): Promise<string> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const campsCollection = collection(db, 'camps');
  const docRef = await addDoc(campsCollection, {
    ...campData,
    hostId,
    createdAt: serverTimestamp(),
    status: campData.status || 'pending',
    listingType: campData.listingType || 'camp',  // Default to 'camp'
    rating: 0,
    reviewCount: 0,
    views: 0,
    bookingCount: 0
  });

  // Send "listing submitted" email to host (best-effort; the server derives
  // the recipient from the camp record and renders the template itself)
  try {
    const emailModule = await import('./emailService');
    await emailModule.sendListingPendingEmail(docRef.id);
    console.log('✅ Listing submission email sent to host');
  } catch (emailError) {
    console.error('❌ Failed to send listing submission email:', emailError);
  }
  
  return docRef.id;
};

export const getCamps = async (): Promise<Camp[]> => {
  console.log('=== [ERR_FIRESTORE_005] getCamps() START ===');
  
  if (!db) {
    console.error('[ERR_FIRESTORE_005] Firestore is not initialized');
    throw new Error('[ERR_FIRESTORE_005] Firestore is not initialized');
  }
  
  try {
    console.log('[ERR_FIRESTORE_005] Creating query for active camps');
    const campsCollection = collection(db, 'camps');
    const campsQuery = query(campsCollection, where('status', '==', 'active'));
    
    console.log('[ERR_FIRESTORE_005] Executing query...');
    const snapshot = await getDocs(campsQuery);
    
    console.log(`[ERR_FIRESTORE_005] Query returned ${snapshot.docs.length} documents`);
    
    const camps = snapshot.docs.map((doc, index) => {
      try {
        console.log(`[ERR_FIRESTORE_005] Converting document ${index + 1}/${snapshot.docs.length}: ${doc.id}`);
        return convertDocData<Camp>(doc);
      } catch (error) {
        console.error(`[ERR_FIRESTORE_005] Failed to convert document ${doc.id}:`, error);
        throw error;
      }
    });
    
    console.log(`[ERR_FIRESTORE_005] Successfully converted ${camps.length} camps`);
    return camps;
  } catch (error) {
    console.error('[ERR_FIRESTORE_005] Error in getCamps():', error);
    console.error('[ERR_FIRESTORE_005] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
};

export const getCampById = async (campId: string): Promise<Camp | null> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const campDoc = doc(db, 'camps', campId);
  const snapshot = await getDoc(campDoc);
  
  if (!snapshot.exists()) return null;
  
  return convertDocData<Camp>(snapshot);
};

export const updateCamp = async (campId: string, updates: Partial<Camp>): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const campDoc = doc(db, 'camps', campId);
  const previousSnapshot = await getDoc(campDoc);
  const previousData = previousSnapshot.exists() ? previousSnapshot.data() : null;
  const previousStatus = previousData?.status;

  await updateDoc(campDoc, {
    ...updates,
    updatedAt: new Date().toISOString()
  });

  // Notify host when listing is approved/activated (recipient + template are
  // handled server-side from the camp record)
  if (updates.status === 'active' && previousStatus !== 'active') {
    try {
      const emailModule = await import('./emailService');
      await emailModule.sendListingApprovalEmail(campId);
      console.log('✅ Listing approval email sent to host');
    } catch (emailError) {
      console.error('❌ Failed to send listing approval email:', emailError);
    }
  }
};

export const deleteCamp = async (campId: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');

  // Block deletion if any active (pending or confirmed) bookings exist for
  // this camp (Audit v4 H-4): deleting a camp with live bookings strands
  // guests and destroys records needed for refunds.
  const activeBookingsSnap = await getDocs(
    query(
      collection(db, 'bookings'),
      where('campId', '==', campId),
      where('status', 'in', ['pending', 'confirmed']),
    )
  );
  if (!activeBookingsSnap.empty) {
    throw new Error('Cannot delete a listing that has active bookings. Cancel or complete all bookings first.');
  }

  const campDoc = doc(db, 'camps', campId);
  await deleteDoc(campDoc);
};

// Get camps by host
export const getCampsByHost = async (hostId: string): Promise<Camp[]> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const campsCollection = collection(db, 'camps');
  const campsQuery = query(campsCollection, where('hostId', '==', hostId));
  const snapshot = await getDocs(campsQuery);
  
  return snapshot.docs.map(doc => convertDocData<Camp>(doc));
};

// Thrown when the requested camp+date was taken by a concurrent booking
export class DateUnavailableError extends Error {
  code = 'date-unavailable' as const;
  constructor(message = 'This date has just been booked by someone else') {
    super(message);
    this.name = 'DateUnavailableError';
  }
}

/**
 * Atomically create a booking while claiming a deterministic availability
 * lock document (one doc per camp+date). Two concurrent attempts for the
 * same camp/date will both try to write `availabilityLocks/{campId}_{date}`;
 * Firestore's transaction guarantees only one succeeds — the other gets a
 * DateUnavailableError instead of proceeding to payment.
 *
 * A lock pointing at a cancelled booking is treated as free and reclaimed.
 */
export const createBookingWithLock = async (
  bookingData: Omit<Booking, 'id' | 'createdAt'> | Record<string, unknown>,
  campId: string,
  dateString: string
): Promise<string> => {
  if (!db) throw new Error('Firestore is not initialized');
  const database = db;

  const lockRef = doc(database, 'availabilityLocks', `${campId}_${dateString}`);
  const bookingRef = doc(collection(database, 'bookings'));

  // Expired online-payment bookings are self-cancelled by their owner in the
  // payment retry flow (startTapPayment / Reserve), which the booking owner is
  // always permitted to do. A server-side scheduled job handles the
  // never-returning-guest edge case. The Firestore rules file also contains a
  // ready-to-deploy expiry condition for the availabilityLocks update rule.
  return runTransaction(database, async (tx) => {
    const lockSnap = await tx.get(lockRef);

    if (lockSnap.exists()) {
      const existingBookingId = lockSnap.data()?.bookingId as string | undefined;
      if (!existingBookingId) {
        throw new DateUnavailableError();
      }
      // Lock exists — reclaim if the booking is cancelled OR if it is an
      // expired online-payment pending (payment window has passed).  Reading the
      // booking inside the same transaction makes the reclaim atomic: no other
      // writer can sneak in between the read and the lock overwrite.
      const existingBookingSnap = await tx.get(doc(database, 'bookings', existingBookingId));
      const existingData = existingBookingSnap.data() as Record<string, unknown> | undefined;
      const isExpiredPendingOnline =
        existingData?.status === 'pending' &&
        existingData?.paymentMethod !== 'cash_on_arrival' &&
        typeof existingData?.expiresAt === 'number' &&
        (existingData.expiresAt as number) < Date.now();
      if (existingBookingSnap.exists() && existingData?.status !== 'cancelled' && !isExpiredPendingOnline) {
        throw new DateUnavailableError();
      }
    }

    tx.set(lockRef, {
      campId,
      date: dateString,
      bookingId: bookingRef.id,
      createdAt: serverTimestamp(),
    });

    const isOnlinePayment = (bookingData as Record<string, unknown>).paymentMethod === 'online';
    const expiresAt = isOnlinePayment ? Date.now() + 30 * 60 * 1000 : undefined;

    tx.set(bookingRef, {
      ...bookingData,
      ...(expiresAt !== undefined ? { expiresAt } : {}),
      createdAt: serverTimestamp(),
      status: (bookingData as { status?: string }).status || 'pending',
      paymentStatus: (bookingData as { paymentStatus?: string }).paymentStatus || 'pending',
    });

    // Maintain the public availability index so guests can filter by date
    // without needing to read private bookings.  One doc per booked date so
    // the rule can verify this write is part of the same lock+booking transaction.
    // For online-payment bookings we embed expiresAt and paymentMethod directly so
    // the availability check can treat expired pending slots as released without
    // reading the private availabilityLocks or bookings collections.
    const dateDocRef = doc(database, 'campAvailability', campId, 'dates', dateString);
    tx.set(dateDocRef, {
      campId,
      date: dateString,
      // bookingId lets the cancellation path verify that it is deleting its own
      // index entry and not one written by a newer booking that reclaimed this slot.
      bookingId: bookingRef.id,
      bookedAt: serverTimestamp(),
      ...(expiresAt !== undefined ? { paymentMethod: 'online', expiresAt } : {}),
    });

    return bookingRef.id;
  });
};

/**
 * Returns all booked dates for a camp from the public campAvailability index.
 * This collection has `allow read: if true` in Firestore rules, so it works
 * for signed-out guests and guests who cannot read other users' bookings.
 * Expired online-payment pending slots (30-min window elapsed) are excluded.
 *
 * Throws on any Firestore read failure so callers can surface a visible error
 * state rather than silently treating all dates as available (fail-open).
 */
export const getCampBookedDatesFromIndex = async (campId: string): Promise<Date[]> => {
  if (!db) throw new Error('Firestore is not initialized');
  const datesSnap = await getDocs(collection(db, 'campAvailability', campId, 'dates'));
  const now = Date.now();
  const dates: Date[] = [];
  datesSnap.forEach(docSnap => {
    const data = docSnap.data() as Record<string, unknown>;
    // Skip expired online-payment pending slots — same expiry logic as createBookingWithLock
    if (
      data.paymentMethod === 'online' &&
      typeof data.expiresAt === 'number' &&
      (data.expiresAt as number) < now
    ) {
      return;
    }
    // Doc id is the YYYY-MM-DD date string used as the index key
    const parts = docSnap.id.split('-').map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      dates.push(new Date(parts[0], parts[1] - 1, parts[2]));
    }
  });
  return dates;
};
export const getBookings = async (): Promise<Booking[]> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const bookingsCollection = collection(db, 'bookings');
  const snapshot = await getDocs(bookingsCollection);
  
  return snapshot.docs.map(doc => convertDocData<Booking>(doc));
};

export const getBookingById = async (bookingId: string): Promise<Booking | null> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const bookingDoc = doc(db, 'bookings', bookingId);
  const snapshot = await getDoc(bookingDoc);
  
  if (!snapshot.exists()) return null;
  
  return convertDocData<Booking>(snapshot);
};

// Narrowed from the old generic updateBooking(Partial<Booking>) side door.
// Only an admin can use this direct status helper. Guest cancellation, host
// acceptance/decline, cash collection, and refunds all go through authenticated
// API routes; non-admin rules permit only the constrained payment-verification
// write below.
export const updateBookingStatus = async (
  bookingId: string,
  status: 'pending' | 'confirmed' | 'cancelled',
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');

  const bookingDoc = doc(db, 'bookings', bookingId);
  await updateDoc(bookingDoc, {
    status,
    updatedAt: new Date().toISOString(),
  });
};

// Check if a user already has a booking on a specific date (excluding cancelled)
export const hasUserBookingOnDate = async (userId: string, dateString: string): Promise<boolean> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const bookingsCollection = collection(db, 'bookings');
  const bookingsQuery = query(
    bookingsCollection,
    where('userId', '==', userId),
    where('checkInDate', '==', dateString)
  );
  const snapshot = await getDocs(bookingsQuery);
  
  return snapshot.docs.some(doc => {
    const data = doc.data() as Booking;
    return data.status !== 'cancelled';
  });
};

// Get bookings by user
export const getBookingsByUser = async (userId: string): Promise<Booking[]> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const bookingsCollection = collection(db, 'bookings');
  const bookingsQuery = query(
    bookingsCollection,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(bookingsQuery);
  
  return snapshot.docs.map(doc => convertDocData<Booking>(doc));
};

// Get bookings by host
export const getBookingsByHost = async (hostId: string): Promise<Booking[]> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const bookingsCollection = collection(db, 'bookings');
  const bookingsQuery = query(
    bookingsCollection,
    where('hostId', '==', hostId)
  );
  const snapshot = await getDocs(bookingsQuery);
  
  const bookings = snapshot.docs.map(doc => convertDocData<Booking>(doc));
  bookings.sort((a, b) => {
    const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt.toDate();
    const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt.toDate();
    return dateB.getTime() - dateA.getTime();
  });
  return bookings;
};

// Get bookings by camp - FIXED: Removed orderBy to avoid composite index requirement
export const getBookingsByCamp = async (campId: string): Promise<Booking[]> => {
  console.log('=== GET BOOKINGS BY CAMP ===');
  console.log('Camp ID:', campId);
  
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const bookingsCollection = collection(db, 'bookings');
    // Removed orderBy('createdAt', 'desc') to avoid composite index requirement
    const bookingsQuery = query(
      bookingsCollection,
      where('campId', '==', campId)
    );
    const snapshot = await getDocs(bookingsQuery);
    
    // Convert and sort client-side
    const bookings = snapshot.docs.map(doc => convertDocData<Booking>(doc));
    
    // Sort by createdAt descending (newest first) in JavaScript
    bookings.sort((a, b) => {
      const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt.toDate();
      const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt.toDate();
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log(`✅ Fetched and sorted ${bookings.length} bookings for camp ${campId}`);
    return bookings;
  } catch (error) {
    console.error('❌ Error fetching bookings by camp:', error);
    throw error;
  }
};

// Recalculate a camp's rating/reviewCount from its actual reviews and write
// the aggregates onto the camp document. NOTE: Firestore rules only allow the
// camp's host or an admin to perform this write; for other users it will be
// denied (callers catch and tolerate that).
export const recalculateCampRating = async (campId: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const reviewsQuery = query(
    collection(db, 'reviews'),
    where('campId', '==', campId)
  );
  const snapshot = await getDocs(reviewsQuery);
  
  const ratings = snapshot.docs
    .map(d => d.data().rating)
    .filter((r): r is number => typeof r === 'number');
  
  const reviewCount = ratings.length;
  const rating = reviewCount > 0
    ? ratings.reduce((sum, r) => sum + r, 0) / reviewCount
    : 0;
  
  await updateDoc(doc(db, 'camps', campId), { rating, reviewCount });
};

// One-off backfill: recalculate rating/reviewCount for EVERY camp from the
// reviews collection. Only drifted camps are written (Firestore rules require
// the caller to be an admin, or the host of each written camp).
export interface RatingBackfillResult {
  checked: number;
  updated: number;
  failed: { campId: string; title?: string; error: string }[];
}

// A camp whose stored rating/reviewCount no longer matches its actual reviews.
export interface CampRatingDrift {
  campId: string;
  title?: string;
  storedRating: number;
  storedReviewCount: number;
  actualRating: number;
  actualReviewCount: number;
}

export interface RatingDriftReport {
  checked: number;
  drifted: CampRatingDrift[];
}

// Read-only drift check: compares every camp's stored rating/reviewCount
// against an aggregate recomputed from the reviews collection, WITHOUT
// writing anything. Used by the admin dashboard to surface drift (e.g. from
// the review-only fallback write on concurrent races) so admins know when
// the backfill is actually needed.
export const checkCampRatingDrift = async (): Promise<RatingDriftReport> => {
  if (!db) throw new Error('Firestore is not initialized');

  const [campsSnapshot, reviewsSnapshot] = await Promise.all([
    getDocs(collection(db, 'camps')),
    getDocs(collection(db, 'reviews')),
  ]);

  // Aggregate all reviews per camp in one pass
  const aggregates = new Map<string, { sum: number; count: number }>();
  reviewsSnapshot.docs.forEach(reviewDoc => {
    const data = reviewDoc.data();
    if (typeof data.campId !== 'string' || typeof data.rating !== 'number') return;
    const agg = aggregates.get(data.campId) || { sum: 0, count: 0 };
    agg.sum += data.rating;
    agg.count += 1;
    aggregates.set(data.campId, agg);
  });

  const report: RatingDriftReport = { checked: 0, drifted: [] };

  for (const campDoc of campsSnapshot.docs) {
    report.checked += 1;
    const data = campDoc.data();
    const agg = aggregates.get(campDoc.id);
    const actualReviewCount = agg?.count ?? 0;
    const actualRating = agg && agg.count > 0 ? agg.sum / agg.count : 0;

    const storedRating = typeof data.rating === 'number' ? data.rating : 0;
    const storedReviewCount = typeof data.reviewCount === 'number' ? data.reviewCount : 0;

    // Camps already in sync are skipped (tolerate float noise)
    if (storedReviewCount === actualReviewCount && Math.abs(storedRating - actualRating) < 0.001) {
      continue;
    }

    report.drifted.push({
      campId: campDoc.id,
      title: typeof data.title === 'string' ? data.title : undefined,
      storedRating,
      storedReviewCount,
      actualRating,
      actualReviewCount,
    });
  }

  return report;
};

export const recalculateAllCampRatings = async (): Promise<RatingBackfillResult> => {
  if (!db) throw new Error('Firestore is not initialized');

  // Reuse the read-only drift check so this writes ONLY the drifted camps.
  const report = await checkCampRatingDrift();
  const result: RatingBackfillResult = { checked: report.checked, updated: 0, failed: [] };

  for (const drift of report.drifted) {
    try {
      await updateDoc(doc(db, 'camps', drift.campId), {
        rating: drift.actualRating,
        reviewCount: drift.actualReviewCount,
      });
      result.updated += 1;
    } catch (error) {
      result.failed.push({
        campId: drift.campId,
        title: drift.title,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
};

// CRUD Operations for Reviews
// The caller supplies only the review content; userId, moderation flags and
// helpful counters are set server-side in the payload below.
export const createReview = async (
  reviewData: Omit<Review, 'id' | 'createdAt' | 'userId' | 'helpful' | 'helpfulVoters' | 'reported' | 'verified'>,
  userId: string
): Promise<string> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const reviewRef = doc(collection(db, 'reviews'));
  const reviewPayload = {
    ...reviewData,
    userId,
    createdAt: serverTimestamp(),
    helpful: 0,
    helpfulVoters: [],
    reported: false,
    verified: true
  };
  
  // Create the review and update the camp's rating aggregates inside a single
  // Firestore transaction so both writes succeed or both are rolled back.
  // The camp read happens inside the transaction to avoid stale aggregate math
  // from a concurrent review that lands between our read and our write.
  const campRef = doc(db, 'camps', reviewData.campId);

  return runTransaction(db, async (tx) => {
    const campSnapshot = await tx.get(campRef);

    if (campSnapshot.exists()) {
      const campData = campSnapshot.data();
      const currentRating = typeof campData.rating === 'number' ? campData.rating : 0;
      const currentCount = typeof campData.reviewCount === 'number' ? campData.reviewCount : 0;
      const newCount = currentCount + 1;
      const newRating = ((currentRating * currentCount) + reviewData.rating) / newCount;

      tx.update(campRef, {
        rating: newRating,
        reviewCount: newCount,
        lastReviewId: reviewRef.id,
        // Browse-card snippet; rules verify it equals this transaction's review text.
        ...(typeof reviewData.reviewText === 'string'
          ? { latestReviewText: reviewData.reviewText, latestReviewId: reviewRef.id }
          : {})
      });
    }

    tx.set(reviewRef, reviewPayload);
    return reviewRef.id;
  });
};

// FIXED: Removed orderBy to avoid composite index requirement
export const getReviewsByCamp = async (campId: string): Promise<Review[]> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const reviewsCollection = collection(db, 'reviews');
    // Removed orderBy('createdAt', 'desc') to avoid composite index requirement
    const reviewsQuery = query(
      reviewsCollection,
      where('campId', '==', campId)
    );
    const snapshot = await getDocs(reviewsQuery);
    
    // Convert and sort client-side
    const reviews = snapshot.docs.map(doc => convertDocData<Review>(doc));
    
    // Sort by createdAt descending (newest first) in JavaScript
    reviews.sort((a, b) => {
      const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt.toDate();
      const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt.toDate();
      return dateB.getTime() - dateA.getTime();
    });
    
    return reviews;
  } catch (error) {
    console.error('Error fetching reviews by camp:', error);
    throw error;
  }
};

/**
 * Writes/updates the host's public response on a review.
 * Only updates adminResponse and adminResponseAt — Firestore rules restrict
 * these fields to the camp's host or an admin.
 */
export const updateReviewResponse = async (
  reviewId: string,
  responseText: string
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  await updateDoc(doc(db, 'reviews', reviewId), {
    adminResponse: responseText.trim(),
    adminResponseAt: new Date().toISOString(),
  });
};

export const updateReview = async (reviewId: string, updates: Partial<Review>): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const reviewDoc = doc(db, 'reviews', reviewId);
  const reviewPayload = {
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  // If the star rating (or review text) changed, update the review AND the
  // camp's rating aggregates in ONE atomic batch. Firestore rules verify (via
  // get/getAfter on lastReviewId) that the aggregate update swaps exactly this
  // review's old rating for its new one — and that any latestReviewText
  // snippet matches the edited review's new text — so guests keep aggregates
  // in sync without being able to tamper with them directly.
  if (typeof updates.rating === 'number' || typeof updates.reviewText === 'string') {
    const reviewSnapshot = await getDoc(reviewDoc);
    const reviewData = reviewSnapshot.data();
    const campId = updates.campId || reviewData?.campId;
    const oldReviewRating = typeof reviewData?.rating === 'number' ? reviewData.rating : undefined;
    const newReviewRating = typeof updates.rating === 'number' ? updates.rating : oldReviewRating;
    const oldReviewText = typeof reviewData?.reviewText === 'string' ? reviewData.reviewText : undefined;
    const newReviewText = typeof updates.reviewText === 'string' ? updates.reviewText : oldReviewText;
    
    if (campId && typeof oldReviewRating === 'number' && typeof newReviewRating === 'number') {
      const campRef = doc(db, 'camps', campId);
      const campSnapshot = await getDoc(campRef);
      
      if (campSnapshot.exists()) {
        const campData = campSnapshot.data();
        const currentRating = typeof campData.rating === 'number' ? campData.rating : 0;
        const currentCount = typeof campData.reviewCount === 'number' ? campData.reviewCount : 0;
        // Only refresh the browse-card snippet when it currently shows THIS
        // review's text — editing an older review must not steal the snippet.
        const snippetIsThisReview = campData.latestReviewId === reviewId;
        
        if (currentCount >= 1) {
          const newRating = ((currentRating * currentCount) - oldReviewRating + newReviewRating) / currentCount;
          
          try {
            const batch = writeBatch(db);
            batch.update(reviewDoc, reviewPayload);
            batch.update(campRef, {
              rating: newRating,
              reviewCount: currentCount,
              lastReviewId: reviewId,
              // Rules verify this equals the edited review's new text.
              ...(snippetIsThisReview && typeof newReviewText === 'string'
                ? { latestReviewText: newReviewText }
                : {})
            });
            await batch.commit();
            return;
          } catch {
            // Rules that predate latestReviewText reject the extra key —
            // retry the aggregate batch without it so ratings never regress.
            try {
              const batch = writeBatch(db);
              batch.update(reviewDoc, reviewPayload);
              batch.update(campRef, {
                rating: newRating,
                reviewCount: currentCount,
                lastReviewId: reviewId
              });
              await batch.commit();
              return;
            } catch (error) {
              // If the batched aggregate update is rejected (e.g. a concurrent
              // write made our aggregate math stale), fall back to saving the
              // review alone so the guest's edit never fails.
              console.error('⚠️ Batched review edit + rating update failed, saving review only:', error);
            }
          }
        }
      }
    }
  }
  
  await updateDoc(reviewDoc, reviewPayload);
};

export const deleteReview = async (reviewId: string, campId: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const reviewDoc = doc(db, 'reviews', reviewId);
  const reviewSnapshot = await getDoc(reviewDoc);
  
  if (!reviewSnapshot.exists()) return;
  
  const reviewData = reviewSnapshot.data();
  const deletedRating = typeof reviewData.rating === 'number' ? reviewData.rating : undefined;
  
  // Delete the review AND update the camp's rating aggregates in ONE atomic
  // batch. Firestore rules verify (via get/existsAfter on lastReviewId) that
  // the aggregate update removes exactly this review's rating from the
  // aggregate, so guests keep aggregates in sync without being able to
  // tamper with them directly.
  if (typeof deletedRating === 'number') {
    const campRef = doc(db, 'camps', campId);
    const campSnapshot = await getDoc(campRef);
    
    if (campSnapshot.exists()) {
      const campData = campSnapshot.data();
      const currentRating = typeof campData.rating === 'number' ? campData.rating : 0;
      const currentCount = typeof campData.reviewCount === 'number' ? campData.reviewCount : 0;
      // Only clear the browse-card snippet when it shows THIS review's text —
      // deleting an older review must not blank a newer review's snippet. The
      // deleted review's text must never remain visible (rules only allow
      // removal on delete); the next review repopulates it.
      const snippetIsThisReview = campData.latestReviewId === reviewId;
      
      if (currentCount >= 1) {
        const newCount = currentCount - 1;
        const newRating = newCount > 0
          ? ((currentRating * currentCount) - deletedRating) / newCount
          : 0;
        
        try {
          const batch = writeBatch(db);
          batch.delete(reviewDoc);
          batch.update(campRef, {
            rating: newRating,
            reviewCount: newCount,
            lastReviewId: reviewId,
            ...(snippetIsThisReview ? { latestReviewText: deleteField(), latestReviewId: deleteField() } : {})
          });
          await batch.commit();
          return;
        } catch {
          // Rules that predate latestReviewText reject the extra key — retry
          // the aggregate batch without it so ratings never regress.
          try {
            const batch = writeBatch(db);
            batch.delete(reviewDoc);
            batch.update(campRef, {
              rating: newRating,
              reviewCount: newCount,
              lastReviewId: reviewId
            });
            await batch.commit();
            return;
          } catch (error) {
            // If the batched aggregate update is rejected (e.g. a concurrent
            // write made our aggregate math stale), fall back to deleting the
            // review alone so the guest's deletion never fails.
            console.error('⚠️ Batched review delete + rating update failed, deleting review only:', error);
          }
        }
      }
    }
  }
  
  await deleteDoc(reviewDoc);
};

// Mark review as helpful
export const markReviewHelpful = async (reviewId: string, userId: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const reviewDoc = doc(db, 'reviews', reviewId);
  const reviewSnapshot = await getDoc(reviewDoc);
  
  if (reviewSnapshot.exists()) {
    const reviewData = reviewSnapshot.data();
    const helpfulVoters = reviewData.helpfulVoters || [];
    
    if (!helpfulVoters.includes(userId)) {
      await updateDoc(reviewDoc, {
        helpful: (reviewData.helpful || 0) + 1,
        helpfulVoters: [...helpfulVoters, userId]
      });
    }
  }
};

// User Profile Operations - FIXED: Use setDoc with the user's UID as document ID
export const createUserProfile = async (userId: string, profileData: Omit<UserProfile, 'id' | 'createdAt'>): Promise<void> => {
  console.log('=== CREATE USER PROFILE ===');
  
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const userDoc = doc(db, 'users', userId);
    
    const existingProfile = await getDoc(userDoc);
    
    if (existingProfile.exists()) {
      console.log('✅ User profile already exists, skipping creation');
      return;
    }
    
    // Create the profile with setDoc (idempotent operation).
    // Role flags (isAdmin/isHost/isSeller) are intentionally omitted —
    // Firestore rules block client-side role writes. Absent flags are false.
    await setDoc(userDoc, {
      ...profileData,
      status: 'active',
      createdAt: serverTimestamp(),
      lastLoginAt: new Date().toISOString()
    });
    
    console.log('✅ User profile created successfully in Firestore');
  } catch (error) {
    console.error('❌ Error creating user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const userDoc = doc(db, 'users', userId);
  const snapshot = await getDoc(userDoc);
  
  if (!snapshot.exists()) return null;
  
  return convertDocData<UserProfile>(snapshot);
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const userDoc = doc(db, 'users', userId);
  await updateDoc(userDoc, updates);
};

/**
 * Fetch all reviews for a host's camps in one call.
 * Batches campIds into chunks of 10 to satisfy Firestore 'in' clause limits.
 * Returns reviews sorted newest-first.
 */
export const getReviewsByHostCamps = async (hostId: string): Promise<Review[]> => {
  if (!db) throw new Error('Firestore is not initialized');

  const camps = await getCampsByHost(hostId);
  if (camps.length === 0) return [];

  const campIds = camps.map((c) => c.id);
  const reviews: Review[] = [];

  for (let i = 0; i < campIds.length; i += 10) {
    const chunk = campIds.slice(i, i + 10);
    const q = query(collection(db, 'reviews'), where('campId', 'in', chunk));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => reviews.push(convertDocData<Review>(d)));
  }

  reviews.sort((a, b) => {
    const da = typeof a.createdAt === 'string' ? new Date(a.createdAt) : (a.createdAt as Timestamp).toDate();
    const db2 = typeof b.createdAt === 'string' ? new Date(b.createdAt) : (b.createdAt as Timestamp).toDate();
    return db2.getTime() - da.getTime();
  });

  return reviews;
};

// Search and Filter Operations - UPDATED FOR SINGLE-DAY BOOKINGS
export const searchCamps = async (filters: Partial<FilterState>): Promise<Camp[]> => {
  console.log('=== [ERR_FIRESTORE_001] searchCamps() START ===');
  console.log('[ERR_FIRESTORE_001] Input filters:', JSON.stringify(filters, null, 2));
  
  if (!db) {
    console.error('[ERR_FIRESTORE_001] Firestore is not initialized');
    throw new Error('[ERR_FIRESTORE_001] Firestore is not initialized');
  }
  
  try {
    console.log('[ERR_FIRESTORE_002] Creating base query...');
    const campsCollection = collection(db, 'camps');
    let campsQuery = query(campsCollection, where('status', '==', 'active'));
    console.log('[ERR_FIRESTORE_002] Base query created: status == active');
    
    // Apply minimum guests filter
    if (filters.minGuests) {
      console.log(`[ERR_FIRESTORE_002] Applying minGuests filter: >= ${filters.minGuests}`);
      campsQuery = query(campsQuery, where('maxGuests', '>=', filters.minGuests));
    }
    
    // NOTE: Rating filter moved to client-side because rating field is optional
    // Firestore queries on optional fields can fail if documents don't have the field
    
    console.log('[ERR_FIRESTORE_003] Executing Firestore query...');
    const snapshot = await getDocs(campsQuery);
    console.log(`[ERR_FIRESTORE_003] Query executed successfully, returned ${snapshot.docs.length} documents`);
    
    if (snapshot.docs.length === 0) {
      console.warn('[ERR_FIRESTORE_003] No documents returned from Firestore query');
      return [];
    }
    
    console.log('[ERR_FIRESTORE_004] Converting documents to Camp objects...');
    let camps: Camp[] = [];
    
    try {
      camps = snapshot.docs.map((doc, index) => {
        console.log(`[ERR_FIRESTORE_004] Converting document ${index + 1}/${snapshot.docs.length}: ${doc.id}`);
        const campData = convertDocData<Camp>(doc);
        console.log(`[ERR_FIRESTORE_004] Document ${doc.id} converted successfully`);
        return campData;
      });
      console.log(`[ERR_FIRESTORE_004] Successfully converted ${camps.length} documents`);
    } catch (conversionError) {
      console.error('[ERR_FIRESTORE_004] Error during document conversion:', conversionError);
      console.error('[ERR_FIRESTORE_004] Conversion error stack:', conversionError instanceof Error ? conversionError.stack : 'No stack trace');
      throw conversionError;
    }
    
    // Helpers for legacy/new field compatibility
    const getPriceValue = (camp: Camp) => {
      const legacyPrice = (camp as unknown as { price?: number }).price;
      if (typeof camp.pricePerNight === 'number') return camp.pricePerNight;
      if (typeof legacyPrice === 'number') return legacyPrice;
      return 0;
    };

    const getRatingValue = (camp: Camp) => {
      const legacyAverage = (camp as unknown as { averageRating?: number }).averageRating;
      if (typeof camp.rating === 'number') return camp.rating;
      if (typeof legacyAverage === 'number') return legacyAverage;
      return 0;
    };

    const normalizedSelectedDate = filters.bookingDate
      ? new Date(new Date(filters.bookingDate).setHours(0, 0, 0, 0))
      : undefined;
    
    // Apply listing type filter (client-side)
    if (filters.listingType && filters.listingType !== 'all') {
      console.log(`[ERR_FIRESTORE_004] Applying client-side listing type filter: ${filters.listingType}`);
      const beforeFilter = camps.length;
      camps = camps.filter(camp => (camp.listingType || 'camp') === filters.listingType);
      console.log(`[ERR_FIRESTORE_004] Listing type filter: ${beforeFilter} -> ${camps.length} camps`);
    }
    
    // Apply location filter client-side to avoid Firestore composite index issues
    if (filters.locations && filters.locations.length > 0) {
      console.log(`[ERR_FIRESTORE_004] Applying client-side location filter: ${filters.locations.join(', ')}`);
      const beforeFilter = camps.length;
      camps = camps.filter(camp => filters.locations!.includes(camp.location));
      console.log(`[ERR_FIRESTORE_004] Location filter: ${beforeFilter} -> ${camps.length} camps`);
    }
    
    // Apply single date filter using the publicly-readable campAvailability index.
    // Guests cannot list bookings (Firestore rules), so we maintain a separate
    // per-camp doc of booked dates that any user (even unauthenticated) can read.
    if (filters.bookingDate) {
      console.log(`[ERR_FIRESTORE_004] Applying date availability filter: ${filters.bookingDate.toISOString()}`);
      const beforeFilter = camps.length;
      
      const selectedDate = normalizedSelectedDate!;
      // Build the YYYY-MM-DD string used as the key in campAvailability.bookedDates
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;

      const availabilityChecks = await Promise.all(
        camps.map(async (camp) => {
          try {
            // Both reads are publicly accessible (campAvailability/dates: allow read if true,
            // blockedDates: allow read if true) — works for signed-out guests.
            const [dateDocSnap, blockedDates] = await Promise.all([
              getDoc(doc(db!, 'campAvailability', camp.id, 'dates', dateStr)),
              getBlockedDates(camp.id)
            ]);

            // If the date doc exists the camp is booked on this date —
            // unless the booking is an expired online-payment pending that
            // was never completed (treat as released after 30 min).
            // expiresAt and paymentMethod are written directly into the date doc
            // at booking-creation time so we read only this publicly-readable doc —
            // no need to touch the private availabilityLocks or bookings collections.
            if (dateDocSnap.exists()) {
              const dateData = dateDocSnap.data() as Record<string, any>;
              const isExpiredOnline =
                dateData.paymentMethod === 'online' &&
                typeof dateData.expiresAt === 'number' &&
                dateData.expiresAt < Date.now();
              if (isExpiredOnline) return camp; // payment window elapsed — date is available again
              return null;
            }

            // Check host-blocked date ranges
            for (const block of blockedDates) {
              const blockStart = new Date(block.startDate);
              const blockEnd = new Date(block.endDate);
              blockStart.setHours(0, 0, 0, 0);
              blockEnd.setHours(0, 0, 0, 0);
              if (selectedDate >= blockStart && selectedDate <= blockEnd) return null;
            }

            return camp;
          } catch (error) {
            // Exclude on failure — no silent include
            console.error(`[ERR_FIRESTORE_004] Availability check failed for ${camp.id}:`, error);
            return null;
          }
        })
      );
      
      camps = availabilityChecks.filter((camp): camp is Camp => camp !== null);
      console.log(`[ERR_FIRESTORE_004] Date filter: ${beforeFilter} -> ${camps.length} camps`);
    }
    
    // Apply price range filter (client-side)
    if (filters.priceRange) {
      console.log(`[ERR_FIRESTORE_004] Applying client-side price range filter: ${filters.priceRange[0]} - ${filters.priceRange[1]}`);
      const beforeFilter = camps.length;
      camps = camps.filter(camp => 
        getPriceValue(camp) >= filters.priceRange![0] && 
        getPriceValue(camp) <= filters.priceRange![1]
      );
      console.log(`[ERR_FIRESTORE_004] Price filter: ${beforeFilter} -> ${camps.length} camps`);
    }
    
    // Apply amenities filter (client-side)
    if (filters.amenities && filters.amenities.length > 0) {
      console.log(`[ERR_FIRESTORE_004] Applying client-side amenities filter: ${filters.amenities.join(', ')}`);
      const beforeFilter = camps.length;
      camps = camps.filter(camp =>
        filters.amenities!.every(amenity => camp.amenities.includes(amenity))
      );
      console.log(`[ERR_FIRESTORE_004] Amenities filter: ${beforeFilter} -> ${camps.length} camps`);
    }
    
    // Apply tent types filter (client-side)
    if (filters.tentTypes && filters.tentTypes.length > 0) {
      console.log(`[ERR_FIRESTORE_004] Applying client-side tent types filter: ${filters.tentTypes.join(', ')}`);
      const beforeFilter = camps.length;
      camps = camps.filter(camp => {
        const tc = camp.tentConfig;
        return filters.tentTypes!.some(type =>
          (type === 'large' && tc.largeTents > 0) ||
          (type === 'small' && tc.smallTents > 0) ||
          (type === 'entertainment' && tc.entertainmentTents > 0)
        );
      });
      console.log(`[ERR_FIRESTORE_004] Tent types filter: ${beforeFilter} -> ${camps.length} camps`);
    }

    // Apply rating filter (client-side) - MOVED FROM FIRESTORE QUERY
    if (filters.minRating) {
      console.log(`[ERR_FIRESTORE_004] Applying client-side rating filter: >= ${filters.minRating}`);
      const beforeFilter = camps.length;
      camps = camps.filter(camp => getRatingValue(camp) >= filters.minRating);
      console.log(`[ERR_FIRESTORE_004] Rating filter: ${beforeFilter} -> ${camps.length} camps`);
    }
    
    // Apply sorting
    if (filters.sortBy) {
      console.log(`[ERR_FIRESTORE_004] Applying sorting: ${filters.sortBy}`);
      switch (filters.sortBy) {
        case 'price_asc':
          camps.sort((a, b) => getPriceValue(a) - getPriceValue(b));
          break;
        case 'price_desc':
          camps.sort((a, b) => getPriceValue(b) - getPriceValue(a));
          break;
        case 'rating':
          camps.sort((a, b) => getRatingValue(b) - getRatingValue(a));
          break;
        case 'newest':
          camps.sort((a, b) => {
            const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt.toDate();
            const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt.toDate();
            return dateB.getTime() - dateA.getTime();
          });
          break;
      }
      console.log(`[ERR_FIRESTORE_004] Sorting applied: ${filters.sortBy}`);
    }
    
    console.log(`=== [ERR_FIRESTORE_001] searchCamps() SUCCESS: Returning ${camps.length} camps ===`);
    return camps;
    
  } catch (error) {
    console.error('[ERR_FIRESTORE_003] Error in searchCamps():', error);
    console.error('[ERR_FIRESTORE_003] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      filters: filters
    });
    throw error;
  }
};

// Admin Operations
export const getAdminStats = async (): Promise<AdminStats> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  // Get all collections
  const [usersSnap, campsSnap, bookingsSnap, reviewsSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'camps')),
    getDocs(collection(db, 'bookings')),
    getDocs(collection(db, 'reviews'))
  ]);
  
  const users = usersSnap.docs.map(doc => doc.data());
  const camps = campsSnap.docs.map(doc => doc.data());
  const bookings = bookingsSnap.docs.map(doc => doc.data());
  const reviews = reviewsSnap.docs.map(doc => doc.data());
  
  // Calculate stats
  const totalUsers = users.length;
  const totalHosts = users.filter(u => u.isHost).length;
  const totalCamps = camps.length;
  const activeCamps = camps.filter(c => c.status === 'active').length;
  const pendingCamps = camps.filter(c => c.status === 'pending').length;
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
  
  const totalRevenue = bookings
    .filter(b => b.paymentStatus === 'paid' || b.paymentStatus === 'cash_collected')
    .reduce((sum, b) => sum + b.totalPrice, 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = bookings
    .filter(b => {
      const bookingDate = typeof b.createdAt === 'string' 
        ? new Date(b.createdAt) 
        : b.createdAt.toDate();
      return (b.paymentStatus === 'paid' || b.paymentStatus === 'cash_collected') && bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
    })
    .reduce((sum, b) => sum + b.totalPrice, 0);
  
  const totalReviews = reviews.length;
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  
  return {
    totalUsers,
    totalHosts,
    totalCamps,
    activeCamps,
    pendingCamps,
    totalBookings,
    confirmedBookings,
    pendingBookings,
    cancelledBookings,
    totalRevenue,
    monthlyRevenue,
    totalReviews,
    averageRating
  };
};

export const getRecentActivity = async (limitCount: number = 10): Promise<RecentActivity[]> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const activities: RecentActivity[] = [];
  
  // Get recent users
  const usersQuery = query(
    collection(db, 'users'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const usersSnap = await getDocs(usersQuery);
  usersSnap.docs.forEach(doc => {
    const data = doc.data();
    const timestamp = typeof data.createdAt === 'string' 
      ? new Date(data.createdAt) 
      : data.createdAt.toDate();
    activities.push({
      id: doc.id,
      type: 'user',
      message: `New user registered: ${data.displayName || data.email}`,
      time: timestamp.toLocaleString(),
      timestamp
    });
  });
  
  // Get recent camps
  const campsQuery = query(
    collection(db, 'camps'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const campsSnap = await getDocs(campsQuery);
  campsSnap.docs.forEach(doc => {
    const data = doc.data();
    const timestamp = typeof data.createdAt === 'string' 
      ? new Date(data.createdAt) 
      : data.createdAt.toDate();
    activities.push({
      id: doc.id,
      type: 'camp',
      message: `New camp listed: ${data.title}`,
      time: timestamp.toLocaleString(),
      timestamp
    });
  });
  
  // Get recent bookings
  const bookingsQuery = query(
    collection(db, 'bookings'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const bookingsSnap = await getDocs(bookingsQuery);
  bookingsSnap.docs.forEach(doc => {
    const data = doc.data();
    const timestamp = typeof data.createdAt === 'string' 
      ? new Date(data.createdAt) 
      : data.createdAt.toDate();
    activities.push({
      id: doc.id,
      type: 'booking',
      message: `New booking: ${data.campTitle}`,
      time: timestamp.toLocaleString(),
      timestamp
    });
  });
  
  // Get recent reviews
  const reviewsQuery = query(
    collection(db, 'reviews'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const reviewsSnap = await getDocs(reviewsQuery);
  reviewsSnap.docs.forEach(doc => {
    const data = doc.data();
    const timestamp = typeof data.createdAt === 'string' 
      ? new Date(data.createdAt) 
      : data.createdAt.toDate();
    activities.push({
      id: doc.id,
      type: 'review',
      message: `New review submitted`,
      time: timestamp.toLocaleString(),
      timestamp
    });
  });
  
  // Sort by timestamp and limit
  return activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limitCount);
};

// Get all users (admin only)
export const getAllUsers = async (): Promise<UserProfile[]> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const usersCollection = collection(db, 'users');
  const snapshot = await getDocs(usersCollection);
  
  return snapshot.docs.map(doc => convertDocData<UserProfile>(doc));
};

// Get all camps (admin only)
export const getAllCamps = async (): Promise<Camp[]> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const campsCollection = collection(db, 'camps');
  const snapshot = await getDocs(campsCollection);
  
  return snapshot.docs.map(doc => convertDocData<Camp>(doc));
};

// Get all bookings (admin only)
export const getAllBookings = async (): Promise<Booking[]> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const bookingsCollection = collection(db, 'bookings');
  const bookingsQuery = query(bookingsCollection, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(bookingsQuery);
  
  return snapshot.docs.map(doc => convertDocData<Booking>(doc));
};

// Get all reviews (admin only)
export const getAllReviews = async (): Promise<Review[]> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const reviewsCollection = collection(db, 'reviews');
  const reviewsQuery = query(reviewsCollection, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(reviewsQuery);
  
  return snapshot.docs.map(doc => convertDocData<Review>(doc));
};

// Flag content (admin only)
export const flagCamp = async (campId: string, reason: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const campDoc = doc(db, 'camps', campId);
  await updateDoc(campDoc, {
    flagged: true,
    flagReason: reason
  });
};

export const flagReview = async (reviewId: string, reason: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const reviewDoc = doc(db, 'reviews', reviewId);
  await updateDoc(reviewDoc, {
    flagged: true,
    flagReason: reason
  });
};

// Suspend user (admin only)
export const suspendUser = async (userId: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const userDoc = doc(db, 'users', userId);
  await updateDoc(userDoc, {
    status: 'suspended'
  });
};

// Activate user (admin only)
export const activateUser = async (userId: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const userDoc = doc(db, 'users', userId);
  await updateDoc(userDoc, {
    status: 'active'
  });
};

// Get camps with filters (alias for searchCamps for compatibility)
export const getCampsWithFilters = searchCamps;

// Get unique amenities from all camps
export const getCampAmenities = async (): Promise<string[]> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const campsCollection = collection(db, 'camps');
  const campsQuery = query(campsCollection, where('status', '==', 'active'));
  const snapshot = await getDocs(campsQuery);
  
  const amenitiesSet = new Set<string>();
  snapshot.docs.forEach(doc => {
    const camp = doc.data() as Camp;
    if (camp.amenities && Array.isArray(camp.amenities)) {
      camp.amenities.forEach(amenity => amenitiesSet.add(amenity));
    }
  });
  
  return Array.from(amenitiesSet).sort();
};

// Alias for getCampById for compatibility
export const getCamp = getCampById;

// FIXED: Implement actual booking cancellation logic
// Cancel a booking through the authenticated API route. The server verifies
// guest/host ownership with the Firebase ID token, applies the stored refund
// policy in integer BHD fils, writes the cancellation + refund record inside a
// transaction, releases the availability slot, calls Tap's refund API for paid
// online bookings, and sends cancellation emails — none of which the client is
// trusted to do directly. This replaces the old direct-Firestore batch write.
export const cancelBooking = async (
  bookingId: string,
  reason: string,
): Promise<{ success: boolean; refundAmount: number; message: string }> => {
  const idToken = await auth?.currentUser?.getIdToken().catch(() => null) ?? null;
  if (!idToken) throw new Error('You must be signed in to cancel a booking');

  const configured = import.meta.env.VITE_API_URL?.trim();
  const useExternal =
    configured &&
    (configured.includes('localhost') ||
      configured.includes('127.0.0.1') ||
      import.meta.env.VITE_API_URL_FORCE === 'true');
  const apiBase = useExternal ? configured : '';

  const res = await fetch(`${apiBase}/api/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ reason }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
    refundAmount?: number;
    message?: string;
  };

  if (!res.ok || !body.success) {
    throw new Error(body.error || 'Failed to cancel booking');
  }

  return {
    success: true,
    refundAmount: body.refundAmount ?? 0,
    message: body.message || 'Booking cancelled successfully',
  };
};

// Host-initiated cancellation. Routes through the same authenticated server
// endpoint as guest cancellation so the server can apply the refund policy,
// initiate a Tap refund for paid online bookings, write the refund record, and
// release the availability slot — all atomically with idempotency guarantees.
// The legacy direct-Firestore batch write did none of this and bypassed rules.
export const cancelBookingAsHost = async (
  bookingId: string,
  reason: string,
  _hostId: string  // kept for call-site compatibility; ownership is verified server-side via uid
): Promise<{ success: boolean; refundAmount: number; message: string }> => {
  const idToken = await auth?.currentUser?.getIdToken().catch(() => null) ?? null;
  if (!idToken) throw new Error('You must be signed in to cancel a booking');

  const configured = import.meta.env.VITE_API_URL?.trim();
  const useExternal =
    configured &&
    (configured.includes('localhost') ||
      configured.includes('127.0.0.1') ||
      import.meta.env.VITE_API_URL_FORCE === 'true');
  const apiBase = useExternal ? configured : '';

  const res = await fetch(`${apiBase}/api/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ reason: reason.trim() || 'Cancelled by host' }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
    refundAmount?: number;
    message?: string;
  };

  if (!res.ok || !body.success) {
    throw new Error(body.error || 'Failed to cancel booking');
  }

  return {
    success: true,
    refundAmount: body.refundAmount ?? 0,
    message: body.message || 'Booking cancelled successfully',
  };
};

// Format relative time for reviews
export const formatRelativeTime = (date: string | Timestamp): string => {
  const reviewDate = typeof date === 'string' ? new Date(date) : date.toDate();
  const now = new Date();
  const diffInMs = now.getTime() - reviewDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
};

// Check if user can review a camp. Requires a completed stay: the caller
// must have a booking for this camp that is either explicitly completed or
// confirmed with a check-in date in the past. Firestore rules enforce the
// same invariant server-side (the review must carry the proving bookingId).
export const canUserReview = async (userId: string, campId: string): Promise<{
  canReview: boolean;
  bookingId?: string;
  // Actual stay dates returned so the review can record them correctly
  // (Audit v4 H-3: never stamp new Date() at submission time).
  checkInDate?: string;
  checkOutDate?: string;
}> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const reviewsRef = collection(db, 'reviews');
    const reviewQuery = query(
      reviewsRef,
      where('userId', '==', userId),
      where('campId', '==', campId)
    );
    const reviewsSnapshot = await getDocs(reviewQuery);
    if (!reviewsSnapshot.empty) {
      return { canReview: false };
    }
    
    const bookingsRef = collection(db, 'bookings');
    const bookingsQuery = query(
      bookingsRef,
      where('userId', '==', userId),
      where('campId', '==', campId)
    );
    const bookingsSnapshot = await getDocs(bookingsQuery);
    const now = new Date();
    for (const bookingDoc of bookingsSnapshot.docs) {
      const data = bookingDoc.data() as Record<string, unknown>;
      const status = typeof data.status === 'string' ? data.status : '';
      const paymentStatus = typeof data.paymentStatus === 'string' ? data.paymentStatus : '';
      const checkInDateRaw = typeof data.checkInDate === 'string' ? data.checkInDate : '';
      const checkOutDateRaw = typeof data.checkOutDate === 'string' ? data.checkOutDate : checkInDateRaw;
      // Mirror the Firestore rule: payment must be settled before a review
      // is allowed (Audit v4 M-10). Cash bookings settle as 'cash_collected';
      // online bookings as 'paid'. Pending/failed/refunded bookings don't qualify.
      const payOk = paymentStatus === 'paid' || paymentStatus === 'cash_collected';
      if (!payOk) continue;
      if (status === 'completed') {
        return { canReview: true, bookingId: bookingDoc.id, checkInDate: checkInDateRaw, checkOutDate: checkOutDateRaw };
      }
      if (status === 'confirmed' && checkInDateRaw) {
        const checkIn = new Date(checkInDateRaw.split('T')[0]);
        if (!isNaN(checkIn.getTime()) && checkIn < now) {
          return { canReview: true, bookingId: bookingDoc.id, checkInDate: checkInDateRaw, checkOutDate: checkOutDateRaw };
        }
      }
    }
    
    return { canReview: false };
  } catch (error) {
    console.error('Error checking if user can review:', error);
    return { canReview: false };
  }
};

// Get blocked dates for a camp
export async function getBlockedDates(campId: string): Promise<BlockedDate[]> {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const blockedDatesRef = collection(db, 'blockedDates');
    const q = query(
      blockedDatesRef,
      where('campId', '==', campId)
    );
    
    const snapshot = await getDocs(q);
    const blockedDates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BlockedDate));
    
    return blockedDates;
  } catch (error) {
    console.error('Error fetching blocked dates:', error);
    throw error;
  }
}

// Block dates for a camp
export async function blockDates(
  campId: string,
  hostId: string,
  startDate: string,
  endDate: string,
  reason?: string
): Promise<string> {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    // serverTimestamp() returns FieldValue which is write-only; omit the
    // typed intermediate variable so Firestore accepts it without a cast.
    const blockedDatesRef = collection(db, 'blockedDates');
    const docRef = await addDoc(blockedDatesRef, {
      campId,
      hostId,
      startDate,
      endDate,
      reason,
      createdAt: serverTimestamp(),
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error blocking dates:', error);
    throw error;
  }
}

// Unblock dates for a camp
export async function unblockDates(blockId: string): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const blockRef = doc(db, 'blockedDates', blockId);
    await deleteDoc(blockRef);
  } catch (error) {
    console.error('Error unblocking dates:', error);
    throw error;
  }
}

// Get revenue statistics
export const getRevenueStats = async () => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const bookingsRef = collection(db, 'bookings');
    const snapshot = await getDocs(bookingsRef);
    
    const bookings = snapshot.docs.map(doc => {
      const data = doc.data() as {
        paymentStatus?: string;
        totalPrice?: number;
        createdAt?: string | Timestamp;
      };
      return {
        paymentStatus: data.paymentStatus,
        totalPrice: data.totalPrice,
        createdAt: typeof data.createdAt === 'string'
          ? new Date(data.createdAt)
          : data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date(),
      };
    });
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const currentMonthRevenue = bookings
      .filter(b => 
        (b.paymentStatus === 'paid' || b.paymentStatus === 'cash_collected') && b.createdAt.getMonth() === currentMonth && b.createdAt.getFullYear() === currentYear
      )
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    const lastMonthRevenue = bookings
      .filter(b => 
        (b.paymentStatus === 'paid' || b.paymentStatus === 'cash_collected') && b.createdAt.getMonth() === lastMonth && b.createdAt.getFullYear() === lastMonthYear
      )
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    const totalRevenue = bookings
      .filter(b => b.paymentStatus === 'paid' || b.paymentStatus === 'cash_collected')
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    const percentageChange = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;
    
    return {
      currentMonth: currentMonthRevenue,
      lastMonth: lastMonthRevenue,
      total: totalRevenue,
      percentageChange
    };
  } catch (error) {
    console.error('Error getting revenue stats:', error);
    throw error;
  }
};

// Get booking trend data for charts
export const getBookingTrendData = async () => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const bookingsRef = collection(db, 'bookings');
    const snapshot = await getDocs(bookingsRef);
    
    const bookings = snapshot.docs.map(doc => {
      const data = doc.data() as {
        paymentStatus?: string;
        totalPrice?: number;
        createdAt?: string | Timestamp;
      };
      return {
        paymentStatus: data.paymentStatus,
        totalPrice: data.totalPrice,
        createdAt: typeof data.createdAt === 'string'
          ? new Date(data.createdAt)
          : data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date(),
      };
    });
    
    // Get last 6 months of data
    const monthsData = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const monthNum = date.getMonth();
      
      const monthBookings = bookings.filter(b => 
        b.createdAt.getMonth() === monthNum && b.createdAt.getFullYear() === year
      );
      
      const revenue = monthBookings
        .filter(b => b.paymentStatus === 'paid' || b.paymentStatus === 'cash_collected')
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      
      monthsData.push({
        month: `${month} ${year}`,
        bookings: monthBookings.length,
        revenue: revenue
      });
    }
    
    return monthsData;
  } catch (error) {
    console.error('Error getting booking trend data:', error);
    throw error;
  }
};

// Update user status (admin only)
export const updateUserStatus = async (userId: string, status: 'active' | 'suspended'): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const userDoc = doc(db, 'users', userId);
  await updateDoc(userDoc, {
    status: status
  });
};

// Toggle user host status (admin only)
export const toggleUserHostStatus = async (userId: string, isHost: boolean): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const userDoc = doc(db, 'users', userId);
  await updateDoc(userDoc, {
    isHost: isHost
  });
};

// Toggle seller status (admin only — set when a seller application is approved)
export const toggleUserSellerStatus = async (userId: string, isSeller: boolean): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');

  const userDoc = doc(db, 'users', userId);
  await updateDoc(userDoc, {
    isSeller: isSeller
  });
};

// Delete user (admin only)
export const deleteUser = async (userId: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const userDoc = doc(db, 'users', userId);
  await deleteDoc(userDoc);
};

// Update camp status (admin only)
export const updateCampStatus = async (campId: string, status: 'active' | 'pending' | 'rejected'): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const campDoc = doc(db, 'camps', campId);
  const prevSnap = await getDoc(campDoc);
  const prevData = prevSnap.exists() ? prevSnap.data() : null;
  const prevStatus = prevData?.status;

  await updateDoc(campDoc, {
    status: status
  });

  // If moving to active from a non-active state, send approval email
  // (recipient + template are handled server-side from the camp record)
  if (status === 'active' && prevStatus !== 'active' && prevData) {
    try {
      const emailModule = await import('./emailService');
      await emailModule.sendListingApprovalEmail(campId);
      console.log('✅ Listing approval email sent to host (updateCampStatus)');
    } catch (emailError) {
      console.error('❌ Failed to send listing approval email (updateCampStatus):', emailError);
    }
  }
};

// Get user growth statistics
export const getUserGrowthStats = async () => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt?.toDate() || new Date()
      };
    });
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const currentMonthUsers = users.filter(u => 
      u.createdAt.getMonth() === currentMonth && u.createdAt.getFullYear() === currentYear
    ).length;
    
    const lastMonthUsers = users.filter(u => 
      u.createdAt.getMonth() === lastMonth && u.createdAt.getFullYear() === lastMonthYear
    ).length;
    
    const percentageChange = lastMonthUsers > 0 
      ? ((currentMonthUsers - lastMonthUsers) / lastMonthUsers) * 100 
      : 0;
    
    return {
      currentMonth: currentMonthUsers,
      lastMonth: lastMonthUsers,
      total: users.length,
      percentageChange
    };
  } catch (error) {
    console.error('Error getting user growth stats:', error);
    throw error;
  }
};

export interface Thread {
  id: string;
  bookingId: string;
  campId: string;
  campTitle: string;
  guestId: string;
  hostId: string;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageBy: 'guest' | 'host';
  unreadGuest: number;
  unreadHost: number;
  createdAt: string;
}
export const getPopularCamps = async (limit: number = 10) => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const campsRef = collection(db, 'camps');
    const snapshot = await getDocs(campsRef);
    
    const camps = snapshot.docs.map(doc => {
      const data = doc.data() as { rating?: number; reviewCount?: number; [key: string]: unknown };
      return { id: doc.id, ...data };
    });
    
    // Sort by rating and number of reviews
    const sortedCamps = camps.sort((a, b) => {
      const scoreA = (a.rating || 0) * (a.reviewCount || 0);
      const scoreB = (b.rating || 0) * (b.reviewCount || 0);
      return scoreB - scoreA;
    });
    
    return sortedCamps.slice(0, limit);
  } catch (error) {
    console.error('Error getting popular camps:', error);
    throw error;
  }
};

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderRole: 'guest' | 'host';
  createdAt: string;
}

/**
 * Subscribe to real-time updates for a thread's messages (newest last).
 */
export const subscribeToMessages = (
  bookingId: string,
  onData: (msgs: Message[]) => void,
  onError?: (err: Error) => void
): (() => void) => {
  if (!db) return () => {};
  const msgsRef = collection(db, 'threads', threadId(bookingId), 'messages');
  const q = query(msgsRef, orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const msgs: Message[] = snap.docs.map(d => {
        const data = d.data() as Record<string, unknown>;
        const ts = data['createdAt'];
        const createdAt =
          ts instanceof Timestamp
            ? ts.toDate().toISOString()
            : typeof ts === 'string'
            ? ts
            : new Date().toISOString();
        return {
          id: d.id,
          text: String(data['text'] ?? ''),
          senderId: String(data['senderId'] ?? ''),
          senderRole: (data['senderRole'] as 'guest' | 'host') ?? 'guest',
          createdAt,
        };
      });
      onData(msgs);
    },
    (err) => onError?.(err)
  );
};

/**
 * Get thread by booking ID (returns null if no thread exists yet).
 */
export const getThreadByBookingId = async (bookingId: string): Promise<Thread | null> => {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'threads', threadId(bookingId)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Thread, 'id'>) };
};

/**
 * Send a message in a booking thread.  Also updates thread metadata
 * (lastMessage, lastMessageAt, unread count for the other party).
 */
export const sendMessage = async (params: {
  bookingId: string;
  senderId: string;
  senderRole: 'guest' | 'host';
  text: string;
}): Promise<string> => {
  if (!db) throw new Error('Firestore not initialized');
  const { bookingId, senderId, senderRole, text } = params;
  const tid = threadId(bookingId);
  const now = new Date().toISOString();
  const msgData = { text: text.trim(), senderId, senderRole, createdAt: now };
  const batch = writeBatch(db);
  const msgRef = doc(collection(db, 'threads', tid, 'messages'));
  batch.set(msgRef, msgData);
  const unreadField = senderRole === 'guest' ? 'unreadHost' : 'unreadGuest';
  batch.update(doc(db, 'threads', tid), {
    lastMessage: text.trim().slice(0, 200),
    lastMessageAt: now,
    lastMessageBy: senderRole,
    [unreadField]: increment(1),
  });
  await batch.commit();
  return msgRef.id;
};

/**
 * Mark a thread as read by the given role (sets their unread counter to 0).
 */
export const markThreadRead = async (
  bookingId: string,
  role: 'guest' | 'host'
): Promise<void> => {
  if (!db) return;
  const field = role === 'guest' ? 'unreadGuest' : 'unreadHost';
  try {
    await updateDoc(doc(db, 'threads', threadId(bookingId)), { [field]: 0 });
  } catch {
    // Best-effort — never block the UI
  }
};

/**
 * Get all threads where the user is the guest or the host (for inbox/dashboard).
 */
export const getThreadsByUser = async (
  userId: string,
  role: 'guest' | 'host'
): Promise<Thread[]> => {
  if (!db) return [];
  const field = role === 'guest' ? 'guestId' : 'hostId';
  const snap = await getDocs(
    query(
      collection(db, 'threads'),
      where(field, '==', userId),
      orderBy('lastMessageAt', 'desc')
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Thread, 'id'>) }));
};

/**
 * Subscribe to all threads for a user (host inbox, guest message list).
 */
export const subscribeToUserThreads = (
  userId: string,
  role: 'guest' | 'host',
  onData: (threads: Thread[]) => void,
  onError?: (err: Error) => void
): (() => void) => {
  if (!db) return () => {};
  const field = role === 'guest' ? 'guestId' : 'hostId';
  const q = query(
    collection(db, 'threads'),
    where(field, '==', userId),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const threads: Thread[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<Thread, 'id'>),
      }));
      onData(threads);
    },
    (err) => onError?.(err)
  );
};

const threadId = (bookingId: string) => `booking_${bookingId}`;

/**
 * Return an existing thread for a booking, or create one if it doesn't exist
 * yet.  Only the guest (guestId == caller) should call this to open a thread.
 */
export const getOrCreateThread = async (params: {
  bookingId: string;
  campId: string;
  campTitle: string;
  guestId: string;
  hostId: string;
}): Promise<Thread> => {
  if (!db) throw new Error('Firestore not initialized');
  const { bookingId, campId, campTitle, guestId, hostId } = params;
  const tid = threadId(bookingId);
  const ref = doc(db, 'threads', tid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { id: snap.id, ...(snap.data() as Omit<Thread, 'id'>) };
  }
  const now = new Date().toISOString();
  const data: Omit<Thread, 'id'> = {
    bookingId,
    campId,
    campTitle,
    guestId,
    hostId,
    lastMessage: '',
    lastMessageAt: now,
    lastMessageBy: 'guest',
    unreadGuest: 0,
    unreadHost: 0,
    createdAt: now,
  };
  await setDoc(ref, data);
  return { id: tid, ...data };
};

export const getRefunds = async (): Promise<RefundRecord[]> => {
  const idToken = await auth?.currentUser?.getIdToken().catch(() => null) ?? null;
  if (!idToken) throw new Error('You must be signed in to view refunds');

  const res = await fetch(`${getApiBase()}/api/admin/refunds`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
    refunds?: Record<string, unknown>[];
  };
  if (!res.ok || !body.success) {
    throw new Error(body.error ?? 'Failed to load refunds');
  }

  return (body.refunds ?? []).map((d): RefundRecord => {
    const rawStatus = String(d['refundStatus'] ?? d['status'] ?? 'pending');
    const status: RefundRecord['status'] =
      rawStatus === 'refunded'
        ? 'completed'
        : rawStatus === 'failed_will_retry'
        ? 'failed'
        : (rawStatus as RefundRecord['status']);

    return {
      id: String(d['id'] ?? ''),
      bookingId: String(d['bookingId'] ?? ''),
      guestId: String(d['userId'] ?? d['guestId'] ?? ''),
      campId: d['campId'] != null ? String(d['campId']) : undefined,
      amount: Number(d['refundAmountBHD'] ?? d['amount'] ?? 0),
      status,
      initiatedAt: String(d['createdAt'] ?? new Date().toISOString()),
      completedAt: d['completedAt'] != null ? String(d['completedAt']) : undefined,
      failureReason: d['failureReason'] != null ? String(d['failureReason']) : undefined,
      adminNotes: d['adminNotes'] != null ? String(d['adminNotes']) : undefined,
      tapRefundId: d['tapRefundId'] != null ? String(d['tapRefundId']) : undefined,
      tapChargeId: d['tapChargeId'] != null ? String(d['tapChargeId']) : undefined,
    };
  });
};

function getApiBase(): string {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? '';
  const useExternal =
    configured &&
    (configured.includes('localhost') ||
      configured.includes('127.0.0.1') ||
      import.meta.env.VITE_API_URL_FORCE === 'true');
  return useExternal ? configured : '';
}

export interface DisputeRecord {
  id: string;
  bookingId: string;
  userId: string;
  campId: string;
  type: string;
  description: string;
  photoUrl?: string;
  createdAt?: string;
  status: 'open' | 'resolved';
  resolvedAt?: string;
  resolvedBy?: string;
  adminNote?: string;
}
export const updateRefundStatus = async (
  refundId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  adminNotes?: string,
  /** Pass true only from the explicit manual-settlement confirmation dialog. */
  manualSettlementConfirmed?: boolean,
): Promise<void> => {
  const idToken = await auth?.currentUser?.getIdToken().catch(() => null) ?? null;
  if (!idToken) throw new Error('You must be signed in');

  // Map UI status 'completed' back to server-side 'refunded'
  const serverStatus = status === 'completed' ? 'refunded' : status;

  const res = await fetch(`${getApiBase()}/api/admin/refunds/${encodeURIComponent(refundId)}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      status: serverStatus,
      adminNotes,
      ...(manualSettlementConfirmed ? { manualSettlementConfirmed: true } : {}),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
  if (!res.ok || !body.success) {
    throw new Error(body.error ?? 'Failed to update refund status');
  }
};

export interface GuestDisputeStatus {
  id: string;
  bookingId: string;
  type: string;
  status: 'open' | 'resolved';
  createdAt?: string;
  resolvedAt?: string;
}

/** Fetch the current user's own disputes — used on the guest Bookings page. */
export const getMyDisputes = async (): Promise<GuestDisputeStatus[]> => {
  const idToken = await auth?.currentUser?.getIdToken().catch(() => null) ?? null;
  if (!idToken) return [];
  try {
    const res = await fetch(`${getApiBase()}/api/sahra/my-disputes`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const body = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      disputes?: Record<string, unknown>[];
    };
    if (!res.ok || !body.success) return [];
    return (body.disputes ?? []).map((d): GuestDisputeStatus => ({
      id: String(d['id'] ?? ''),
      bookingId: String(d['bookingId'] ?? ''),
      type: String(d['type'] ?? 'other'),
      status: d['status'] === 'resolved' ? 'resolved' : 'open',
      createdAt: d['createdAt'] != null ? String(d['createdAt']) : undefined,
      resolvedAt: d['resolvedAt'] != null ? String(d['resolvedAt']) : undefined,
    }));
  } catch {
    return [];
  }
};

export const getDisputes = async (): Promise<DisputeRecord[]> => {
  const idToken = await auth?.currentUser?.getIdToken().catch(() => null) ?? null;
  if (!idToken) throw new Error('You must be signed in to view disputes');

  const res = await fetch(`${getApiBase()}/api/admin/disputes`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
    disputes?: Record<string, unknown>[];
  };
  if (!res.ok || !body.success) {
    throw new Error(body.error ?? 'Failed to load disputes');
  }

  return (body.disputes ?? []).map((d): DisputeRecord => ({
    id: String(d['id'] ?? ''),
    bookingId: String(d['bookingId'] ?? ''),
    userId: String(d['userId'] ?? ''),
    campId: String(d['campId'] ?? ''),
    type: String(d['type'] ?? 'other'),
    description: String(d['description'] ?? ''),
    photoUrl: d['photoUrl'] != null ? String(d['photoUrl']) : undefined,
    createdAt: d['createdAt'] != null ? String(d['createdAt']) : undefined,
    status: d['status'] === 'resolved' ? 'resolved' : 'open',
    resolvedAt: d['resolvedAt'] != null ? String(d['resolvedAt']) : undefined,
    resolvedBy: d['resolvedBy'] != null ? String(d['resolvedBy']) : undefined,
    adminNote: d['adminNote'] != null ? String(d['adminNote']) : undefined,
  }));
};

export const resolveDispute = async (disputeId: string, adminNote?: string): Promise<void> => {
  const idToken = await auth?.currentUser?.getIdToken().catch(() => null) ?? null;
  if (!idToken) throw new Error('You must be signed in');

  const res = await fetch(
    `${getApiBase()}/api/admin/disputes/${encodeURIComponent(disputeId)}/resolve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ adminNote: adminNote?.trim() || undefined }),
    },
  );
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
  if (!res.ok || !body.success) {
    throw new Error(body.error ?? 'Failed to resolve dispute');
  }
};
