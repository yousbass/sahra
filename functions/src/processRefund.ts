/**
 * Process Refund Cloud Function
 * Handles refund requests for bookings
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const db = admin.firestore();

// Initialize Stripe
const getStripe = () => {
  const secretKey = functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Stripe secret key not configured');
  }
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });
};

interface ProcessRefundData {
  bookingId: string;
  reason: string;
  notes?: string;
}

export const processRefund = functions.https.onCall(
  async (data: ProcessRefundData, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to request refund'
      );
    }

    const { bookingId, reason, notes } = data;

    if (!bookingId || !reason) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: bookingId, reason'
      );
    }

    try {
      // Get booking
      const bookingDoc = await db.collection('bookings').doc(bookingId).get();

      if (!bookingDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Booking not found');
      }

      const booking = bookingDoc.data();

      if (!booking) {
        throw new functions.https.HttpsError('not-found', 'Booking data not found');
      }

      // Verify ownership
      if (booking.userId !== context.auth.uid) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'You do not have permission to refund this booking'
        );
      }

      // Check if already refunded
      if (booking.refundStatus === 'completed') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Booking has already been refunded'
        );
      }

      // Check payment status
      if (booking.paymentStatus !== 'completed') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Cannot refund a booking that has not been paid'
        );
      }

      if (!booking.paymentIntentId) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'No payment intent found for this booking'
        );
      }

      // Get camp details for refund policy
      const campDoc = await db.collection('camps').doc(booking.campId).get();
      const camp = campDoc.data();

      // Check refund eligibility
      const checkInDate = new Date(booking.checkInDate);
      const now = new Date();
      const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      let refundPercentage = 0;
      let eligibilityReason = '';

      if (camp?.refundPolicy === 'non-refundable') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'This booking is non-refundable'
        );
      }

      if (hoursUntilCheckIn >= 48) {
        refundPercentage = 1.0; // 100% refund of camp price
        eligibilityReason = 'Full refund (48+ hours before check-in)';
      } else if (hoursUntilCheckIn >= 24) {
        refundPercentage = 0.5; // 50% refund of camp price
        eligibilityReason = '50% refund (24-48 hours before check-in)';
      } else {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Refund deadline has passed (must cancel 24+ hours before check-in)'
        );
      }

      // Calculate refund amount (camp price + taxes, excluding service fee)
      const campPrice = booking.campPrice || booking.totalPrice || 0;
      const taxes = booking.taxes || 0;
      const refundAmount = campPrice * refundPercentage + taxes;

      if (refundAmount <= 0) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Invalid refund amount calculated'
        );
      }

      const stripe = getStripe();

      // Create Stripe refund
      const refund = await stripe.refunds.create({
        payment_intent: booking.paymentIntentId,
        amount: Math.round(refundAmount * 1000), // Convert to fils
        reason: 'requested_by_customer',
        metadata: {
          bookingId,
          userId: context.auth.uid,
          reason,
          notes: notes || '',
          eligibilityReason,
        },
      });

      // Update booking
      await bookingDoc.ref.update({
        refundStatus: 'processing',
        refundAmount,
        refundReason: reason,
        refundId: refund.id,
        refundRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'cancelled',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create refund transaction
      await db.collection('transactions').add({
        bookingId,
        userId: context.auth.uid,
        campId: booking.campId,
        hostId: booking.hostId || '',
        type: 'refund',
        amount: refundAmount,
        currency: 'BHD',
        status: 'completed',
        stripeRefundId: refund.id,
        stripePaymentIntentId: booking.paymentIntentId,
        paymentMethod: booking.paymentMethod || 'card',
        description: `Refund for booking ${bookingId}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          reason,
          notes: notes || '',
          eligibilityReason,
          refundPercentage,
        },
      });

      functions.logger.info('Refund processed successfully', {
        refundId: refund.id,
        bookingId,
        userId: context.auth.uid,
        amount: refundAmount,
        eligibilityReason,
      });

      return {
        success: true,
        refundId: refund.id,
        refundAmount,
        eligibilityReason,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      functions.logger.error('Error processing refund', {
        error: errorMessage,
        bookingId,
        userId: context.auth.uid,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        `Failed to process refund: ${errorMessage}`
      );
    }
  }
);