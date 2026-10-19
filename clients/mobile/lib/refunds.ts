// Refund calculation — verbatim port of the web app's refund logic
// (artifacts/sahra/src/lib/refundCalculator.ts) so mobile shows the SAME
// numbers the website shows. Display-only: cancelBooking() never writes
// refund amounts; admins process refunds on the web.
//
// NOTE ON POLICY INPUT: the web CancellationDialog passes
// `booking.cancellationPolicy || 'moderate'` — a legacy STRING — into
// calculateRefund, whose object-shape check (`policy.type === 'full_refundable'`)
// is false for strings, so string policies always take the partial-refundable
// branch with the default 20% arboon and default rules. We intentionally
// reproduce that exact runtime behavior for parity.

export interface RefundCalculation {
  refundAmount: number;
  refundPercentage: number;
  serviceFee: number;
  arboonAmount: number; // Non-refundable deposit (عربون)
  canCancel: boolean;
  message: 'full' | 'half' | 'none';
}

export interface RefundRule {
  hoursBeforeCheckIn: number;
  refundPercentage: number;
}

export const DEFAULT_PARTIAL_REFUND_RULES: RefundRule[] = [
  { hoursBeforeCheckIn: 48, refundPercentage: 100 },
  { hoursBeforeCheckIn: 24, refundPercentage: 50 },
  { hoursBeforeCheckIn: 0, refundPercentage: 0 },
];

export type PolicyInput =
  | string
  | {
      type?: 'full_refundable' | 'partial_refundable';
      arboonPercentage?: number;
      refundRules?: RefundRule[];
    }
  | undefined
  | null;

export function calculateRefund(
  totalAmount: number,
  checkInDate: Date,
  cancellationDate: Date,
  policyInput: PolicyInput
): RefundCalculation {
  // Service fee is always non-refundable (10% of total) — same as web.
  const serviceFee = totalAmount * 0.10;
  const hoursUntilCheckIn = (checkInDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60);

  const policy = (policyInput && typeof policyInput === 'object' ? policyInput : {}) as {
    type?: string;
    arboonPercentage?: number;
    refundRules?: RefundRule[];
  };

  if (policy.type === 'full_refundable') {
    const refundPercentage = hoursUntilCheckIn >= 24 ? 100 : 0;
    const refundableAmount = totalAmount - serviceFee;
    return {
      refundAmount: (refundableAmount * refundPercentage) / 100,
      refundPercentage,
      serviceFee,
      arboonAmount: 0,
      canCancel: true,
      message: refundPercentage === 100 ? 'full' : 'none',
    };
  }

  // Partial refundable with عربون (also the path for legacy string policies).
  const arboonAmount = totalAmount * ((policy.arboonPercentage || 20) / 100);
  const refundableBase = totalAmount - serviceFee - arboonAmount;

  const rules = policy.refundRules || DEFAULT_PARTIAL_REFUND_RULES;
  const sortedRules = [...rules].sort((a, b) => b.hoursBeforeCheckIn - a.hoursBeforeCheckIn);

  let refundPercentage = 0;
  for (const rule of sortedRules) {
    if (hoursUntilCheckIn >= rule.hoursBeforeCheckIn) {
      refundPercentage = rule.refundPercentage;
      break;
    }
  }

  return {
    refundAmount: (refundableBase * refundPercentage) / 100,
    refundPercentage,
    serviceFee,
    arboonAmount,
    canCancel: true,
    message: refundPercentage === 100 ? 'full' : refundPercentage > 0 ? 'half' : 'none',
  };
}

/** Legacy policy label key for display (web shows Flexible/Moderate/Strict). */
export function policyLabelKey(policyInput: PolicyInput): 'policyFlexible' | 'policyModerate' | 'policyStrict' {
  if (policyInput === 'flexible') return 'policyFlexible';
  if (policyInput === 'strict') return 'policyStrict';
  return 'policyModerate';
}
