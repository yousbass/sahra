/**
 * Stripe Webhook Handler
 * Processes Stripe webhook events for payment status updates
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

export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    functions.logger.error('Missing stripe-signature header');
    res.status(400).send('Missing stripe-signature header');
    return;
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    const webhookSecret = functions.config().stripe?.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    functions.logger.error('Webhook signature verification failed', { error: errorMessage });
    res.status(400).send(`Webhook Error: ${errorMessage}`);
    return;
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleRefundCompleted(event.data.object as Stripe.Charge);
        break;

      default:
        functions.logger.info('Unhandled event type', { type: event.type });
    }

    res.json({ received: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    functions.logger.error('Error handling webhook event', {
      error: errorMessage,
      eventType: event.type,
    });
    res.status(500).send('Webhook handler failed');
  }
});

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { bookingId, userId } = paymentIntent.metadata;

  functions.logger.info('Payment succeeded', {
    paymentIntentId: paymentIntent.id,
    bookingId,
    userId,
  });

  if (!bookingId) {
    functions.logger.error('Missing bookingId in payment intent metadata');
    return;
  }

  // Update booking status
  await db.collection('bookings').doc(bookingId).update({
    paymentStatus: 'completed',
    status: 'confirmed',
    paymentIntentId: paymentIntent.id,
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update transaction status
  const transactionQuery = await db
    .collection('transactions')
    .where('stripePaymentIntentId', '==', paymentIntent.id)
    .limit(1)
    .get();

  if (!transactionQuery.empty) {
    await transactionQuery.docs[0].ref.update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  functions.logger.info('Booking and transaction updated successfully', { bookingId });
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const { bookingId, userId } = paymentIntent.metadata;

  functions.logger.warn('Payment failed', {
    paymentIntentId: paymentIntent.id,
    bookingId,
    userId,
    error: paymentIntent.last_payment_error?.message,
  });

  if (!bookingId) {
    functions.logger.error('Missing bookingId in payment intent metadata');
    return;
  }

  // Update booking status
  await db.collection('bookings').doc(bookingId).update({
    paymentStatus: 'failed',
    paymentIntentId: paymentIntent.id,
  });

  // Update transaction status
  const transactionQuery = await db
    .collection('transactions')
    .where('stripePaymentIntentId', '==', paymentIntent.id)
    .limit(1)
    .get();

  if (!transactionQuery.empty) {
    await transactionQuery.docs[0].ref.update({
      status: 'failed',
      failureReason: paymentIntent.last_payment_error?.message || 'Unknown error',
    });
  }
}

async function handleRefundCompleted(charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string;

  functions.logger.info('Refund completed', {
    chargeId: charge.id,
    paymentIntentId,
    refundAmount: charge.amount_refunded,
  });

  // Find booking by payment intent ID
  const bookingQuery = await db
    .collection('bookings')
    .where('paymentIntentId', '==', paymentIntentId)
    .limit(1)
    .get();

  if (!bookingQuery.empty) {
    const bookingDoc = bookingQuery.docs[0];
    await bookingDoc.ref.update({
      refundStatus: 'completed',
      paymentStatus: 'refunded',
      refundCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info('Booking refund status updated', {
      bookingId: bookingDoc.id,
    });
  }
}