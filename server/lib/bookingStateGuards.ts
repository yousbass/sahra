/**
 * Pure guards for server-authoritative booking state transitions.
 *
 * Keep these decisions outside route handlers so their financial and
 * availability invariants are easy to test without a live Firebase service.
 */

export function isCancellableBookingStatus(status: string): boolean {
  return status === "pending" || status === "confirmed";
}

export function isAuthoritativeCampHost(
  camp: Record<string, unknown> | null,
  callerId: string,
): boolean {
  return camp !== null && camp["hostId"] === callerId;
}

export function hasMatchingAvailabilityLock(
  lock: Record<string, unknown> | null,
  bookingId: string,
): boolean {
  return lock !== null && lock["bookingId"] === bookingId;
}