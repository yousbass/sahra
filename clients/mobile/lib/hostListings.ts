import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  type FieldValue,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Camp,
  Booking,
  BlockedDate,
  normalizeCampDoc,
  timestampToString,
  getBookingsByCamp,
} from './firestore';

/**
 * Host-side listing management, mirroring the LIVE web contracts exactly
 * (artifacts/sahra/src/lib/firestore.ts + lib/dateBlocking.ts). All three
 * clients share one production Firebase, so field names/shapes/defaults here
 * must never drift from the web create flow.
 *
 * IMPORTANT: host tools never write to availabilityLocks — that collection
 * belongs to the guest booking transaction only.
 */

// ---------- Types (create-flow field contract) ----------

export interface TentConfig {
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

export type CancellationPolicyType = 'full_refundable' | 'partial_refundable';

export interface RefundRule {
  hoursBeforeCheckIn: number;
  refundPercentage: number;
  description: string;
}

export interface CancellationPolicy {
  type: CancellationPolicyType;
  arboonPercentage?: number;
  refundRules?: RefundRule[];
}

// Web parity: DEFAULT_PARTIAL_REFUND_RULES in sahra lib/refundCalculator.ts
export const DEFAULT_PARTIAL_REFUND_RULES: RefundRule[] = [
  {
    hoursBeforeCheckIn: 48,
    refundPercentage: 100,
    description: 'Full refund (minus عربون) if cancelled 48+ hours before check-in',
  },
  {
    hoursBeforeCheckIn: 24,
    refundPercentage: 50,
    description: '50% refund (minus عربون) if cancelled 24-48 hours before check-in',
  },
  {
    hoursBeforeCheckIn: 0,
    refundPercentage: 0,
    description: 'No refund if cancelled less than 24 hours before check-in',
  },
];

export type ListingType = 'camp' | 'kashta';

/** Payload shape assembled by the create/edit form — identical to web CreateListing's CampData. */
export interface CampData {
  slug: string;
  title: string;
  location: string;
  coordinates: { lat: number; lng: number };
  price: number;
  /**
   * Optional peak-night rates (BHD). Only written when > 0. On edit, pass
   * `deleteField()` to remove a rate a host has turned off.
   */
  weekendPrice?: number | FieldValue;
  holidayPrice?: number | FieldValue;
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
  tents?: TentConfig[];
  tentConfiguration?: { large: number; small: number; entertainment: number };
  seatingCapacity?: number;
  beachfrontAccess?: boolean;
  shadeType?: 'tent' | 'umbrella' | 'pergola' | 'natural';
  viewType?: 'beach' | 'mixed';
  waterActivities?: string[];
  instantBook?: boolean;
  status?: string;
}

/**
 * Firestore rejects `undefined` values. The web form only ends up with
 * undefined for genuinely optional fields (campArea, shadeType, viewType) —
 * dropping the key writes the same document a web host gets when those
 * fields are filled-or-absent.
 */
const stripUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
};

// ---------- Camps CRUD (web parity) ----------

/** Mirrors web createCamp: same defaults, counters and serverTimestamp. */
export const createCampListing = async (campData: CampData, hostId: string): Promise<string> => {
  if (!db) throw new Error('Firestore is not initialized');

  const docRef = await addDoc(collection(db, 'camps'), {
    ...stripUndefined(campData as unknown as Record<string, unknown>),
    hostId,
    createdAt: serverTimestamp(),
    status: campData.status || 'pending',
    listingType: campData.listingType || 'camp',
    rating: 0,
    reviewCount: 0,
    views: 0,
    bookingCount: 0,
  });

  // Best-effort "listing submitted" email — same as web createCamp.
  try {
    const hostDoc = await getDoc(doc(db, 'users', hostId));
    const hostEmail = hostDoc.exists() ? (hostDoc.data() as Record<string, any>).email : undefined;
    if (hostEmail) {
      await sendListingPendingEmail(
        {
          campName: campData.title || 'Your camp',
          campLocation: campData.location,
          hostName: (hostDoc.data() as Record<string, any>)?.displayName || 'Host',
          approvalDate: new Date().toISOString(),
          dashboardUrl: 'https://www.mukhymat.com/host/dashboard',
        },
        hostEmail
      );
    }
  } catch {
    // Emails are best-effort; the listing itself was created.
  }

  return docRef.id;
};

/** Mirrors web updateCamp: partial update + ISO-string updatedAt. */
export const updateCampListing = async (
  campId: string,
  updates: Partial<CampData>
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  await updateDoc(doc(db, 'camps', campId), {
    ...stripUndefined(updates as Record<string, unknown>),
    updatedAt: new Date().toISOString(),
  });
};

/** Delete a camp listing — blocked if any active bookings exist (Audit v4 H-4). */
export const deleteCampListing = async (campId: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');

  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const activeSnap = await getDocs(
    query(
      collection(db, 'bookings'),
      where('campId', '==', campId),
      where('status', 'in', ['pending', 'confirmed']),
    )
  );
  if (!activeSnap.empty) {
    throw new Error('Cannot delete a listing that has active bookings.');
  }

  await deleteDoc(doc(db, 'camps', campId));
};

/** Mirrors web getCampsByHost: where hostId ==, no orderBy (query order preserved). */
export const getCampsByHost = async (hostId: string): Promise<Camp[]> => {
  if (!db) return [];
  const q = query(collection(db, 'camps'), where('hostId', '==', hostId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizeCampDoc(d.id, d.data()));
};

/**
 * Raw camp doc for the edit form ONLY. Display surfaces read normalized docs
 * (normalizeCampDoc); the edit form needs the verbatim stored shape — the
 * photo/photos split, string `rules`, the cancellationPolicy object — exactly
 * like the web EditListing prefill. Enforces ownership like the web does.
 */
export const getCampRawForEdit = async (
  campId: string,
  hostId: string
): Promise<Record<string, any> | null> => {
  if (!db) throw new Error('Firestore is not initialized');
  const snap = await getDoc(doc(db, 'camps', campId));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, any>;
  if (data.hostId !== hostId) throw new NotListingOwnerError();
  return { id: snap.id, ...data };
};

export class NotListingOwnerError extends Error {
  code = 'not-owner' as const;
  constructor() {
    super('You can only edit your own listings');
    this.name = 'NotListingOwnerError';
  }
}

// ---------- Host bookings (read-only, web parity) ----------

export interface HostBooking extends Booking {
  createdAt?: string;
  paymentMethod?: 'card' | 'apple_pay' | 'google_pay' | 'cash_on_arrival';
}

/** Mirrors web getBookingsByHost: where hostId ==, newest first client-side. */
export const getBookingsByHost = async (hostId: string): Promise<HostBooking[]> => {
  if (!db) return [];
  const q = query(collection(db, 'bookings'), where('hostId', '==', hostId));
  const snap = await getDocs(q);
  const bookings = snap.docs.map((d) => {
    const data = d.data() as Record<string, any>;
    return {
      id: d.id,
      ...data,
      createdAt: timestampToString(data.createdAt),
    } as HostBooking;
  });
  bookings.sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
  return bookings;
};

// ---------- Availability (booked + blocked dates, web parity) ----------

/** 'YYYY-MM-DD' (or ISO string) -> local Date at midnight, avoiding TZ shifts. */
export const parseDateOnly = (value: string): Date => {
  const datePart = (value || '').slice(0, 10);
  const [y, m, d] = datePart.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
};

/**
 * Mirrors web getBookedDates (lib/availability.ts): check-in dates of all
 * non-cancelled bookings. Checkout days stay available.
 */
export const getBookedDatesForCamp = async (campId: string): Promise<Date[]> => {
  const bookings = await getBookingsByCamp(campId);
  return bookings
    .filter((b) => b.status !== 'cancelled')
    .map((b) => parseDateOnly(b.checkInDate))
    .filter((d) => !isNaN(d.getTime()));
};

export class BookingConflictError extends Error {
  code = 'booking-conflict' as const;
  conflictCount: number;
  constructor(count: number) {
    super(`Cannot block dates: ${count} existing booking(s) in this range`);
    this.name = 'BookingConflictError';
    this.conflictCount = count;
  }
}

export type BlockReasonCategory =
  | 'maintenance'
  | 'personal'
  | 'weather'
  | 'event'
  | 'seasonal'
  | 'other';

/**
 * Mirrors web blockDates (lib/dateBlocking.ts) verbatim:
 * - rejects when any non-cancelled booking's check-in falls inside the range
 * - writes the exact blockedDates document shape the web writes
 */
export const blockDatesForCamp = async (
  campId: string,
  hostId: string,
  range: { startDate: Date; endDate: Date },
  reason: string,
  reasonCategory: BlockReasonCategory,
  notes?: string
): Promise<string> => {
  if (!db) throw new Error('Firestore is not initialized');

  const start = new Date(range.startDate);
  const end = new Date(range.endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  if (end.getTime() < start.getTime()) throw new Error('invalid-range');

  const bookings = await getBookingsByCamp(campId);
  const conflicts = bookings.filter((b) => {
    if (b.status === 'cancelled') return false;
    const checkIn = parseDateOnly(b.checkInDate);
    return checkIn.getTime() >= start.getTime() && checkIn.getTime() <= end.getTime();
  });
  if (conflicts.length > 0) throw new BookingConflictError(conflicts.length);

  const docRef = await addDoc(collection(db, 'blockedDates'), {
    campId,
    hostId,
    startDate: Timestamp.fromDate(range.startDate),
    endDate: Timestamp.fromDate(range.endDate),
    reason: reason || 'Not specified',
    reasonCategory: reasonCategory || 'other',
    createdBy: hostId,
    createdAt: serverTimestamp(),
    ...(notes ? { notes } : {}),
  });
  return docRef.id;
};

/** Mirrors web unblockDates: plain delete of the blockedDates doc. */
export const unblockDatesForCamp = async (blockId: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  await deleteDoc(doc(db, 'blockedDates', blockId));
};

export type { BlockedDate };

// ---------- Best-effort listing-pending email (same API route as web) ----------

interface ListingPendingData {
  campName: string;
  campLocation?: string;
  hostName?: string;
  approvalDate?: string;
  dashboardUrl?: string;
}

const listingPendingEmailHtml = (d: ListingPendingData): string => {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f2ea;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#0A1128;border-radius:12px 12px 0 0;padding:20px 24px;">
      <span style="color:#F0A03C;font-size:20px;font-weight:bold;letter-spacing:2px;">MUKHYMAT</span>
    </div>
    <div style="background:#ffffff;border-radius:0 0 12px 12px;padding:24px;">
      <h2 style="margin:0 0 8px;color:#111827;">We received your listing!</h2>
      <p style="margin:0 0 12px;color:#4b5563;font-size:14px;">Hi ${d.hostName || 'Host'},</p>
      <p style="margin:0 0 12px;color:#4b5563;font-size:14px;">Your camp <strong>${d.campName}</strong>${d.campLocation ? ` in ${d.campLocation}` : ''} has been submitted for review. Our team will approve it soon.</p>
      <p style="margin:0 0 16px;color:#4b5563;font-size:14px;">You can check your dashboard for status updates.</p>
      <a href="${d.dashboardUrl || 'https://www.mukhymat.com/host/dashboard'}" style="display:inline-block;padding:12px 24px;background:#0A1128;color:#F0A03C;border-radius:6px;text-decoration:none;font-weight:bold;">Go to Dashboard</a>
      <p style="margin-top:16px;font-size:12px;color:#6b7280;">Submitted on ${d.approvalDate ? new Date(d.approvalDate).toLocaleString() : new Date().toLocaleString()}</p>
    </div>
  </div>
</body></html>`;
};

const sendListingPendingEmail = async (
  listingData: ListingPendingData,
  hostEmail: string
): Promise<void> => {
  const base = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  await fetch(`${base}/api/emails/listing-pending`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      listingData,
      hostEmail,
      htmlContent: listingPendingEmailHtml(listingData),
    }),
  });
};
