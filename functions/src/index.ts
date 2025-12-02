/**
 * Firebase Cloud Functions for Sahra Payment System
 * Handles secure payment processing with Stripe
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export all Cloud Functions
export { createPaymentIntent } from './createPaymentIntent';
export { stripeWebhook } from './stripeWebhook';
export { processRefund } from './processRefund';

// Health check endpoint
export const healthCheck = functions.https.onRequest((req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Sahra Payment Backend',
  });
});