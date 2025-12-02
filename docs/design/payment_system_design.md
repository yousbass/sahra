# System Design Document: Payment System Integration

**Project:** Sahra Desert Camp Booking Platform  
**Version:** 1.0  
**Date:** November 12, 2025  
**Author:** Bob (System Architect)  
**Status:** Ready for Implementation

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema Design](#2-database-schema-design)
3. [Stripe Integration Architecture](#3-stripe-integration-architecture)
4. [Component Specifications](#4-component-specifications)
5. [API/Service Layer Design](#5-apiservice-layer-design)
6. [Payment Flow Diagrams](#6-payment-flow-diagrams)
7. [Security Architecture](#7-security-architecture)
8. [Error Handling Strategy](#8-error-handling-strategy)
9. [Mobile Responsiveness](#9-mobile-responsiveness)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. Architecture Overview

### 1.1 High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Reserve.tsx  │  │ Bookings.tsx │  │ Payment      │         │
│  │              │  │              │  │ Confirmation │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PAYMENT COMPONENTS                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Payment      │  │ Apple Pay    │  │ Refund       │         │
│  │ Method       │  │ Button       │  │ Request      │         │
│  │ Selector     │  │              │  │ Form         │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER (lib/)                          │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  stripe.ts                                            │      │
│  │  - createPaymentIntent()                              │      │
│  │  - confirmPayment()                                   │      │
│  │  - createRefund()                                     │      │
│  │  - handleWebhook()                                    │      │
│  └──────────────────────────────────────────────────────┘      │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  firestore.ts (extended)                              │      │
│  │  - createTransaction()                                │      │
│  │  - updateBookingPayment()                             │      │
│  │  - requestRefund()                                    │      │
│  │  - processRefund()                                    │      │
│  │  - calculateRefundAmount()                            │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Stripe     │  │  Firestore   │  │   Firebase   │         │
│  │   Payment    │  │  Database    │  │   Auth       │         │
│  │   API        │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Design Principles

1. **Security First**: Never store card data, use Stripe Elements for PCI compliance
2. **User Trust**: Clear pricing breakdown, transparent refund policies
3. **Reliability**: Comprehensive error handling, webhook fallbacks
4. **Performance**: Optimistic UI updates, minimal payment processing time
5. **Mobile-First**: Touch-friendly interfaces, Apple Pay integration

### 1.3 Technology Stack

- **Payment Gateway**: Stripe (v2023-10-16 API)
- **Frontend**: React + TypeScript + Stripe React SDK
- **Backend**: Firebase Firestore + Cloud Functions (for webhooks)
- **State Management**: React hooks + Context API
- **Validation**: Zod for schema validation
- **Currency**: Bahraini Dinar (BHD)

---

## 2. Database Schema Design

### 2.1 Updated Camp Schema

```typescript
export interface Camp {
  // ... existing fields from current firestore.ts ...
  id: string;
  slug: string;
  title: string;
  photo: string;
  price: number;
  location: string;
  description?: string;
  amenities?: string[];
  maxGuests?: number;
  hostId: string;
  createdAt: string | Timestamp;
  
  // NEW PAYMENT-RELATED FIELDS
  refundPolicy: 'refundable' | 'non-refundable';
  refundDeadlineHours?: number;          // Hours before check-in (default: 48)
  cancellationFeePercentage?: number;    // 0-100 (default: 0 for refundable, 100 for non-refundable)
  nonRefundableDiscount?: number;        // Percentage discount for non-refundable (e.g., 15)
}
```

**Firestore Path**: `/camps/{campId}`

**Indexes Required**:
- `refundPolicy` (for filtering)
- `price` + `refundPolicy` (composite)

### 2.2 Updated Booking Schema

```typescript
export interface Booking {
  // ... existing fields ...
  id: string;
  campId: string;
  campTitle: string;
  campPhoto: string;
  campLocation: string;
  checkIn: string;
  checkOut: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  userId: string;
  userName?: string;
  userEmail?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string | Timestamp;
  cancelledAt?: string;
  
  // NEW PAYMENT FIELDS
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
  paymentMethod: 'card' | 'apple_pay' | 'google_pay';
  paymentIntentId?: string;              // Stripe Payment Intent ID
  transactionId?: string;                // Our internal transaction ID
  
  // Pricing breakdown
  campPrice: number;                     // Base camp price (price × nights × guests)
  serviceFee: number;                    // 10% of camp price
  taxes: number;                         // 10% of (camp price + service fee)
  totalPrice: number;                    // campPrice + serviceFee + taxes
  currency: string;                      // 'BHD'
  paidAt?: string;                       // ISO timestamp
  
  // Refund information
  refundPolicy: 'refundable' | 'non-refundable';
  refundEligible: boolean;               // Calculated based on policy and dates
  refundStatus?: 'none' | 'requested' | 'approved' | 'processing' | 'completed' | 'rejected';
  refundAmount?: number;                 // Amount refunded
  refundReason?: string;                 // User-provided reason
  refundRequestedAt?: string;
  refundCompletedAt?: string;
  refundId?: string;                     // Stripe Refund ID
  
  // Payment metadata
  cardLast4?: string;                    // Last 4 digits of card
  cardBrand?: string;                    // 'visa', 'mastercard', etc.
}
```

**Firestore Path**: `/bookings/{bookingId}`

**Indexes Required**:
- `userId` + `createdAt` (desc) - existing
- `campId` + `status` - existing
- `paymentStatus` + `createdAt` (desc)
- `refundStatus` + `refundRequestedAt` (desc)

### 2.3 New Transaction Collection

```typescript
export interface Transaction {
  id: string;
  bookingId: string;
  userId: string;
  campId: string;
  hostId: string;                        // For future host payout tracking
  
  // Transaction details
  type: 'payment' | 'refund';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: number;                        // Amount in BHD
  currency: string;                      // 'BHD'
  
  // Stripe information
  stripePaymentIntentId?: string;
  stripeRefundId?: string;
  stripeChargeId?: string;
  
  // Payment method details
  paymentMethod: 'card' | 'apple_pay' | 'google_pay';
  cardLast4?: string;
  cardBrand?: string;
  
  // Metadata
  description: string;                   // Human-readable description
  failureReason?: string;                // Error message if failed
  createdAt: Timestamp;
  completedAt?: Timestamp;
  
  // Audit trail
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;        // Additional data
}
```

**Firestore Path**: `/transactions/{transactionId}`

**Indexes Required**:
- `bookingId` + `createdAt` (desc)
- `userId` + `createdAt` (desc)
- `type` + `status` + `createdAt` (desc)
- `stripePaymentIntentId` (for webhook lookups)

### 2.4 Database Relationships Diagram

```
┌─────────────┐
│    Users    │
│  (Firebase  │
│    Auth)    │
└──────┬──────┘
       │
       │ userId
       │
       ▼
┌─────────────┐      campId     ┌─────────────┐
│   Bookings  │◄────────────────│    Camps    │
│             │                 │             │
│ - payment   │                 │ - refund    │
│   status    │                 │   policy    │
│ - refund    │                 │             │
│   status    │                 └─────────────┘
└──────┬──────┘
       │
       │ bookingId
       │
       ▼
┌─────────────┐
│Transactions │
│             │
│ - payment   │
│ - refund    │
└─────────────┘
```

### 2.5 Data Validation Rules

**Firestore Security Rules** (add to firestore.rules):

```javascript
match /bookings/{bookingId} {
  allow read: if request.auth != null && 
    (resource.data.userId == request.auth.uid || 
     resource.data.hostId == request.auth.uid);
  
  allow create: if request.auth != null &&
    request.resource.data.userId == request.auth.uid &&
    request.resource.data.paymentStatus == 'pending';
  
  allow update: if request.auth != null &&
    (resource.data.userId == request.auth.uid || 
     resource.data.hostId == request.auth.uid);
}

match /transactions/{transactionId} {
  allow read: if request.auth != null &&
    (resource.data.userId == request.auth.uid ||
     resource.data.hostId == request.auth.uid);
  
  // Only backend can create transactions
  allow create: if false;
  allow update: if false;
}
```

---

## 3. Stripe Integration Architecture

### 3.1 Stripe SDK Setup

**File**: `/workspace/shadcn-ui/src/lib/stripe.ts`

```typescript
import Stripe from 'stripe';

// Initialize Stripe (server-side only)
// NOTE: This should be in a backend function (Cloud Function)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

export default stripe;
```

**Environment Variables** (`.env`):
```bash
# Stripe Keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...  # Backend only, never expose
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3.2 Payment Intent Creation

**Function**: `createPaymentIntent`

```typescript
/**
 * Creates a Stripe Payment Intent for a booking
 * This should be a Cloud Function endpoint
 */
export const createPaymentIntent = async (
  bookingId: string,
  amount: number,
  currency: string,
  userId: string,
  campId: string
): Promise<{ clientSecret: string; paymentIntentId: string }> => {
  console.log('=== CREATE PAYMENT INTENT ===');
  console.log('Booking ID:', bookingId);
  console.log('Amount:', amount, currency);
  
  try {
    // Convert amount to smallest currency unit (fils for BHD)
    const amountInFils = Math.round(amount * 1000);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInFils,
      currency: currency.toLowerCase(),
      metadata: {
        bookingId,
        userId,
        campId,
        platform: 'sahra',
      },
      automatic_payment_methods: {
        enabled: true,
      },
      // Enable Apple Pay
      payment_method_types: ['card'],
      // Capture payment immediately
      capture_method: 'automatic',
      // Confirmation method
      confirmation_method: 'automatic',
    });
    
    console.log('✅ Payment Intent created:', paymentIntent.id);
    
    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error('❌ Error creating Payment Intent:', error);
    throw new Error(`Failed to create payment intent: ${error.message}`);
  }
};
```

### 3.3 Payment Confirmation

**Function**: `confirmPayment`

```typescript
/**
 * Confirms a payment and retrieves payment details
 */
export const confirmPayment = async (
  paymentIntentId: string
): Promise<{
  success: boolean;
  status: string;
  paymentMethod?: {
    type: string;
    card?: {
      brand: string;
      last4: string;
    };
  };
}> => {
  console.log('=== CONFIRM PAYMENT ===');
  console.log('Payment Intent ID:', paymentIntentId);
  
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['payment_method'],
    });
    
    const success = paymentIntent.status === 'succeeded';
    
    console.log(`${success ? '✅' : '❌'} Payment status:`, paymentIntent.status);
    
    return {
      success,
      status: paymentIntent.status,
      paymentMethod: paymentIntent.payment_method as any,
    };
  } catch (error) {
    console.error('❌ Error confirming payment:', error);
    throw new Error(`Failed to confirm payment: ${error.message}`);
  }
};
```

### 3.4 Refund Processing

**Function**: `createRefund`

```typescript
/**
 * Creates a refund for a payment
 */
export const createRefund = async (
  paymentIntentId: string,
  amount?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
): Promise<{
  refundId: string;
  status: string;
  amount: number;
}> => {
  console.log('=== CREATE REFUND ===');
  console.log('Payment Intent ID:', paymentIntentId);
  console.log('Amount:', amount || 'full refund');
  
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 1000) : undefined, // Convert to fils
      reason: reason || 'requested_by_customer',
    });
    
    console.log('✅ Refund created:', refund.id);
    console.log('Status:', refund.status);
    
    return {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount / 1000, // Convert back to BHD
    };
  } catch (error) {
    console.error('❌ Error creating refund:', error);
    throw new Error(`Failed to create refund: ${error.message}`);
  }
};
```

### 3.5 Webhook Handler

**Function**: `handleStripeWebhook`

```typescript
/**
 * Handles Stripe webhook events
 * This should be a Cloud Function HTTP endpoint
 */
export const handleStripeWebhook = async (
  rawBody: string,
  signature: string
): Promise<void> => {
  console.log('=== STRIPE WEBHOOK RECEIVED ===');
  
  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    
    console.log('Event type:', event.type);
    
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
        console.log('Unhandled event type:', event.type);
    }
    
    console.log('✅ Webhook processed successfully');
  } catch (error) {
    console.error('❌ Webhook error:', error);
    throw error;
  }
};

// Helper functions for webhook handlers
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  // Update booking status
  await updateDoc(doc(db, 'bookings', bookingId), {
    paymentStatus: 'completed',
    paidAt: new Date().toISOString(),
    status: 'confirmed',
  });
  
  // Create transaction record
  await createTransaction({
    bookingId,
    userId: paymentIntent.metadata.userId,
    campId: paymentIntent.metadata.campId,
    type: 'payment',
    status: 'completed',
    amount: paymentIntent.amount / 1000,
    currency: paymentIntent.currency.toUpperCase(),
    stripePaymentIntentId: paymentIntent.id,
    paymentMethod: 'card',
    description: `Payment for booking ${bookingId}`,
  });
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  
  await updateDoc(doc(db, 'bookings', bookingId), {
    paymentStatus: 'failed',
  });
}

async function handleRefundCompleted(charge: Stripe.Charge) {
  // Find booking by payment intent ID
  const bookingsRef = collection(db, 'bookings');
  const q = query(bookingsRef, where('paymentIntentId', '==', charge.payment_intent));
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    const bookingDoc = snapshot.docs[0];
    await updateDoc(bookingDoc.ref, {
      refundStatus: 'completed',
      refundCompletedAt: new Date().toISOString(),
      paymentStatus: 'refunded',
    });
  }
}
```

### 3.6 Apple Pay Integration

**Frontend Setup** (in Reserve.tsx or payment component):

```typescript
import { PaymentRequest } from '@stripe/stripe-js';
import { useStripe } from '@stripe/react-stripe-js';

const PaymentComponent = () => {
  const stripe = useStripe();
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  
  useEffect(() => {
    checkApplePayAvailability();
  }, [stripe]);
  
  const checkApplePayAvailability = async () => {
    if (!stripe) return;
    
    const paymentRequest = stripe.paymentRequest({
      country: 'BH',
      currency: 'bhd',
      total: {
        label: 'Sahra Booking',
        amount: 0, // Will be updated with actual amount
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });
    
    const canMakePayment = await paymentRequest.canMakePayment();
    setApplePayAvailable(!!canMakePayment?.applePay);
  };
  
  const handleApplePay = async (amount: number) => {
    if (!stripe) return;
    
    const paymentRequest = stripe.paymentRequest({
      country: 'BH',
      currency: 'bhd',
      total: {
        label: 'Sahra Desert Camp Booking',
        amount: Math.round(amount * 1000), // Convert to fils
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });
    
    paymentRequest.on('paymentmethod', async (event) => {
      // Create payment intent on backend
      const { clientSecret } = await createPaymentIntent(
        bookingId,
        amount,
        'BHD',
        userId,
        campId
      );
      
      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: event.paymentMethod.id },
        { handleActions: false }
      );
      
      if (error) {
        event.complete('fail');
        toast.error(error.message);
      } else {
        event.complete('success');
        // Handle success
        handlePaymentSuccess(paymentIntent);
      }
    });
    
    paymentRequest.show();
  };
};
```

---

## 4. Component Specifications

### 4.1 Component Hierarchy

```
Reserve.tsx (Updated)
├── PaymentMethodSelector
│   ├── CardPaymentOption
│   └── ApplePayOption
├── StripePaymentForm
│   ├── CardElement (Stripe)
│   ├── PriceBreakdown
│   └── RefundPolicyInfo
├── PriceBreakdown
│   ├── LineItem (camp price)
│   ├── LineItem (service fee)
│   ├── LineItem (taxes)
│   └── TotalAmount
└── RefundPolicyBadge

PaymentConfirmation.tsx (New)
├── SuccessIcon
├── BookingDetails
├── PaymentSummary
└── ActionButtons
    ├── ViewBookingButton
    └── DownloadReceiptButton

Bookings.tsx (Updated)
└── BookingCard
    └── RefundRequestButton (conditional)

RefundRequestModal.tsx (New)
├── RefundPolicyReminder
├── RefundAmountCalculation
├── ReasonSelector
└── ConfirmationButtons
```

### 4.2 PaymentMethodSelector Component

**File**: `/workspace/shadcn-ui/src/components/PaymentMethodSelector.tsx`

```typescript
interface PaymentMethodSelectorProps {
  selectedMethod: 'card' | 'apple_pay';
  onMethodChange: (method: 'card' | 'apple_pay') => void;
  applePayAvailable: boolean;
  amount: number;
  onApplePayClick: () => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onMethodChange,
  applePayAvailable,
  amount,
  onApplePayClick,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Payment Method</h3>
      
      {/* Card Payment Option */}
      <div
        className={`border-2 rounded-lg p-4 cursor-pointer transition ${
          selectedMethod === 'card'
            ? 'border-terracotta-500 bg-terracotta-50'
            : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => onMethodChange('card')}
      >
        <div className="flex items-center">
          <input
            type="radio"
            checked={selectedMethod === 'card'}
            onChange={() => onMethodChange('card')}
            className="mr-3"
          />
          <div className="flex-1">
            <p className="font-semibold">Credit or Debit Card</p>
            <div className="flex gap-2 mt-2">
              <img src="/icons/visa.svg" alt="Visa" className="h-6" />
              <img src="/icons/mastercard.svg" alt="Mastercard" className="h-6" />
              <img src="/icons/amex.svg" alt="Amex" className="h-6" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Apple Pay Option */}
      {applePayAvailable && (
        <div
          className={`border-2 rounded-lg p-4 cursor-pointer transition ${
            selectedMethod === 'apple_pay'
              ? 'border-terracotta-500 bg-terracotta-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => onMethodChange('apple_pay')}
        >
          <div className="flex items-center">
            <input
              type="radio"
              checked={selectedMethod === 'apple_pay'}
              onChange={() => onMethodChange('apple_pay')}
              className="mr-3"
            />
            <div className="flex-1">
              <p className="font-semibold">Apple Pay</p>
              <p className="text-sm text-gray-600">
                Pay with Touch ID or Face ID
              </p>
            </div>
            <AppleIcon className="h-8" />
          </div>
        </div>
      )}
    </div>
  );
};
```

**State Management**:
- Local state for selected method
- Parent component handles payment processing

**Validation**:
- At least one payment method must be available
- Apple Pay availability checked on mount

### 4.3 StripePaymentForm Component

**File**: `/workspace/shadcn-ui/src/components/StripePaymentForm.tsx`

```typescript
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface StripePaymentFormProps {
  amount: number;
  bookingId: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

export const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  amount,
  bookingId,
  onSuccess,
  onError,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }
    
    setProcessing(true);
    
    try {
      // Create payment intent on backend
      const { clientSecret, paymentIntentId } = await createPaymentIntent(
        bookingId,
        amount,
        'BHD',
        userId,
        campId
      );
      
      // Confirm card payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: {
              name: userName,
              email: userEmail,
            },
          },
        }
      );
      
      if (error) {
        onError(error.message || 'Payment failed');
      } else if (paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      }
    } catch (error) {
      onError(error.message);
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-lg p-4">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>
      
      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full"
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>Pay {amount} BD</>
        )}
      </Button>
    </form>
  );
};
```

**Props**:
- `amount`: Total payment amount
- `bookingId`: Booking ID for metadata
- `onSuccess`: Callback when payment succeeds
- `onError`: Callback when payment fails

**State**:
- `processing`: Boolean for loading state
- Stripe elements state managed by Stripe SDK

**Validation**:
- Stripe Elements handles card validation
- Form submission disabled until Stripe loads
- Real-time card validation feedback

### 4.4 PriceBreakdown Component

**File**: `/workspace/shadcn-ui/src/components/PriceBreakdown.tsx`

```typescript
interface PriceBreakdownProps {
  campPrice: number;
  nights: number;
  guests: number;
  serviceFeePercentage?: number; // Default 10
  taxPercentage?: number;         // Default 10
  currency?: string;              // Default 'BD'
}

export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({
  campPrice,
  nights,
  guests,
  serviceFeePercentage = 10,
  taxPercentage = 10,
  currency = 'BD',
}) => {
  const basePrice = campPrice * nights * guests;
  const serviceFee = basePrice * (serviceFeePercentage / 100);
  const taxes = (basePrice + serviceFee) * (taxPercentage / 100);
  const total = basePrice + serviceFee + taxes;
  
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Price Details</h3>
      
      <div className="space-y-2">
        <div className="flex justify-between text-gray-700">
          <span>
            {campPrice} {currency} × {nights} night{nights !== 1 ? 's' : ''} × {guests} guest{guests !== 1 ? 's' : ''}
          </span>
          <span className="font-medium">{basePrice.toFixed(2)} {currency}</span>
        </div>
        
        <div className="flex justify-between text-gray-700">
          <span>Service Fee ({serviceFeePercentage}%)</span>
          <span className="font-medium">{serviceFee.toFixed(2)} {currency}</span>
        </div>
        
        <div className="flex justify-between text-gray-700">
          <span>Taxes ({taxPercentage}% VAT)</span>
          <span className="font-medium">{taxes.toFixed(2)} {currency}</span>
        </div>
        
        <div className="border-t-2 pt-3 flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-terracotta-600">
            {total.toFixed(2)} {currency}
          </span>
        </div>
      </div>
    </div>
  );
};
```

**Calculation Logic**:
```
Base Price = campPrice × nights × guests
Service Fee = Base Price × 0.10
Taxes = (Base Price + Service Fee) × 0.10
Total = Base Price + Service Fee + Taxes
```

**Display Format**:
- All amounts rounded to 2 decimal places
- Currency symbol displayed after amount
- Clear breakdown of each component

### 4.5 RefundPolicyBadge Component

**File**: `/workspace/shadcn-ui/src/components/RefundPolicyBadge.tsx`

```typescript
interface RefundPolicyBadgeProps {
  policy: 'refundable' | 'non-refundable';
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export const RefundPolicyBadge: React.FC<RefundPolicyBadgeProps> = ({
  policy,
  size = 'md',
  showTooltip = true,
}) => {
  const isRefundable = policy === 'refundable';
  
  const badge = (
    <Badge
      className={`
        ${isRefundable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
        ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}
      `}
    >
      {isRefundable ? (
        <>
          <RefreshCw className="w-3 h-3 mr-1" />
          Refundable
        </>
      ) : (
        <>
          <XCircle className="w-3 h-3 mr-1" />
          Non-Refundable
        </>
      )}
    </Badge>
  );
  
  if (!showTooltip) return badge;
  
  return (
    <Tooltip>
      <TooltipTrigger>{badge}</TooltipTrigger>
      <TooltipContent>
        {isRefundable ? (
          <p>Cancel up to 48 hours before check-in for full refund</p>
        ) : (
          <p>No refunds for cancellations</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
};
```

**Usage**:
- Display on camp cards
- Display on camp details page
- Display during checkout

### 4.6 RefundRequestModal Component

**File**: `/workspace/shadcn-ui/src/components/RefundRequestModal.tsx`

```typescript
interface RefundRequestModalProps {
  booking: Booking;
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export const RefundRequestModal: React.FC<RefundRequestModalProps> = ({
  booking,
  open,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const refundAmount = calculateRefundAmount(booking);
  
  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }
    
    setSubmitting(true);
    try {
      await onSubmit(reason);
      toast.success('Refund request submitted');
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Refund</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="font-semibold mb-2">Booking Details</p>
            <p className="text-sm">{booking.campTitle}</p>
            <p className="text-sm text-gray-600">
              {booking.checkInDate} - {booking.checkOutDate}
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="font-semibold mb-2">Refund Amount</p>
            <p className="text-2xl font-bold text-green-700">
              {refundAmount.toFixed(2)} BD
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Service fee ({booking.serviceFee.toFixed(2)} BD) is non-refundable
            </p>
          </div>
          
          <div>
            <Label>Reason for Cancellation *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="change_of_plans">Change of plans</SelectItem>
                <SelectItem value="found_alternative">Found alternative accommodation</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="bg-red-50 p-3 rounded-lg text-sm">
            <p className="font-semibold text-red-800">⚠️ Important</p>
            <p className="text-red-700 mt-1">
              This action cannot be undone. Your booking will be cancelled and
              refund will be processed within 5-7 business days.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !reason}
            className="bg-red-600 hover:bg-red-700"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Request Refund'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

**Refund Amount Calculation**:
```typescript
function calculateRefundAmount(booking: Booking): number {
  const now = new Date();
  const checkIn = new Date(booking.checkInDate);
  const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (booking.refundPolicy === 'non-refundable') {
    return 0;
  }
  
  // Refundable policy
  if (hoursUntilCheckIn >= 48) {
    // Full refund (minus service fee)
    return booking.campPrice + booking.taxes;
  } else if (hoursUntilCheckIn >= 24) {
    // 50% refund
    return (booking.campPrice * 0.5) + booking.taxes;
  } else {
    // No refund
    return 0;
  }
}
```

### 4.7 PaymentConfirmation Component

**File**: `/workspace/shadcn-ui/src/pages/PaymentConfirmation.tsx`

```typescript
export default function PaymentConfirmation() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (bookingId) {
      loadBooking(bookingId);
    }
  }, [bookingId]);
  
  const loadBooking = async (id: string) => {
    try {
      const bookingRef = doc(db, 'bookings', id);
      const bookingSnap = await getDoc(bookingRef);
      
      if (bookingSnap.exists()) {
        setBooking({ id: bookingSnap.id, ...bookingSnap.data() } as Booking);
      }
    } catch (error) {
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!booking) {
    return <ErrorState message="Booking not found" />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-sand-50 to-sand-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Card className="p-8 text-center">
          <div className="mb-6">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-gray-600">
              Your payment was successful and your booking has been confirmed.
              A confirmation email has been sent to {booking.userEmail}.
            </p>
          </div>
          
          <div className="bg-sand-50 rounded-lg p-6 text-left space-y-4">
            <div>
              <p className="text-sm text-gray-600">Booking ID</p>
              <p className="font-mono font-semibold">#{booking.id}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Camp</p>
              <p className="font-semibold">{booking.campTitle}</p>
              <p className="text-sm text-gray-600">{booking.campLocation}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Check-in</p>
                <p className="font-semibold">{booking.checkInDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Check-out</p>
                <p className="font-semibold">{booking.checkOutDate}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Guests</p>
              <p className="font-semibold">{booking.guests}</p>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">Payment Summary</p>
              <div className="flex justify-between mb-1">
                <span>Amount Paid</span>
                <span className="font-bold">{booking.totalPrice.toFixed(2)} BD</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Payment Method</span>
                <span>•••• {booking.cardLast4}</span>
              </div>
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <RefundPolicyBadge policy={booking.refundPolicy} />
                <p className="text-sm text-gray-700">
                  {booking.refundPolicy === 'refundable'
                    ? 'Cancel up to 48 hours before check-in'
                    : 'No refunds for cancellations'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 mt-6">
            <Button
              onClick={() => navigate('/bookings')}
              className="flex-1"
            >
              View Booking Details
            </Button>
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Receipt
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
```

---

## 5. API/Service Layer Design

### 5.1 Firestore Functions (Extended)

**File**: `/workspace/shadcn-ui/src/lib/firestore.ts` (add these functions)

```typescript
// ============================================
// PAYMENT & TRANSACTION FUNCTIONS
// ============================================

/**
 * Creates a transaction record in Firestore
 */
export const createTransaction = async (
  transactionData: Omit<Transaction, 'id' | 'createdAt'>
): Promise<string> => {
  console.log('=== CREATE TRANSACTION ===');
  console.log('Transaction data:', transactionData);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const docRef = await addDoc(collection(db, 'transactions'), {
      ...transactionData,
      createdAt: serverTimestamp(),
    });
    
    console.log('✅ Transaction created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    throw error;
  }
};

/**
 * Updates booking payment status
 */
export const updateBookingPaymentStatus = async (
  bookingId: string,
  updates: {
    paymentStatus: string;
    paymentIntentId?: string;
    paymentMethod?: string;
    cardLast4?: string;
    cardBrand?: string;
    paidAt?: string;
  }
): Promise<void> => {
  console.log('=== UPDATE BOOKING PAYMENT STATUS ===');
  console.log('Booking ID:', bookingId);
  console.log('Updates:', updates);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, updates);
    
    console.log('✅ Booking payment status updated');
  } catch (error) {
    console.error('❌ Error updating booking payment status:', error);
    throw error;
  }
};

/**
 * Calculates refund amount based on policy and timing
 */
export const calculateRefundAmount = (booking: Booking): {
  eligible: boolean;
  amount: number;
  reason: string;
} => {
  console.log('=== CALCULATE REFUND AMOUNT ===');
  console.log('Booking:', booking.id);
  console.log('Policy:', booking.refundPolicy);
  
  const now = new Date();
  const checkIn = new Date(booking.checkInDate);
  const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  console.log('Hours until check-in:', hoursUntilCheckIn);
  
  // Non-refundable policy
  if (booking.refundPolicy === 'non-refundable') {
    return {
      eligible: false,
      amount: 0,
      reason: 'This booking is non-refundable',
    };
  }
  
  // Refundable policy
  if (hoursUntilCheckIn >= 48) {
    // Full refund (minus service fee)
    const refundAmount = booking.campPrice + booking.taxes;
    return {
      eligible: true,
      amount: refundAmount,
      reason: 'Full refund (service fee non-refundable)',
    };
  } else if (hoursUntilCheckIn >= 24) {
    // 50% refund
    const refundAmount = (booking.campPrice * 0.5) + booking.taxes;
    return {
      eligible: true,
      amount: refundAmount,
      reason: '50% refund (cancelled 24-48 hours before check-in)',
    };
  } else {
    // No refund
    return {
      eligible: false,
      amount: 0,
      reason: 'No refund available (less than 24 hours before check-in)',
    };
  }
};

/**
 * Requests a refund for a booking
 */
export const requestRefund = async (
  bookingId: string,
  reason: string,
  userId: string
): Promise<void> => {
  console.log('=== REQUEST REFUND ===');
  console.log('Booking ID:', bookingId);
  console.log('Reason:', reason);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    // Get booking to verify eligibility
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      throw new Error('Booking not found');
    }
    
    const booking = bookingSnap.data() as Booking;
    
    // Verify user owns booking
    if (booking.userId !== userId) {
      throw new Error('Unauthorized');
    }
    
    // Check refund eligibility
    const refundCalc = calculateRefundAmount(booking);
    
    if (!refundCalc.eligible) {
      throw new Error(refundCalc.reason);
    }
    
    // Update booking with refund request
    await updateDoc(bookingRef, {
      refundStatus: 'requested',
      refundReason: reason,
      refundAmount: refundCalc.amount,
      refundRequestedAt: new Date().toISOString(),
    });
    
    console.log('✅ Refund requested successfully');
    
    // TODO: Send notification to admin for approval
    
  } catch (error) {
    console.error('❌ Error requesting refund:', error);
    throw error;
  }
};

/**
 * Processes a refund (admin/backend function)
 */
export const processRefund = async (
  bookingId: string,
  refundId: string,
  refundAmount: number
): Promise<void> => {
  console.log('=== PROCESS REFUND ===');
  console.log('Booking ID:', bookingId);
  console.log('Refund ID:', refundId);
  console.log('Amount:', refundAmount);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      throw new Error('Booking not found');
    }
    
    const booking = bookingSnap.data() as Booking;
    
    // Update booking status
    await updateDoc(bookingRef, {
      refundStatus: 'completed',
      refundId,
      refundAmount,
      refundCompletedAt: new Date().toISOString(),
      paymentStatus: 'refunded',
      status: 'cancelled',
    });
    
    // Create refund transaction record
    await createTransaction({
      bookingId,
      userId: booking.userId,
      campId: booking.campId,
      hostId: '', // Get from camp
      type: 'refund',
      status: 'completed',
      amount: refundAmount,
      currency: 'BHD',
      stripeRefundId: refundId,
      paymentMethod: booking.paymentMethod,
      description: `Refund for booking ${bookingId}`,
      completedAt: serverTimestamp() as any,
    });
    
    console.log('✅ Refund processed successfully');
    
  } catch (error) {
    console.error('❌ Error processing refund:', error);
    throw error;
  }
};

/**
 * Gets transaction history for a user
 */
export const getTransactionsByUser = async (
  userId: string
): Promise<Transaction[]> => {
  console.log('=== GET TRANSACTIONS BY USER ===');
  console.log('User ID:', userId);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const transactionsRef = collection(db, 'transactions');
    const q = query(
      transactionsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Transaction[];
    
    console.log(`✅ Fetched ${transactions.length} transactions`);
    return transactions;
    
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    throw error;
  }
};

/**
 * Gets transaction history for a booking
 */
export const getTransactionsByBooking = async (
  bookingId: string
): Promise<Transaction[]> => {
  console.log('=== GET TRANSACTIONS BY BOOKING ===');
  console.log('Booking ID:', bookingId);
  
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  
  try {
    const transactionsRef = collection(db, 'transactions');
    const q = query(
      transactionsRef,
      where('bookingId', '==', bookingId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Transaction[];
    
    console.log(`✅ Fetched ${transactions.length} transactions`);
    return transactions;
    
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    throw error;
  }
};
```

### 5.2 Price Calculation Utilities

**File**: `/workspace/shadcn-ui/src/lib/priceCalculations.ts`

```typescript
/**
 * Calculates complete price breakdown for a booking
 */
export interface PriceBreakdown {
  campPrice: number;
  serviceFee: number;
  taxes: number;
  total: number;
  currency: string;
}

export const calculatePriceBreakdown = (
  pricePerNight: number,
  nights: number,
  guests: number,
  serviceFeePercentage: number = 10,
  taxPercentage: number = 10,
  currency: string = 'BHD'
): PriceBreakdown => {
  // Base camp price
  const campPrice = pricePerNight * nights * guests;
  
  // Service fee (10% of camp price)
  const serviceFee = campPrice * (serviceFeePercentage / 100);
  
  // Taxes (10% of camp price + service fee)
  const taxes = (campPrice + serviceFee) * (taxPercentage / 100);
  
  // Total
  const total = campPrice + serviceFee + taxes;
  
  return {
    campPrice: roundToTwoDecimals(campPrice),
    serviceFee: roundToTwoDecimals(serviceFee),
    taxes: roundToTwoDecimals(taxes),
    total: roundToTwoDecimals(total),
    currency,
  };
};

/**
 * Rounds a number to 2 decimal places
 */
export const roundToTwoDecimals = (num: number): number => {
  return Math.round(num * 100) / 100;
};

/**
 * Converts BHD to fils (smallest currency unit)
 */
export const bhdToFils = (bhd: number): number => {
  return Math.round(bhd * 1000);
};

/**
 * Converts fils to BHD
 */
export const filsToBhd = (fils: number): number => {
  return fils / 1000;
};

/**
 * Formats price for display
 */
export const formatPrice = (
  amount: number,
  currency: string = 'BHD'
): string => {
  return `${amount.toFixed(2)} ${currency}`;
};
```

### 5.3 Refund Eligibility Checker

**File**: `/workspace/shadcn-ui/src/lib/refundEligibility.ts`

```typescript
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
  return format(date, 'MMM dd, yyyy \'at\' h:mm a');
};
```

---

## 6. Payment Flow Diagrams

### 6.1 Complete Booking with Payment Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    USER BOOKING JOURNEY                          │
└──────────────────────────────────────────────────────────────────┘

1. USER SELECTS CAMP & DATES
   │
   ├─→ Index.tsx (Browse camps)
   │   └─→ Click "Reserve Now"
   │
   ▼
2. RESERVE PAGE - BOOKING DETAILS
   │
   ├─→ Reserve.tsx
   │   ├─ Select dates (DateRangePicker)
   │   ├─ Select guests
   │   ├─ Enter contact info
   │   └─ Review price breakdown
   │
   ├─→ Click "Proceed to Payment"
   │
   ▼
3. PAYMENT METHOD SELECTION
   │
   ├─→ PaymentMethodSelector component
   │   ├─ Option 1: Credit/Debit Card
   │   └─ Option 2: Apple Pay (if available)
   │
   ├─→ User selects method
   │
   ▼
4a. CARD PAYMENT FLOW
   │
   ├─→ StripePaymentForm component
   │   ├─ User enters card details (Stripe Elements)
   │   ├─ Click "Pay X BD"
   │   │
   │   ├─→ Frontend: Create Payment Intent
   │   │   └─→ POST /api/create-payment-intent
   │   │       └─→ Returns: clientSecret, paymentIntentId
   │   │
   │   ├─→ Frontend: Confirm Card Payment
   │   │   └─→ stripe.confirmCardPayment(clientSecret, cardDetails)
   │   │       └─→ Stripe processes payment
   │   │
   │   ├─→ 3D Secure (if required)
   │   │   └─→ User authenticates with bank
   │   │
   │   └─→ Payment Result
   │       ├─ SUCCESS → Go to step 5
   │       └─ FAILURE → Show error, allow retry
   │
   ▼
4b. APPLE PAY FLOW
   │
   ├─→ ApplePayButton component
   │   ├─ User clicks Apple Pay button
   │   ├─ Apple Pay sheet opens
   │   ├─ User authenticates (Touch ID/Face ID)
   │   │
   │   ├─→ Frontend: Create Payment Intent
   │   │   └─→ POST /api/create-payment-intent
   │   │
   │   ├─→ Frontend: Confirm Payment
   │   │   └─→ stripe.confirmCardPayment(clientSecret, applePayToken)
   │   │
   │   └─→ Payment Result
   │       ├─ SUCCESS → Go to step 5
   │       └─ FAILURE → Show error, fallback to card
   │
   ▼
5. PAYMENT PROCESSING (Backend)
   │
   ├─→ Stripe Webhook: payment_intent.succeeded
   │   │
   │   ├─→ Update Booking in Firestore
   │   │   ├─ paymentStatus: 'completed'
   │   │   ├─ status: 'confirmed'
   │   │   ├─ paidAt: timestamp
   │   │   └─ paymentIntentId, cardLast4, cardBrand
   │   │
   │   ├─→ Create Transaction Record
   │   │   ├─ type: 'payment'
   │   │   ├─ status: 'completed'
   │   │   └─ amount, currency, stripePaymentIntentId
   │   │
   │   └─→ Send Confirmation Email
   │       ├─ To: User
   │       └─ Content: Booking details, receipt
   │
   ▼
6. PAYMENT CONFIRMATION PAGE
   │
   ├─→ Navigate to /payment-confirmation?bookingId=xxx
   │   │
   │   ├─→ PaymentConfirmation.tsx
   │   │   ├─ Show success message
   │   │   ├─ Display booking details
   │   │   ├─ Show payment summary
   │   │   └─ Action buttons
   │   │       ├─ View Booking Details
   │   │       └─ Download Receipt
   │   │
   │   └─→ User clicks "View Booking Details"
   │       └─→ Navigate to /bookings
   │
   ▼
7. BOOKING CONFIRMED
   │
   └─→ Bookings.tsx
       └─ Booking appears in "Upcoming" tab
           ├─ Status: Confirmed
           ├─ Payment: Completed
           └─ Refund button (if eligible)

┌──────────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING PATHS                          │
└──────────────────────────────────────────────────────────────────┘

ERROR 1: Payment Declined
├─→ Stripe returns error
├─→ Show user-friendly message
│   "Your payment was declined. Please try a different card."
└─→ Allow retry with same or different card

ERROR 2: Network Timeout
├─→ Payment Intent created but confirmation times out
├─→ Show message: "Payment processing, please wait..."
├─→ Poll Payment Intent status
│   ├─ If succeeded → Complete booking
│   └─ If failed → Show error, allow retry

ERROR 3: Webhook Failure
├─→ Payment succeeded but webhook not received
├─→ Fallback: Frontend polls Payment Intent status
├─→ If succeeded after 30 seconds → Complete booking manually
└─→ Create transaction record from frontend

ERROR 4: Concurrent Booking
├─→ Dates become unavailable during payment
├─→ Detect conflict before creating Payment Intent
├─→ Show message: "These dates are no longer available"
└─→ Redirect to camp page to select new dates

ERROR 5: Invalid Card
├─→ Stripe Elements shows real-time validation
├─→ Submit button disabled until valid
└─→ Clear error messages for each field
```

### 6.2 Refund Request Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    REFUND REQUEST FLOW                           │
└──────────────────────────────────────────────────────────────────┘

1. USER VIEWS BOOKING
   │
   ├─→ Bookings.tsx
   │   └─→ BookingCard component
   │       ├─ Shows booking details
   │       └─ "Request Refund" button (if eligible)
   │
   ├─→ Check refund eligibility
   │   └─→ checkRefundEligibility(booking)
   │       ├─ Policy: refundable/non-refundable
   │       ├─ Timing: hours until check-in
   │       └─ Status: not already refunded
   │
   ├─→ If eligible: Show button
   └─→ If not: Hide button or show disabled with reason
   │
   ▼
2. USER CLICKS "REQUEST REFUND"
   │
   ├─→ RefundRequestModal opens
   │   │
   │   ├─→ Display booking details
   │   │   ├─ Camp name
   │   │   ├─ Dates
   │   │   └─ Amount paid
   │   │
   │   ├─→ Calculate refund amount
   │   │   └─→ calculateRefundAmount(booking)
   │   │       ├─ If 48+ hours: Full refund (minus service fee)
   │   │       ├─ If 24-48 hours: 50% refund
   │   │       └─ If <24 hours: No refund
   │   │
   │   ├─→ Show refund amount
   │   │   └─ "You will receive: X BD"
   │   │
   │   ├─→ Reason dropdown
   │   │   ├─ Change of plans
   │   │   ├─ Found alternative
   │   │   ├─ Emergency
   │   │   └─ Other
   │   │
   │   └─→ Warning message
   │       "This action cannot be undone"
   │
   ▼
3. USER CONFIRMS REFUND
   │
   ├─→ Click "Request Refund" button
   │   │
   │   ├─→ Frontend validation
   │   │   └─ Reason selected? ✓
   │   │
   │   ├─→ Call requestRefund()
   │   │   └─→ Firestore: Update booking
   │   │       ├─ refundStatus: 'requested'
   │   │       ├─ refundReason: reason
   │   │       ├─ refundAmount: calculated amount
   │   │       └─ refundRequestedAt: timestamp
   │   │
   │   ├─→ Send notification to admin
   │   │   └─ Email: "New refund request for booking #xxx"
   │   │
   │   └─→ Show success message
   │       "Refund request submitted"
   │
   ▼
4. ADMIN REVIEWS REQUEST (Manual or Automatic)
   │
   ├─→ Admin Dashboard (future feature)
   │   ├─ View pending refund requests
   │   ├─ Review booking details
   │   └─ Approve or reject
   │
   ├─→ For now: Automatic approval for eligible requests
   │   └─→ Cloud Function triggered on refundStatus = 'requested'
   │       └─→ If eligible: Auto-approve and process
   │
   ▼
5. PROCESS REFUND (Backend)
   │
   ├─→ Cloud Function or Admin Action
   │   │
   │   ├─→ Call Stripe Refund API
   │   │   └─→ stripe.refunds.create({
   │   │       payment_intent: booking.paymentIntentId,
   │   │       amount: booking.refundAmount * 1000,
   │   │       reason: 'requested_by_customer'
   │   │     })
   │   │
   │   ├─→ Stripe processes refund
   │   │   └─→ Returns refund ID and status
   │   │
   │   ├─→ Update Booking in Firestore
   │   │   └─→ processRefund(bookingId, refundId, refundAmount)
   │   │       ├─ refundStatus: 'completed'
   │   │       ├─ refundId: Stripe refund ID
   │   │       ├─ refundCompletedAt: timestamp
   │   │       ├─ paymentStatus: 'refunded'
   │   │       └─ status: 'cancelled'
   │   │
   │   ├─→ Create Refund Transaction Record
   │   │   └─→ createTransaction({
   │   │       type: 'refund',
   │   │       status: 'completed',
   │   │       amount: refundAmount,
   │   │       stripeRefundId: refundId
   │   │     })
   │   │
   │   └─→ Send Confirmation Emails
   │       ├─ To User: "Your refund has been processed"
   │       └─ To Host: "Booking #xxx has been cancelled"
   │
   ▼
6. REFUND COMPLETED
   │
   ├─→ User sees updated booking status
   │   └─→ Bookings.tsx
   │       ├─ Status: Cancelled
   │       ├─ Refund Status: Completed
   │       └─ Refund Amount: X BD
   │
   └─→ Refund appears in user's bank account
       └─ Timeline: 5-7 business days

┌──────────────────────────────────────────────────────────────────┐
│                    REFUND ERROR SCENARIOS                        │
└──────────────────────────────────────────────────────────────────┘

ERROR 1: Refund Already Processed
├─→ Check booking.refundStatus before processing
└─→ If already 'completed': Return error "Already refunded"

ERROR 2: Stripe Refund Fails
├─→ Stripe API returns error
├─→ Update booking: refundStatus = 'failed'
├─→ Notify admin for manual intervention
└─→ Show user: "Refund processing failed, support will contact you"

ERROR 3: Insufficient Funds in Stripe Account
├─→ Rare case: Stripe account has insufficient balance
├─→ Refund goes to 'pending' status
├─→ Monitor and retry when funds available
└─→ Notify user of delay

ERROR 4: User Changes Mind After Request
├─→ Allow cancellation of refund request
├─→ Only if refundStatus is still 'requested'
├─→ Update status back to 'none'
└─→ Booking remains active
```

### 6.3 Webhook Event Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    STRIPE WEBHOOK FLOW                           │
└──────────────────────────────────────────────────────────────────┘

STRIPE → WEBHOOK ENDPOINT → HANDLER → FIRESTORE → USER NOTIFICATION

1. STRIPE SENDS WEBHOOK
   │
   ├─→ Event: payment_intent.succeeded
   │   ├─ Payload: PaymentIntent object
   │   ├─ Signature: Webhook signature for verification
   │   └─ Timestamp: Event creation time
   │
   ▼
2. WEBHOOK ENDPOINT RECEIVES REQUEST
   │
   ├─→ Cloud Function: /webhooks/stripe
   │   │
   │   ├─→ Verify webhook signature
   │   │   └─→ stripe.webhooks.constructEvent(
   │   │       rawBody,
   │   │       signature,
   │   │       webhookSecret
   │   │     )
   │   │   ├─ Valid ✓ → Continue
   │   │   └─ Invalid ✗ → Return 400 error
   │   │
   │   └─→ Parse event type
   │       ├─ payment_intent.succeeded
   │       ├─ payment_intent.payment_failed
   │       ├─ charge.refunded
   │       └─ Other events (log and ignore)
   │
   ▼
3. HANDLE EVENT TYPE
   │
   ├─→ payment_intent.succeeded
   │   │
   │   ├─→ Extract metadata
   │   │   ├─ bookingId
   │   │   ├─ userId
   │   │   └─ campId
   │   │
   │   ├─→ Extract payment details
   │   │   ├─ paymentIntentId
   │   │   ├─ amount
   │   │   ├─ currency
   │   │   ├─ payment_method (card details)
   │   │   └─ status
   │   │
   │   ├─→ Update Booking
   │   │   └─→ updateDoc(bookingsRef, bookingId, {
   │   │       paymentStatus: 'completed',
   │   │       status: 'confirmed',
   │   │       paymentIntentId,
   │   │       cardLast4,
   │   │       cardBrand,
   │   │       paidAt: timestamp
   │   │     })
   │   │
   │   ├─→ Create Transaction Record
   │   │   └─→ createTransaction({
   │   │       type: 'payment',
   │   │       status: 'completed',
   │   │       ...paymentDetails
   │   │     })
   │   │
   │   ├─→ Send Confirmation Email
   │   │   └─→ sendEmail(user.email, 'booking-confirmation', {
   │   │       bookingDetails,
   │   │       receiptUrl
   │   │     })
   │   │
   │   └─→ Return 200 OK to Stripe
   │
   ▼
   │
   ├─→ payment_intent.payment_failed
   │   │
   │   ├─→ Extract failure reason
   │   │   ├─ card_declined
   │   │   ├─ insufficient_funds
   │   │   └─ authentication_failed
   │   │
   │   ├─→ Update Booking
   │   │   └─→ updateDoc(bookingsRef, bookingId, {
   │   │       paymentStatus: 'failed',
   │   │       failureReason: error.message
   │   │     })
   │   │
   │   ├─→ Send Failure Email (optional)
   │   │   └─ "Your payment failed, please try again"
   │   │
   │   └─→ Return 200 OK
   │
   ▼
   │
   └─→ charge.refunded
       │
       ├─→ Extract refund details
       │   ├─ refund ID
       │   ├─ amount
       │   └─ payment_intent ID
       │
       ├─→ Find Booking by paymentIntentId
       │   └─→ query(bookingsRef,
       │       where('paymentIntentId', '==', paymentIntentId)
       │     )
       │
       ├─→ Update Booking
       │   └─→ updateDoc(bookingRef, {
       │       refundStatus: 'completed',
       │       refundCompletedAt: timestamp,
       │       paymentStatus: 'refunded'
       │     })
       │
       ├─→ Create Refund Transaction
       │   └─→ createTransaction({
       │       type: 'refund',
       │       status: 'completed',
       │       ...refundDetails
       │     })
       │
       ├─→ Send Refund Confirmation Email
       │   └─ "Your refund of X BD has been processed"
       │
       └─→ Return 200 OK

┌──────────────────────────────────────────────────────────────────┐
│                    WEBHOOK RELIABILITY                           │
└──────────────────────────────────────────────────────────────────┘

PROBLEM: Webhook delivery can fail

SOLUTIONS:

1. Idempotency
   ├─→ Check if event already processed
   │   └─ Store processed event IDs in Firestore
   └─→ If already processed: Return 200 OK, skip processing

2. Retry Logic
   ├─→ Stripe automatically retries failed webhooks
   │   └─ Exponential backoff: 1h, 2h, 4h, 8h, 16h
   └─→ Webhook endpoint must be idempotent

3. Fallback: Frontend Polling
   ├─→ If webhook not received within 30 seconds
   ├─→ Frontend polls Payment Intent status
   │   └─→ GET /api/payment-intent/:id/status
   └─→ If succeeded: Complete booking from frontend

4. Manual Reconciliation
   ├─→ Admin dashboard shows unreconciled payments
   ├─→ Daily cron job checks for mismatches
   │   └─ Stripe payments without corresponding bookings
   └─→ Alert admin for manual review
```

---

## 7. Security Architecture

### 7.1 PCI DSS Compliance

**Key Principle**: Never handle raw card data

```
┌──────────────────────────────────────────────────────────────────┐
│                    CARD DATA FLOW                                │
└──────────────────────────────────────────────────────────────────┘

USER ENTERS CARD → STRIPE ELEMENTS → STRIPE SERVERS → TOKEN
                                                         │
                                                         ▼
                                    OUR SERVER ← PAYMENT INTENT ID
                                         │
                                         ▼
                                    FIRESTORE
                                    (Only stores:
                                     - Payment Intent ID
                                     - Last 4 digits
                                     - Card brand
                                     - No full card number
                                     - No CVV
                                     - No expiry)
```

**What We Store**:
✅ Payment Intent ID (pi_xxx)
✅ Last 4 digits (4242)
✅ Card brand (Visa, Mastercard)
✅ Payment status
✅ Transaction amounts

**What We NEVER Store**:
❌ Full card number
❌ CVV/CVC code
❌ Card expiry date
❌ Cardholder authentication data

### 7.2 API Key Security

**Environment Variables** (Never commit to Git):

```bash
# .env (local development)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# .env.production (production)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**.gitignore**:
```
.env
.env.local
.env.production
```

**Firebase Functions Config**:
```bash
firebase functions:config:set \
  stripe.secret_key="sk_test_..." \
  stripe.webhook_secret="whsec_..."
```

**Access Control**:
- Publishable key: Safe to expose in frontend
- Secret key: Backend only, never in frontend code
- Webhook secret: Backend only, for signature verification

### 7.3 Webhook Signature Verification

```typescript
/**
 * Verifies Stripe webhook signature
 * CRITICAL: Always verify before processing events
 */
export const verifyWebhookSignature = (
  rawBody: string,
  signature: string,
  secret: string
): Stripe.Event => {
  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      secret
    );
    
    console.log('✅ Webhook signature verified');
    return event;
    
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
};
```

**Why This Matters**:
- Prevents attackers from sending fake webhook events
- Ensures events actually came from Stripe
- Protects against replay attacks

### 7.4 Rate Limiting

**Prevent Payment Abuse**:

```typescript
// Rate limit: 5 payment attempts per user per hour
const PAYMENT_RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
};

/**
 * Checks if user has exceeded payment rate limit
 */
export const checkPaymentRateLimit = async (
  userId: string
): Promise<{ allowed: boolean; remainingAttempts: number }> => {
  const now = Date.now();
  const windowStart = now - PAYMENT_RATE_LIMIT.windowMs;
  
  // Query recent payment attempts
  const attemptsRef = collection(db, 'payment_attempts');
  const q = query(
    attemptsRef,
    where('userId', '==', userId),
    where('timestamp', '>', windowStart)
  );
  
  const snapshot = await getDocs(q);
  const attemptCount = snapshot.size;
  
  const allowed = attemptCount < PAYMENT_RATE_LIMIT.maxAttempts;
  const remainingAttempts = Math.max(0, PAYMENT_RATE_LIMIT.maxAttempts - attemptCount);
  
  if (!allowed) {
    console.warn(`⚠️ Rate limit exceeded for user ${userId}`);
  }
  
  return { allowed, remainingAttempts };
};

/**
 * Records a payment attempt
 */
export const recordPaymentAttempt = async (
  userId: string,
  success: boolean
): Promise<void> => {
  await addDoc(collection(db, 'payment_attempts'), {
    userId,
    success,
    timestamp: Date.now(),
  });
};
```

### 7.5 Fraud Detection

**Stripe Radar Integration**:

```typescript
/**
 * Creates Payment Intent with fraud detection
 */
export const createPaymentIntentWithFraudCheck = async (
  amount: number,
  metadata: Record<string, string>
): Promise<Stripe.PaymentIntent> => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 1000),
    currency: 'bhd',
    metadata,
    
    // Enable Stripe Radar (automatic fraud detection)
    // Radar is included with Stripe, no extra setup needed
    
    // Add risk indicators
    description: `Booking for ${metadata.campTitle}`,
    
    // Capture payment immediately (not on hold)
    capture_method: 'automatic',
  });
  
  // Check Radar risk score (if available)
  if (paymentIntent.charges?.data[0]?.outcome?.risk_score) {
    const riskScore = paymentIntent.charges.data[0].outcome.risk_score;
    
    if (riskScore > 75) {
      console.warn(`⚠️ High risk payment detected: ${riskScore}`);
      // Could add manual review step here
    }
  }
  
  return paymentIntent;
};
```

**Manual Fraud Indicators**:
- Multiple failed payment attempts
- Unusual booking patterns (many bookings in short time)
- Mismatched user info (email vs name)
- High-value bookings from new accounts
- IP address from high-risk country

### 7.6 Data Encryption

**In Transit**:
- All API calls over HTTPS (TLS 1.2+)
- Stripe uses TLS 1.2+ for all connections
- Firebase Firestore uses HTTPS by default

**At Rest**:
- Firestore encrypts all data at rest (AES-256)
- Stripe encrypts all data at rest
- No additional encryption needed

**Sensitive Data Handling**:
```typescript
// ❌ NEVER DO THIS
const booking = {
  cardNumber: '4242424242424242', // NEVER store
  cvv: '123',                      // NEVER store
};

// ✅ CORRECT
const booking = {
  paymentIntentId: 'pi_xxx',       // Safe to store
  cardLast4: '4242',               // Safe to store
  cardBrand: 'visa',               // Safe to store
};
```

### 7.7 Access Control

**Firestore Security Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Bookings: Users can only read/write their own
    match /bookings/{bookingId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid ||
         resource.data.hostId == request.auth.uid);
      
      allow create: if request.auth != null &&
        request.resource.data.userId == request.auth.uid &&
        request.resource.data.paymentStatus == 'pending';
      
      allow update: if request.auth != null &&
        resource.data.userId == request.auth.uid &&
        // Only allow updating specific fields
        !request.resource.data.diff(resource.data).affectedKeys()
          .hasAny(['totalPrice', 'campPrice', 'paymentIntentId']);
    }
    
    // Transactions: Read-only for users, write-only for backend
    match /transactions/{transactionId} {
      allow read: if request.auth != null &&
        (resource.data.userId == request.auth.uid ||
         resource.data.hostId == request.auth.uid);
      
      // Only backend (Cloud Functions) can create/update
      allow write: if false;
    }
    
    // Camps: Public read, host-only write
    match /camps/{campId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        resource.data.hostId == request.auth.uid;
    }
  }
}
```

### 7.8 Audit Trail

**Transaction Logging**:

```typescript
/**
 * Creates comprehensive audit log for payment
 */
export const createPaymentAuditLog = async (
  booking: Booking,
  paymentIntent: Stripe.PaymentIntent,
  request: Request
): Promise<void> => {
  await addDoc(collection(db, 'audit_logs'), {
    type: 'payment',
    bookingId: booking.id,
    userId: booking.userId,
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount / 1000,
    currency: paymentIntent.currency,
    status: paymentIntent.status,
    
    // Request metadata
    ipAddress: request.headers.get('x-forwarded-for') || request.ip,
    userAgent: request.headers.get('user-agent'),
    timestamp: serverTimestamp(),
    
    // Additional context
    metadata: {
      campId: booking.campId,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
    },
  });
};
```

**Retention Policy**:
- Audit logs: Keep for 7 years (compliance requirement)
- Transaction records: Keep indefinitely
- Payment attempts: Keep for 1 year

---

## 8. Error Handling Strategy

### 8.1 Payment Error Categories

**1. Card Errors** (User-facing, actionable):
```typescript
const CARD_ERROR_MESSAGES: Record<string, string> = {
  card_declined: 'Your card was declined. Please try a different card.',
  insufficient_funds: 'Your card has insufficient funds. Please use a different card.',
  expired_card: 'Your card has expired. Please use a different card.',
  incorrect_cvc: 'The security code (CVC) is incorrect. Please check and try again.',
  processing_error: 'An error occurred while processing your card. Please try again.',
  incorrect_number: 'The card number is incorrect. Please check and try again.',
};
```

**2. Network Errors** (Retry-able):
```typescript
const NETWORK_ERROR_MESSAGES: Record<string, string> = {
  api_connection_error: 'Unable to connect to payment processor. Please check your internet connection.',
  api_error: 'A temporary error occurred. Please try again.',
  rate_limit_error: 'Too many requests. Please wait a moment and try again.',
};
```

**3. Business Logic Errors** (Non-retry-able):
```typescript
const BUSINESS_ERROR_MESSAGES: Record<string, string> = {
  booking_unavailable: 'These dates are no longer available. Please select different dates.',
  invalid_amount: 'The payment amount is invalid. Please refresh and try again.',
  booking_already_paid: 'This booking has already been paid for.',
};
```

### 8.2 Error Handling Implementation

**Frontend Error Handler**:

```typescript
/**
 * Handles payment errors with user-friendly messages
 */
export const handlePaymentError = (error: any): {
  message: string;
  retryable: boolean;
  action?: string;
} => {
  console.error('Payment error:', error);
  
  // Stripe card errors
  if (error.type === 'card_error') {
    return {
      message: CARD_ERROR_MESSAGES[error.code] || 'Your card was declined.',
      retryable: true,
      action: 'try_different_card',
    };
  }
  
  // Network errors
  if (error.type === 'api_connection_error' || error.type === 'api_error') {
    return {
      message: NETWORK_ERROR_MESSAGES[error.type] || 'A temporary error occurred.',
      retryable: true,
      action: 'retry',
    };
  }
  
  // Rate limit
  if (error.type === 'rate_limit_error') {
    return {
      message: 'Too many payment attempts. Please wait a moment.',
      retryable: true,
      action: 'wait_and_retry',
    };
  }
  
  // Business logic errors
  if (error.code === 'booking_unavailable') {
    return {
      message: 'These dates are no longer available.',
      retryable: false,
      action: 'select_new_dates',
    };
  }
  
  // Generic error
  return {
    message: 'An unexpected error occurred. Please try again or contact support.',
    retryable: true,
    action: 'retry',
  };
};
```

**Usage in Component**:

```typescript
const handlePayment = async () => {
  try {
    setProcessing(true);
    
    // Create payment intent
    const { clientSecret } = await createPaymentIntent(...);
    
    // Confirm payment
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, ...);
    
    if (error) {
      const errorInfo = handlePaymentError(error);
      
      toast.error(errorInfo.message);
      
      if (errorInfo.action === 'try_different_card') {
        // Show option to use different card
        setShowCardSelector(true);
      } else if (errorInfo.action === 'select_new_dates') {
        // Redirect to camp page
        navigate(`/camp/${campId}`);
      }
      
      return;
    }
    
    // Success
    handlePaymentSuccess(paymentIntent);
    
  } catch (error) {
    const errorInfo = handlePaymentError(error);
    toast.error(errorInfo.message);
  } finally {
    setProcessing(false);
  }
};
```

### 8.3 Retry Logic

**Exponential Backoff for Network Errors**:

```typescript
/**
 * Retries a function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on card errors
      if (error.type === 'card_error') {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Usage
const createPaymentWithRetry = () => {
  return retryWithBackoff(
    () => createPaymentIntent(bookingId, amount, currency, userId, campId),
    3,
    1000
  );
};
```

### 8.4 Timeout Handling

**Payment Confirmation Timeout**:

```typescript
/**
 * Confirms payment with timeout
 */
export const confirmPaymentWithTimeout = async (
  stripe: Stripe,
  clientSecret: string,
  paymentMethod: any,
  timeoutMs: number = 30000
): Promise<{ error?: any; paymentIntent?: Stripe.PaymentIntent }> => {
  
  return Promise.race([
    // Payment confirmation
    stripe.confirmCardPayment(clientSecret, { payment_method: paymentMethod }),
    
    // Timeout
    new Promise<{ error: any }>((resolve) => {
      setTimeout(() => {
        resolve({
          error: {
            type: 'timeout_error',
            message: 'Payment confirmation timed out',
          },
        });
      }, timeoutMs);
    }),
  ]);
};
```

**Fallback: Poll Payment Intent Status**:

```typescript
/**
 * Polls Payment Intent status as fallback
 */
export const pollPaymentIntentStatus = async (
  paymentIntentId: string,
  maxAttempts: number = 10,
  intervalMs: number = 3000
): Promise<Stripe.PaymentIntent> => {
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      return paymentIntent;
    }
    
    if (paymentIntent.status === 'canceled' || paymentIntent.status === 'payment_failed') {
      throw new Error(`Payment ${paymentIntent.status}`);
    }
    
    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error('Payment status polling timed out');
};
```

### 8.5 User-Friendly Error Display

**Error Toast Component**:

```typescript
/**
 * Shows payment error with appropriate styling and actions
 */
export const showPaymentError = (error: any) => {
  const errorInfo = handlePaymentError(error);
  
  toast.error(
    <div className="space-y-2">
      <p className="font-semibold">{errorInfo.message}</p>
      {errorInfo.retryable && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            toast.dismiss();
            // Trigger retry
          }}
        >
          Try Again
        </Button>
      )}
    </div>,
    {
      duration: errorInfo.retryable ? 10000 : 5000,
    }
  );
};
```

### 8.6 Error Logging

**Comprehensive Error Logging**:

```typescript
/**
 * Logs payment errors for debugging and monitoring
 */
export const logPaymentError = async (
  error: any,
  context: {
    userId: string;
    bookingId: string;
    amount: number;
    paymentIntentId?: string;
  }
): Promise<void> => {
  const errorLog = {
    type: 'payment_error',
    errorType: error.type,
    errorCode: error.code,
    errorMessage: error.message,
    ...context,
    timestamp: serverTimestamp(),
    userAgent: navigator.userAgent,
  };
  
  try {
    await addDoc(collection(db, 'error_logs'), errorLog);
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
  
  // Also log to console for development
  console.error('Payment Error:', errorLog);
};
```

---

## 9. Mobile Responsiveness

### 9.1 Responsive Breakpoints

```typescript
// Tailwind breakpoints (already configured)
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
};
```

### 9.2 Mobile Payment UI Adaptations

**Reserve Page Mobile Layout**:

```tsx
// Desktop: Two-column layout
// Mobile: Single-column, stacked

<div className="grid lg:grid-cols-3 gap-6">
  {/* Form Section - Full width on mobile */}
  <div className="lg:col-span-2">
    <Card className="p-4 md:p-6">
      {/* Payment form */}
    </Card>
  </div>
  
  {/* Summary Section - Full width on mobile, sticky on desktop */}
  <div className="lg:col-span-1">
    <div className="lg:sticky lg:top-4">
      <Card className="p-4 md:p-6">
        {/* Price breakdown */}
      </Card>
    </div>
  </div>
</div>
```

**Mobile-Optimized Payment Button**:

```tsx
<Button
  type="submit"
  disabled={processing}
  className="
    w-full 
    h-12 md:h-14 
    text-base md:text-lg
    fixed md:relative
    bottom-0 md:bottom-auto
    left-0 md:left-auto
    right-0 md:right-auto
    rounded-none md:rounded-lg
    z-50
  "
>
  {processing ? 'Processing...' : `Pay ${total} BD`}
</Button>
```

### 9.3 Touch-Friendly Interactions

**Minimum Touch Target Size**: 44px × 44px (Apple HIG standard)

```tsx
// Payment method selector - large touch targets
<div
  className="
    border-2 rounded-lg p-4
    cursor-pointer
    min-h-[60px]
    flex items-center
    active:bg-gray-50
    transition-colors
  "
  onClick={() => selectPaymentMethod('card')}
>
  {/* Content */}
</div>
```

**Apple Pay Button Sizing**:

```tsx
<button
  className="
    apple-pay-button
    h-12 md:h-14
    w-full
    rounded-lg
  "
  style={{
    WebkitAppearance: '-apple-pay-button',
    applePayButtonStyle: 'black',
    applePayButtonType: 'buy',
  }}
  onClick={handleApplePay}
/>
```

### 9.4 Mobile Keyboard Handling

**Auto-focus and Keyboard Behavior**:

```tsx
// Card input - optimize for mobile keyboard
<CardElement
  options={{
    style: {
      base: {
        fontSize: '16px', // Prevents zoom on iOS
        lineHeight: '24px',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
    },
  }}
  onReady={(element) => {
    // Auto-focus on mobile
    if (window.innerWidth < 768) {
      element.focus();
    }
  }}
/>
```

**Input Type Optimization**:

```tsx
// Phone number input - numeric keyboard on mobile
<Input
  type="tel"
  inputMode="numeric"
  pattern="[0-9]*"
  placeholder="+973 XXXX XXXX"
/>

// Amount input - decimal keyboard on mobile
<Input
  type="number"
  inputMode="decimal"
  step="0.01"
/>
```

### 9.5 Mobile-Specific Payment Flow

**Simplified Mobile Checkout**:

```tsx
const MobileCheckout = () => {
  const [step, setStep] = useState<'details' | 'payment' | 'confirm'>('details');
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress indicator */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex justify-between p-4">
          <div className={step === 'details' ? 'text-terracotta-600 font-bold' : 'text-gray-400'}>
            1. Details
          </div>
          <div className={step === 'payment' ? 'text-terracotta-600 font-bold' : 'text-gray-400'}>
            2. Payment
          </div>
          <div className={step === 'confirm' ? 'text-terracotta-600 font-bold' : 'text-gray-400'}>
            3. Confirm
          </div>
        </div>
      </div>
      
      {/* Step content */}
      <div className="p-4">
        {step === 'details' && <BookingDetailsStep onNext={() => setStep('payment')} />}
        {step === 'payment' && <PaymentStep onNext={() => setStep('confirm')} />}
        {step === 'confirm' && <ConfirmStep />}
      </div>
      
      {/* Sticky bottom button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <Button className="w-full h-12" onClick={handleNext}>
          {step === 'confirm' ? 'Complete Booking' : 'Continue'}
        </Button>
      </div>
    </div>
  );
};
```

### 9.6 Apple Pay Mobile Integration

**Apple Pay Button Appearance**:

```css
/* Apple Pay button styling for mobile */
.apple-pay-button {
  -webkit-appearance: -apple-pay-button;
  -apple-pay-button-type: buy;
  -apple-pay-button-style: black;
  height: 48px;
  width: 100%;
  border-radius: 8px;
  cursor: pointer;
}

.apple-pay-button:hover {
  -apple-pay-button-style: white-outline;
}

@media (min-width: 768px) {
  .apple-pay-button {
    height: 56px;
  }
}
```

**Apple Pay Sheet Configuration**:

```typescript
const configureApplePayForMobile = () => {
  const paymentRequest = stripe.paymentRequest({
    country: 'BH',
    currency: 'bhd',
    total: {
      label: 'Sahra Booking',
      amount: Math.round(totalAmount * 1000),
    },
    requestPayerName: true,
    requestPayerEmail: true,
    requestPayerPhone: true, // Mobile users expect this
  });
  
  return paymentRequest;
};
```

### 9.7 Mobile Performance Optimization

**Lazy Loading**:

```tsx
// Lazy load payment components
const StripePaymentForm = lazy(() => import('@/components/StripePaymentForm'));
const ApplePayButton = lazy(() => import('@/components/ApplePayButton'));

// Show loading spinner while loading
<Suspense fallback={<PaymentFormSkeleton />}>
  <StripePaymentForm />
</Suspense>
```

**Image Optimization**:

```tsx
// Responsive images for camp photos
<img
  src={camp.photo}
  srcSet={`
    ${camp.photo}?w=400 400w,
    ${camp.photo}?w=800 800w,
    ${camp.photo}?w=1200 1200w
  `}
  sizes="
    (max-width: 768px) 100vw,
    (max-width: 1024px) 50vw,
    33vw
  "
  alt={camp.title}
  loading="lazy"
/>
```

### 9.8 Mobile Testing Checklist

**iOS Testing**:
- [ ] Apple Pay button appears on Safari
- [ ] Touch ID/Face ID authentication works
- [ ] Card input doesn't zoom page (16px font size)
- [ ] Keyboard doesn't cover input fields
- [ ] Payment confirmation displays correctly
- [ ] Back button works properly

**Android Testing**:
- [ ] Google Pay button appears (if implemented)
- [ ] Card input works smoothly
- [ ] Keyboard behavior is correct
- [ ] Payment processing shows loading state
- [ ] Error messages display properly
- [ ] Navigation works correctly

**Cross-Device Testing**:
- [ ] iPhone SE (small screen)
- [ ] iPhone 14 Pro (standard)
- [ ] iPhone 14 Pro Max (large)
- [ ] Samsung Galaxy S23 (Android)
- [ ] iPad (tablet)
- [ ] Various Android tablets

---

## 10. Implementation Roadmap

### Phase 1: Database & Stripe Setup (Week 1)

**Duration**: 5 days  
**Owner**: Alex (Engineer)

**Day 1-2: Stripe Account & SDK Setup**
- [ ] Create Stripe account (test mode)
- [ ] Get API keys (publishable and secret)
- [ ] Install Stripe SDKs
  ```bash
  npm install stripe @stripe/stripe-js @stripe/react-stripe-js
  ```
- [ ] Set up environment variables
- [ ] Test Stripe connection

**Day 3-4: Database Schema Updates**
- [ ] Update Camp interface with refund policy fields
- [ ] Update Booking interface with payment fields
- [ ] Create Transaction interface
- [ ] Create Firestore indexes
  ```bash
  # Create composite indexes in Firebase Console
  - bookings: paymentStatus + createdAt
  - transactions: userId + createdAt
  - transactions: bookingId + createdAt
  ```
- [ ] Update Firestore security rules

**Day 5: Stripe Integration Functions**
- [ ] Implement `createPaymentIntent()`
- [ ] Implement `confirmPayment()`
- [ ] Implement `createRefund()`
- [ ] Test with Stripe test cards
- [ ] Document all functions

**Deliverables**:
- ✅ Stripe account configured
- ✅ All database schemas updated
- ✅ Firestore indexes created
- ✅ Basic Stripe functions working
- ✅ Test mode validated

**Success Criteria**:
- Can create Payment Intent successfully
- Database queries work with new schema
- All functions have error handling
- Console logs show clear payment flow

---

### Phase 2: Payment UI Components (Week 2)

**Duration**: 5 days  
**Owner**: Alex (Engineer)

**Day 1: Core Payment Components**
- [ ] Create `PaymentMethodSelector.tsx`
  - Radio buttons for card/Apple Pay
  - Payment method icons
  - Conditional Apple Pay display
- [ ] Create `PriceBreakdown.tsx`
  - Camp price calculation
  - Service fee (10%)
  - Taxes (10%)
  - Total display

**Day 2: Stripe Elements Integration**
- [ ] Create `StripePaymentForm.tsx`
  - Integrate CardElement
  - Form validation
  - Submit handler
  - Loading states
- [ ] Style Stripe Elements to match design
- [ ] Add error display

**Day 3: Refund Components**
- [ ] Create `RefundPolicyBadge.tsx`
  - Refundable/Non-refundable badges
  - Tooltip with policy details
- [ ] Create `RefundRequestModal.tsx`
  - Refund amount calculation
  - Reason selector
  - Confirmation dialog

**Day 4: Confirmation & Receipt**
- [ ] Create `PaymentConfirmation.tsx` page
  - Success message
  - Booking details display
  - Payment summary
  - Download receipt button
- [ ] Create receipt PDF template

**Day 5: Mobile Optimization**
- [ ] Make all components responsive
- [ ] Test on mobile devices
- [ ] Add touch-friendly interactions
- [ ] Optimize for small screens

**Deliverables**:
- ✅ 6 new payment components
- ✅ All components styled with Tailwind
- ✅ Mobile responsive layouts
- ✅ Loading and error states
- ✅ Storybook documentation (optional)

**Success Criteria**:
- Components render correctly on all screen sizes
- Forms validate properly
- Error messages are clear
- Loading states are smooth
- Matches design specifications

---

### Phase 3: Checkout Flow Integration (Week 3)

**Duration**: 5 days  
**Owner**: Alex (Engineer)

**Day 1: Update Reserve.tsx**
- [ ] Add payment method selection
- [ ] Integrate PriceBreakdown component
- [ ] Add refund policy display
- [ ] Update booking flow to include payment

**Day 2: Payment Processing**
- [ ] Implement payment submission handler
- [ ] Create Payment Intent on form submit
- [ ] Confirm payment with Stripe
- [ ] Handle 3D Secure authentication
- [ ] Update booking status after payment

**Day 3: Transaction Recording**
- [ ] Implement `createTransaction()` in firestore.ts
- [ ] Record transaction on payment success
- [ ] Update booking with payment details
- [ ] Add payment status tracking

**Day 4: Confirmation Flow**
- [ ] Redirect to PaymentConfirmation page
- [ ] Load booking details
- [ ] Display receipt
- [ ] Send confirmation email (using Firebase Functions)

**Day 5: Error Handling**
- [ ] Implement comprehensive error handling
- [ ] Add retry logic for network errors
- [ ] Handle payment failures gracefully
- [ ] Test all error scenarios

**Deliverables**:
- ✅ Complete checkout flow working
- ✅ Payment processing functional
- ✅ Transaction logging implemented
- ✅ Confirmation page complete
- ✅ Error handling comprehensive

**Success Criteria**:
- Can complete booking with card payment
- Payment Intent created correctly
- Booking created after successful payment
- Transaction record created
- Confirmation page displays correctly
- Errors handled gracefully

---

### Phase 4: Apple Pay & Refund System (Week 4)

**Duration**: 7 days  
**Owner**: Alex (Engineer)

**Day 1-2: Apple Pay Integration**
- [ ] Check Apple Pay availability
- [ ] Create `ApplePayButton.tsx` component
- [ ] Implement Apple Pay payment flow
- [ ] Handle Apple Pay authentication
- [ ] Test on iOS devices (iPhone, iPad, Mac)

**Day 3: Refund Policy Setup**
- [ ] Add refund policy field to camp creation form
- [ ] Update camp cards to show refund policy badge
- [ ] Display refund policy on camp details page
- [ ] Show refund policy during checkout

**Day 4-5: Refund Request System**
- [ ] Implement `calculateRefundAmount()` function
- [ ] Add "Request Refund" button to bookings
- [ ] Implement refund eligibility check
- [ ] Create refund request modal
- [ ] Submit refund request to Firestore

**Day 6: Refund Processing**
- [ ] Implement `processRefund()` function
- [ ] Create Stripe refund via API
- [ ] Update booking status
- [ ] Create refund transaction record
- [ ] Send refund confirmation email

**Day 7: Testing & Polish**
- [ ] Test Apple Pay on multiple devices
- [ ] Test refund flow end-to-end
- [ ] Test refund eligibility calculations
- [ ] Fix any bugs found
- [ ] Polish UI/UX

**Deliverables**:
- ✅ Apple Pay working on compatible devices
- ✅ Refund policy system implemented
- ✅ Refund request flow functional
- ✅ Refund processing automated
- ✅ All features tested

**Success Criteria**:
- Apple Pay button appears on iOS/Safari
- Apple Pay payment completes successfully
- Refund requests can be submitted
- Refunds process through Stripe
- Users receive refund confirmation
- Refund amount calculated correctly

---

### Phase 5: Webhooks & Production Readiness (Week 5)

**Duration**: 5 days  
**Owner**: Alex (Engineer) + Mike (PM)

**Day 1: Webhook Setup**
- [ ] Create Cloud Function for webhook endpoint
- [ ] Implement webhook signature verification
- [ ] Handle `payment_intent.succeeded` event
- [ ] Handle `payment_intent.payment_failed` event
- [ ] Handle `charge.refunded` event

**Day 2: Webhook Testing**
- [ ] Test webhooks with Stripe CLI
  ```bash
  stripe listen --forward-to localhost:5001/webhook
  stripe trigger payment_intent.succeeded
  ```
- [ ] Test webhook retry logic
- [ ] Test idempotency
- [ ] Verify all events handled correctly

**Day 3: Production Configuration**
- [ ] Switch to Stripe live mode
- [ ] Update API keys to production
- [ ] Configure production webhook endpoint
- [ ] Set up webhook monitoring
- [ ] Enable Stripe Radar (fraud detection)

**Day 4: Security Audit**
- [ ] Verify no card data stored
- [ ] Check API key security
- [ ] Review Firestore security rules
- [ ] Test rate limiting
- [ ] Review error messages (no sensitive data)

**Day 5: Final Testing & Documentation**
- [ ] Test complete flow with real card (small amount)
- [ ] Test refund flow with real refund
- [ ] Create user documentation
- [ ] Create admin documentation
- [ ] Update README with payment setup instructions

**Deliverables**:
- ✅ Webhook endpoint deployed
- ✅ Production Stripe account configured
- ✅ Security audit passed
- ✅ Documentation complete
- ✅ System ready for launch

**Success Criteria**:
- Webhooks process events correctly
- Production payment works
- Security measures in place
- No sensitive data exposed
- Documentation complete
- Team trained on payment system

---

### Implementation Dependencies

```
Phase 1 (Database & Stripe)
    ↓
Phase 2 (UI Components)
    ↓
Phase 3 (Checkout Flow) ← Depends on Phase 1 & 2
    ↓
Phase 4 (Apple Pay & Refunds) ← Depends on Phase 3
    ↓
Phase 5 (Webhooks & Production) ← Depends on all previous phases
```

### Risk Mitigation

**High-Risk Items**:
1. **Stripe API Integration** - Test thoroughly in test mode before production
2. **Webhook Reliability** - Implement fallback polling mechanism
3. **Apple Pay Testing** - Requires physical iOS devices
4. **Refund Calculations** - Verify math is correct with multiple scenarios

**Mitigation Strategies**:
- Start with test mode and test cards
- Implement comprehensive error handling
- Test on real devices early
- Create unit tests for calculations
- Have backup plan for each critical feature

### Post-Launch Monitoring

**Week 1 After Launch**:
- Monitor payment success rate (target >98%)
- Track payment errors and failures
- Monitor webhook delivery success
- Check refund request volume
- Gather user feedback

**Week 2-4**:
- Analyze payment method preferences
- Review fraud detection alerts
- Optimize checkout conversion rate
- Address any issues found
- Plan improvements

---

## Appendix A: Stripe Test Cards

**Success Scenarios**:
- `4242 4242 4242 4242` - Visa (succeeds)
- `5555 5555 5555 4444` - Mastercard (succeeds)
- `3782 822463 10005` - Amex (succeeds)

**Decline Scenarios**:
- `4000 0000 0000 0002` - Generic decline
- `4000 0000 0000 9995` - Insufficient funds
- `4000 0000 0000 9987` - Lost card
- `4000 0000 0000 9979` - Stolen card

**3D Secure**:
- `4000 0027 6000 3184` - Requires authentication

**Full list**: https://stripe.com/docs/testing

---

## Appendix B: Firestore Index Commands

```bash
# Create indexes via Firebase Console or CLI

# Bookings indexes
firebase firestore:indexes:create \
  --collection-group=bookings \
  --query-scope=COLLECTION \
  --field=paymentStatus --order=ASC \
  --field=createdAt --order=DESC

firebase firestore:indexes:create \
  --collection-group=bookings \
  --query-scope=COLLECTION \
  --field=refundStatus --order=ASC \
  --field=refundRequestedAt --order=DESC

# Transactions indexes
firebase firestore:indexes:create \
  --collection-group=transactions \
  --query-scope=COLLECTION \
  --field=userId --order=ASC \
  --field=createdAt --order=DESC

firebase firestore:indexes:create \
  --collection-group=transactions \
  --query-scope=COLLECTION \
  --field=bookingId --order=ASC \
  --field=createdAt --order=DESC

firebase firestore:indexes:create \
  --collection-group=transactions \
  --query-scope=COLLECTION \
  --field=type --order=ASC \
  --field=status --order=ASC \
  --field=createdAt --order=DESC
```

---

## Appendix C: Environment Variables Template

```bash
# .env.example

# Stripe Keys (Test Mode)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here

# Firebase (existing)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# App Configuration
VITE_APP_URL=http://localhost:5173
VITE_API_URL=http://localhost:5001

# Email Service (for notifications)
SENDGRID_API_KEY=your_sendgrid_key
EMAIL_FROM=noreply@sahra.com
```

---

## Document Approval

**System Architect**: Bob  
**Date**: November 12, 2025  
**Status**: Ready for Implementation

**Reviewed By**:
- [ ] Emma (Product Manager)
- [ ] Alex (Engineer)
- [ ] Mike (Project Manager)

**Next Steps**:
1. Review this design document with the team
2. Get approval from all stakeholders
3. Begin Phase 1 implementation
4. Schedule weekly progress reviews

---

*This design document is comprehensive and ready for implementation. All architectural decisions have been made with security, scalability, and user experience in mind.*