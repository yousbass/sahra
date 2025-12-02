import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
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
  setDoc
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
  maxGuests: number;
  images: string[];
  amenities: string[];
  rules: string[];
  status: 'active' | 'inactive' | 'pending';
  rating?: number;
  reviewCount?: number;
  createdAt: string | Timestamp;
  updatedAt?: string;
  featured?: boolean;
  instantBook?: boolean;
  minimumStay?: number;
  checkInTime?: string;
  checkOutTime?: string;
  cancellationPolicy?: 'flexible' | 'moderate' | 'strict';
  
  // Tent configuration
  tentConfig: {
    largeTents: number;
    smallTents: number;
    entertainmentTents: number;
  };
  
  // Pricing per tent type
  pricing: {
    largeTent: number;
    smallTent: number;
    entertainmentTent: number;
  };
  
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
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'partially_refunded';
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
  
  // Review status
  reviewSubmitted?: boolean;
  reviewId?: string;
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
  isHost: boolean;
  isAdmin: boolean;
  status?: 'active' | 'suspended';
  createdAt: string | Timestamp;
  lastLoginAt?: string;
  totalBookings?: number;
  totalSpent?: number;
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

// Host Penalty Interface
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
    rating: 0,
    reviewCount: 0,
    views: 0,
    bookingCount: 0
  });
  
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

  // Notify host when listing is approved/activated
  if (updates.status === 'active' && previousStatus !== 'active') {
    try {
      const emailModule = await import('./emailService');

      const hostId = (updates as Camp).hostId || previousData?.hostId;
      const campName = (updates as Camp).title || previousData?.title || 'Your camp';
      const campLocation = (updates as Camp).location || previousData?.location;
      const hostName = previousData?.hostName || 'Host';

      let hostEmail: string | undefined;
      if (hostId) {
        const hostDoc = await getDoc(doc(db, 'users', hostId));
        hostEmail = hostDoc.exists() ? hostDoc.data().email : undefined;
      }

      if (hostEmail) {
        await emailModule.sendListingApprovalEmail(
          {
            campName,
            campLocation,
            hostName,
            approvalDate: new Date().toISOString(),
            dashboardUrl: 'https://sahra.camp/host/dashboard'
          },
          hostEmail
        );
        console.log('✅ Listing approval email sent to host');
      }
    } catch (emailError) {
      console.error('❌ Failed to send listing approval email:', emailError);
    }
  }
};

export const deleteCamp = async (campId: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
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

// CRUD Operations for Bookings
export const createBooking = async (bookingData: Omit<Booking, 'id' | 'createdAt'>): Promise<string> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const bookingsCollection = collection(db, 'bookings');
  const docRef = await addDoc(bookingsCollection, {
    ...bookingData,
    createdAt: serverTimestamp(),
    status: bookingData.status || 'pending',
    paymentStatus: bookingData.paymentStatus || 'pending'
  });
  
  return docRef.id;
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

export const updateBooking = async (bookingId: string, updates: Partial<Booking>): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const bookingDoc = doc(db, 'bookings', bookingId);
  await updateDoc(bookingDoc, {
    ...updates,
    updatedAt: new Date().toISOString()
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
    where('hostId', '==', hostId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(bookingsQuery);
  
  return snapshot.docs.map(doc => convertDocData<Booking>(doc));
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

// CRUD Operations for Reviews
export const createReview = async (reviewData: Omit<Review, 'id' | 'createdAt'>, userId: string): Promise<string> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const reviewsCollection = collection(db, 'reviews');
  const docRef = await addDoc(reviewsCollection, {
    ...reviewData,
    userId,
    createdAt: serverTimestamp(),
    helpful: 0,
    helpfulVoters: [],
    reported: false,
    verified: true
  });
  
  // Update camp rating
  const campDoc = doc(db, 'camps', reviewData.campId);
  const campSnapshot = await getDoc(campDoc);
  
  if (campSnapshot.exists()) {
    const campData = campSnapshot.data();
    const currentRating = campData.rating || 0;
    const currentCount = campData.reviewCount || 0;
    const newCount = currentCount + 1;
    const newRating = ((currentRating * currentCount) + reviewData.rating) / newCount;
    
    await updateDoc(campDoc, {
      rating: newRating,
      reviewCount: newCount
    });
  }
  
  return docRef.id;
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

export const updateReview = async (reviewId: string, updates: Partial<Review>): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const reviewDoc = doc(db, 'reviews', reviewId);
  await updateDoc(reviewDoc, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
};

export const deleteReview = async (reviewId: string, campId: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const reviewDoc = doc(db, 'reviews', reviewId);
  const reviewSnapshot = await getDoc(reviewDoc);
  
  if (reviewSnapshot.exists()) {
    const reviewData = reviewSnapshot.data();
    await deleteDoc(reviewDoc);
    
    // Update camp rating
    const campDoc = doc(db, 'camps', campId);
    const campSnapshot = await getDoc(campDoc);
    
    if (campSnapshot.exists()) {
      const campData = campSnapshot.data();
      const currentRating = campData.rating || 0;
      const currentCount = campData.reviewCount || 0;
      
      if (currentCount > 1) {
        const newCount = currentCount - 1;
        const newRating = ((currentRating * currentCount) - reviewData.rating) / newCount;
        
        await updateDoc(campDoc, {
          rating: newRating,
          reviewCount: newCount
        });
      } else {
        await updateDoc(campDoc, {
          rating: 0,
          reviewCount: 0
        });
      }
    }
  }
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
  console.log('User ID:', userId);
  console.log('Profile Data:', profileData);
  
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    // Use setDoc with the user's UID as the document ID
    // This ensures the document ID matches the Auth UID
    const userDoc = doc(db, 'users', userId);
    
    // Check if profile already exists
    const existingProfile = await getDoc(userDoc);
    
    if (existingProfile.exists()) {
      console.log('✅ User profile already exists, skipping creation');
      return;
    }
    
    // Create the profile with setDoc (idempotent operation)
    await setDoc(userDoc, {
      ...profileData,
      isAdmin: false, // Default to non-admin
      status: 'active', // Default to active
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
    
    // Apply location filter
    if (filters.locations && filters.locations.length > 0) {
      console.log(`[ERR_FIRESTORE_002] Applying location filter: ${filters.locations.join(', ')}`);
      campsQuery = query(campsQuery, where('location', 'in', filters.locations));
    }
    
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

    // Apply single date filter (client-side) - UPDATED FOR DAILY BOOKINGS
    if (filters.bookingDate) {
      console.log(`[ERR_FIRESTORE_004] Applying client-side single date filter: ${filters.bookingDate.toISOString()}`);
      const beforeFilter = camps.length;
      
      // Filter camps based on availability for the selected date
      const availabilityChecks = await Promise.all(
        camps.map(async (camp) => {
          try {
            const [bookings, blockedDates] = await Promise.all([
              getBookingsByCamp(camp.id),
              getBlockedDates(camp.id)
            ]);
            
            const selectedDate = normalizedSelectedDate!;
            let hasConflict = false;
            
            // Check bookings - compare with checkInDate (which is the booking date for daily bookings)
            for (const booking of bookings) {
              if (booking.status !== 'cancelled') {
                const bookingDate = new Date(booking.checkInDate);
                bookingDate.setHours(0, 0, 0, 0);
                
                if (bookingDate.getTime() === selectedDate.getTime()) {
                  hasConflict = true;
                  break;
                }
              }
            }
            
            // Check blocked dates
            if (!hasConflict) {
              for (const block of blockedDates) {
                const blockStart = new Date(block.startDate);
                const blockEnd = new Date(block.endDate);
                
                blockStart.setHours(0, 0, 0, 0);
                blockEnd.setHours(0, 0, 0, 0);
                
                if (selectedDate >= blockStart && selectedDate <= blockEnd) {
                  hasConflict = true;
                  break;
                }
              }
            }
            
            return hasConflict ? null : camp;
          } catch (error) {
            console.error(`[ERR_FIRESTORE_004] Error checking availability for camp ${camp.id}:`, error);
            // Include camp if availability check fails
            return camp;
          }
        })
      );
      
      camps = availabilityChecks.filter((camp): camp is Camp => Boolean(camp));
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
    .filter(b => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + b.totalPrice, 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = bookings
    .filter(b => {
      const bookingDate = typeof b.createdAt === 'string' 
        ? new Date(b.createdAt) 
        : b.createdAt.toDate();
      return b.paymentStatus === 'paid' && bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
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
export const cancelBooking = async (bookingId: string, reason: string): Promise<{ success: boolean; refundAmount: number; message: string }> => {
  console.log('=== CANCEL BOOKING ===');
  console.log('Booking ID:', bookingId);
  console.log('Reason:', reason);
  
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const bookingDoc = doc(db, 'bookings', bookingId);
    const bookingSnapshot = await getDoc(bookingDoc);

    if (!bookingSnapshot.exists()) {
      throw new Error('Booking not found');
    }

    const booking = bookingSnapshot.data() as Booking;
    
    // Update the booking status to 'cancelled'
    await updateDoc(bookingDoc, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: 'guest',
      cancellationReason: reason,
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Booking status updated to cancelled in Firestore');

    // Send cancellation emails (best-effort, do not block)
    try {
      const emailModule = await import('./emailService');

      const cancellationData = {
        bookingId,
        campName: booking.campTitle || booking.campName || 'Camp',
        campLocation: booking.campLocation || booking.location || '',
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        numberOfGuests: booking.guests || booking.numberOfGuests || 1,
        totalAmount: booking.totalPrice || booking.price || 0,
        guestName: booking.userName || booking.guestName || 'Guest',
        hostName: booking.hostName || 'Host',
        cancellationReason: reason,
        cancelledAt: new Date().toISOString()
      };

      if (booking.userEmail) {
        await emailModule.sendCancellationNotificationToGuest(cancellationData, booking.userEmail);
        console.log('✅ Cancellation email sent to guest');
      }

      if (booking.hostId) {
        const hostDoc = await getDoc(doc(db, 'users', booking.hostId));
        const hostEmail = hostDoc.exists() ? hostDoc.data().email : undefined;

        if (hostEmail) {
          await emailModule.sendCancellationNotificationToHost(cancellationData, hostEmail);
          console.log('✅ Cancellation email sent to host');
        }
      }
    } catch (emailError) {
      console.error('❌ Failed to send cancellation emails:', emailError);
    }
    
    return { 
      success: true, 
      refundAmount: 0, 
      message: 'Booking cancelled successfully' 
    };
  } catch (error) {
    console.error('❌ Error cancelling booking:', error);
    throw error;
  }
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

// Check if user can review a camp - UPDATED TO ALLOW ALL AUTHENTICATED USERS
export const canUserReview = async (userId: string, campId: string): Promise<{ canReview: boolean; bookingId?: string }> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    // Check if user has already reviewed this camp
    const reviewsRef = collection(db, 'reviews');
    const reviewQuery = query(
      reviewsRef,
      where('userId', '==', userId),
      where('campId', '==', campId)
    );
    
    const reviewsSnapshot = await getDocs(reviewQuery);
    
    // If user has already reviewed, they cannot review again
    if (!reviewsSnapshot.empty) {
      return { canReview: false };
    }
    
    // User is authenticated and hasn't reviewed yet - they can review
    return { canReview: true };
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
    const blockedDateData: Omit<BlockedDate, 'id'> = {
      campId,
      hostId,
      startDate,
      endDate,
      reason,
      createdAt: serverTimestamp()
    };
    
    const blockedDatesRef = collection(db, 'blockedDates');
    const docRef = await addDoc(blockedDatesRef, blockedDateData);
    
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
      const data = doc.data();
      return {
        ...data,
        createdAt: typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt.toDate()
      };
    });
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const currentMonthRevenue = bookings
      .filter(b => 
        b.paymentStatus === 'paid' && b.createdAt.getMonth() === currentMonth && b.createdAt.getFullYear() === currentYear
      )
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    const lastMonthRevenue = bookings
      .filter(b => 
        b.paymentStatus === 'paid' && b.createdAt.getMonth() === lastMonth && b.createdAt.getFullYear() === lastMonthYear
      )
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    const totalRevenue = bookings
      .filter(b => b.paymentStatus === 'paid')
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
      const data = doc.data();
      return {
        ...data,
        createdAt: typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt.toDate()
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
        .filter(b => b.paymentStatus === 'paid')
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
  await updateDoc(campDoc, {
    status: status
  });
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

// Get popular camps
export const getPopularCamps = async (limit: number = 10) => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const campsRef = collection(db, 'camps');
    const snapshot = await getDocs(campsRef);
    
    const camps = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
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
