# Product Requirements Document: Payment System Integration

**Project:** Sahra Desert Camp Booking Platform  
**Version:** 1.0  
**Date:** November 12, 2025  
**Author:** Emma (Product Manager)  
**Status:** Draft for Review

---

## Executive Summary

This PRD outlines the implementation of a comprehensive payment system for the Sahra platform, enabling secure online payments, multiple payment methods including Apple Pay, and a flexible refund policy system. The goal is to provide a seamless, secure, and trustworthy payment experience that increases booking conversion rates and builds user confidence.

### Key Objectives
- Enable secure online payment processing for all bookings
- Support multiple payment methods including Apple Pay
- Implement flexible refund policy system for hosts
- Increase booking conversion rate by 50% through trusted payment
- Reduce payment-related support requests by 70%
- Achieve 99.9% payment success rate

---

## 1. Feature Overview

### 1.1 Payment Processing System
A complete payment infrastructure featuring:
- **Stripe Integration**: Primary payment gateway supporting international cards, local Bahrain cards, and digital wallets
- **Apple Pay**: One-tap payment for iOS/Safari users
- **Credit/Debit Cards**: Visa, Mastercard, Amex support
- **Secure Checkout**: PCI-compliant payment processing
- **Multi-Currency**: Primary currency BHD (Bahraini Dinar) with conversion support
- **Payment Confirmation**: Instant booking confirmation after successful payment
- **Receipt Generation**: Automatic receipt generation and email delivery

### 1.2 Refund Policy System
Flexible refund management:
- **Host-Defined Policies**: Hosts choose "Refundable" or "Non-Refundable" per listing
- **Policy Display**: Clear refund policy shown before booking
- **Refund Request**: Users can request refunds for eligible bookings
- **Automated Processing**: Refunds processed through Stripe
- **Partial Refunds**: Support for service fee retention
- **Cancellation Deadlines**: Time-based refund eligibility (e.g., 48 hours before check-in)

### 1.3 Transaction Management
Complete transaction tracking:
- **Transaction History**: Full audit trail of all payments
- **Payment Status Tracking**: Pending, Completed, Failed, Refunded states
- **Admin Dashboard**: Transaction monitoring and reporting
- **Dispute Management**: Handle payment disputes and chargebacks
- **Financial Reports**: Revenue tracking and payout management

---

## 2. User Stories

### 2.1 Guest Payment Journey

**As a guest making a booking**, I want to:
- See total price breakdown (camp price, service fee, taxes) before payment
- Choose from multiple payment methods (card, Apple Pay)
- See refund policy clearly before confirming payment
- Pay securely without my card details being stored
- Receive instant booking confirmation after payment
- Get a receipt via email immediately
- Request refund if eligible based on policy

**Acceptance Criteria:**
- Payment page shows complete price breakdown
- All payment methods display with clear icons
- Refund policy badge visible on camp card and checkout
- Payment processes in < 5 seconds
- Confirmation email sent within 1 minute
- Receipt includes all transaction details
- Refund request button appears for eligible bookings

### 2.2 Host Refund Policy Setup

**As a camp host**, I want to:
- Set refund policy when creating/editing my camp listing
- Choose between "Refundable" and "Non-Refundable"
- Understand how each policy affects my bookings
- See which bookings are eligible for refunds
- Receive notifications when refund requests are made
- Track refund history for my listings

**Acceptance Criteria:**
- Refund policy selector in camp creation form
- Tooltip explaining each policy option
- Policy can be changed anytime (affects future bookings only)
- Dashboard shows refund-eligible bookings
- Email notification for refund requests
- Refund history visible in host dashboard

### 2.3 Refund Request Process

**As a guest requesting a refund**, I want to:
- Check if my booking is eligible for refund
- Submit refund request with reason
- Track refund request status
- Receive refund to original payment method
- Get notification when refund is processed

**Acceptance Criteria:**
- Eligibility check before showing refund button
- Refund request form with reason dropdown
- Status tracking (Requested, Approved, Processing, Completed)
- Refund processes within 5-7 business days
- Email notification at each status change

### 2.4 Admin Transaction Monitoring

**As a platform admin**, I want to:
- View all transactions in real-time
- Monitor payment success/failure rates
- Handle payment disputes
- Process manual refunds when needed
- Generate financial reports
- Track platform revenue and host payouts

**Acceptance Criteria:**
- Admin dashboard with transaction list
- Filter by status, date, amount, user
- Success rate metrics displayed
- Dispute management interface
- Manual refund processing capability
- Export reports to CSV/PDF

---

## 3. Functional Requirements

### 3.1 Payment Method Specifications

#### 3.1.1 Credit/Debit Card Payment
- **Supported Cards**: Visa, Mastercard, American Express, Discover
- **Card Input**: Stripe Elements for secure card entry
- **Validation**: Real-time card validation (number, expiry, CVC)
- **Save Card**: Optional "Save for future bookings" checkbox
- **3D Secure**: Support for SCA (Strong Customer Authentication)
- **Retry Logic**: Automatic retry for soft declines

#### 3.1.2 Apple Pay
- **Availability**: Show only on compatible devices (iOS Safari, macOS Safari)
- **Button Design**: Standard Apple Pay button (black, white, or white-outline)
- **Payment Sheet**: Show camp name, dates, total amount
- **Verification**: Touch ID, Face ID, or passcode authentication
- **Fallback**: If Apple Pay fails, show card payment option

#### 3.1.3 Payment Flow
1. User selects dates and clicks "Reserve Now"
2. System checks camp availability
3. User reviews booking details and price breakdown
4. User selects payment method
5. User enters payment details or uses Apple Pay
6. System processes payment through Stripe
7. On success: Create booking, send confirmation email
8. On failure: Show error message, allow retry

### 3.2 Refund Policy System

#### 3.2.1 Policy Types

**Refundable Policy:**
- Full refund if cancelled 48+ hours before check-in
- 50% refund if cancelled 24-48 hours before check-in
- No refund if cancelled < 24 hours before check-in
- Service fee (10%) non-refundable
- Refund processed within 5-7 business days

**Non-Refundable Policy:**
- No refunds for any cancellations
- Lower price (typically 10-15% discount)
- Booking cannot be modified or cancelled
- Exceptions only for host cancellations

#### 3.2.2 Policy Display
- **Camp Card Badge**: "Refundable" or "Non-Refundable" badge
- **Camp Details Page**: Full refund policy explanation
- **Checkout Page**: Refund policy summary with checkbox confirmation
- **Booking Confirmation**: Policy included in confirmation email

#### 3.2.3 Refund Request Process
1. User navigates to "My Bookings"
2. System checks eligibility (policy type, time until check-in)
3. If eligible, "Request Refund" button appears
4. User clicks button, modal opens with policy reminder
5. User selects cancellation reason (dropdown)
6. User submits request
7. System creates refund record with status "Pending"
8. Admin reviews request (auto-approve for clear cases)
9. System processes refund through Stripe
10. User receives refund to original payment method
11. Email notification sent at each stage

### 3.3 Price Breakdown

#### 3.3.1 Pricing Components
- **Camp Price**: Base price per night × number of nights
- **Service Fee**: 10% of camp price (platform fee)
- **Taxes**: 10% VAT (Bahrain standard rate)
- **Total**: Camp Price + Service Fee + Taxes

#### 3.3.2 Display Format
```
Camp Price (3 nights × 75 BD)     225.00 BD
Service Fee (10%)                   22.50 BD
Taxes (10% VAT)                     24.75 BD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total                              272.25 BD
```

### 3.4 Payment Status Tracking

#### 3.4.1 Payment States
- **Pending**: Payment initiated, awaiting confirmation
- **Processing**: Payment being processed by Stripe
- **Completed**: Payment successful, booking confirmed
- **Failed**: Payment declined or error occurred
- **Refunded**: Full or partial refund issued
- **Disputed**: Chargeback or dispute filed

#### 3.4.2 Status Transitions
```
Pending → Processing → Completed → [Refunded]
         ↓
       Failed
```

---

## 4. Technical Requirements

### 4.1 Payment Gateway Selection

#### 4.1.1 Recommended: Stripe

**Why Stripe:**
- ✅ Supports Bahrain and international cards
- ✅ Built-in Apple Pay support
- ✅ PCI Level 1 certified (highest security)
- ✅ Excellent developer experience
- ✅ Comprehensive API and webhooks
- ✅ Automatic currency conversion
- ✅ Built-in fraud detection (Radar)
- ✅ Refund API for automated processing
- ✅ Test mode for development

**Pricing:**
- 2.9% + 0.30 BD per successful card charge
- No setup fees, monthly fees, or hidden costs
- Refunds: No additional fee (original fee not returned)

**Alternative Considered: PayPal**
- ❌ Higher fees (3.4% + fixed fee)
- ❌ Less developer-friendly
- ✅ Familiar to users
- Decision: Use Stripe as primary, consider PayPal as future addition

### 4.2 Database Schema Updates

#### 4.2.1 Updated Camp Schema
```typescript
export interface Camp {
  // ... existing fields ...
  
  // New payment-related fields
  refundPolicy: 'refundable' | 'non-refundable';
  pricePerNight: number;              // Base price in BHD
  discountForNonRefundable?: number;  // Percentage discount (e.g., 15)
}
```

#### 4.2.2 Updated Booking Schema
```typescript
export interface Booking {
  // ... existing fields ...
  
  // Payment information
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'card' | 'apple_pay';
  paymentIntentId: string;            // Stripe Payment Intent ID
  
  // Pricing breakdown
  campPrice: number;                  // Base camp price
  serviceFee: number;                 // Platform service fee
  taxes: number;                      // VAT/taxes
  totalPrice: number;                 // Total amount charged
  currency: string;                   // 'BHD'
  
  // Refund information
  refundPolicy: 'refundable' | 'non-refundable';
  refundEligible: boolean;
  refundStatus?: 'none' | 'requested' | 'approved' | 'processing' | 'completed' | 'rejected';
  refundAmount?: number;
  refundReason?: string;
  refundRequestedAt?: string;
  refundCompletedAt?: string;
  refundId?: string;                  // Stripe Refund ID
}
```

#### 4.2.3 New Transaction Collection
```typescript
export interface Transaction {
  id: string;
  bookingId: string;
  userId: string;
  campId: string;
  
  // Transaction details
  type: 'payment' | 'refund';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: number;
  currency: string;
  
  // Stripe information
  stripePaymentIntentId?: string;
  stripeRefundId?: string;
  stripeChargeId?: string;
  
  // Payment method
  paymentMethod: 'card' | 'apple_pay';
  cardLast4?: string;
  cardBrand?: string;
  
  // Metadata
  description: string;
  failureReason?: string;
  createdAt: string | Timestamp;
  completedAt?: string;
  
  // Audit trail
  ipAddress?: string;
  userAgent?: string;
}
```

### 4.3 Stripe Integration Architecture

#### 4.3.1 Backend Functions (Firestore + Cloud Functions)

**File: `/workspace/shadcn-ui/src/lib/stripe.ts`**

```typescript
import Stripe from 'stripe';

// Initialize Stripe (use environment variable for secret key)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Create Payment Intent
export const createPaymentIntent = async (
  amount: number,
  currency: string,
  bookingId: string,
  userId: string
): Promise<{ clientSecret: string; paymentIntentId: string }> => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: currency.toLowerCase(),
    metadata: {
      bookingId,
      userId,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });
  
  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  };
};

// Confirm Payment
export const confirmPayment = async (paymentIntentId: string): Promise<boolean> => {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return paymentIntent.status === 'succeeded';
};

// Create Refund
export const createRefund = async (
  paymentIntentId: string,
  amount?: number,
  reason?: string
): Promise<{ refundId: string; status: string }> => {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount ? Math.round(amount * 100) : undefined,
    reason: reason as Stripe.RefundCreateParams.Reason,
  });
  
  return {
    refundId: refund.id,
    status: refund.status,
  };
};
```

**File: `/workspace/shadcn-ui/src/lib/firestore.ts`** (Add these functions)

```typescript
// Create transaction record
export const createTransaction = async (
  transactionData: Omit<Transaction, 'id' | 'createdAt'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'transactions'), {
    ...transactionData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

// Update booking payment status
export const updateBookingPaymentStatus = async (
  bookingId: string,
  paymentStatus: string,
  paymentIntentId: string
): Promise<void> => {
  await updateDoc(doc(db, 'bookings', bookingId), {
    paymentStatus,
    paymentIntentId,
  });
};

// Request refund
export const requestRefund = async (
  bookingId: string,
  reason: string,
  userId: string
): Promise<void> => {
  await updateDoc(doc(db, 'bookings', bookingId), {
    refundStatus: 'requested',
    refundReason: reason,
    refundRequestedAt: new Date().toISOString(),
  });
};

// Process refund
export const processRefund = async (
  bookingId: string,
  refundAmount: number,
  refundId: string
): Promise<void> => {
  await updateDoc(doc(db, 'bookings', bookingId), {
    refundStatus: 'completed',
    refundAmount,
    refundId,
    refundCompletedAt: new Date().toISOString(),
    paymentStatus: 'refunded',
  });
};
```

#### 4.3.2 Frontend Integration

**Install Stripe React SDK:**
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

**Stripe Provider Setup** (in App.tsx or main layout):
```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY!);

// Wrap app with Elements provider
<Elements stripe={stripePromise}>
  <YourApp />
</Elements>
```

### 4.4 Apple Pay Integration

#### 4.4.1 Requirements
- **Domain Verification**: Register domain with Apple
- **HTTPS**: Must be served over HTTPS
- **Stripe Integration**: Use Stripe's Apple Pay support
- **Device Detection**: Check if Apple Pay is available

#### 4.4.2 Implementation
```typescript
import { PaymentRequest } from '@stripe/stripe-js';

// Check Apple Pay availability
const checkApplePayAvailability = async (stripe: Stripe): Promise<boolean> => {
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
  return canMakePayment?.applePay || false;
};
```

### 4.5 Security & Compliance

#### 4.5.1 PCI DSS Compliance
- ✅ **Never store card details**: Use Stripe Elements (card data never touches our servers)
- ✅ **HTTPS only**: All payment pages served over HTTPS
- ✅ **Stripe handles PCI**: Stripe is PCI Level 1 certified
- ✅ **Tokenization**: Card data tokenized by Stripe
- ✅ **No card data in logs**: Never log sensitive payment information

#### 4.5.2 Data Protection
- **Environment Variables**: Store API keys in environment variables (never in code)
- **Webhook Signatures**: Verify Stripe webhook signatures
- **Rate Limiting**: Implement rate limiting on payment endpoints
- **Fraud Detection**: Use Stripe Radar for fraud prevention
- **IP Logging**: Log IP addresses for transaction audit trail

#### 4.5.3 Error Handling
- **Graceful Failures**: Show user-friendly error messages
- **Retry Logic**: Allow users to retry failed payments
- **Timeout Handling**: Handle network timeouts gracefully
- **Idempotency**: Use idempotency keys to prevent duplicate charges

---

## 5. UI/UX Specifications

### 5.1 Payment Method Selection Page

#### 5.1.1 Layout (Desktop)
```
┌─────────────────────────────────────────────────────────────┐
│ Complete Your Booking                                       │
├──────────────────────────────┬──────────────────────────────┤
│                              │                              │
│ Booking Summary              │ Payment Method               │
│ ┌──────────────────────────┐ │ ┌──────────────────────────┐│
│ │ [Camp Photo]             │ │ │ ○ Credit or Debit Card   ││
│ │ Golden Dunes Retreat     │ │ │   [Card Icons]           ││
│ │ Northern Bahrain         │ │ │                          ││
│ └──────────────────────────┘ │ │ ○ Apple Pay              ││
│                              │ │   [Apple Pay Button]     ││
│ Check-in: Jan 15, 2025       │ └──────────────────────────┘│
│ Check-out: Jan 18, 2025      │                              │
│ Guests: 4                    │ [Selected Method Form]       │
│                              │                              │
│ Price Details                │ Card Number                  │
│ Camp (3 nights × 75 BD)      │ [____________]               │
│                   225.00 BD  │                              │
│ Service Fee (10%)            │ Expiry        CVC            │
│                    22.50 BD  │ [MM/YY]      [___]           │
│ Taxes (10%)                  │                              │
│                    24.75 BD  │ ☐ Save for future bookings   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━  │                              │
│ Total          272.25 BD     │ Refund Policy                │
│                              │ ⓘ Refundable                 │
│ Refund Policy                │ Full refund if cancelled     │
│ 🔄 Refundable                │ 48+ hours before check-in    │
│ Cancel up to 48 hours before │                              │
│ check-in for full refund     │ ☑ I agree to the refund     │
│                              │   policy and booking terms   │
│                              │                              │
│                              │ [Pay 272.25 BD]              │
└──────────────────────────────┴──────────────────────────────┘
```

#### 5.1.2 Mobile Layout
```
┌─────────────────────────────────┐
│ ← Complete Booking              │
├─────────────────────────────────┤
│ [Camp Photo]                    │
│ Golden Dunes Retreat            │
│ Jan 15 - Jan 18, 2025 • 4 guests│
│                                 │
│ Price Details ▼                 │
│ Total: 272.25 BD                │
│                                 │
│ Payment Method                  │
│ ┌─────────────────────────────┐ │
│ │ ● Credit or Debit Card      │ │
│ │   [Card Icons]              │ │
│ │                             │ │
│ │ ○ Apple Pay                 │ │
│ │   [Apple Pay Button]        │ │
│ └─────────────────────────────┘ │
│                                 │
│ Card Details                    │
│ [Card Number____________]       │
│ [MM/YY]  [CVC]                  │
│                                 │
│ ☐ Save card                     │
│                                 │
│ Refund Policy                   │
│ 🔄 Refundable - Full refund if  │
│ cancelled 48+ hours before      │
│                                 │
│ ☑ I agree to terms              │
│                                 │
│ [Pay 272.25 BD]                 │
└─────────────────────────────────┘
```

### 5.2 Component Specifications

#### 5.2.1 Refund Policy Badge
**On Camp Card:**
```tsx
<Badge className="bg-green-100 text-green-800">
  <RefreshCw className="w-3 h-3 mr-1" />
  Refundable
</Badge>

<Badge className="bg-gray-100 text-gray-800">
  <XCircle className="w-3 h-3 mr-1" />
  Non-Refundable
</Badge>
```

#### 5.2.2 Apple Pay Button
- Use official Apple Pay button styles
- Show only when Apple Pay is available
- Standard sizes: small (40px), medium (48px), large (56px)
- Colors: black, white, white-outline
- Button text: "Buy with Apple Pay" or "Book with Apple Pay"

#### 5.2.3 Payment Form (Stripe Elements)
```tsx
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
```

### 5.3 Payment Confirmation Page

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              ✓ Booking Confirmed!                       │
│                                                         │
│     Your payment was successful and your booking        │
│     has been confirmed. A confirmation email has        │
│     been sent to your email address.                    │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Booking Details                                     │ │
│ │                                                     │ │
│ │ Booking ID: #BK-2025-001234                         │ │
│ │ Golden Dunes Retreat                                │ │
│ │ Northern Bahrain                                    │ │
│ │                                                     │ │
│ │ Check-in: January 15, 2025 at 3:00 PM              │ │
│ │ Check-out: January 18, 2025 at 11:00 AM            │ │
│ │ Guests: 4                                           │ │
│ │                                                     │ │
│ │ Payment Summary                                     │ │
│ │ Amount Paid: 272.25 BD                              │ │
│ │ Payment Method: •••• 4242                           │ │
│ │ Transaction ID: pi_3Abc123...                       │ │
│ │                                                     │ │
│ │ Refund Policy: Refundable                           │ │
│ │ Cancel up to 48 hours before check-in               │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [View Booking Details]  [Download Receipt]              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.4 Refund Request Interface

**In "My Bookings" page, for eligible bookings:**

```
┌─────────────────────────────────────────────────────────┐
│ Request Refund                                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ You are requesting a refund for:                        │
│                                                         │
│ Golden Dunes Retreat                                    │
│ January 15-18, 2025                                     │
│ Total Paid: 272.25 BD                                   │
│                                                         │
│ Refund Policy                                           │
│ This booking is eligible for a full refund because      │
│ cancellation is more than 48 hours before check-in.     │
│                                                         │
│ Refund Amount: 247.50 BD                                │
│ (Service fee of 24.75 BD is non-refundable)            │
│                                                         │
│ Reason for Cancellation *                               │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ▼ Select a reason                                   │ │
│ │   - Change of plans                                 │ │
│ │   - Found alternative accommodation                 │ │
│ │   - Emergency                                       │ │
│ │   - Other                                           │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Additional Comments (Optional)                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ⚠️ This action cannot be undone. Your booking will be   │
│ cancelled and refund will be processed within 5-7       │
│ business days.                                          │
│                                                         │
│ [Cancel]                    [Request Refund]            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.5 Responsive Design

#### 5.5.1 Breakpoints
- **Mobile**: < 768px (single column, stacked layout)
- **Tablet**: 768px - 1023px (single column, wider)
- **Desktop**: ≥ 1024px (two-column layout)

#### 5.5.2 Mobile Optimizations
- Large touch targets (minimum 44px)
- Sticky payment button at bottom
- Collapsible price details
- Simplified card input (native mobile keyboard)
- Apple Pay prominent on iOS devices

---

## 6. Implementation Phases

### Phase 1: Stripe Setup & Database (Week 1)
**Duration**: 5 days  
**Team**: Alex (Engineer)

**Tasks:**
1. Create Stripe account and get API keys
2. Install Stripe SDK (`@stripe/stripe-js`, `@stripe/react-stripe-js`)
3. Set up environment variables for Stripe keys
4. Update Camp interface with `refundPolicy` field
5. Update Booking interface with payment fields
6. Create Transaction collection schema
7. Implement Stripe integration functions:
   - `createPaymentIntent()`
   - `confirmPayment()`
   - `createRefund()`
8. Implement Firestore functions:
   - `createTransaction()`
   - `updateBookingPaymentStatus()`
   - `requestRefund()`
   - `processRefund()`
9. Set up Stripe webhook endpoint (for payment confirmations)
10. Test Stripe integration with test cards

**Deliverables:**
- Stripe account configured
- Database schemas updated
- All payment functions implemented
- Webhook endpoint working
- Test mode validated

**Success Criteria:**
- Can create Payment Intent successfully
- Payment confirmation works
- Refund creation works
- All functions have error handling
- Console logs show clear payment flow

### Phase 2: Payment UI Components (Week 2)
**Duration**: 5 days  
**Team**: Alex (Engineer)

**Tasks:**
1. Create components:
   - `PaymentMethodSelector.tsx` - Choose card or Apple Pay
   - `CardPaymentForm.tsx` - Stripe Elements card input
   - `ApplePayButton.tsx` - Apple Pay button
   - `PriceBreakdown.tsx` - Show price details
   - `RefundPolicyBadge.tsx` - Display policy badge
   - `RefundPolicyInfo.tsx` - Full policy explanation
   - `PaymentConfirmation.tsx` - Success page
   - `RefundRequestForm.tsx` - Request refund modal
2. Style all components with Tailwind CSS
3. Implement loading states
4. Add form validation
5. Add error handling and user feedback
6. Ensure mobile responsiveness

**Deliverables:**
- 8 new payment-related components
- All components styled and responsive
- Form validation working
- Error states handled
- Loading states implemented

**Success Criteria:**
- Components render correctly
- Mobile layouts work well
- Forms validate properly
- Error messages are clear
- Loading states are smooth

### Phase 3: Checkout Flow Integration (Week 3)
**Duration**: 5 days  
**Team**: Alex (Engineer)

**Tasks:**
1. Update Reserve.tsx:
   - Add payment method selection
   - Integrate Stripe Elements
   - Implement payment processing
   - Add confirmation page
2. Add refund policy selection to camp creation/edit
3. Display refund policy badges on camp cards (Index.tsx)
4. Show refund policy on CampDetails.tsx
5. Implement price calculation logic:
   - Calculate service fee (10%)
   - Calculate taxes (10%)
   - Calculate total
6. Add payment confirmation email template
7. Implement receipt generation
8. Add transaction logging

**Deliverables:**
- Complete checkout flow working
- Payment processing functional
- Confirmation emails sent
- Receipts generated
- Transaction logs created

**Success Criteria:**
- Can complete booking with card payment
- Payment Intent created correctly
- Booking created after successful payment
- Confirmation email received
- Receipt downloadable

### Phase 4: Apple Pay & Refund System (Week 4)
**Duration**: 7 days  
**Team**: Alex (Engineer)

**Tasks:**
1. Implement Apple Pay:
   - Check device compatibility
   - Show Apple Pay button conditionally
   - Implement Apple Pay payment flow
   - Test on iOS/macOS devices
2. Implement refund system:
   - Add "Request Refund" button to bookings
   - Check refund eligibility
   - Create refund request form
   - Implement refund processing
   - Send refund confirmation emails
3. Add refund status tracking
4. Create admin refund management interface (basic)
5. Implement refund notifications

**Deliverables:**
- Apple Pay working on compatible devices
- Refund request system functional
- Refund processing automated
- Admin can manage refunds
- Notifications sent

**Success Criteria:**
- Apple Pay button appears on iOS/Safari
- Apple Pay payment completes successfully
- Refund requests can be submitted
- Refunds process through Stripe
- Users receive refund confirmation

### Phase 5: Testing & Security Audit (Week 5)
**Duration**: 5 days  
**Team**: Full team

**Tasks:**
1. Comprehensive testing:
   - Test all Stripe test cards (success, decline, errors)
   - Test Apple Pay on multiple devices
   - Test refund flow end-to-end
   - Test edge cases (network failures, timeouts)
   - Test concurrent payments
   - Test refund eligibility calculations
2. Security audit:
   - Verify no card data stored
   - Check API key security
   - Test webhook signature verification
   - Review error messages (no sensitive data)
   - Test rate limiting
3. Performance testing:
   - Measure payment processing time
   - Test with slow network
   - Check mobile performance
4. User acceptance testing
5. Create documentation:
   - User guide for payments
   - Host guide for refund policies
   - Admin guide for transaction management

**Deliverables:**
- All payment scenarios tested
- Security audit passed
- Performance benchmarks met
- Documentation complete
- Test report created

**Success Criteria:**
- Zero critical bugs
- All test cards work correctly
- Apple Pay works on iOS
- Refunds process correctly
- Page load time < 3 seconds
- No security vulnerabilities
- Documentation complete

---

## 7. Testing Requirements

### 7.1 Stripe Test Cards

#### 7.1.1 Success Scenarios
- **4242 4242 4242 4242**: Successful payment
- **5555 5555 5555 4444**: Successful Mastercard payment
- **3782 822463 10005**: Successful Amex payment

#### 7.1.2 Decline Scenarios
- **4000 0000 0000 0002**: Card declined (generic)
- **4000 0000 0000 9995**: Insufficient funds
- **4000 0000 0000 9987**: Lost card
- **4000 0000 0000 9979**: Stolen card

#### 7.1.3 Error Scenarios
- **4000 0000 0000 0069**: Expired card
- **4000 0000 0000 0127**: Incorrect CVC
- **4000 0000 0000 0119**: Processing error

### 7.2 Payment Flow Tests

#### 7.2.1 Card Payment Tests
- ✅ Successful payment with valid card
- ✅ Declined payment with test decline card
- ✅ Payment with 3D Secure authentication
- ✅ Payment with saved card
- ✅ Payment failure and retry
- ✅ Network timeout handling
- ✅ Concurrent payment attempts

#### 7.2.2 Apple Pay Tests
- ✅ Apple Pay button appears on iOS/Safari
- ✅ Apple Pay button hidden on non-compatible devices
- ✅ Successful Apple Pay payment
- ✅ Apple Pay cancellation
- ✅ Apple Pay failure and fallback to card

#### 7.2.3 Price Calculation Tests
- ✅ Correct service fee calculation (10%)
- ✅ Correct tax calculation (10%)
- ✅ Correct total calculation
- ✅ Rounding to 2 decimal places
- ✅ Multiple nights calculation
- ✅ Non-refundable discount applied

### 7.3 Refund System Tests

#### 7.3.1 Eligibility Tests
- ✅ Refundable booking > 48 hours before check-in: Full refund eligible
- ✅ Refundable booking 24-48 hours before: 50% refund eligible
- ✅ Refundable booking < 24 hours before: No refund eligible
- ✅ Non-refundable booking: No refund eligible
- ✅ Already refunded booking: Cannot request again

#### 7.3.2 Refund Processing Tests
- ✅ Full refund processes correctly
- ✅ Partial refund processes correctly
- ✅ Service fee not refunded
- ✅ Refund appears in original payment method
- ✅ Refund status updates correctly
- ✅ Refund confirmation email sent

### 7.4 Security Tests

#### 7.4.1 Data Security
- ✅ No card numbers in database
- ✅ No card numbers in logs
- ✅ API keys not exposed in frontend
- ✅ Webhook signatures verified
- ✅ HTTPS enforced

#### 7.4.2 Fraud Prevention
- ✅ Rate limiting on payment attempts
- ✅ Stripe Radar enabled
- ✅ IP address logging
- ✅ Unusual activity detection

### 7.5 Performance Tests

#### 7.5.1 Speed Tests
- ✅ Payment Intent creation < 1 second
- ✅ Payment confirmation < 3 seconds
- ✅ Page load time < 2 seconds
- ✅ Refund processing < 5 seconds

#### 7.5.2 Load Tests
- ✅ 100 concurrent payment requests
- ✅ 1000 bookings with payments
- ✅ Database query performance

---

## 8. Success Metrics

### 8.1 Business Metrics
- **Booking Conversion Rate**: Increase from 15% to 25% (+67%)
- **Average Booking Value**: Track before/after payment integration
- **Refund Rate**: Target < 5% of all bookings
- **Payment Success Rate**: Target > 98%
- **Apple Pay Adoption**: Target 20% of iOS users

### 8.2 Technical Metrics
- **Payment Processing Time**: < 3 seconds
- **Payment Intent Creation**: < 1 second
- **Refund Processing Time**: < 5 seconds
- **API Error Rate**: < 0.5%
- **Webhook Success Rate**: > 99%

### 8.3 User Experience Metrics
- **Payment Abandonment Rate**: Target < 10%
- **Payment Error Rate**: < 2%
- **Refund Request Time**: Average < 2 minutes
- **User Satisfaction**: > 4.5/5 for payment experience

### 8.4 Financial Metrics
- **Total Transaction Volume**: Track monthly
- **Average Transaction Value**: Track trend
- **Refund Amount**: Track as % of revenue
- **Platform Revenue**: Service fees collected

---

## 9. Risk Assessment

### 9.1 Technical Risks

#### 9.1.1 Payment Gateway Downtime
**Risk**: Stripe service outage prevents payments  
**Impact**: High - No bookings can be completed  
**Mitigation**:
- Monitor Stripe status page
- Show maintenance message during outages
- Queue failed payments for retry
- Consider backup payment gateway (future)

#### 9.1.2 Webhook Delivery Failures
**Risk**: Stripe webhooks not received, booking not confirmed  
**Impact**: High - Payment taken but booking not created  
**Mitigation**:
- Implement webhook retry logic
- Poll Payment Intent status as fallback
- Manual reconciliation process
- Alert system for failed webhooks

#### 9.1.3 Currency Conversion Issues
**Risk**: Incorrect currency conversion or rounding  
**Impact**: Medium - Financial discrepancies  
**Mitigation**:
- Use Stripe's built-in currency handling
- Always work in smallest currency unit (fils)
- Round consistently to 2 decimal places
- Audit transactions regularly

### 9.2 Security Risks

#### 9.2.1 API Key Exposure
**Risk**: Stripe secret key leaked  
**Impact**: Critical - Unauthorized charges possible  
**Mitigation**:
- Store keys in environment variables only
- Never commit keys to Git
- Rotate keys regularly
- Use restricted API keys where possible
- Monitor for unauthorized API usage

#### 9.2.2 Fraudulent Transactions
**Risk**: Stolen cards used for bookings  
**Impact**: High - Chargebacks and financial loss  
**Mitigation**:
- Enable Stripe Radar (fraud detection)
- Require 3D Secure for high-value transactions
- Monitor for suspicious patterns
- Implement velocity checks
- Verify user email and phone

#### 9.2.3 Refund Abuse
**Risk**: Users abuse refund policy  
**Impact**: Medium - Financial loss and operational overhead  
**Mitigation**:
- Track refund patterns per user
- Limit refunds per user per month
- Flag suspicious refund requests
- Manual review for high-value refunds
- Ban repeat abusers

### 9.3 User Experience Risks

#### 9.3.1 Payment Failures
**Risk**: High payment failure rate frustrates users  
**Impact**: High - Lost bookings and poor reputation  
**Mitigation**:
- Clear error messages
- Suggest alternative payment methods
- Allow retry without re-entering details
- Provide support contact for payment issues

#### 9.3.2 Refund Confusion
**Risk**: Users unclear about refund eligibility  
**Impact**: Medium - Support requests and disputes  
**Mitigation**:
- Clear refund policy display
- Eligibility check before showing refund button
- Confirmation dialog with policy reminder
- Email confirmation of refund requests

### 9.4 Compliance Risks

#### 9.4.1 PCI Non-Compliance
**Risk**: Handling card data incorrectly  
**Impact**: Critical - Legal liability and fines  
**Mitigation**:
- Use Stripe Elements (PCI-compliant)
- Never store card data
- Regular security audits
- Staff training on PCI requirements

#### 9.4.2 Tax Compliance
**Risk**: Incorrect tax calculation  
**Impact**: High - Legal issues with tax authorities  
**Mitigation**:
- Consult with Bahrain tax expert
- Verify VAT rate (currently 10%)
- Keep detailed tax records
- Regular tax compliance review

---

## 10. Future Enhancements

### 10.1 Additional Payment Methods
- **PayPal**: Add as alternative payment option
- **Local Bahrain Banks**: Integrate Benefit Pay
- **Buy Now Pay Later**: Integrate Tabby or Tamara
- **Cryptocurrency**: Accept Bitcoin/Ethereum (exploratory)

### 10.2 Advanced Refund Features
- **Flexible Refund Policies**: Custom cancellation windows
- **Partial Refunds**: Refund specific nights
- **Refund Credits**: Offer platform credit instead of refund
- **Automated Refunds**: Auto-refund for host cancellations

### 10.3 Payment Analytics
- **Revenue Dashboard**: Real-time revenue tracking
- **Payment Method Analytics**: Which methods used most
- **Refund Analytics**: Refund patterns and reasons
- **Conversion Funnel**: Track payment abandonment points

### 10.4 Host Payouts
- **Automated Payouts**: Schedule automatic payouts to hosts
- **Payout Methods**: Bank transfer, PayPal, etc.
- **Payout Dashboard**: Hosts track earnings
- **Tax Documents**: Generate 1099/tax forms

### 10.5 Subscription Model
- **Host Subscriptions**: Monthly fee for listing
- **Premium Features**: Paid features for hosts
- **User Memberships**: Loyalty program with benefits

---

## 11. Appendices

### Appendix A: Stripe API Reference
- Payment Intents API: https://stripe.com/docs/api/payment_intents
- Refunds API: https://stripe.com/docs/api/refunds
- Webhooks: https://stripe.com/docs/webhooks
- Apple Pay: https://stripe.com/docs/apple-pay

### Appendix B: Test Card Numbers
Full list: https://stripe.com/docs/testing

### Appendix C: Bahrain Payment Landscape
- VAT Rate: 10% (as of 2025)
- Currency: Bahraini Dinar (BHD)
- Popular Payment Methods: Credit/Debit cards, Benefit Pay
- Banking: Central Bank of Bahrain regulations

### Appendix D: Price Calculation Formula
```
Camp Price = Base Price × Number of Nights
Service Fee = Camp Price × 0.10
Taxes = (Camp Price + Service Fee) × 0.10
Total = Camp Price + Service Fee + Taxes

Example:
Camp Price = 75 BD × 3 nights = 225 BD
Service Fee = 225 × 0.10 = 22.50 BD
Taxes = (225 + 22.50) × 0.10 = 24.75 BD
Total = 225 + 22.50 + 24.75 = 272.25 BD
```

### Appendix E: Refund Calculation Formula
```
Refundable Amount = Total - Service Fee

For Partial Refunds:
If 24-48 hours before check-in:
  Refund = (Camp Price × 0.50) + Taxes
  (50% of camp price + full taxes, service fee not refunded)

Example:
Total Paid: 272.25 BD
Service Fee: 22.50 BD
Full Refund: 272.25 - 22.50 = 249.75 BD
50% Refund: (225 × 0.50) + 24.75 = 137.25 BD
```

---

## 12. Approval & Sign-off

**Product Manager**: Emma  
**Engineering Lead**: Alex  
**Project Manager**: Mike  
**Finance Lead**: [To be assigned]

**Approval Date**: _________________  
**Target Launch Date**: 5 weeks from approval  

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 12, 2025 | Emma | Initial PRD creation |

---

**Next Steps:**
1. Review PRD with full team
2. Get approval from finance team
3. Create Stripe account and verify business
4. Estimate effort for each phase
5. Begin Phase 1: Stripe setup and database updates
6. Schedule weekly progress reviews

---

*This PRD is a living document and will be updated as requirements evolve during implementation.*