/**
 * Normalises all live Firestore cancellation-policy shapes into a display tier.
 * Mirrors artifacts/mukhymat-mobile/lib/policyUtils.ts so all clients agree.
 *
 * Live shapes (the legacy compat layer can put any of these into `refundPolicy`):
 * 1. object   — host forms: { type: 'full_refundable' | 'partial_refundable', ... }
 * 2. string   — web legacy: 'flexible' | 'moderate' | 'strict'
 * 3. string   — oldest web legacy: 'refundable' | 'non-refundable'
 * Returns null when nothing resolves — callers should show a neutral
 * "review the policy" message rather than guessing.
 */
export type CancellationTier = 'free' | 'partial' | 'none' | null;

export function resolveCancellationTier(
  cancellationPolicy: unknown,
  refundPolicy?: unknown,
): CancellationTier {
  for (const p of [cancellationPolicy, refundPolicy]) {
    if (p && typeof p === 'object') {
      const type = (p as { type?: string }).type;
      if (type === 'full_refundable') return 'free';
      if (type === 'partial_refundable') return 'partial';
    }
    if (typeof p === 'string') {
      if (p === 'flexible' || p === 'refundable' || p === 'full_refundable') return 'free';
      if (p === 'moderate' || p === 'partial_refundable') return 'partial';
      if (p === 'strict' || p === 'non-refundable') return 'none';
    }
  }
  return null;
}
