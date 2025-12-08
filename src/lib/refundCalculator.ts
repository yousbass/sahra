export interface RefundCalculation {
  refundAmount: number;
  refundPercentage: number;
  serviceFee: number;
  arboonAmount: number; // Non-refundable deposit (عربون)
  canCancel: boolean;
  message: string;
}

// New cancellation policy types
export type CancellationPolicyType = 'full_refundable' | 'partial_refundable';

export interface CancellationPolicy {
  type: CancellationPolicyType;
  arboonPercentage?: number; // Only for partial_refundable (10-50%)
  refundRules?: RefundRule[]; // Only for partial_refundable
}

export interface RefundRule {
  hoursBeforeCheckIn: number; // Minimum hours before check-in
  refundPercentage: number; // Percentage of (total - arboon) to refund
  description: string;
}

// Default refund rules for partial_refundable policy
export const DEFAULT_PARTIAL_REFUND_RULES: RefundRule[] = [
  {
    hoursBeforeCheckIn: 48,
    refundPercentage: 100,
    description: 'Full refund (minus عربون) if cancelled 48+ hours before check-in'
  },
  {
    hoursBeforeCheckIn: 24,
    refundPercentage: 50,
    description: '50% refund (minus عربون) if cancelled 24-48 hours before check-in'
  },
  {
    hoursBeforeCheckIn: 0,
    refundPercentage: 0,
    description: 'No refund if cancelled less than 24 hours before check-in'
  }
];

/**
 * Calculate refund for guest-initiated cancellations with new عربون system
 */
export function calculateRefund(
  totalAmount: number,
  checkInDate: Date,
  cancellationDate: Date,
  policy: CancellationPolicy
): RefundCalculation {
  // Service fee is always non-refundable (10% of total)
  const serviceFee = totalAmount * 0.10;
  
  // Calculate hours until check-in
  const hoursUntilCheckIn = (checkInDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60);
  
  let refundPercentage = 0;
  let message = '';
  let arboonAmount = 0;
  
  if (policy.type === 'full_refundable') {
    // Full Refundable Policy: 100% refund if cancelled 24+ hours before
    if (hoursUntilCheckIn >= 24) {
      refundPercentage = 100;
      message = 'Full refund (cancelled 24+ hours before check-in)';
    } else {
      refundPercentage = 0;
      message = 'No refund (cancelled less than 24 hours before check-in)';
    }
    
    const refundableAmount = totalAmount - serviceFee;
    const refundAmount = (refundableAmount * refundPercentage) / 100;
    
    return {
      refundAmount,
      refundPercentage,
      serviceFee,
      arboonAmount: 0,
      canCancel: true,
      message
    };
  } else {
    // Partial Refundable with عربون
    arboonAmount = totalAmount * ((policy.arboonPercentage || 20) / 100);
    const refundableBase = totalAmount - serviceFee - arboonAmount;
    
    // Find applicable refund rule
    const rules = policy.refundRules || DEFAULT_PARTIAL_REFUND_RULES;
    const sortedRules = [...rules].sort((a, b) => b.hoursBeforeCheckIn - a.hoursBeforeCheckIn);
    
    for (const rule of sortedRules) {
      if (hoursUntilCheckIn >= rule.hoursBeforeCheckIn) {
        refundPercentage = rule.refundPercentage;
        message = rule.description;
        break;
      }
    }
    
    const refundAmount = (refundableBase * refundPercentage) / 100;
    
    return {
      refundAmount,
      refundPercentage,
      serviceFee,
      arboonAmount,
      canCancel: true,
      message
    };
  }
}

/**
 * Calculate host penalty for host-initiated cancellations
 * Host penalties are based on timing:
 * - 30+ days before: No penalty
 * - 15-30 days before: 10% penalty
 * - 7-14 days before: 25% penalty
 * - Less than 7 days: 50% penalty
 */
export function calculateHostPenalty(
  totalAmount: number,
  checkInDate: Date,
  cancellationDate: Date
): { penaltyAmount: number; penaltyPercentage: number; message: string } {
  const daysUntilCheckIn = Math.ceil(
    (checkInDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  let penaltyPercentage = 0;
  let message = '';
  
  if (daysUntilCheckIn > 30) {
    penaltyPercentage = 0;
    message = 'No penalty (cancelled 30+ days before check-in)';
  } else if (daysUntilCheckIn >= 15) {
    penaltyPercentage = 10;
    message = '10% penalty (cancelled 15-30 days before check-in)';
  } else if (daysUntilCheckIn >= 7) {
    penaltyPercentage = 25;
    message = '25% penalty (cancelled 7-14 days before check-in)';
  } else {
    penaltyPercentage = 50;
    message = '50% penalty (cancelled less than 7 days before check-in)';
  }
  
  const penaltyAmount = (totalAmount * penaltyPercentage) / 100;
  
  return {
    penaltyAmount,
    penaltyPercentage,
    message
  };
}

/**
 * Check if cancellation is within host penalty period
 */
export function isWithinHostPenaltyPeriod(
  checkInDate: Date,
  cancellationDate: Date
): boolean {
  const daysUntilCheckIn = Math.ceil(
    (checkInDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return daysUntilCheckIn <= 30;
}

/**
 * Calculate refund for host-initiated cancellations
 * Guests always receive 100% refund for host cancellations
 */
export function calculateHostCancellationRefund(
  totalAmount: number
): RefundCalculation {
  return {
    refundAmount: totalAmount,
    refundPercentage: 100,
    serviceFee: 0,
    arboonAmount: 0,
    canCancel: true,
    message: 'Full refund (host-initiated cancellation)'
  };
}

/**
 * Helper function to create a full refundable policy
 */
export function createFullRefundablePolicy(): CancellationPolicy {
  return {
    type: 'full_refundable'
  };
}

/**
 * Helper function to create a partial refundable policy with عربون
 */
export function createPartialRefundablePolicy(
  arboonPercentage: number = 20,
  customRules?: RefundRule[]
): CancellationPolicy {
  return {
    type: 'partial_refundable',
    arboonPercentage,
    refundRules: customRules || DEFAULT_PARTIAL_REFUND_RULES
  };
}