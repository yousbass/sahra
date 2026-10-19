// ---------------------------------------------------------------------------
// expirySweep.ts — server-side sweep that marks expired unpaid bookings and
// releases their availability slots so other guests can book those dates.
//
// Safety invariants:
//  • Never touches bookings with paymentStatus 'paid', 'pending_verification',
//    or 'cash_collected' — guards against races with the Tap webhook.
//  • Removes the campAvailability index entry ONLY if it still points at this
//    booking — a newer booking may have already reclaimed the slot.
//  • All reads and writes for a single booking are inside one Admin SDK
//    transaction (read-before-write ordering respected).
//  • Idempotent: a booking already marked 'expired' is skipped on the
//    re-read guard inside the transaction.
//  • Full pagination: iterates through all matching docs in BATCH_SIZE chunks
//    so terminal historic records (confirmed/cancelled/already-expired) can
//    never fill the batch and starve real pending candidates.
// ---------------------------------------------------------------------------

import { getAdminFirestore } from "./firestoreAdmin.js";
import { logger } from "./logger.js";

/** States that mean the booking was already settled or released — skip it. */
const SKIP_PAYMENT_STATUSES = new Set([
  "paid",
  "pending_verification",
  "cash_collected",
  "expired",
]);

const SKIP_STATUSES = new Set(["confirmed", "cancelled", "expired"]);

/** Number of docs fetched per pagination page. */
const BATCH_SIZE = 200;

/** Max concurrent Firestore transactions per page to avoid saturation. */
const CONCURRENCY = 10;

export interface SweepResult {
  swept: number;
  skipped: number;
  errors: number;
  pages: number;
}

/**
 * Sweep all bookings whose `expiresAt` timestamp is in the past, have no
 * successful payment, and are still status=pending.  For each one:
 *  1. Mark status='expired', paymentStatus='expired' in the booking doc.
 *  2. Delete the campAvailability date-index entry if it still references
 *     this booking, so the date is unblocked for future guests.
 *
 * Pagination: iterates through ALL matching docs in pages of BATCH_SIZE so
 * that terminal records (already paid/cancelled/expired) cannot crowd out
 * pending candidates regardless of how many accumulate over time.
 */
export async function sweepExpiredBookings(): Promise<SweepResult> {
  const db = getAdminFirestore();
  const now = Date.now();
  const result: SweepResult = { swept: 0, skipped: 0, errors: 0, pages: 0 };

  // Single-field range query on expiresAt with orderBy on the same field —
  // no composite index required (Firestore handles single-field range +
  // orderBy on the same field with the built-in single-field index).
  // The orderBy is required for cursor-based pagination via startAfter.
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  for (;;) {
    let query = db
      .collection("bookings")
      .where("expiresAt", ">", 0)
      .where("expiresAt", "<", now)
      .orderBy("expiresAt")
      .limit(BATCH_SIZE);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snap = await query.get();
    result.pages += 1;

    if (snap.empty) {
      break;
    }

    logger.debug(
      { page: result.pages, count: snap.size },
      "expirySweep: processing page",
    );

    // Process docs in this page with bounded concurrency.
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += CONCURRENCY) {
      const chunk = docs.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (docSnap) => {
          const bookingId = docSnap.id;
          try {
            const swept = await expireBookingIfEligible(db, bookingId, now);
            if (swept) {
              result.swept += 1;
            } else {
              result.skipped += 1;
            }
          } catch (err) {
            result.errors += 1;
            logger.error(
              { err, bookingId },
              "expirySweep: failed to process booking",
            );
          }
        }),
      );
    }

    // Advance the cursor. If we got a full page there may be more.
    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < BATCH_SIZE) {
      // Last page — no more docs.
      break;
    }
  }

  if (result.swept > 0 || result.errors > 0) {
    logger.info(result, "expirySweep: complete");
  } else {
    logger.debug(result, "expirySweep: complete (nothing to sweep)");
  }

  return result;
}

/**
 * Attempt to expire a single booking inside an Admin SDK transaction.
 * Returns true if the booking was expired, false if it was skipped (already
 * in a terminal state or paid).
 */
async function expireBookingIfEligible(
  db: FirebaseFirestore.Firestore,
  bookingId: string,
  now: number,
): Promise<boolean> {
  let expired = false;

  await db.runTransaction(async (tx) => {
    const bookingRef = db.collection("bookings").doc(bookingId);
    const snap = await tx.get(bookingRef);

    if (!snap.exists) {
      // Document disappeared between the query and now — skip safely.
      return;
    }

    const d = snap.data()!;
    const status = String(d["status"] ?? "");
    const paymentStatus = String(d["paymentStatus"] ?? "");
    const paymentMethod = String(d["paymentMethod"] ?? "");

    // Skip guard: paid, confirmed, already expired, or cancelled — don't touch.
    if (SKIP_STATUSES.has(status) || SKIP_PAYMENT_STATUSES.has(paymentStatus)) {
      return;
    }

    // Cash-on-arrival bookings never have an expiresAt payment window — skip.
    if (paymentMethod === "cash_on_arrival") {
      return;
    }

    // Re-verify expiry on the freshly-read doc (the query read may be stale).
    const expiresAt =
      typeof d["expiresAt"] === "number" ? (d["expiresAt"] as number) : 0;
    if (!expiresAt || expiresAt >= now) {
      // Not actually expired yet (or no expiry set) — skip.
      return;
    }

    // Read all docs that will be conditionally written BEFORE any writes —
    // Firestore Admin SDK transactions require all reads to precede the first
    // write in the callback.
    const campId = String(d["campId"] ?? "");
    const checkInDate = String(d["checkInDate"] ?? "");

    // 1. Public campAvailability index (read by the calendar UI).
    let availIndexRef: FirebaseFirestore.DocumentReference | null = null;
    let availIndexSnap: FirebaseFirestore.DocumentSnapshot | null = null;

    // 2. Authoritative availability lock (read+enforced by createBookingWithLock).
    //    Key format: `${campId}_${checkInDate}` — matches the client-side writer.
    let lockRef: FirebaseFirestore.DocumentReference | null = null;
    let lockSnap: FirebaseFirestore.DocumentSnapshot | null = null;

    if (campId && checkInDate) {
      availIndexRef = db
        .collection("campAvailability")
        .doc(campId)
        .collection("dates")
        .doc(checkInDate);
      availIndexSnap = await tx.get(availIndexRef);

      lockRef = db
        .collection("availabilityLocks")
        .doc(`${campId}_${checkInDate}`);
      lockSnap = await tx.get(lockRef);
    }

    // Mark the booking expired.
    const nowIso = new Date(now).toISOString();
    tx.update(bookingRef, {
      status: "expired",
      paymentStatus: "expired",
      expiredAt: nowIso,
      updatedAt: nowIso,
    });

    // Helper: delete an index/lock doc only when it still points at THIS booking.
    // If a newer booking already reclaimed the slot its bookingId will differ —
    // leave it untouched so the newer guest's reservation is not corrupted.
    function deleteIfOwned(
      ref: FirebaseFirestore.DocumentReference,
      snap: FirebaseFirestore.DocumentSnapshot,
    ): void {
      const storedId = snap.exists
        ? (snap.data() as Record<string, unknown>)["bookingId"]
        : undefined;
      if (!snap.exists || !storedId || storedId === bookingId) {
        tx.delete(ref);
      }
    }

    // Release the public availability calendar entry.
    if (availIndexRef && availIndexSnap !== null) {
      deleteIfOwned(availIndexRef, availIndexSnap);
    }

    // Release the authoritative lock so createBookingWithLock can reclaim the
    // slot for a new guest.  Without this, new reservations see status='expired'
    // (not 'cancelled' or 'pending+expiresAt<now') and throw DateUnavailableError
    // even though the sweep already freed the calendar entry.
    if (lockRef && lockSnap !== null) {
      deleteIfOwned(lockRef, lockSnap);
    }

    expired = true;
  });

  if (expired) {
    logger.info({ bookingId }, "expirySweep: booking expired and date released");
  }

  return expired;
}
