import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  runTransaction,
  writeBatch,
  setDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  Unsubscribe,
  increment,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { TentConfiguration } from './tentConfiguration';

export interface Camp {
  id: string;

  /** Normalized ISO timestamp; legacy docs without one default to load time. */
  createdAt?: string;

  hostId: string;

  hostName: string;

  hostEmail?: string;

  title: string;

  description: string;

  location: string;

  pricePerNight: number;

  /** Optional rate for Thursday & Friday nights (BHD, only when > 0) */
  weekendPrice?: number;

  /** Optional rate for Bahrain public holidays (BHD, only when > 0) */
  holidayPrice?: number;

  maxGuests: number;

  images: string[];

  amenities: string[];

  rules: string[];

  status: 'active' | 'inactive' | 'pending';

  rating?: number;

  reviews?: number;

  /**
   * Text of the most recent review, written as part of the review-aggregate
   * batch (see submitReview). Older camps won't have it until they receive a
   * new review — browse cards must treat it as optional.
   */
  latestReviewText?: string;

  /** ID of the review whose text is stored in latestReviewText. */
  latestReviewId?: string;

  listingType?: 'camp' | 'kashta';

  /**
   * Two runtime shapes coexist in Firestore:
   * - Legacy web string: 'flexible' | 'moderate' | 'strict'
   * - Mobile host form object: { type: 'full_refundable' | 'partial_refundable', arboonPercentage?: number }
   * Always use resolveCancellationTier() (StayCard / camp detail) rather than
   * comparing directly against string literals.
   */
  cancellationPolicy?:
    | 'flexible' | 'moderate' | 'strict'
    | { type: 'full_refundable' | 'partial_refundable'; arboonPercentage?: number };
  /** Raw stored fields that survive normalizeCampDoc's spread (host tools display these). */

  refundPolicy?: string;

  checkInTime?: string;

  checkOutTime?: string;

  tentConfiguration?: TentConfiguration;

  seatingCapacity?: number;

  /** Set by host listing form. Camps without coordinates are excluded from map view. */
  coordinates?: { lat: number; lng: number };

  /** When true, guests can book immediately without waiting for host approval. */
  instantBook?: boolean;
}

export interface Booking {
  id: string;
  campId: string;
  campTitle: string;
  campLocation: string;
  campImages?: string[];
  userId: string;
  userName?: string;
  userEmail?: string;
  hostId: string;
  checkInDate: string;
  /** NOTE: single-day convention — equals checkInDate. Use lib/bookingDates helpers for display. */
  checkOutDate: string;
  /** Full datetime "YYYY-MM-DD HH:mm" — carries the real next-morning departure. */
  checkIn?: string;
  checkOut?: string;
  guests: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'pending_verification' | 'refunded' | 'cash_collected';
  collectedAt?: string;
  paymentMethod?: 'card' | 'online' | 'apple_pay' | 'google_pay' | 'cash_on_arrival';
  userPhone?: string;
  specialRequests?: string;
  arrivalTime?: string;
  currency?: string;
  serviceFee?: number;
  priceBreakdown?: {
    basePrice: number;
    largeTentPrice?: number;
    smallTentPrice?: number;
    entertainmentTentPrice?: number;
    serviceFee: number;
    tax?: number;
    total: number;
  };
  /** Snapshot of the listing's tent inventory when the booking was created. */
  tentConfiguration?: TentConfiguration;
  /** Who initiated the cancellation — written by cancelBooking(). */
  cancelledBy?: 'guest' | 'host' | 'admin';
  tapChargeId?: string;
  /** Refund tracking fields written by the server cancellation endpoint. */
  refundStatus?: 'pending' | 'processing' | 'refunded' | 'not_applicable';
  refundAmount?: number;
  /** Online-payment hold deadline (ms epoch); unpaid bookings past this display as expired. */
  expiresAt?: number;
}

export interface Review {
  id: string;
  campId: string;
  userId: string;
  rating: number;
  reviewText: string;
  userName: string;
  userPhoto?: string;
  createdAt: string;
  verified?: boolean;
  adminResponse?: string;
}
export interface BlockedDate {
  id: string;
  campId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  reasonCategory?: string;
  notes?: string;
  hostId?: string;
}

// Live Firestore contains camp docs in BOTH legacy and new formats.
// Mirrors the web app's convertDocData normalization (artifacts/sahra/src/lib/firestore.ts)
// so legacy docs (price/photo/reviewCount/tentConfiguration) render correctly here too.
export const timestampToString = (value: unknown): string => {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    return new Date((value as { seconds: number }).seconds * 1000).toISOString();
  }
  return new Date().toISOString();
};

export const normalizeCampDoc = (id: string, data: Record<string, any>): Camp => {
  const normalized: Record<string, any> = {
    id,
    ...data,
    createdAt: timestampToString(data.createdAt),
  };

  if (!('listingType' in data)) normalized.listingType = 'camp';

  if ('photo' in data && !('images' in data)) {
    normalized.images = data.photo ? [data.photo] : [];
  } else if (!('images' in data)) {
    normalized.images = Array.isArray(data.photos) ? data.photos : [];
  }
  if (!Array.isArray(normalized.images)) normalized.images = [];
  // Junk live docs contain images like [''] — drop non-string/empty entries so
  // every screen's `images.length > 0` fallback check works correctly.
  normalized.images = normalized.images.filter(
    (u: unknown) => typeof u === 'string' && u.trim().length > 0
  );

  if ('price' in data && !('pricePerNight' in data)) {
    normalized.pricePerNight = data.price || 0;
  } else if (!('pricePerNight' in data)) {
    normalized.pricePerNight = 0;
  }

  if ('reviewCount' in data && !('reviews' in data)) {
    normalized.reviews = data.reviewCount || 0;
  }

  if (!Array.isArray(normalized.amenities)) normalized.amenities = [];
  if (!Array.isArray(normalized.rules)) normalized.rules = [];
  if (!normalized.description) normalized.description = '';
  if (!normalized.status) normalized.status = 'active';

  // Legacy docs may store numeric fields as strings or empty strings —
  // coerce so `{camp.maxGuests && ...}`-style guards and .toFixed never break.
  normalized.maxGuests = Number(normalized.maxGuests) || 0;
  normalized.pricePerNight = Number(normalized.pricePerNight) || 0;

  // Optional peak-night rates — keep only when a positive number, otherwise
  // drop the key so `weekendPrice`/`holidayPrice` stay undefined (matching
  // the peakPricing helper's `validRate` contract).
  const weekendPrice = Number(normalized.weekendPrice);
  if (weekendPrice > 0) normalized.weekendPrice = weekendPrice;
  else delete normalized.weekendPrice;
  const holidayPrice = Number(normalized.holidayPrice);
  if (holidayPrice > 0) normalized.holidayPrice = holidayPrice;
  else delete normalized.holidayPrice;

  normalized.rating = Number(normalized.rating) || 0;
  normalized.reviews = Number(normalized.reviews) || 0;

  if (typeof normalized.latestReviewText !== 'string' || !normalized.latestReviewText.trim()) {
    delete normalized.latestReviewText;
  }

  return normalized as Camp;
};

export const getCamps = async (): Promise<Camp[]> => {
  if (!db) return [];
  const q = query(collection(db, 'camps'), where('status', '==', 'active'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => normalizeCampDoc(doc.id, doc.data()));
};

export const getCampById = async (id: string): Promise<Camp | null> => {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'camps', id));
  if (!snap.exists()) return null;
  return normalizeCampDoc(snap.id, snap.data());
};

export const getReviewsByCamp = async (campId: string): Promise<Review[]> => {
  if (!db) return [];
  const q = query(collection(db, 'reviews'), where('campId', '==', campId));
  const snap = await getDocs(q);
  const reviews = snap.docs.map(d => {
    const data = d.data() as Record<string, any>;
    const rating = Number(data.rating);
    return {
      id: d.id,
      campId: String(data.campId || campId),
      userId: String(data.userId || ''),
      rating: Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0,
      reviewText: typeof data.reviewText === 'string' ? data.reviewText : '',
      userName: typeof data.userName === 'string' && data.userName.trim() ? data.userName : 'Guest',
      userPhoto: typeof data.userPhoto === 'string' && data.userPhoto.trim() ? data.userPhoto : undefined,
      createdAt: timestampToString(data.createdAt),
      verified: data.verified === true,
      adminResponse: typeof data.adminResponse === 'string' && data.adminResponse.trim() ? data.adminResponse : undefined,
    } as Review;
  });
  reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return reviews;
};
export const getBookingById = async (bookingId: string): Promise<Booking | null> => {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'bookings', bookingId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Booking;
  } catch {
    return null;
  }
};

export const getBookingsByUser = async (userId: string): Promise<Booking[]> => {
  if (!db) return [];
  const q = query(
    collection(db, 'bookings'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
};

/**
 * Attaches a real-time listener to the current user's bookings.
 * Because this uses onSnapshot instead of getDocs, Firestore keeps the query
 * result in the persistent offline cache and updates it whenever a server
 * write lands while the device is online.  When the device is offline the
 * last known result is served from cache — including any client-side writes
 * (e.g. the confirmed status written by payment-result.tsx) — so guests
 * never see a stale "pending" booking that was already confirmed.
 *
 * Returns an unsubscribe function; call it in the component's cleanup effect.
 */
export const subscribeToUserBookings = (
  userId: string,
  onData: (bookings: Booking[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe => {
  if (!db) {
    // DB not ready — return a no-op unsubscribe and deliver an empty list
    onData([]);
    return () => {};
  }
  const q = query(
    collection(db, 'bookings'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    { includeMetadataChanges: false },
    snap => {
      const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
      onData(bookings);
    },
    err => {
      if (onError) onError(err);
    }
  );
};
/**
 * Attaches a real-time listener to all camp listings owned by the given host.
 * Uses onSnapshot so status changes (e.g. pending → active after admin
 * approval) appear immediately without a manual pull-to-refresh.
 * The persistent offline cache is kept warm so hosts see the latest state
 * even when their device is offline.
 *
 * Returns an unsubscribe function; call it in the component's cleanup effect.
 */
export const subscribeToHostListings = (
  hostId: string,
  onData: (camps: Camp[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe => {
  if (!db) {
    onData([]);
    return () => {};
  }
  const q = query(
    collection(db, 'camps'),
    where('hostId', '==', hostId)
  );
  return onSnapshot(
    q,
    { includeMetadataChanges: false },
    snap => {
      const camps = snap.docs.map(d => normalizeCampDoc(d.id, d.data() as Record<string, any>));
      onData(camps);
    },
    err => {
      if (onError) onError(err);
    }
  );
};

/**
 * Attaches a real-time listener to all bookings for the given host.
 * Mirrors subscribeToUserBookings but filters on hostId instead of userId.
 * The persistent offline cache is kept warm so hosts see the latest state
 * even when their device is offline.
 *
 * Returns an unsubscribe function; call it in the component's cleanup effect.
 */
export const subscribeToHostBookings = (
  hostId: string,
  onData: (bookings: Booking[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe => {
  if (!db) {
    onData([]);
    return () => {};
  }
  const q = query(
    collection(db, 'bookings'),
    where('hostId', '==', hostId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    { includeMetadataChanges: false },
    snap => {
      const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
      onData(bookings);
    },
    err => {
      if (onError) onError(err);
    }
  );
};

export const getBookingsByCamp = async (campId: string): Promise<Booking[]> => {
  if (!db) return [];
  const q = query(
    collection(db, 'bookings'),
    where('campId', '==', campId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
};

export const getBlockedDates = async (campId: string): Promise<BlockedDate[]> => {
  if (!db) return [];
  const q = query(
    collection(db, 'blockedDates'),
    where('campId', '==', campId)
  );
  const snap = await getDocs(q);
  // Live docs store startDate/endDate as either strings or Firestore Timestamps.
  return snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startDate: timestampToString(data.startDate),
      endDate: timestampToString(data.endDate),
    } as BlockedDate;
  });
};

/**
 * Returns all booked dates for a camp from the public campAvailability/dates index.
 * This subcollection has `allow read: if true` so it works for any guest, including
 * signed-out users. Expired online-payment pending slots are excluded so the calendar
 * correctly shows those dates as available again after the 30-min payment window.
 *
 * Throws on any Firestore read failure so callers can surface a visible error state
 * rather than silently treating all dates as available (fail-open).
 */
export const getCampBookedDates = async (campId: string): Promise<Date[]> => {
  if (!db) throw new Error('Firestore is not initialized');
  const datesSnap = await getDocs(collection(db, 'campAvailability', campId, 'dates'));
  const now = Date.now();
  const dates: Date[] = [];
  datesSnap.forEach(docSnap => {
    const data = docSnap.data() as Record<string, any>;
    // Expired online-payment pending slots are treated as released
    if (data.paymentMethod === 'online' && typeof data.expiresAt === 'number' && data.expiresAt < now) {
      return;
    }
    // The doc id is the YYYY-MM-DD date string
    const parts = docSnap.id.split('-').map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      dates.push(new Date(parts[0], parts[1] - 1, parts[2]));
    }
  });
  return dates;
};
/**
 * Returns whether a camp is available on a given date by reading the publicly
 * readable campAvailability/dates subcollection and blockedDates collection.
 * Works for signed-out guests (both collections have `allow read: if true`).
 *
 * @param campId   Firestore camp document ID
 * @param dateStr  YYYY-MM-DD string for the date to check
 * @returns true if the camp is free on that date, false if booked or blocked
 */
export const isCampAvailableOnDate = async (
  campId: string,
  dateStr: string
): Promise<boolean> => {
  if (!db) return false; // exclude if DB unavailable — no silent include

  const selectedMidnight = new Date(`${dateStr}T00:00:00`);

  const [dateDocSnap, blockedDates] = await Promise.all([
    getDoc(doc(db, 'campAvailability', campId, 'dates', dateStr)),
    getBlockedDates(campId),
  ]);

  // Date doc exists → this date is booked, unless the booking is an expired
  // online-payment pending (released after 30 min of no payment).
  // expiresAt and paymentMethod are written directly into the date doc when the
  // booking is created so we never need to read the private availabilityLocks or
  // bookings collections — this makes the check work for signed-out guests too.
  if (dateDocSnap.exists()) {
    const dateData = dateDocSnap.data() as Record<string, any>;
    const isExpiredOnline =
      dateData.paymentMethod === 'online' &&
      typeof dateData.expiresAt === 'number' &&
      dateData.expiresAt < Date.now();
    if (isExpiredOnline) return true; // payment window elapsed — date is available again
    return false;
  }

  // Check host-blocked date ranges
  for (const b of blockedDates) {
    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (selectedMidnight >= start && selectedMidnight <= end) return false;
  }

  return true;
};

type EmailType =
  | 'booking-confirmation'
  | 'booking-notification'
  | 'cancellation-guest'
  | 'cancellation-host';
// Cancel a booking through the authenticated API route. The server verifies
// guest/host ownership with the Firebase ID token, applies the stored refund
// policy in integer BHD fils, writes the cancellation + refund record inside a
// transaction, releases the availability slot, calls Tap's refund API for paid
// online bookings, and sends cancellation emails. This replaces the old
// direct-Firestore batch write so refunds are actually issued server-side.
export const cancelBooking = async (bookingId: string, reason: string): Promise<void> => {
  const idToken = await auth?.currentUser?.getIdToken().catch(() => null) ?? null;
  if (!idToken) throw new Error('You must be signed in to cancel a booking');

  const res = await fetch(
    `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/bookings/${bookingId}/cancel`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ reason }),
    },
  );

  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
  };

  if (!res.ok || !body.success) {
    throw new Error(body.error || 'Failed to cancel booking');
  }
};

export const sendBookingEmails = async (
  _booking: Record<string, any>,
  bookingId: string
): Promise<void> => {
  try {
    await sendEmailViaApi('booking-confirmation', bookingId);
    await sendEmailViaApi('booking-notification', bookingId);
  } catch {
    // Emails are best-effort; the booking itself already succeeded.
  }
};

/**
 * Ask the API server to push a "new booking request" notification to the host's
 * device. Best-effort — the booking itself already succeeded before this is
 * called, so any failure here is logged but never re-thrown.
 */
export const notifyHostNewBooking = async (bookingId: string): Promise<void> => {
  try {
    const idToken = await auth?.currentUser?.getIdToken();
    if (!idToken) return;
    await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/notifications/host-booking-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ bookingId }),
    });
  } catch {
    // Best-effort — never block the booking flow.
  }
};

// Mirrors the web app's duplicate-booking guard: one booking per user per date.
export const hasUserBookingOnDate = async (userId: string, dateString: string): Promise<boolean> => {
  if (!db) throw new Error('Firestore is not initialized');
  const bookingsQuery = query(
    collection(db, 'bookings'),
    where('userId', '==', userId),
    where('checkInDate', '==', dateString)
  );
  const snapshot = await getDocs(bookingsQuery);
  return snapshot.docs.some(d => (d.data() as Record<string, any>).status !== 'cancelled');
};

export const updateUserProfile = async (
  userId: string,
  updates: { displayName?: string; phone?: string; photoURL?: string }
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  await updateDoc(doc(db, 'users', userId), updates);
};
export class DateUnavailableError extends Error {
  code = 'date-unavailable' as const;
  constructor(message = 'This date has just been booked by someone else') {
    super(message);
    this.name = 'DateUnavailableError';
  }
}

export const createBookingWithLock = async (
  bookingData: any,
  campId: string,
  dateString: string
): Promise<string> => {
  if (!db) throw new Error('Firestore is not initialized');
  const database = db;

  const lockRef = doc(database, 'availabilityLocks', `${campId}_${dateString}`);
  const bookingRef = doc(collection(database, 'bookings'));

  // Expired online-payment bookings are self-cancelled by their owner in
  // startTapPayment, which the booking owner is always permitted to do. A
  // server-side scheduled job (task #112) handles the never-returning-guest
  // edge case. The lock rule on Firestore also has an expiry condition in the
  // rules file ready to deploy when Firebase CLI auth is available.
  return runTransaction(database, async (tx) => {
    const lockSnap = await tx.get(lockRef);

    if (lockSnap.exists()) {
      const existingBookingId = lockSnap.data()?.bookingId;
      if (!existingBookingId) {
        throw new DateUnavailableError();
      }
      const existingBookingSnap = await tx.get(doc(database, 'bookings', existingBookingId));
      const existingData = existingBookingSnap.data() as Record<string, any> | undefined;
      const isExpiredPendingOnline =
        existingData?.status === 'pending' &&
        existingData?.paymentMethod !== 'cash_on_arrival' &&
        typeof existingData?.expiresAt === 'number' &&
        existingData.expiresAt < Date.now();
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

    // Write expiresAt for online-payment bookings so availability checks can
    // treat abandoned pending bookings as released after 30 minutes.
    const isOnlinePayment = (bookingData as any).paymentMethod === 'online';
    tx.set(bookingRef, {
      ...bookingData,
      ...(isOnlinePayment ? { expiresAt: Date.now() + 30 * 60 * 1000 } : {}),
      createdAt: serverTimestamp(),
      status: bookingData.status || 'pending',
      paymentStatus: bookingData.paymentStatus || 'pending',
    });

    // Maintain the public availability index so guests can filter by date
    // without needing to read private bookings.  One doc per booked date so
    // the rule can verify this write is part of the same lock+booking transaction.
    // For online-payment bookings we embed expiresAt and paymentMethod directly so
    // the availability check can treat expired pending slots as released without
    // reading the private availabilityLocks or bookings collections.
    const expiresAt = isOnlinePayment ? Date.now() + 30 * 60 * 1000 : undefined;
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
 * Submits a guest review for a completed stay.
 * The review document and camp rating aggregates (rating, reviewCount,
 * lastReviewId, latestReviewText) are written inside a single Firestore
 * transaction so both writes succeed or both are rolled back — no partial
 * state where a review exists but the camp rating hasn't updated.
 */
export const submitReview = async (params: {
  campId: string;
  bookingId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
}): Promise<string> => {
  if (!db) throw new Error('Firestore is not initialized');
  const database = db;

  const reviewRef = doc(collection(database, 'reviews'));
  const reviewPayload = {
    campId: params.campId,
    bookingId: params.bookingId,
    userId: params.userId,
    userName: params.userName,
    ...(params.userPhoto ? { userPhoto: params.userPhoto } : {}),
    rating: params.rating,
    reviewText: params.comment,
    createdAt: serverTimestamp(),
    verified: true,
    helpful: 0,
    helpfulVoters: [],
    reported: false,
  };

  const campRef = doc(database, 'camps', params.campId);

  return runTransaction(database, async (tx) => {
    const campSnap = await tx.get(campRef);

    if (campSnap.exists()) {
      const campData = campSnap.data() as Record<string, any>;
      const currentRating = typeof campData.rating === 'number' ? campData.rating : 0;
      const currentCount =
        typeof campData.reviewCount === 'number'
          ? campData.reviewCount
          : typeof campData.reviews === 'number'
          ? campData.reviews
          : 0;
      const newCount = currentCount + 1;
      const newRating = (currentRating * currentCount + params.rating) / newCount;

      tx.update(campRef, {
        rating: newRating,
        reviewCount: newCount,
        lastReviewId: reviewRef.id,
        // Browse cards show this snippet without extra reads. Rules verify it
        // matches the review text created in the same transaction.
        latestReviewText: params.comment,
        latestReviewId: reviewRef.id,
      });
    }

    tx.set(reviewRef, reviewPayload);
    return reviewRef.id;
  });
};

/**
 * Writes/updates the host's public response on a review.
 * Firestore rules restrict this to the camp's host (or admin) and only allow
 * the adminResponse/adminResponseAt fields to change.
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
/**
 * Edits an existing guest review.
 * Uses the atomic batch + getAfter rules pattern:
 * review doc is updated and the camp aggregate is recalculated in one batch
 * (count unchanged, old rating swapped for new rating).
 * Falls back to a review-only update if the batch is rejected.
 */
export const editReview = async (params: {
  reviewId: string;
  campId: string;
  oldRating: number;
  newRating: number;
  comment: string;
}): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');

  const reviewRef = doc(db, 'reviews', params.reviewId);
  const campRef = doc(db, 'camps', params.campId);
  const campSnap = await getDoc(campRef);

  if (campSnap.exists()) {
    const campData = campSnap.data() as Record<string, any>;
    const currentRating = typeof campData.rating === 'number' ? campData.rating : 0;
    // Honour both field names: reviewCount (canonical) and reviews (legacy)
    const currentCount =
      typeof campData.reviewCount === 'number'
        ? campData.reviewCount
        : typeof campData.reviews === 'number'
        ? campData.reviews
        : 1;
    // Swap old rating for new rating; count stays the same
    const newAggRating =
      currentCount > 1
        ? (currentRating * currentCount - params.oldRating + params.newRating) / currentCount
        : params.newRating;

    const batch = writeBatch(db);
    batch.update(reviewRef, {
      rating: params.newRating,
      reviewText: params.comment,
      updatedAt: serverTimestamp(),
    });
    // Only write the fields the Firestore rules allow guests to touch
    batch.update(campRef, {
      rating: newAggRating,
      reviewCount: currentCount,
      lastReviewId: params.reviewId,
    });
    // Do not catch — any batch rejection must surface to the caller so the
    // UI can show an error rather than silently leaving the aggregate wrong.
    await batch.commit();
    return;
  }

  // Camp doc missing — update just the review (aggregate has nowhere to live)
  await updateDoc(reviewRef, {
    rating: params.newRating,
    reviewText: params.comment,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Deletes an existing guest review.
 * Uses the atomic batch + getAfter rules pattern:
 * review doc is deleted and the camp aggregate is decremented in one batch.
 * Falls back to a review-only delete if the batch is rejected.
 */
export const deleteReview = async (params: {
  reviewId: string;
  campId: string;
  oldRating: number;
}): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');

  const reviewRef = doc(db, 'reviews', params.reviewId);
  const campRef = doc(db, 'camps', params.campId);
  const campSnap = await getDoc(campRef);

  if (campSnap.exists()) {
    const campData = campSnap.data() as Record<string, any>;
    const currentRating = typeof campData.rating === 'number' ? campData.rating : 0;
    // Honour both field names: reviewCount (canonical) and reviews (legacy)
    const currentCount =
      typeof campData.reviewCount === 'number'
        ? campData.reviewCount
        : typeof campData.reviews === 'number'
        ? campData.reviews
        : 1;
    const newCount = Math.max(currentCount - 1, 0);
    const newAggRating =
      newCount === 0
        ? 0
        : (currentRating * currentCount - params.oldRating) / newCount;

    const batch = writeBatch(db);
    batch.delete(reviewRef);
    // Only write the fields the Firestore rules allow guests to touch
    batch.update(campRef, {
      rating: newAggRating,
      reviewCount: newCount,
      lastReviewId: params.reviewId,
    });
    // Do not catch — any batch rejection must surface to the caller so the
    // UI can show an error rather than silently leaving the aggregate wrong.
    await batch.commit();
    return;
  }

  // Camp doc missing — delete just the review (aggregate has nowhere to live)
  await deleteDoc(reviewRef);
};

/**
 * Fetch all reviews for a host's camps in one call.
 * Batches campIds in chunks of 10 (Firestore 'in' limit).
 * Returns reviews sorted newest-first.
 */
export const getReviewsByHostCamps = async (hostId: string): Promise<Review[]> => {
  if (!db) return [];

  const campsSnap = await getDocs(
    query(collection(db, 'camps'), where('hostId', '==', hostId))
  );
  if (campsSnap.empty) return [];

  const campIds = campsSnap.docs.map((d) => d.id);
  const reviews: Review[] = [];

  for (let i = 0; i < campIds.length; i += 10) {
    const chunk = campIds.slice(i, i + 10);
    const snap = await getDocs(
      query(collection(db, 'reviews'), where('campId', 'in', chunk))
    );
    snap.docs.forEach((d) => {
      const data = d.data() as Record<string, any>;
      const rating = Number(data.rating);
      reviews.push({
        id: d.id,
        campId: String(data.campId || ''),
        userId: String(data.userId || ''),
        rating: Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0,
        reviewText: typeof data.reviewText === 'string' ? data.reviewText : '',
        userName: typeof data.userName === 'string' && data.userName.trim() ? data.userName : 'Guest',
        userPhoto: typeof data.userPhoto === 'string' && data.userPhoto.trim() ? data.userPhoto : undefined,
        createdAt: timestampToString(data.createdAt),
        verified: data.verified === true,
        adminResponse: typeof data.adminResponse === 'string' && data.adminResponse.trim() ? data.adminResponse : undefined,
      } as Review);
    });
  }

  reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return reviews;
};

/**
 * Record the host's last reviews-page visit in their Firestore user doc.
 * Used to compute unread-review counts across sessions.
 */
export const recordReviewsVisit = async (userId: string): Promise<void> => {
  if (!db) return;
  try {
    await updateDoc(doc(db, 'users', userId), {
      lastReviewsVisitAt: new Date().toISOString(),
    });
  } catch {
    // Best-effort — never block the UI
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
const sendEmailViaApi = async (type: EmailType, bookingId: string): Promise<void> => {
  const idToken = await auth?.currentUser?.getIdToken();
  if (!idToken) return;
  await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/emails/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ type, bookingId }),
  });
};

export const getOrCreateThread = async (params: {
  bookingId: string;
  campId: string;
  campTitle: string;
  guestId: string;
  hostId: string;
}): Promise<Thread> => {
  if (!db) throw new Error('Firestore not initialized');
  const { bookingId, campId, campTitle, guestId, hostId } = params;
  const tid = threadDocId(bookingId);
  const ref = doc(db, 'threads', tid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const d = snap.data() as Record<string, unknown>;
    return {
      id: snap.id,
      bookingId: String(d['bookingId'] ?? ''),
      campId: String(d['campId'] ?? ''),
      campTitle: String(d['campTitle'] ?? ''),
      guestId: String(d['guestId'] ?? ''),
      hostId: String(d['hostId'] ?? ''),
      lastMessage: String(d['lastMessage'] ?? ''),
      lastMessageAt: tsToString(d['lastMessageAt']),
      lastMessageBy: (d['lastMessageBy'] as 'guest' | 'host') ?? 'guest',
      unreadGuest: Number(d['unreadGuest'] ?? 0),
      unreadHost: Number(d['unreadHost'] ?? 0),
      createdAt: tsToString(d['createdAt']),
    };
  }
  const now = new Date().toISOString();
  const data = { bookingId, campId, campTitle, guestId, hostId, lastMessage: '', lastMessageAt: now, lastMessageBy: 'guest' as const, unreadGuest: 0, unreadHost: 0, createdAt: now };
  await setDoc(ref, data);
  return { id: tid, ...data };
};

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderRole: 'guest' | 'host';
  createdAt: string;
}

/**
 * Fire-and-forget: notify the other party of a new message via the API server.
 */
export const notifyNewMessage = async (threadId: string, messageId: string): Promise<void> => {
  try {
    const idToken = await auth?.currentUser?.getIdToken();
    if (!idToken) return;
    await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/notifications/new-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ threadId, messageId }),
    });
  } catch {
    // Best-effort — never block the UI
  }
};

const tsToString = (ts: unknown): string => {
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts === 'string') return ts;
  return new Date().toISOString();
};

export const markThreadRead = async (
  bookingId: string,
  role: 'guest' | 'host'
): Promise<void> => {
  if (!db) return;
  const field = role === 'guest' ? 'unreadGuest' : 'unreadHost';
  try {
    await updateDoc(doc(db, 'threads', threadDocId(bookingId)), { [field]: 0 });
  } catch {
    // Best-effort
  }
};

export const subscribeToUserThreads = (
  userId: string,
  role: 'guest' | 'host',
  onData: (threads: Thread[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
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
      const threads: Thread[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          bookingId: String(data['bookingId'] ?? ''),
          campId: String(data['campId'] ?? ''),
          campTitle: String(data['campTitle'] ?? ''),
          guestId: String(data['guestId'] ?? ''),
          hostId: String(data['hostId'] ?? ''),
          lastMessage: String(data['lastMessage'] ?? ''),
          lastMessageAt: tsToString(data['lastMessageAt']),
          lastMessageBy: (data['lastMessageBy'] as 'guest' | 'host') ?? 'guest',
          unreadGuest: Number(data['unreadGuest'] ?? 0),
          unreadHost: Number(data['unreadHost'] ?? 0),
          createdAt: tsToString(data['createdAt']),
        };
      });
      onData(threads);
    },
    (err) => onError?.(err)
  );
};

export const sendMessage = async (params: {
  bookingId: string;
  senderId: string;
  senderRole: 'guest' | 'host';
  text: string;
}): Promise<string> => {
  if (!db) throw new Error('Firestore not initialized');
  const { bookingId, senderId, senderRole, text } = params;
  const tid = threadDocId(bookingId);
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  const msgRef = doc(collection(db, 'threads', tid, 'messages'));
  batch.set(msgRef, { text: text.trim(), senderId, senderRole, createdAt: now });
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

const threadDocId = (bookingId: string) => `booking_${bookingId}`;

export const subscribeToMessages = (
  bookingId: string,
  onData: (msgs: Message[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!db) return () => {};
  const q = query(
    collection(db, 'threads', threadDocId(bookingId), 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const msgs: Message[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          text: String(data['text'] ?? ''),
          senderId: String(data['senderId'] ?? ''),
          senderRole: (data['senderRole'] as 'guest' | 'host') ?? 'guest',
          createdAt: tsToString(data['createdAt']),
        };
      });
      onData(msgs);
    },
    (err) => onError?.(err)
  );
};
