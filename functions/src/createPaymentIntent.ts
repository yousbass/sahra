/**
 * Create Payment Intent Cloud Function
 * Creates a Stripe Payment Intent for a booking
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

interface CreatePaymentIntentData {
  bookingId: string;
  amount: number;
  currency: string;
  campId: string;
  campName: string;
}

export const createPaymentIntent = functions.https.onCall(
  async (data: CreatePaymentIntentData, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to create payment intent'
      );
    }

    const { bookingId, amount, currency, campId, campName } = data;

    // Validate input
    if (!bookingId || !amount || !currency) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: bookingId, amount, currency'
      );
    }

    if (amount <= 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Amount must be greater than 0'
      );
    }

    try {
      const stripe = getStripe();
      
      // Convert BHD to fils (1 BHD = 1000 fils)
      const amountInFils = Math.round(amount * 1000);

      // Create Stripe Payment Intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInFils,
        currency: currency.toLowerCase(),
        metadata: {
          bookingId,
          userId: context.auth.uid,
          campId,
          campName: campName || 'Unknown Camp',
        },
        description: `Booking for ${campName || 'Desert Camp'}`,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Create transaction record
      await db.collection('transactions').add({
        bookingId,
        userId: context.auth.uid,
        campId,
        hostId: '',
        type: 'payment',
        amount,
        currency: currency.toUpperCase(),
        status: 'pending',
        stripePaymentIntentId: paymentIntent.id,
        paymentMethod: 'card',
        description: `Payment for booking ${bookingId}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update booking with payment intent ID
      await db.collection('bookings').doc(bookingId).update({
        paymentIntentId: paymentIntent.id,
        paymentStatus: 'processing',
      });

      functions.logger.info('Payment intent created successfully', {
        paymentIntentId: paymentIntent.id,
        bookingId,
        userId: context.auth.uid,
        amount,
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      functions.logger.error('Error creating payment intent', {
        error: errorMessage,
        bookingId,
        userId: context.auth.uid,
      });

      throw new functions.https.HttpsError(
        'internal',
        `Failed to create payment intent: ${errorMessage}`
      );
    }
  }
);