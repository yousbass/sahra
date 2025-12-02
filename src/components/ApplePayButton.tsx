/**
 * Apple Pay Button Component
 * Handles Apple Pay payment flow
 */

import { useState, useEffect } from 'react';
import { PaymentRequestButtonElement, useStripe } from '@stripe/react-stripe-js';
import type { PaymentRequest } from '@stripe/stripe-js';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { createPaymentIntent } from '@/lib/stripe';

interface ApplePayButtonProps {
  amount: number;
  currency: string;
  bookingId: string;
  campId: string;
  campName: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

export function ApplePayButton({
  amount,
  currency,
  bookingId,
  campId,
  campName,
  onSuccess,
  onError,
}: ApplePayButtonProps) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: 'BH',
      currency: currency.toLowerCase(),
      total: {
        label: `${campName} Booking`,
        amount: Math.round(amount * 1000), // Convert to fils
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr);
      }
    });

    pr.on('paymentmethod', async (e) => {
      try {
        // Create payment intent
        const { clientSecret, paymentIntentId } = await createPaymentIntent({
          bookingId,
          amount,
          currency,
          campId,
          campName,
        });

        // Confirm payment
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          {
            payment_method: e.paymentMethod.id,
          },
          { handleActions: false }
        );

        if (confirmError) {
          e.complete('fail');
          const errorMsg = confirmError.message || 'Payment failed';
          setError(errorMsg);
          onError(errorMsg);
        } else {
          e.complete('success');
          if (paymentIntent?.status === 'succeeded') {
            onSuccess(paymentIntentId);
          }
        }
      } catch (err: unknown) {
        e.complete('fail');
        const errorMessage = err instanceof Error ? err.message : 'Payment failed';
        setError(errorMessage);
        onError(errorMessage);
      }
    });
  }, [stripe, amount, currency, bookingId, campId, campName, onSuccess, onError]);

  if (!paymentRequest) {
    return null;
  }

  return (
    <div className="space-y-4">
      <PaymentRequestButtonElement 
        options={{ 
          paymentRequest,
          style: {
            paymentRequestButton: {
              type: 'buy',
              theme: 'dark',
              height: '48px',
            },
          },
        }} 
      />
      {error && (
        <Alert variant="destructive" className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}