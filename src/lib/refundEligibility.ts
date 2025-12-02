/**
 * Refund Eligibility Checker
 * Determines if a booking is eligible for refund and calculates the refund amount
 */

import { Booking } from './firestore';
import { format } from 'date-fns';

export interface RefundEligibility {
  eligible: boolean;
  amount: number;
  percentage: number;
  reason: string;
  deadline?: string;
}

/**
 * Checks if a booking is eligible for refund and calculates amount
 */
export const checkRefundEligibility = (
  booking: Booking,
  currentDate: Date = new Date()
): RefundEligibility => {
  // Non-refundable policy
  if (booking.refundPolicy === 'non-refundable') {
    return {
      eligible: false,
      amount: 0,
      percentage: 0,
      reason: 'This booking has a non-refundable policy',
    };
  }
  
  // Already refunded
  if (booking.refundStatus === 'completed') {
    return {
      eligible: false,
      amount: 0,
      percentage: 0,
      reason: 'This booking has already been refunded',
    };
  }
  
  // Calculate hours until check-in
  const checkInDate = new Date(booking.checkInDate);
  const hoursUntilCheckIn = 
    (checkInDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60);
  
  // Past check-in date
  if (hoursUntilCheckIn < 0) {
    return {
      eligible: false,
      amount: 0,
      percentage: 0,
      reason: 'Cannot refund after check-in date has passed',
    };
  }
  
  // Refundable policy - calculate based on timing
  const refundableAmount = booking.campPrice + booking.taxes;
  
  if (hoursUntilCheckIn >= 48) {
    // Full refund (minus service fee)
    return {
      eligible: true,
      amount: refundableAmount,
      percentage: 100,
      reason: 'Full refund available (service fee non-refundable)',
      deadline: new Date(checkInDate.getTime() - 48 * 60 * 60 * 1000).toISOString(),
    };
  } else if (hoursUntilCheckIn >= 24) {
    // 50% refund
    return {
      eligible: true,
      amount: (booking.campPrice * 0.5) + booking.taxes,
      percentage: 50,
      reason: '50% refund available (cancelled 24-48 hours before check-in)',
      deadline: new Date(checkInDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    };
  } else {
    // No refund
    return {
      eligible: false,
      amount: 0,
      percentage: 0,
      reason: 'No refund available (less than 24 hours before check-in)',
    };
  }
};

/**
 * Formats refund deadline for display
 */
export const formatRefundDeadline = (deadline: string): string => {
  const date = new Date(deadline);
  return format(date, "MMM dd, yyyy 'at' h:mm a");
};

/**
 * Calculates refund amount based on booking and policy
 */
export const calculateRefundAmount = (booking: Booking): number => {
  const eligibility = checkRefundEligibility(booking);
  return eligibility.amount;
};