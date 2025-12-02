export interface RefundCalculation {
  refundAmount: number;
  refundPercentage: number;
  serviceFee: number;
  canCancel: boolean;
  message: string;
}

export type CancellationPolicy = 'flexible' | 'moderate' | 'strict';

/**
 * Calculate refund for guest-initiated cancellations
 */
export function calculateRefund(
  totalAmount: number,
  checkInDate: Date,
  cancellationDate: Date,
  cancellationPolicy: CancellationPolicy = 'moderate'
): RefundCalculation {
  // Service fee is always non-refundable (10% of total)
  const serviceFee = totalAmount * 0.10;
  const refundableAmount = totalAmount - serviceFee;
  
  // Calculate hours until check-in
  const hoursUntilCheckIn = (checkInDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60);
  
  let refundPercentage = 0;
  let message = '';
  
  // Apply cancellation policy rules
  switch (cancellationPolicy) {
    case 'flexible':
      if (hoursUntilCheckIn >= 24) {
        refundPercentage = 100;
        message = 'Full refund (cancelled 24+ hours before check-in)';
      } else {
        refundPercentage = 0;
        message = 'No refund (cancelled less than 24 hours before check-in)';
      }
      break;
      
    case 'moderate':
      if (hoursUntilCheckIn >= 120) { // 5 days
        refundPercentage = 100;
        message = 'Full refund (cancelled 5+ days before check-in)';
      } else if (hoursUntilCheckIn >= 48) {
        refundPercentage = 50;
        message = '50% refund (cancelled 2-5 days before check-in)';
      } else {
        refundPercentage = 0;
        message = 'No refund (cancelled less than 48 hours before check-in)';
      }
      break;
      
    case 'strict':
      if (hoursUntilCheckIn >= 168) { // 7 days
        refundPercentage = 50;
        message = '50% refund (cancelled 7+ days before check-in)';
      } else {
        refundPercentage = 0;
        message = 'No refund (cancelled less than 7 days before check-in)';
      }
      break;
  }
  
  const refundAmount = (refundableAmount * refundPercentage) / 100;
  
  return {
    refundAmount,
    refundPercentage,
    serviceFee,
    canCancel: true,
    message
  };
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
    canCancel: true,
    message: 'Full refund (host-initiated cancellation)'
  };
}