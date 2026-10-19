/**
 * Booking date helpers — single source of truth for displaying stay dates
 * and night counts.
 *
 * Storage convention (shared with mobile and enforced by Firestore rules):
 * a one-night stay is stored with `checkOutDate === checkInDate`
 * ("single-day booking"), while the `checkOut` datetime string
 * ("YYYY-MM-DD HH:mm") carries the guest's real next-morning departure.
 *
 * NEVER show `checkOutDate` directly as the departure date and never derive
 * nights via `checkOutDate - checkInDate` — that displays a same-day
 * checkout and 0 nights. Use these helpers instead.
 */

type BookingDatesLike = {
  checkInDate: string;
  checkOutDate?: string;
  /** Full datetime string "YYYY-MM-DD HH:mm" — carries the real departure day. */
  checkOut?: string;
};

const DAY_MS = 86_400_000;

function parseDateOnly(s?: string): Date | null {
  if (!s || typeof s !== 'string') return null;
  const d = new Date(s.slice(0, 10));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * The calendar date the guest actually departs.
 * Prefers the `checkOut` datetime's date part; falls back to the stored
 * `checkOutDate` when it is genuinely after check-in (future multi-night
 * data); otherwise rolls check-in forward one day.
 */
export function getDepartureDate(b: BookingDatesLike): Date {
  const checkIn = parseDateOnly(b.checkInDate);

  const fromDatetime = parseDateOnly(b.checkOut);
  if (fromDatetime && (!checkIn || fromDatetime.getTime() > checkIn.getTime())) {
    return fromDatetime;
  }

  const stored = parseDateOnly(b.checkOutDate);
  if (stored && checkIn && stored.getTime() > checkIn.getTime()) {
    return stored;
  }

  const base = checkIn ?? stored ?? new Date();
  return new Date(base.getTime() + DAY_MS);
}

/** Departure date as a 'YYYY-MM-DD' string (for formatters that take strings). */
export function getDepartureDateStr(b: BookingDatesLike): string {
  const d = getDepartureDate(b);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Number of nights of the stay — never less than 1. */
export function getNights(b: BookingDatesLike): number {
  const checkIn = parseDateOnly(b.checkInDate);
  if (!checkIn) return 1;
  const nights = Math.round((getDepartureDate(b).getTime() - checkIn.getTime()) / DAY_MS);
  return Math.max(1, nights);
}
