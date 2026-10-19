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
 * Checks if a booking is eligible for refund and calculates amount.
 *
 * The Booking type no longer carries `refundPolicy`, `campPrice`, or `taxes`
 * as dedicated fields — cancellation policy lives on `cancellationPolicy` and
 * the price breakdown is inside `priceBreakdown`.  Server-authoritative
 * cancellation/refund writes are handled by the API; this helper is used
 * client-side only to *display* eligibility before the guest submits.
 */
export const checkRefundEligibility = (
  booking: Booking,
  currentDate: Date = new Date()
): RefundEligibility => {
  // Map cancellationPolicy to a simple refundable / non-refundable decision.
  // 'strict' == non-refundable for display purposes.
  if (booking.cancellationPolicy === 'strict') {
    return {
      eligible: false,
      amount: 0,
      percentage: 0,
      reason: 'This booking has a non-refundable (strict) policy',
    };
  }

  // Already refunded — server writes 'refunded' to refundStatus.
  if (booking.refundStatus === 'refunded') {
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

  // Derive the refundable base from priceBreakdown (base + tent prices, no service fee).
  const pb = booking.priceBreakdown;
  const baseRefundable = pb
    ? pb.basePrice + pb.largeTentPrice + pb.smallTentPrice + pb.entertainmentTentPrice
    : booking.totalPrice;

  if (hoursUntilCheckIn >= 48) {
    // Full refund (minus service fee)
    return {
      eligible: true,
      amount: baseRefundable,
      percentage: 100,
      reason: 'Full refund available (service fee non-refundable)',
      deadline: new Date(checkInDate.getTime() - 48 * 60 * 60 * 1000).toISOString(),
    };
  } else if (hoursUntilCheckIn >= 24) {
    // 50% refund
    return {
      eligible: true,
      amount: baseRefundable * 0.5,
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