import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  limit,
  setDoc,
  FirestoreError,
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';

// Type definitions
export interface Camp {
  id: string;
  slug: string;
  title: string;
  photo: string;
  price: number;
  location: string;
  description?: string;
  rating?: number;
  amenities?: string[];
  maxGuests?: number;
  campArea?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
  tents?: TentConfig[];
  tentConfiguration?: {
    large: number;
    small: number;
    entertainment: number;
  };
  specialFeatures?: string;
  rules?: string;
  hostId: string;
  hostName?: string;
  createdAt: string | Timestamp;
  
  // Check-in/Check-out times
  checkInTime?: string;  // Format: "08:00 AM"
  checkOutTime?: string; // Format: "03:00 AM"
  
  // Review System fields
  averageRating?: number;
  reviewCount?: number;
  ratingDistribution?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  tentTypes?: string[];
  specialFeaturesList?: string[];
  
  // Payment-related fields
  refundPolicy?: 'refundable' | 'non-refundable';
  
  // Cancellation Policy - NEW FIELD
  cancellationPolicy?: 'flexible' | 'moderate' | 'strict';
  refundDeadlineHours?: number;
  cancellationFeePercentage?: number;
  nonRefundableDiscount?: number;
  
  // Admin fields
  status?: 'active' | 'pending' | 'inactive';
  photos?: string[];
}

export interface TentConfig {
  id: string;
  type: 'large' | 'small' | 'entertainment';
  furnished: boolean;
  carpeted: boolean;
  tv: boolean;
  sofas: boolean;
  teaSets: boolean;
  pingPongTable?: boolean;
  foosballTable?: boolean;
  airHockeyTable?: boolean;
  volleyballField?: boolean;
  footballField?: boolean;
}

export interface Booking {
  id: string;
  campId: string;
  campTitle: string;
  campPhoto: string;
  campLocation: string;
  checkIn: string;
  checkOut: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  totalPrice: number;
  userId: string;
  userName?: string;
  userEmail?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string | Timestamp;
  cancelledAt?: string;
  
  // Review System fields
  reviewId?: string;
  eligibleForReview?: boolean;
  
  // Payment fields
  paymentStatus?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
  paymentMethod?: 'card' | 'apple_pay' | 'google_pay';
  paymentIntentId?: string;
  transactionId?: string;
  
  // Pricing breakdown
  campPrice?: number;
  serviceFee?: number;
  taxes?: number;
  currency?: string;
  paidAt?: string;
  
  // Refund information
  refundPolicy?: 'refundable' | 'non-refundable';
  refundEligible?: boolean;
  refundStatus?: 'none' | 'requested' | 'approved' | 'processing' | 'completed' | 'rejected';
  refundAmount?: number;
  refundReason?: string;
  refundRequestedAt?: string;
  refundCompletedAt?: string;
  refundId?: string;
  
  // Cancellation Policy - NEW FIELD
  cancellationPolicy?: 'flexible' | 'moderate' | 'strict';
  
  // Payment metadata
  cardLast4?: string;
  cardBrand?: string;
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
  bookingId: string;
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

export interface FilterState {
  priceRange: [number, number];
  locations: string[];
  minGuests: number;
  amenities: string[];
  tentTypes: ('large' | 'small' | 'entertainment')[];
  minRating: number;
  sortBy: 'price_asc' | 'price_desc' | 'rating' | 'newest';
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
  
  console.log('1. db object exists:', result.configured);
  console.log('2. db object:', db);
  
  if (!result.configured) {
    result.error = 'Firestore not initialized';
    console.log('❌ Test failed:', result.error);
    return result;
  }
  
  try {
    // Test read
    console.log('3. Testing read access to camps collection...');
    const campsRef = collection(db, 'camps');
    console.log('4. Collection reference created:', campsRef);
    const snapshot = await getDocs(query(campsRef, limit(1)));
    console.log('5. Query snapshot received:', snapshot);
    console.log('6. Snapshot size:', snapshot.size);
    result.canRead = true;
    console.log('✅ Read access: SUCCESS (found', snapshot.size, 'documents)');
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌ Read access: FAILED', error);
    result.error = `Read failed: ${firestoreError.code} - ${firestoreError.message}`;
  }
  
  try {
    // Test write
    console.log('7. Testing write access...');
    const testDoc = {
      name: 'TEST_CONNECTION',
      createdAt: new Date().toISOString(),
      test: true
    };
    const docRef = await addDoc(collection(db, 'camps'), testDoc);
    result.canWrite = true;
    console.log('✅ Write access: SUCCESS, doc ID:', docRef.id);
    
    // Clean up test document
    await deleteDoc(doc(db, 'camps', docRef.id));
    console.log('✅ Test document deleted');
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌ Write access: FAILED', error);
    if (!result.error) {
      result.error = `Write failed: ${firestoreError.code} - ${firestoreError.message}`;
    }
  }
  
  console.log('=== TEST COMPLETE ===', result);
  return result;
};

// Camp operations
export const createCamp = async (campData: Omit<Camp, 'id' | 'createdAt'>, hostId: string): Promise<string> => {
  console.log('=== CREATE CAMP (Firestore Only) ===');
  console.log('Camp data:', campData);
  console.log('Host ID:', hostId);
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const campWithHost = {
      ...campData,
      hostId,
      createdAt: serverTimestamp(),
      averageRating: 0,
      reviewCount: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      refundPolicy: campData.refundPolicy || 'refundable',
      checkInTime: campData.checkInTime || '08:00 AM',
      checkOutTime: campData.checkOutTime || '03:00 AM',
      cancellationPolicy: campData.cancellationPolicy || 'moderate',
      status: 'active'
    };
    
    const docRef = await addDoc(collection(db, 'camps'), campWithHost);
    console.log('✅ Camp created in Firestore with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌ Failed to create camp:', error);
    console.error('Error details:', {
      code: firestoreError.code,
      message: firestoreError.message
    });
    throw new Error(`Failed to create camp: ${firestoreError.message}`);
  }
};

export const getCamps = async (): Promise<Camp[]> => {
  console.log('=== GET CAMPS (Firestore Only) ===');
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const campsRef = collection(db, 'camps');
    const q = query(campsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const camps = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Camp[];
    
    // Filter to only show active camps for public
    const activeCamps = camps.filter(camp => camp.status === 'active' || !camp.status);
    
    console.log(`✅ Fetched ${camps.length} camps, ${activeCamps.length} active`);
    return activeCamps;
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌ Failed to fetch camps:', error);
    console.error('Error details:', {
      code: firestoreError.code,
      message: firestoreError.message
    });
    throw new Error(`Failed to fetch camps: ${firestoreError.message}`);
  }
};

export const getCampsWithFilters = async (filters: FilterState): Promise<Camp[]> => {
  console.log('=== GET CAMPS WITH FILTERS ===');
  console.log('Filters:', filters);
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    // Start with base query
    const campsRef = collection(db, 'camps');
    let q = query(campsRef);
    
    // Apply sorting
    switch (filters.sortBy) {
      case 'price_asc':
        q = query(q, orderBy('price', 'asc'));
        break;
      case 'price_desc':
        q = query(q, orderBy('price', 'desc'));
        break;
      case 'rating':
        q = query(q, orderBy('averageRating', 'desc'));
        break;
      case 'newest':
      default:
        q = query(q, orderBy('createdAt', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    let camps = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Camp[];
    
    // Client-side filtering
    
    // Filter to only show active camps
    camps = camps.filter(camp => camp.status === 'active' || !camp.status);
    
    // Filter by price range
    camps = camps.filter(camp => 
      camp.price >= filters.priceRange[0] && 
      camp.price <= filters.priceRange[1]
    );
    
    // Filter by locations
    if (filters.locations.length > 0) {
      camps = camps.filter(camp => 
        filters.locations.includes(camp.location)
      );
    }
    
    // Filter by minimum guests
    if (filters.minGuests > 1) {
      camps = camps.filter(camp => 
        (camp.maxGuests || 0) >= filters.minGuests
      );
    }
    
    // Filter by amenities (camp must have ALL selected amenities)
    if (filters.amenities.length > 0) {
      camps = camps.filter(camp => 
        filters.amenities.every(amenity => 
          camp.amenities?.includes(amenity)
        )
      );
    }
    
    // Filter by tent types
    if (filters.tentTypes.length > 0) {
      camps = camps.filter(camp => {
        if (!camp.tentConfiguration) return false;
        return filters.tentTypes.some(type => 
          camp.tentConfiguration![type] > 0
        );
      });
    }
    
    // Filter by minimum rating
    if (filters.minRating > 0) {
      camps = camps.filter(camp => 
        (camp.averageRating || 0) >= filters.minRating
      );
    }
    
    console.log(`✅ Found ${camps.length} camps matching filters`);
    return camps;
    
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌ Error filtering camps:', error);
    throw new Error(`Failed to filter camps: ${firestoreError.message}`);
  }
};

export const getCampLocations = async (): Promise<string[]> => {
  try {
    const camps = await getCamps();
    const locations = [...new Set(camps.map(camp => camp.location))];
    return locations.sort();
  } catch (error) {
    console.error('❌ Error fetching locations:', error);
    throw error;
  }
};

export const getCampAmenities = async (): Promise<string[]> => {
  try {
    const camps = await getCamps();
    const amenitiesSet = new Set<string>();
    camps.forEach(camp => {
      camp.amenities?.forEach(amenity => amenitiesSet.add(amenity));
    });
    return Array.from(amenitiesSet).sort();
  } catch (error) {
    console.error('❌ Error fetching amenities:', error);
    throw error;
  }
};

export const getCamp = async (campId: string): Promise<Camp | null> => {
  console.log('=== GET CAMP BY ID (Firestore Only) ===');
  console.log('Camp ID:', campId);
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const campRef = doc(db, 'camps', campId);
    const campSnap = await getDoc(campRef);
    
    if (campSnap.exists()) {
      const camp = { id: campSnap.id, ...campSnap.data() } as Camp;
      console.log('✅ Camp found:', camp.title);
      return camp;
    }
    
    console.log('⚠️ Camp not found');
    return null;
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌ Failed to fetch camp:', error);
    throw new Error(`Failed to fetch camp: ${firestoreError.message}`);
  }
};

export const getCampById = getCamp;

export const getCampBySlug = async (slug: string): Promise<Camp | null> => {
  console.log('=== GET CAMP BY SLUG (Firestore Only) ===');
  console.log('Slug:', slug);
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const campsRef = collection(db, 'camps');
    const q = query(campsRef, where('slug', '==', slug));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const camp = { id: docSnap.id, ...docSnap.data() } as Camp;
      console.log('✅ Camp found:', camp.title);
      return camp;
    }
    
    console.log('⚠️ Camp not found');
    return null;
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌ Failed to fetch camp by slug:', error);
    throw new Error(`Failed to fetch camp: ${firestoreError.message}`);
  }
};

/**
 * Get camps by host - FIXED: Remove orderBy to avoid index requirement
 * Host should see ALL their camps regardless of status
 */
export const getCampsByHost = async (hostId: string): Promise<Camp[]> => {
  console.log('=== GET CAMPS BY HOST (FIXED - NO INDEX REQUIRED) ===');
  console.log('Host ID:', hostId);
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const campsRef = collection(db, 'camps');
    
    // SIMPLE QUERY: Only filter by hostId - no orderBy to avoid index requirement
    console.log('📍 Step 1: Creating simple query with ONLY hostId filter');
    const q = query(campsRef, where('hostId', '==', hostId));
    
    console.log('📍 Step 2: Executing query...');
    const snapshot = await getDocs(q);
    
    console.log(`📊 Step 3: Query returned ${snapshot.size} camps for host ${hostId}`);
    
    if (snapshot.empty) {
      console.log('✅ No camps found for this host');
      return [];
    }
    
    // CLIENT-SIDE SORTING: Sort by createdAt descending
    console.log('📍 Step 4: Sorting camps on client side...');
    const camps = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Camp[];
    
    // Sort by createdAt (newest first)
    camps.sort((a, b) => {
      const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : 
                    (a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt) ? 
                    (a.createdAt as Timestamp).toDate() : new Date(0);
      const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : 
                    (b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt) ? 
                    (b.createdAt as Timestamp).toDate() : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log(`✅ Fetched and sorted ${camps.length} camps for host ${hostId}`);
    console.log('📋 Camp titles:', camps.map(c => c.title));
    
    // HOST SHOULD SEE ALL THEIR CAMPS (active, pending, inactive)
    return camps;
    
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌❌❌ CRITICAL ERROR in getCampsByHost ❌❌❌');
    console.error('Error code:', firestoreError.code);
    console.error('Error message:', firestoreError.message);
    console.error('Full error:', error);
    
    // Provide detailed error information for debugging
    if (firestoreError.code === 'permission-denied') {
      console.error('🚫 PERMISSION DENIED - Check Firestore security rules');
      throw new Error('Permission denied: You must be signed in to view your listings');
    } else if (firestoreError.code === 'failed-precondition') {
      console.error('📊 INDEX REQUIRED - But this should not happen with single where clause');
      throw new Error('Database index missing. Please contact support.');
    } else if (firestoreError.code === 'unavailable') {
      console.error('🌐 FIRESTORE UNAVAILABLE - Network or service issue');
      throw new Error('Unable to connect to database. Please check your internet connection.');
    }
    
    throw new Error(`Failed to fetch host camps: ${firestoreError.message}`);
  }
};

export const updateCamp = async (campId: string, campData: Partial<Camp>): Promise<void> => {
  console.log('=== UPDATE CAMP (Firestore Only) ===');
  console.log('Camp ID:', campId);
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const campRef = doc(db, 'camps', campId);
    await updateDoc(campRef, campData);
    console.log('✅ Camp updated successfully');
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌ Failed to update camp:', error);
    throw new Error(`Failed to update camp: ${firestoreError.message}`);
  }
};

export const deleteCamp = async (campId: string): Promise<void> => {
  console.log('=== DELETE CAMP (Firestore Only) ===');
  console.log('Camp ID:', campId);
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const campRef = doc(db, 'camps', campId);
    await deleteDoc(campRef);
    console.log('✅ Camp deleted successfully');
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌ Failed to delete camp:', error);
    throw new Error(`Failed to delete camp: ${firestoreError.message}`);
  }
};

// Rest of the file remains the same...
// (Keeping all the booking, transaction, review, user profile, and admin functions unchanged)
// Booking operations
export const createBooking = async (bookingData: Omit<Booking, 'id' | 'createdAt'>, userId: string): Promise<string> => {
  console.log('=== CREATE BOOKING (Firestore Only) ===');
  console.log('Booking data:', bookingData);
  console.log('User ID:', userId);
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const bookingWithUser = {
      ...bookingData,
      userId,
      createdAt: serverTimestamp(),
      eligibleForReview: false,
      paymentStatus: bookingData.paymentStatus || 'pending',
      refundPolicy: bookingData.refundPolicy || 'refundable',
      refundEligible: true,
      refundStatus: 'none'
    };
    
    const docRef = await addDoc(collection(db, 'bookings'), bookingWithUser);
    console.log('✅ Booking created in Firestore with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌ Failed to create booking:', error);
    throw new Error(`Failed to create booking: ${firestoreError.message}`);
  }
};

export const getBookingsByUser = async (userId: string): Promise<Booking[]> => {
  console.log('=== GET BOOKINGS BY USER (Firestore Only) ===');
  console.log('User ID:', userId);
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const bookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Booking[];
    
    console.log(`✅ Fetched ${bookings.length} bookings for user ${userId}`);
    return bookings;
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌ Failed to fetch user bookings:', error);
    throw new Error(`Failed to fetch bookings: ${firestoreError.message}`);
  }
};

export const getBookingsByCamp = async (campId: string): Promise<Booking[]> => {
  console.log('=== GET BOOKINGS BY CAMP (CRITICAL FIX) ===');
  console.log('Camp ID:', campId);
  console.log('🔍 This query returns ALL non-cancelled bookings to block dates properly');
  
  if (!db) {
    const error = new Error('Firestore is not initialized. Please check your Firebase configuration.');
    console.error('❌ DB not initialized');
    throw error;
  }
  
  try {
    const bookingsRef = collection(db, 'bookings');
    
    console.log('📍 Step 1: Creating simple query with ONLY campId filter');
    const q = query(bookingsRef, where('campId', '==', campId));
    
    console.log('📍 Step 2: Executing query...');
    const snapshot = await getDocs(q);
    
    console.log(`📊 Step 3: Query returned ${snapshot.size} total bookings for camp ${campId}`);
    
    if (snapshot.empty) {
      console.log('✅ No bookings found - all dates available!');
      return [];
    }
    
    console.log('📍 Step 4: Filtering bookings on client side...');
    const bookings = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        } as Booking;
      })
      .filter(booking => {
        const isNotCancelled = booking.status !== 'cancelled';
        console.log(`  - Booking ${booking.id.substring(0, 8)}: status=${booking.status}, paymentStatus=${booking.paymentStatus || 'N/A'}, include=${isNotCancelled}`);
        return isNotCancelled;
      });
    
    console.log(`✅ Returning ${bookings.length} active bookings (${snapshot.size - bookings.length} cancelled excluded)`);
    console.log('📋 Active booking statuses:', bookings.map(b => ({ 
      id: b.id.substring(0, 8), 
      status: b.status,
      paymentStatus: b.paymentStatus || 'N/A'
    })));
    
    return bookings;
    
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌❌❌ CRITICAL ERROR in getBookingsByCamp ❌❌❌');
    console.error('Error code:', firestoreError.code);
    console.error('Error message:', firestoreError.message);
    console.error('Full error:', error);
    
    if (firestoreError.code === 'permission-denied') {
      console.error('🚫 PERMISSION DENIED - Check Firestore security rules');
      console.error('Required rule: allow read: if request.auth != null;');
      throw new Error('Permission denied: You must be signed in to view booking availability');
    } else if (firestoreError.code === 'failed-precondition') {
      console.error('📊 INDEX REQUIRED - But this should not happen with single where clause');
      throw new Error('Database index missing. Please contact support.');
    } else if (firestoreError.code === 'unavailable') {
      console.error('🌐 FIRESTORE UNAVAILABLE - Network or service issue');
      throw new Error('Unable to connect to database. Please check your internet connection.');
    }
    
    throw new Error(`Failed to fetch bookings: ${firestoreError.message}`);
  }
};

export const updateBooking = async (bookingId: string, bookingData: Partial<Booking>): Promise<void> => {
  console.log('=== UPDATE BOOKING (Firestore Only) ===');
  console.log('Booking ID:', bookingId);
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, bookingData);
    console.log('✅ Booking updated successfully');
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌ Failed to update booking:', error);
    throw new Error(`Failed to update booking: ${firestoreError.message}`);
  }
};

export const cancelBooking = async (bookingId: string): Promise<void> => {
  console.log('=== CANCELLING BOOKING ===');
  console.log('Booking ID:', bookingId);
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    
    await updateDoc(bookingRef, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    });
    
    console.log('✅ Booking cancelled successfully');
  } catch (error) {
    console.error('❌ Error cancelling booking:', error);
    throw error;
  }
};

// PAYMENT & TRANSACTION FUNCTIONS
export const createTransaction = async (
  transactionData: Omit<Transaction, 'id' | 'createdAt'>
): Promise<string> => {
  console.log('=== CREATE TRANSACTION ===');
  console.log('Transaction data:', transactionData);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const docRef = await addDoc(collection(db, 'transactions'), {
      ...transactionData,
      createdAt: serverTimestamp(),
    });
    
    console.log('✅ Transaction created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    throw error;
  }
};

export const updateBookingPaymentStatus = async (
  bookingId: string,
  updates: {
    paymentStatus: string;
    paymentIntentId?: string;
    paymentMethod?: string;
    cardLast4?: string;
    cardBrand?: string;
    paidAt?: string;
  }
): Promise<void> => {
  console.log('=== UPDATE BOOKING PAYMENT STATUS ===');
  console.log('Booking ID:', bookingId);
  console.log('Updates:', updates);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, updates);
    
    console.log('✅ Booking payment status updated');
  } catch (error) {
    console.error('❌ Error updating booking payment status:', error);
    throw error;
  }
};

export const calculateRefundAmount = (booking: Booking): {
  eligible: boolean;
  amount: number;
  reason: string;
} => {
  console.log('=== CALCULATE REFUND AMOUNT ===');
  console.log('Booking:', booking.id);
  console.log('Policy:', booking.refundPolicy);
  
  const now = new Date();
  const checkIn = new Date(booking.checkInDate);
  const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  console.log('Hours until check-in:', hoursUntilCheckIn);
  
  if (booking.refundPolicy === 'non-refundable') {
    return {
      eligible: false,
      amount: 0,
      reason: 'This booking is non-refundable',
    };
  }
  
  if (hoursUntilCheckIn >= 48) {
    const refundAmount = (booking.campPrice || 0) + (booking.taxes || 0);
    return {
      eligible: true,
      amount: refundAmount,
      reason: 'Full refund (service fee non-refundable)',
    };
  } else if (hoursUntilCheckIn >= 24) {
    const refundAmount = ((booking.campPrice || 0) * 0.5) + (booking.taxes || 0);
    return {
      eligible: true,
      amount: refundAmount,
      reason: '50% refund (cancelled 24-48 hours before check-in)',
    };
  } else {
    return {
      eligible: false,
      amount: 0,
      reason: 'No refund available (less than 24 hours before check-in)',
    };
  }
};

export const requestRefund = async (
  bookingId: string,
  reason: string,
  userId: string
): Promise<void> => {
  console.log('=== REQUEST REFUND ===');
  console.log('Booking ID:', bookingId);
  console.log('Reason:', reason);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      throw new Error('Booking not found');
    }
    
    const booking = bookingSnap.data() as Booking;
    
    if (booking.userId !== userId) {
      throw new Error('Unauthorized');
    }
    
    const refundCalc = calculateRefundAmount(booking);
    
    if (!refundCalc.eligible) {
      throw new Error(refundCalc.reason);
    }
    
    await updateDoc(bookingRef, {
      refundStatus: 'requested',
      refundReason: reason,
      refundAmount: refundCalc.amount,
      refundRequestedAt: new Date().toISOString(),
    });
    
    console.log('✅ Refund requested successfully');
    
  } catch (error) {
    console.error('❌ Error requesting refund:', error);
    throw error;
  }
};

export const processRefund = async (
  bookingId: string,
  refundId: string,
  refundAmount: number
): Promise<void> => {
  console.log('=== PROCESS REFUND ===');
  console.log('Booking ID:', bookingId);
  console.log('Refund ID:', refundId);
  console.log('Amount:', refundAmount);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      throw new Error('Booking not found');
    }
    
    const booking = bookingSnap.data() as Booking;
    
    await updateDoc(bookingRef, {
      refundStatus: 'completed',
      refundId,
      refundAmount,
      refundCompletedAt: new Date().toISOString(),
      paymentStatus: 'refunded',
      status: 'cancelled',
    });
    
    await createTransaction({
      bookingId,
      userId: booking.userId,
      campId: booking.campId,
      hostId: '',
      type: 'refund',
      status: 'completed',
      amount: refundAmount,
      currency: 'BHD',
      stripeRefundId: refundId,
      paymentMethod: booking.paymentMethod || 'card',
      description: `Refund for booking ${bookingId}`,
      completedAt: serverTimestamp() as Timestamp,
    });
    
    console.log('✅ Refund processed successfully');
    
  } catch (error) {
    console.error('❌ Error processing refund:', error);
    throw error;
  }
};

export const getTransactionsByUser = async (
  userId: string
): Promise<Transaction[]> => {
  console.log('=== GET TRANSACTIONS BY USER ===');
  console.log('User ID:', userId);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const transactionsRef = collection(db, 'transactions');
    const q = query(
      transactionsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Transaction[];
    
    console.log(`✅ Fetched ${transactions.length} transactions`);
    return transactions;
    
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    throw error;
  }
};

export const getTransactionsByBooking = async (
  bookingId: string
): Promise<Transaction[]> => {
  console.log('=== GET TRANSACTIONS BY BOOKING ===');
  console.log('Booking ID:', bookingId);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const transactionsRef = collection(db, 'transactions');
    const q = query(
      transactionsRef,
      where('bookingId', '==', bookingId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Transaction[];
    
    console.log(`✅ Fetched ${transactions.length} transactions`);
    return transactions;
    
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    throw error;
  }
};

// Review operations
export const createReview = async (
  reviewData: Omit<Review, 'id' | 'createdAt' | 'helpful' | 'helpfulVoters' | 'reported' | 'verified'>,
  userId: string
): Promise<string> => {
  console.log('=== CREATE REVIEW ===');
  console.log('Review data:', reviewData);
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const existingReview = await getReviewByBooking(reviewData.bookingId);
    if (existingReview) {
      throw new Error('You have already reviewed this booking');
    }
    
    const review = {
      ...reviewData,
      userId,
      helpful: 0,
      helpfulVoters: [],
      reported: false,
      verified: true,
      flagged: false,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'reviews'), review);
    console.log('✅ Review created with ID:', docRef.id);
    
    await updateDoc(doc(db, 'bookings', reviewData.bookingId), {
      reviewId: docRef.id
    });
    
    await updateCampRating(reviewData.campId);
    
    return docRef.id;
    
  } catch (error) {
    console.error('❌ Error creating review:', error);
    throw error;
  }
};

export const getReviewsByCamp = async (
  campId: string,
  limitCount: number = 10,
  lastDoc?: DocumentSnapshot
): Promise<{ reviews: Review[]; lastDoc: DocumentSnapshot | null }> => {
  console.log('=== GET REVIEWS BY CAMP (FIXED - NO INDEX REQUIRED) ===');
  console.log('Camp ID:', campId);
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    console.log('📍 Creating simple query with ONLY campId filter');
    const q = query(
      collection(db, 'reviews'),
      where('campId', '==', campId)
    );
    
    console.log('📍 Executing query...');
    const snapshot = await getDocs(q);
    
    console.log(`📊 Query returned ${snapshot.size} reviews`);
    
    if (snapshot.empty) {
      console.log('✅ No reviews found');
      return { reviews: [], lastDoc: null };
    }
    
    const allReviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Review[];
    
    allReviews.sort((a, b) => {
      const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : 
                    (a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt) ? 
                    (a.createdAt as Timestamp).toDate() : new Date(0);
      const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : 
                    (b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt) ? 
                    (b.createdAt as Timestamp).toDate() : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    
    const reviews = allReviews.slice(0, limitCount);
    
    console.log(`✅ Returning ${reviews.length} reviews`);
    return { reviews, lastDoc: null };
    
  } catch (error) {
    console.error('❌ Error fetching reviews:', error);
    throw error;
  }
};

export const getReviewsByUser = async (userId: string): Promise<Review[]> => {
  console.log('=== GET REVIEWS BY USER ===');
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const q = query(
      collection(db, 'reviews'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const reviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Review[];
    
    console.log(`✅ Fetched ${reviews.length} reviews for user`);
    return reviews;
    
  } catch (error) {
    console.error('❌ Error fetching user reviews:', error);
    throw error;
  }
};

export const getReviewByBooking = async (bookingId: string): Promise<Review | null> => {
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const q = query(
      collection(db, 'reviews'),
      where('bookingId', '==', bookingId),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as Review;
    
  } catch (error) {
    console.error('❌ Error fetching review by booking:', error);
    throw error;
  }
};

export const updateCampRating = async (campId: string): Promise<void> => {
  console.log('=== UPDATE CAMP RATING ===');
  console.log('Camp ID:', campId);
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const q = query(
      collection(db, 'reviews'),
      where('campId', '==', campId)
    );
    
    const snapshot = await getDocs(q);
    const reviews = snapshot.docs.map(doc => doc.data()) as Review[];
    
    if (reviews.length === 0) {
      await updateDoc(doc(db, 'camps', campId), {
        averageRating: 0,
        reviewCount: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      });
      return;
    }
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;
    
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    
    await updateDoc(doc(db, 'camps', campId), {
      averageRating,
      reviewCount: reviews.length,
      ratingDistribution: distribution
    });
    
    console.log(`✅ Updated camp rating: ${averageRating} (${reviews.length} reviews)`);
    
  } catch (error) {
    console.error('❌ Error updating camp rating:', error);
    throw error;
  }
};

export const canUserReview = async (
  userId: string,
  campId: string,
  bookingId?: string
): Promise<{ canReview: boolean; bookingId?: string; message?: string }> => {
  console.log('=== CHECK CAN USER REVIEW ===');
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    if (bookingId) {
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingSnap = await getDoc(bookingRef);
      
      if (!bookingSnap.exists()) {
        return { canReview: false, message: 'Booking not found' };
      }
      
      const booking = bookingSnap.data() as Booking;
      
      if (booking.userId !== userId || booking.campId !== campId) {
        return { canReview: false, message: 'Invalid booking' };
      }
      
      if (booking.reviewId) {
        return { canReview: false, message: 'Already reviewed' };
      }
      
      const checkOutDate = new Date(booking.checkOutDate);
      const today = new Date();
      
      if (checkOutDate >= today) {
        return { canReview: false, message: 'Booking not completed yet' };
      }
      
      if (booking.status === 'cancelled') {
        return { canReview: false, message: 'Cannot review cancelled booking' };
      }
      
      return { canReview: true, bookingId };
    }
    
    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', userId),
      where('campId', '==', campId)
    );
    
    const snapshot = await getDocs(q);
    
    const today = new Date();
    for (const docSnap of snapshot.docs) {
      const booking = docSnap.data() as Booking;
      const checkOutDate = new Date(booking.checkOutDate);
      
      if (checkOutDate < today && booking.status !== 'cancelled' && !booking.reviewId) {
        return { canReview: true, bookingId: docSnap.id };
      }
    }
    
    return { canReview: false, message: 'No eligible bookings found' };
    
  } catch (error) {
    console.error('❌ Error checking review eligibility:', error);
    return { canReview: false, message: 'Error checking eligibility' };
  }
};

export const markReviewHelpful = async (reviewId: string, userId: string): Promise<void> => {
  console.log('=== MARK REVIEW HELPFUL ===');
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    const reviewSnap = await getDoc(reviewRef);
    
    if (!reviewSnap.exists()) {
      throw new Error('Review not found');
    }
    
    const review = reviewSnap.data() as Review;
    
    if (review.helpfulVoters.includes(userId)) {
      console.log('⚠️ User already voted for this review');
      return;
    }
    
    await updateDoc(reviewRef, {
      helpful: review.helpful + 1,
      helpfulVoters: [...review.helpfulVoters, userId]
    });
    
    console.log('✅ Review marked as helpful');
    
  } catch (error) {
    console.error('❌ Error marking review helpful:', error);
    throw error;
  }
};

// User profile operations
export const createUserProfile = async (userId: string, profileData: Omit<UserProfile, 'id' | 'createdAt'>): Promise<void> => {
  console.log('=== CREATE USER PROFILE (Firestore Only) ===');
  console.log('User ID:', userId);
  console.log('Profile data:', profileData);
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...profileData,
      isAdmin: false,
      status: 'active',
      createdAt: serverTimestamp(),
    });
    console.log('✅ User profile created successfully');
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌ Failed to create user profile:', error);
    throw new Error(`Failed to create user profile: ${firestoreError.message}`);
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  console.log('=== GET USER PROFILE (Firestore Only) ===');
  console.log('User ID:', userId);
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const profile = { id: userSnap.id, ...userSnap.data() } as UserProfile;
      console.log('✅ User profile found:', profile.email);
      return profile;
    }
    
    console.log('⚠️ User profile not found');
    return null;
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌ Failed to fetch user profile:', error);
    throw new Error(`Failed to fetch user profile: ${firestoreError.message}`);
  }
};

export const updateUserProfile = async (userId: string, profileData: Partial<UserProfile>): Promise<void> => {
  console.log('=== UPDATE USER PROFILE (Firestore Only) ===');
  console.log('User ID:', userId);
  
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, profileData);
    console.log('✅ User profile updated successfully');
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌ Failed to update user profile:', error);
    throw new Error(`Failed to update user profile: ${firestoreError.message}`);
  }
};

// ADMIN FUNCTIONS
export const getAllUsers = async (): Promise<UserProfile[]> => {
  console.log('=== GET ALL USERS (ADMIN) ===');
  console.log('📊 DB Instance:', db ? 'EXISTS' : 'NULL');
  
  if (!db) {
    console.error('❌ Firestore DB is null or undefined');
    throw new Error('Firestore is not initialized');
  }
  
  try {
    console.log('📍 Step 1: Creating collection reference for "users"');
    const usersRef = collection(db, 'users');
    console.log('✅ Collection reference created:', usersRef);
    
    console.log('📍 Step 2: Creating query with orderBy');
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    console.log('✅ Query created');
    
    console.log('📍 Step 3: Executing getDocs...');
    const snapshot = await getDocs(q);
    console.log('✅ Query executed successfully');
    console.log('📊 Snapshot details:', {
      empty: snapshot.empty,
      size: snapshot.size,
      docsLength: snapshot.docs.length
    });
    
    console.log('📍 Step 4: Mapping documents to UserProfile objects');
    const users = snapshot.docs.map((docSnap, index) => {
      const data = docSnap.data();
      console.log(`  📄 Document ${index + 1}:`, {
        id: docSnap.id,
        email: data.email,
        hasData: !!data
      });
      return {
        id: docSnap.id,
        ...data
      };
    }) as UserProfile[];
    
    console.log(`✅ Successfully fetched ${users.length} users from Firestore`);
    console.log('📋 User emails:', users.map(u => u.email));
    return users;
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌ Error fetching users:', error);
    console.error('❌ Error code:', firestoreError.code);
    console.error('❌ Error message:', firestoreError.message);
    throw error;
  }
};

export const updateUserStatus = async (userId: string, status: 'active' | 'suspended'): Promise<void> => {
  console.log('=== UPDATE USER STATUS (ADMIN) ===');
  console.log('User ID:', userId, 'Status:', status);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { status });
    console.log('✅ User status updated');
  } catch (error) {
    console.error('❌ Error updating user status:', error);
    throw error;
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  console.log('=== DELETE USER (ADMIN) ===');
  console.log('User ID:', userId);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    console.log('✅ User deleted');
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    throw error;
  }
};

export const toggleUserHostStatus = async (userId: string, isHost: boolean): Promise<void> => {
  console.log('=== TOGGLE USER HOST STATUS (ADMIN) ===');
  console.log('User ID:', userId, 'Is Host:', isHost);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { isHost });
    console.log('✅ User host status updated');
  } catch (error) {
    console.error('❌ Error updating host status:', error);
    throw error;
  }
};

export const getAllCamps = async (): Promise<Camp[]> => {
  console.log('=== GET ALL CAMPS (ADMIN) ===');
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const campsRef = collection(db, 'camps');
    const q = query(campsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const camps = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Camp[];
    
    console.log(`✅ Fetched ${camps.length} camps`);
    return camps;
  } catch (error) {
    console.error('❌ Error fetching camps:', error);
    throw error;
  }
};

export const updateCampStatus = async (campId: string, status: 'active' | 'pending' | 'inactive'): Promise<void> => {
  console.log('=== UPDATE CAMP STATUS (ADMIN) ===');
  console.log('Camp ID:', campId, 'Status:', status);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const campRef = doc(db, 'camps', campId);
    await updateDoc(campRef, { status });
    console.log('✅ Camp status updated');
  } catch (error) {
    console.error('❌ Error updating camp status:', error);
    throw error;
  }
};

export const getAllBookings = async (): Promise<Booking[]> => {
  console.log('=== GET ALL BOOKINGS (ADMIN) ===');
  console.log('📊 DB Instance:', db ? 'EXISTS' : 'NULL');
  
  if (!db) {
    console.error('❌ Firestore DB is null or undefined');
    throw new Error('Firestore is not initialized');
  }
  
  try {
    console.log('📍 Step 1: Creating collection reference for "bookings"');
    const bookingsRef = collection(db, 'bookings');
    console.log('✅ Collection reference created:', bookingsRef);
    
    console.log('📍 Step 2: Executing getDocs WITHOUT orderBy to avoid index requirement...');
    const snapshot = await getDocs(bookingsRef);
    console.log('✅ Query executed successfully');
    console.log('📊 Snapshot details:', {
      empty: snapshot.empty,
      size: snapshot.size,
      docsLength: snapshot.docs.length
    });
    
    console.log('📍 Step 3: Mapping documents to Booking objects');
    const bookings = snapshot.docs.map((docSnap, index) => {
      const data = docSnap.data();
      console.log(`  📄 Document ${index + 1}:`, {
        id: docSnap.id,
        campTitle: data.campTitle,
        userName: data.userName,
        status: data.status,
        hasData: !!data
      });
      return {
        id: docSnap.id,
        ...data
      };
    }) as Booking[];
    
    bookings.sort((a, b) => {
      const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : 
                    (a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt) ? 
                    (a.createdAt as Timestamp).toDate() : new Date(0);
      const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : 
                    (b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt) ? 
                    (b.createdAt as Timestamp).toDate() : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log(`✅ Successfully fetched ${bookings.length} bookings from Firestore`);
    console.log('📋 Booking IDs:', bookings.map(b => b.id.substring(0, 8)));
    return bookings;
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error('❌ Error fetching bookings:', error);
    console.error('❌ Error code:', firestoreError.code);
    console.error('❌ Error message:', firestoreError.message);
    throw error;
  }
};

export const getBookingStats = async (): Promise<{
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
}> => {
  console.log('=== GET BOOKING STATS (ADMIN) ===');
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const bookings = await getAllBookings();
    
    const stats = {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      pending: bookings.filter(b => b.status === 'pending').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
    };
    
    console.log('✅ Booking stats:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Error getting booking stats:', error);
    throw error;
  }
};

export const getAllReviews = async (): Promise<Review[]> => {
  console.log('=== GET ALL REVIEWS (ADMIN) ===');
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const reviewsRef = collection(db, 'reviews');
    const q = query(reviewsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const reviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Review[];
    
    console.log(`✅ Fetched ${reviews.length} reviews`);
    return reviews;
  } catch (error) {
    console.error('❌ Error fetching reviews:', error);
    throw error;
  }
};

export const deleteReview = async (reviewId: string): Promise<void> => {
  console.log('=== DELETE REVIEW (ADMIN) ===');
  console.log('Review ID:', reviewId);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    const reviewSnap = await getDoc(reviewRef);
    
    if (!reviewSnap.exists()) {
      throw new Error('Review not found');
    }
    
    const review = reviewSnap.data() as Review;
    const campId = review.campId;
    
    await deleteDoc(reviewRef);
    console.log('✅ Review deleted');
    
    await updateCampRating(campId);
    
  } catch (error) {
    console.error('❌ Error deleting review:', error);
    throw error;
  }
};

export const flagReview = async (reviewId: string, flagged: boolean, reason?: string): Promise<void> => {
  console.log('=== FLAG REVIEW (ADMIN) ===');
  console.log('Review ID:', reviewId, 'Flagged:', flagged);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    const updateData: Partial<Review> = { flagged };
    
    if (flagged && reason) {
      updateData.flagReason = reason;
    }
    
    await updateDoc(reviewRef, updateData);
    console.log('✅ Review flag status updated');
  } catch (error) {
    console.error('❌ Error flagging review:', error);
    throw error;
  }
};

export const getRevenueStats = async (startDate: Date, endDate: Date): Promise<{
  total: number;
  byMonth: Array<{ month: string; revenue: number }>;
}> => {
  console.log('=== GET REVENUE STATS (ADMIN) ===');
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const bookings = await getAllBookings();
    
    const filteredBookings = bookings.filter(b => {
      if (b.status !== 'confirmed') return false;
      
      let bookingDate: Date;
      if (typeof b.createdAt === 'string') {
        bookingDate = new Date(b.createdAt);
      } else if (b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt) {
        bookingDate = (b.createdAt as Timestamp).toDate();
      } else {
        return false;
      }
      
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    
    const total = filteredBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    const byMonth: { [key: string]: number } = {};
    filteredBookings.forEach(b => {
      let date: Date;
      if (typeof b.createdAt === 'string') {
        date = new Date(b.createdAt);
      } else if (b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt) {
        date = (b.createdAt as Timestamp).toDate();
      } else {
        return;
      }
      
      const monthKey = format(date, 'MMM yyyy');
      byMonth[monthKey] = (byMonth[monthKey] || 0) + (b.totalPrice || 0);
    });
    
    const byMonthArray = Object.entries(byMonth).map(([month, revenue]) => ({
      month,
      revenue
    })).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });
    
    console.log('✅ Revenue stats calculated');
    return { total, byMonth: byMonthArray };
  } catch (error) {
    console.error('❌ Error getting revenue stats:', error);
    throw error;
  }
};

export const getUserGrowthStats = async (): Promise<{
  total: number;
  growth: Array<{ month: string; count: number }>;
}> => {
  console.log('=== GET USER GROWTH STATS (ADMIN) ===');
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const users = await getAllUsers();
    
    const byMonth: { [key: string]: number } = {};
    users.forEach(u => {
      let date: Date;
      if (typeof u.createdAt === 'string') {
        date = new Date(u.createdAt);
      } else if (u.createdAt && typeof u.createdAt === 'object' && 'toDate' in u.createdAt) {
        date = (u.createdAt as Timestamp).toDate();
      } else {
        return;
      }
      
      const monthKey = format(date, 'MMM yyyy');
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
    });
    
    const growth = Object.entries(byMonth).map(([month, count]) => ({
      month,
      count
    })).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });
    
    console.log('✅ User growth stats calculated');
    return { total: users.length, growth };
  } catch (error) {
    console.error('❌ Error getting user growth stats:', error);
    throw error;
  }
};

export const getPopularCamps = async (limitCount: number = 10): Promise<Camp[]> => {
  console.log('=== GET POPULAR CAMPS (ADMIN) ===');
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const camps = await getAllCamps();
    
    const sortedCamps = camps.sort((a, b) => {
      const scoreA = (a.reviewCount || 0) * (a.averageRating || 0);
      const scoreB = (b.reviewCount || 0) * (b.averageRating || 0);
      return scoreB - scoreA;
    });
    
    console.log(`✅ Retrieved top ${limitCount} popular camps`);
    return sortedCamps.slice(0, limitCount);
  } catch (error) {
    console.error('❌ Error getting popular camps:', error);
    throw error;
  }
};

export const getBookingTrendData = async (days: number = 30): Promise<Array<{ date: string; bookings: number }>> => {
  console.log('=== GET BOOKING TREND DATA (ADMIN) ===');
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const bookings = await getAllBookings();
    const now = new Date();
    const startDate = subDays(now, days);
    
    const recentBookings = bookings.filter(b => {
      let bookingDate: Date;
      if (typeof b.createdAt === 'string') {
        bookingDate = new Date(b.createdAt);
      } else if (b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt) {
        bookingDate = (b.createdAt as Timestamp).toDate();
      } else {
        return false;
      }
      return bookingDate >= startDate;
    });
    
    const byWeek: { [key: string]: number } = {};
    recentBookings.forEach(b => {
      let date: Date;
      if (typeof b.createdAt === 'string') {
        date = new Date(b.createdAt);
      } else if (b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt) {
        date = (b.createdAt as Timestamp).toDate();
      } else {
        return;
      }
      
      const weekNum = Math.floor((now.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const weekKey = `Week ${Math.max(1, days / 7 - weekNum)}`;
      byWeek[weekKey] = (byWeek[weekKey] || 0) + 1;
    });
    
    const trendData: Array<{ date: string; bookings: number }> = [];
    const numWeeks = Math.ceil(days / 7);
    for (let i = 1; i <= numWeeks; i++) {
      const weekKey = `Week ${i}`;
      trendData.push({
        date: weekKey,
        bookings: byWeek[weekKey] || 0
      });
    }
    
    console.log('✅ Booking trend data calculated');
    return trendData;
  } catch (error) {
    console.error('❌ Error getting booking trend data:', error);
    throw error;
  }
};

export const getRecentActivity = async (limitCount: number = 5): Promise<RecentActivity[]> => {
  console.log('=== GET RECENT ACTIVITY (ADMIN) ===');
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const [users, camps, bookings, reviews] = await Promise.all([
      getAllUsers(),
      getAllCamps(),
      getAllBookings(),
      getAllReviews()
    ]);
    
    const activities: RecentActivity[] = [];
    
    users.slice(0, 2).forEach(user => {
      let timestamp: Date;
      if (typeof user.createdAt === 'string') {
        timestamp = new Date(user.createdAt);
      } else if (user.createdAt && typeof user.createdAt === 'object' && 'toDate' in user.createdAt) {
        timestamp = (user.createdAt as Timestamp).toDate();
      } else {
        timestamp = new Date();
      }
      
      activities.push({
        id: user.id,
        type: 'user',
        message: `New user registered: ${user.email}`,
        time: formatRelativeTime(timestamp),
        timestamp
      });
    });
    
    camps.slice(0, 1).forEach(camp => {
      let timestamp: Date;
      if (typeof camp.createdAt === 'string') {
        timestamp = new Date(camp.createdAt);
      } else if (camp.createdAt && typeof camp.createdAt === 'object' && 'toDate' in camp.createdAt) {
        timestamp = (camp.createdAt as Timestamp).toDate();
      } else {
        timestamp = new Date();
      }
      
      activities.push({
        id: camp.id,
        type: 'camp',
        message: `New camp listing created: ${camp.title}`,
        time: formatRelativeTime(timestamp),
        timestamp
      });
    });
    
    bookings.slice(0, 1).forEach(booking => {
      let timestamp: Date;
      if (typeof booking.createdAt === 'string') {
        timestamp = new Date(booking.createdAt);
      } else if (booking.createdAt && typeof booking.createdAt === 'object' && 'toDate' in booking.createdAt) {
        timestamp = (booking.createdAt as Timestamp).toDate();
      } else {
        timestamp = new Date();
      }
      
      const action = booking.status === 'confirmed' ? 'confirmed' : booking.status === 'cancelled' ? 'cancelled' : 'placed';
      activities.push({
        id: booking.id,
        type: 'booking',
        message: `New booking ${action} for ${booking.campTitle}`,
        time: formatRelativeTime(timestamp),
        timestamp
      });
    });
    
    reviews.slice(0, 1).forEach(review => {
      let timestamp: Date;
      if (typeof review.createdAt === 'string') {
        timestamp = new Date(review.createdAt);
      } else if (review.createdAt && typeof review.createdAt === 'object' && 'toDate' in review.createdAt) {
        timestamp = (review.createdAt as Timestamp).toDate();
      } else {
        timestamp = new Date();
      }
      
      activities.push({
        id: review.id,
        type: 'review',
        message: `New ${review.rating}-star review posted`,
        time: formatRelativeTime(timestamp),
        timestamp
      });
    });
    
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    console.log(`✅ Retrieved ${activities.length} recent activities`);
    return activities.slice(0, limitCount);
  } catch (error) {
    console.error('❌ Error getting recent activity:', error);
    throw error;
  }
};

export const getAdminStats = async (): Promise<AdminStats> => {
  console.log('=== GET ADMIN STATS ===');
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const [users, camps, bookings, reviews] = await Promise.all([
      getAllUsers(),
      getAllCamps(),
      getAllBookings(),
      getAllReviews()
    ]);
    
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyBookings = bookings.filter(b => {
      let bookingDate: Date;
      if (typeof b.createdAt === 'string') {
        bookingDate = new Date(b.createdAt);
      } else if (b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt) {
        bookingDate = (b.createdAt as Timestamp).toDate();
      } else {
        return false;
      }
      return bookingDate >= firstDayOfMonth;
    });
    
    const stats: AdminStats = {
      totalUsers: users.length,
      totalHosts: users.filter(u => u.isHost).length,
      totalCamps: camps.length,
      activeCamps: camps.filter(c => c.status === 'active').length,
      pendingCamps: camps.filter(c => c.status === 'pending').length,
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
      pendingBookings: bookings.filter(b => b.status === 'pending').length,
      cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
      totalRevenue: bookings
        .filter(b => b.status === 'confirmed')
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0),
      monthlyRevenue: monthlyBookings
        .filter(b => b.status === 'confirmed')
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0),
      totalReviews: reviews.length,
      averageRating: reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0,
    };
    
    console.log('✅ Admin stats calculated:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Error getting admin stats:', error);
    throw error;
  }
};

// Helper functions
export const calculateAverageRating = (reviews: Review[]): number => {
  if (reviews.length === 0) return 0;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
};

export const getRatingDistribution = (reviews: Review[]): {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
} => {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(review => {
    distribution[review.rating as keyof typeof distribution]++;
  });
  return distribution;
};

export const formatRelativeTime = (date: Date | string | Timestamp): string => {
  const now = new Date();
  let reviewDate: Date;
  
  if (typeof date === 'string') {
    reviewDate = new Date(date);
  } else if (date instanceof Date) {
    reviewDate = date;
  } else {
    reviewDate = date.toDate();
  }
  
  const diffMs = now.getTime() - reviewDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};
