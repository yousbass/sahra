export interface RefundCalculation {
  refundAmount: number;
  refundPercentage: number;
  serviceFee: number;
  arboonAmount: number;
  canCancel: boolean;
  message: string;
}

export type CancellationPolicyType = 'full_refundable' | 'partial_refundable';

export interface RefundRule {
  hoursBeforeCheckIn: number;
  refundPercentage: number;
  description: string;
}

export interface CancellationPolicy {
  type: CancellationPolicyType;
  arboonPercentage?: number;
  refundRules?: RefundRule[];
}

export const DEFAULT_PARTIAL_REFUND_RULES: RefundRule[] = [
  { hoursBeforeCheckIn: 48, refundPercentage: 100, description: 'Full refund (minus عربون) if cancelled 48+ hours before check-in' },
  { hoursBeforeCheckIn: 24, refundPercentage: 50, description: '50% refund (minus عربون) if cancelled 24-48 hours before check-in' },
  { hoursBeforeCheckIn: 0, refundPercentage: 0, description: 'No refund if cancelled less than 24 hours before check-in' }
];

export function calculateRefund(
  totalAmount: number,
  checkInDate: Date,
  cancellationDate: Date,
  policy: CancellationPolicy
): RefundCalculation {
  const serviceFee = totalAmount * 0.10;
  const hoursUntilCheckIn = (checkInDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60);
  
  let refundPercentage = 0;
  let message = '';
  let arboonAmount = 0;
  
  if (policy.type === 'full_refundable' || !policy.type) {
    if (hoursUntilCheckIn >= 24) {
      refundPercentage = 100;
      message = 'Full refund (cancelled 24+ hours before check-in)';
    } else {
      refundPercentage = 0;
      message = 'No refund (cancelled less than 24 hours before check-in)';
    }
    
    const refundableAmount = totalAmount - serviceFee;
    const refundAmount = (refundableAmount * refundPercentage) / 100;
    
    return { refundAmount, refundPercentage, serviceFee, arboonAmount: 0, canCancel: true, message };
  } else {
    arboonAmount = totalAmount * ((policy.arboonPercentage || 20) / 100);
    const refundableBase = totalAmount - serviceFee - arboonAmount;
    
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
    
    return { refundAmount, refundPercentage, serviceFee, arboonAmount, canCancel: true, message };
  }
}
