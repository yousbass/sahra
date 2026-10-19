/**
 * One-off backfill: populate campAvailability/{campId}/dates for every active
 * booking that existed before this index was introduced.
 *
 * Safe to run multiple times — uses set() which is idempotent.
 *
 * Run with:
 *   npx tsx src/scripts/backfillAvailabilityIndex.ts
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON (or GOOGLE_APPLICATION_CREDENTIALS)
 * and VITE_FIREBASE_PROJECT_ID to be set in the environment.
 */

import { getAdminFirestore } from '../lib/firestoreAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const BATCH_SIZE = 400; // Firestore max is 500; stay under with headroom

async function main() {
  const db = getAdminFirestore();

  console.log('[backfill] Reading bookings collection…');
  const bookingsSnap = await db.collection('bookings').get();
  console.log(`[backfill] Found ${bookingsSnap.size} total bookings`);

  const now = Date.now();
  let wrote = 0;
  let skipped = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const docSnap of bookingsSnap.docs) {
    const b = docSnap.data() as {
      campId?: string;
      checkInDate?: string;
      status?: string;
      paymentMethod?: string;
      expiresAt?: number;
    };

    // Skip cancelled bookings — they should not block dates.
    if (!b.campId || !b.checkInDate || b.status === 'cancelled') {
      skipped++;
      continue;
    }

    // The doc id in the index is the YYYY-MM-DD check-in date string.
    const dateDocRef = db
      .collection('campAvailability')
      .doc(b.campId)
      .collection('dates')
      .doc(b.checkInDate);

    // Determine whether this is an online-payment pending booking that still has
    // an unexpired hold.  Confirmed, completed, and cash bookings are written
    // without expiry (permanent block).  For legacy pending online bookings we
    // cannot recover the original expiresAt, so treat them as permanently blocked
    // — the atomic transaction lock at checkout is still the definitive guard.
    const isOnlinePending =
      b.status === 'pending' &&
      b.paymentMethod !== 'cash_on_arrival' &&
      b.paymentMethod != null;

    // For pending online bookings that have an expiresAt we can still honour,
    // skip ones that have already expired so we don't re-surface stale holds.
    if (isOnlinePending && typeof b.expiresAt === 'number' && b.expiresAt < now) {
      console.log(
        `[backfill] Skipping expired pending online booking ${docSnap.id} (${b.checkInDate})`
      );
      skipped++;
      continue;
    }

    const payload: Record<string, unknown> = {
      campId: b.campId,
      date: b.checkInDate,
      // bookingId lets the cancellation path verify that it is not deleting an
      // index entry that was reclaimed by a newer booking for the same date.
      bookingId: docSnap.id,
      bookedAt: FieldValue.serverTimestamp(),
    };

    // Preserve an unexpired online-payment expiry if we have it.
    if (isOnlinePending && typeof b.expiresAt === 'number') {
      payload.paymentMethod = 'online';
      payload.expiresAt = b.expiresAt;
    }

    // set() is idempotent — safe to re-run.
    batch.set(dateDocRef, payload, { merge: true });
    wrote++;
    batchCount++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`[backfill] Committed batch of ${batchCount}`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`[backfill] Committed final batch of ${batchCount}`);
  }

  console.log(
    `[backfill] Done. Wrote: ${wrote}  Skipped (cancelled / expired / no campId): ${skipped}`
  );
}

main().catch((err) => {
  console.error('[backfill] Fatal error:', err);
  process.exit(1);
});
