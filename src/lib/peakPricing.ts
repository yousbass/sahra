// Peak-night pricing — Bahrain weekends (Thursday & Friday nights) and public
// holidays. Hosts may set optional weekendPrice / holidayPrice on a camp doc;
// every client AND the server derive the nightly rate for a date through this
// same logic so displayed and charged amounts always agree.
//
// Precedence: holiday > weekend > standard. A field only applies when it is a
// number > 0; otherwise the standard nightly rate is used.

/**
 * Bahrain public holidays (YYYY-MM-DD). Fixed-date holidays are exact;
 * Islamic-calendar holidays are the expected Gregorian dates and may shift by
 * a day with moon sighting — extend this list each year.
 */
export const BAHRAIN_PUBLIC_HOLIDAYS: ReadonlySet<string> = new Set([
  // 2026 — fixed
  '2026-01-01', // New Year's Day
  '2026-05-01', // Labour Day
  '2026-12-16', '2026-12-17', // National Day
  // 2026 — Islamic (expected)
  '2026-03-19', '2026-03-20', '2026-03-21', // Eid al-Fitr
  '2026-05-26', '2026-05-27', '2026-05-28', // Arafat Day + Eid al-Adha
  '2026-06-16', // Islamic New Year
  '2026-06-25', '2026-06-26', // Ashura
  '2026-08-25', // Prophet's Birthday
  // 2027 — fixed
  '2027-01-01',
  '2027-05-01',
  '2027-12-16', '2027-12-17',
  // 2027 — Islamic (expected)
  '2027-03-09', '2027-03-10', '2027-03-11', // Eid al-Fitr
  '2027-05-16', '2027-05-17', '2027-05-18', // Arafat Day + Eid al-Adha
  '2027-06-06', // Islamic New Year
  '2027-06-14', '2027-06-15', // Ashura
  '2027-08-14', // Prophet's Birthday

  // 2028 — fixed
  '2028-01-01', // New Year's Day
  '2028-05-01', // Labour Day
  '2028-12-16', '2028-12-17', // National Day
  // 2028 — Islamic (expected; may shift ±1 day with moon sighting)
  '2028-02-26', '2028-02-27', '2028-02-28', // Eid al-Fitr
  '2028-05-04', '2028-05-05', '2028-05-06', // Arafat Day + Eid al-Adha
  '2028-05-25', // Islamic New Year
  '2028-06-02', '2028-06-03', // Ashura
  '2028-08-02', // Prophet's Birthday
  // 2029 — fixed
  '2029-01-01',
  '2029-05-01',
  '2029-12-16', '2029-12-17',
  // 2029 — Islamic (expected; may shift ±1 day with moon sighting)
  '2029-02-14', '2029-02-15', '2029-02-16', // Eid al-Fitr
  '2029-04-23', '2029-04-24', '2029-04-25', // Arafat Day + Eid al-Adha
  '2029-05-14', // Islamic New Year
  '2029-05-22', '2029-05-23', // Ashura
  '2029-07-22', // Prophet's Birthday
]);

export type NightlyRateKind = 'standard' | 'weekend' | 'holiday';

export interface PeakPricedCamp {
  /** Canonical nightly rate (normalized clients) */
  pricePerNight?: number;
  /** Legacy nightly rate field */
  price?: number;
  /** Optional rate for Thursday & Friday nights */
  weekendPrice?: number;
  /** Optional rate for Bahrain public holidays */
  holidayPrice?: number;
}

/** Normalize a date input to a local YYYY-MM-DD key. Accepts 'YYYY-MM-DD',
 *  'YYYY-MM-DD HH:mm', ISO strings, or Date objects. */
export function toDateKey(input: string | Date): string {
  if (typeof input === 'string') {
    const m = input.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const d = new Date(input);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const d = input;
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Bahrain weekend nights are Thursday and Friday. */
export function isWeekendDate(input: string | Date): boolean {
  const key = toDateKey(input);
  if (!key) return false;
  // Noon avoids any DST/timezone edge cases when parsing the plain date.
  const dow = new Date(`${key}T12:00:00`).getDay();
  return dow === 4 || dow === 5; // Thu, Fri
}

export function isHolidayDate(input: string | Date): boolean {
  const key = toDateKey(input);
  return !!key && BAHRAIN_PUBLIC_HOLIDAYS.has(key);
}

const validRate = (v: unknown): v is number => typeof v === 'number' && isFinite(v) && v > 0;

/**
 * Authoritative nightly rate for a given booking date.
 * Holiday beats weekend beats standard; unset/invalid peak fields fall back.
 */
export function getNightlyRateForDate(
  camp: PeakPricedCamp,
  date: string | Date,
): { rate: number; kind: NightlyRateKind } {
  const base = validRate(camp.pricePerNight) ? camp.pricePerNight : (validRate(camp.price) ? camp.price : 0);
  if (isHolidayDate(date) && validRate(camp.holidayPrice)) {
    return { rate: camp.holidayPrice, kind: 'holiday' };
  }
  if (isWeekendDate(date) && validRate(camp.weekendPrice)) {
    return { rate: camp.weekendPrice, kind: 'weekend' };
  }
  return { rate: base, kind: 'standard' };
}

/** True when the camp has any peak rate that differs from the standard rate. */
export function hasPeakPricing(camp: PeakPricedCamp): boolean {
  const base = validRate(camp.pricePerNight) ? camp.pricePerNight : (validRate(camp.price) ? camp.price : 0);
  return (
    (validRate(camp.weekendPrice) && camp.weekendPrice !== base) ||
    (validRate(camp.holidayPrice) && camp.holidayPrice !== base)
  );
}

/** Lowest configured nightly rate — for "from X BD" card displays. */
export function getStartingRate(camp: PeakPricedCamp): number {
  const base = validRate(camp.pricePerNight) ? camp.pricePerNight : (validRate(camp.price) ? camp.price : 0);
  const rates = [base];
  if (validRate(camp.weekendPrice)) rates.push(camp.weekendPrice);
  if (validRate(camp.holidayPrice)) rates.push(camp.holidayPrice);
  return Math.min(...rates.filter(r => r > 0));
}
