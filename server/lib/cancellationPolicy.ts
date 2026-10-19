/**
 * Server-side cancellation policy resolver — the authoritative twin of the
 * client-side `policyUtils.ts` files in artifacts/sahra, sahra-v2, and
 * mukhymat-mobile.
 *
 * The CAMP document (host-written, rules-protected) is the source of truth
 * for the refund tier. Booking-stored `refundPolicy` / `cancellationPolicy`
 * values are client-authored at reservation time and are used only as a
 * fallback when the camp document no longer exists.
 *
 * Live policy shapes:
 * 1. object — host forms: { type: 'full_refundable' | 'partial_refundable', ... }
 * 2. string — web legacy: 'flexible' | 'moderate' | 'strict'
 * 3. string — oldest web legacy: 'refundable' | 'non-refundable'
 * 4. string — server legacy: 'full_refundable' | 'non_refundable'
 */

export type CancellationTier = "free" | "partial" | "none";

export function resolveCancellationTier(
  ...candidates: unknown[]
): CancellationTier | null {
  for (const p of candidates) {
    if (p && typeof p === "object") {
      const type = (p as { type?: string }).type;
      if (type === "full_refundable") return "free";
      if (type === "partial_refundable") return "partial";
    }
    if (typeof p === "string") {
      if (p === "flexible" || p === "refundable" || p === "full_refundable") return "free";
      if (p === "moderate" || p === "partial_refundable") return "partial";
      if (p === "strict" || p === "non-refundable" || p === "non_refundable") return "none";
    }
  }
  return null;
}

/**
 * Refund amount in integer fils (1 BHD = 1000 fils) for a guest-initiated
 * cancellation. Mirrors the schedule the clients display:
 *  - free:    100% ≥1 day before check-in, 50% same-day, 0 after
 *  - partial: 100% ≥5 days before check-in, otherwise 0
 *  - none / unresolved: 0 (conservative default)
 */
export function guestRefundFils(
  tier: CancellationTier | null,
  totalBhd: number,
  daysUntilCheckIn: number,
): number {
  if (!(totalBhd > 0)) return 0;
  const fullFils = Math.round(totalBhd * 1000);
  if (tier === "free") {
    if (daysUntilCheckIn >= 1) return fullFils;
    if (daysUntilCheckIn === 0) return Math.round(totalBhd * 500); // 50% same-day
    return 0;
  }
  if (tier === "partial") {
    return daysUntilCheckIn >= 5 ? fullFils : 0;
  }
  return 0;
}
