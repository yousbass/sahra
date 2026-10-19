import { Camp } from './firestore';

/**
 * Normalises all live Firestore policy shapes into a display tier.
 *
 * Priority order:
 * 1. `cancellationPolicy` object  — mobile host form: { type: 'full_refundable' | 'partial_refundable' }
 * 2. `cancellationPolicy` string  — web legacy: 'flexible' | 'moderate' | 'strict'
 * 3. `refundPolicy` string        — oldest web legacy: 'refundable' | 'non-refundable' | 'flexible' | 'moderate' | 'strict'
 * 4. Returns `null` when neither field resolves (caller should omit the badge)
 */
export function resolveCancellationTier(
  cancellationPolicy: Camp['cancellationPolicy'],
  refundPolicy: string | undefined,
): 'free' | 'partial' | 'none' | null {
  // 1. Object shape (mobile host form)
  if (cancellationPolicy && typeof cancellationPolicy === 'object') {
    if (cancellationPolicy.type === 'full_refundable') return 'free';
    if (cancellationPolicy.type === 'partial_refundable') return 'partial';
  }
  // 2. String cancellationPolicy (web legacy)
  if (typeof cancellationPolicy === 'string') {
    if (cancellationPolicy === 'flexible') return 'free';
    if (cancellationPolicy === 'moderate') return 'partial';
    if (cancellationPolicy === 'strict') return 'none';
  }
  // 3. Fall back to refundPolicy (oldest legacy field)
  if (refundPolicy) {
    if (refundPolicy === 'refundable' || refundPolicy === 'flexible') return 'free';
    if (refundPolicy === 'moderate') return 'partial';
    if (refundPolicy === 'non-refundable' || refundPolicy === 'strict') return 'none';
  }
  // 4. Unknown — omit the badge rather than show a false label
  return null;
}
