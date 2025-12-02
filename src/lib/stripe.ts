/**
 * Stripe Integration Module
 * Handles payment processing with Firebase Cloud Functions
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';

// Initialize Stripe with publishable key
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

// Initialize Firebase Functions
const functions = getFunctions(app);

/**
 * Payment Intent Types
 */
export interface CreatePaymentIntentRequest {
  bookingId: string;
  amount: number;
  currency: string;
  campId: string;
  campName: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

/**
 * Creates a Payment Intent via Cloud Function
 */
export const createPaymentIntent = async (
  request: CreatePaymentIntentRequest
): Promise<CreatePaymentIntentResponse> => {
  console.log('=== CREATE PAYMENT INTENT ===');
  console.log('Request:', request);
  
  try {
    const createPaymentIntentFn = httpsCallable<CreatePaymentIntentRequest, CreatePaymentIntentResponse>(
      functions,
      'createPaymentIntent'
    );
    
    const result = await createPaymentIntentFn(request);
    
    console.log('✅ Payment Intent created:', result.data.paymentIntentId);
    return result.data;
  } catch (error) {
    console.error('❌ Error creating payment intent:', error);
    throw error;
  }
};

/**
 * Confirms a payment and retrieves payment details
 */
export const confirmPayment = async (
  stripe: Stripe,
  clientSecret: string,
  paymentMethodId: string
): Promise<{
  success: boolean;
  status: string;
  paymentIntent?: Stripe.PaymentIntent;
  error?: string;
}> => {
  console.log('=== CONFIRM PAYMENT ===');
  
  try {
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: paymentMethodId,
    });
    
    if (result.error) {
      console.error('❌ Payment confirmation failed:', result.error.message);
      return {
        success: false,
        status: 'failed',
        error: result.error.message,
      };
    }
    
    console.log('✅ Payment confirmed:', result.paymentIntent?.id);
    return {
      success: true,
      status: result.paymentIntent?.status || 'unknown',
      paymentIntent: result.paymentIntent,
    };
  } catch (error) {
    console.error('❌ Error confirming payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      status: 'failed',
      error: errorMessage,
    };
  }
};

/**
 * Checks Apple Pay availability
 */
export const checkApplePayAvailability = async (): Promise<boolean> => {
  const stripe = await getStripe();
  if (!stripe) return false;
  
  try {
    const paymentRequest = stripe.paymentRequest({
      country: 'BH',
      currency: 'bhd',
      total: {
        label: 'Sahra Booking',
        amount: 0,
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });
    
    const canMakePayment = await paymentRequest.canMakePayment();
    return !!canMakePayment?.applePay;
  } catch (error) {
    console.error('Error checking Apple Pay availability:', error);
    return false;
  }
};

/**
 * Refund Types
 */
export interface ProcessRefundRequest {
  bookingId: string;
  reason: string;
  notes?: string;
}

export interface ProcessRefundResponse {
  success: boolean;
  refundId: string;
  refundAmount: number;
  eligibilityReason: string;
}

/**
 * Processes a refund via Cloud Function
 */
export const processRefund = async (
  request: ProcessRefundRequest
): Promise<ProcessRefundResponse> => {
  console.log('=== PROCESS REFUND ===');
  console.log('Request:', request);
  
  try {
    const processRefundFn = httpsCallable<ProcessRefundRequest, ProcessRefundResponse>(
      functions,
      'processRefund'
    );
    
    const result = await processRefundFn(request);
    
    console.log('✅ Refund processed:', result.data.refundId);
    return result.data;
  } catch (error) {
    console.error('❌ Error processing refund:', error);
    throw error;
  }
};