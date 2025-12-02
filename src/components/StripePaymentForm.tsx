/**
 * Stripe Payment Form Component
 * Handles card payment with Stripe Elements
 */

import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Lock } from 'lucide-react';
import { createPaymentIntent } from '@/lib/stripe';

interface StripePaymentFormProps {
  amount: number;
  currency: string;
  bookingId: string;
  campId: string;
  campName: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

export function StripePaymentForm({
  amount,
  currency,
  bookingId,
  campId,
  campName,
  onSuccess,
  onError,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment intent via Cloud Function
      const { clientSecret, paymentIntentId } = await createPaymentIntent({
        bookingId,
        amount,
        currency,
        campId,
        campName,
      });

      // Confirm payment with card details
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        const errorMsg = stripeError.message || 'Payment failed';
        setError(errorMsg);
        onError(errorMsg);
      } else if (paymentIntent?.status === 'succeeded') {
        onSuccess(paymentIntentId);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during payment';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border-2 border-sand-300 rounded-lg bg-white focus-within:border-terracotta-500 transition-colors">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#1f2937',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                '::placeholder': {
                  color: '#9ca3af',
                },
              },
              invalid: {
                color: '#ef4444',
              },
            },
          }}
        />
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      )}

      <Button 
        type="submit" 
        disabled={!stripe || loading} 
        className="w-full h-12 bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white font-semibold text-base"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Pay {amount.toFixed(3)} {currency}
          </>
        )}
      </Button>

      <p className="text-xs text-gray-600 text-center flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" />
        Your payment is secured by Stripe. We never store your card details.
      </p>
    </form>
  );
}