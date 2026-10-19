/**
 * Earnings computation unit tests — runs with:
 *   node --experimental-strip-types --test src/lib/__tests__/earningsComputation.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeEarnings, type BookingForEarnings } from '../earningsComputation.ts';

// Fix "now" to 2026-08-18 for deterministic month-boundary tests
const NOW = new Date('2026-08-18T12:00:00Z');
const THIS_MONTH = '2026-08-10T09:00:00Z';
const LAST_MONTH = '2026-07-15T09:00:00Z';

function b(
  paymentStatus: string,
  status: string,
  totalPrice: number = 100,
  createdAt: BookingForEarnings['createdAt'] = THIS_MONTH
): BookingForEarnings {
  return { paymentStatus, status, totalPrice, createdAt };
}

describe('computeEarnings', () => {
  it('returns zeros for empty list', () => {
    const r = computeEarnings([], NOW);
    assert.deepEqual(r, { totalGross: 0, monthGross: 0, pendingPayout: 0 });
  });

  it('counts card-paid bookings in gross', () => {
    const r = computeEarnings([b('paid', 'completed')], NOW);
    assert.equal(r.totalGross, 100);
    assert.equal(r.monthGross, 100);
  });

  it('counts cash_collected bookings in gross', () => {
    const r = computeEarnings([b('cash_collected', 'completed')], NOW);
    assert.equal(r.totalGross, 100);
    assert.equal(r.monthGross, 100);
  });

  it('excludes pending, failed, refunded, and cancelled bookings', () => {
    const bookings = [
      b('pending', 'pending'),
      b('failed', 'cancelled'),
      b('refunded', 'cancelled'),
      b('partially_refunded', 'completed'),
    ];
    const r = computeEarnings(bookings, NOW);
    assert.deepEqual(r, { totalGross: 0, monthGross: 0, pendingPayout: 0 });
  });

  it('only includes current-month bookings in monthGross', () => {
    const bookings = [
      b('paid', 'completed', 100, THIS_MONTH),
      b('paid', 'completed', 200, LAST_MONTH),
    ];
    const r = computeEarnings(bookings, NOW);
    assert.equal(r.totalGross, 300);
    assert.equal(r.monthGross, 100);
  });

  it('adds online paid+confirmed to pendingPayout', () => {
    const bookings = [
      b('paid', 'confirmed', 100),        // pending payout
      b('paid', 'completed', 100),        // already settled
      b('cash_collected', 'confirmed', 100), // cash — no payout
    ];
    const r = computeEarnings(bookings, NOW);
    assert.equal(r.totalGross, 300);
    assert.equal(r.pendingPayout, 100);
  });

  it('cash_collected confirmed bookings are NOT added to pendingPayout', () => {
    const r = computeEarnings([b('cash_collected', 'confirmed')], NOW);
    assert.equal(r.totalGross, 100);
    assert.equal(r.pendingPayout, 0);
  });

  it('handles Firestore Timestamp-shaped createdAt', () => {
    const ts = { toDate: () => new Date(THIS_MONTH) };
    const r = computeEarnings([b('paid', 'completed', 100, ts)], NOW);
    assert.equal(r.monthGross, 100);
  });

  it('handles null createdAt — counted in total but not in month', () => {
    const r = computeEarnings([b('paid', 'completed', 100, null)], NOW);
    assert.equal(r.totalGross, 100);
    assert.equal(r.monthGross, 0);
  });

  it('accumulates multiple bookings correctly', () => {
    const bookings = [
      b('paid', 'confirmed', 50),
      b('cash_collected', 'completed', 75),
      b('paid', 'completed', 25, LAST_MONTH),
      b('pending', 'pending', 999),
    ];
    const r = computeEarnings(bookings, NOW);
    assert.equal(r.totalGross, 150);    // 50 + 75 + 25 (not 999)
    assert.equal(r.monthGross, 125);    // 50 + 75 (this month)
    assert.equal(r.pendingPayout, 50);  // only paid+confirmed
  });
});
