# Payment System Implementation Guide

## Overview

This document provides a comprehensive guide for the Sahra Desert Camp Booking Platform payment system integration with Stripe.

## 🎯 System Architecture

### Frontend (Implemented)
- **Stripe Integration**: `/src/lib/stripe.ts`
- **Price Calculations**: `/src/lib/priceCalculations.ts`
- **Refund Logic**: `/src/lib/refundEligibility.ts`
- **Database Functions**: `/src/lib/firestore.ts` (extended with payment functions)
- **UI Components**: 
  - `PriceBreakdown.tsx`
  - `RefundPolicyBadge.tsx`

### Backend (Required - Not Yet Implemented)
- **Cloud Functions**: Need to be created
- **Webhook Handler**: Need to be created
- **Payment Processing**: Need to be created

## 💰 Pricing Structure

### Price Breakdown Formula
```
Camp Price = Base Price × Nights × Guests
Service Fee = Camp Price × 10%
Taxes = (Camp Price + Service Fee) × 10% (VAT)
Total = Camp Price + Service Fee + Taxes
```

### Example Calculation
```
Camp: 75 BD/night
Guests: 2
Nights: 3

Camp Price = 75 × 3 × 2 = 450 BD
Service Fee = 450 × 0.10 = 45 BD
Taxes = (450 + 45) × 0.10 = 49.50 BD
Total = 450 + 45 + 49.50 = 544.50 BD
```

## 🔄 Refund Policy

### Refundable Bookings
- **48+ hours before check-in**: Full refund (minus service fee)
- **24-48 hours before check-in**: 50% refund of camp price + full tax refund
- **< 24 hours before check-in**: No refund

### Non-Refundable Bookings
- **No refunds** for any cancellations
- Typically offered at 10-15% discount

### Service Fee Policy
- Service fees are **non-refundable** in all cases
- Only camp price and taxes are eligible for refund

## 🔧 Implementation Status

### ✅ Completed
1. **Type Definitions**
   - Extended `Camp` interface with refund policy fields
   - Extended `Booking` interface with payment fields
   - Created `Transaction` interface
   - Updated all related types

2. **Utility Functions**
   - `calculatePriceBreakdown()` - Calculates full price breakdown
   - `checkRefundEligibility()` - Determines refund eligibility
   - `calculateRefundAmount()` - Calculates refund amount
   - Price formatting utilities

3. **Database Functions**
   - `createTransaction()` - Records payment transactions
   - `updateBookingPaymentStatus()` - Updates payment status
   - `requestRefund()` - Handles refund requests
   - `processRefund()` - Processes approved refunds
   - `getTransactionsByUser()` - Retrieves user transactions
   - `getTransactionsByBooking()` - Retrieves booking transactions

4. **UI Components**
   - `PriceBreakdown` - Displays price details
   - `RefundPolicyBadge` - Shows refund policy status

### 🚧 Required for Production

#### 1. Backend Cloud Functions

Create these Firebase Cloud Functions:

**a. Create Payment Intent**
```typescript
// functions/src/createPaymentIntent.ts
export const createPaymentIntent = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { bookingId, amount, currency } = data;
  
  // Create Stripe Payment Intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 1000), // Convert to fils
    currency: currency.toLowerCase(),
    metadata: { bookingId, userId: context.auth.uid }
  });
  
  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id
  };
});
```

**b. Webhook Handler**
```typescript
// functions/src/stripeWebhook.ts
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
      case 'charge.refunded':
        await handleRefundCompleted(event.data.object);
        break;
    }
    
    res.json({ received: true });
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
```

**c. Process Refund**
```typescript
// functions/src/processRefund.ts
export const processRefund = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { bookingId, reason } = data;
  
  // Get booking and verify ownership
  const booking = await getBooking(bookingId);
  if (booking.userId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }
  
  // Check eligibility
  const eligibility = checkRefundEligibility(booking);
  if (!eligibility.eligible) {
    throw new functions.https.HttpsError('failed-precondition', eligibility.reason);
  }
  
  // Create Stripe refund
  const refund = await stripe.refunds.create({
    payment_intent: booking.paymentIntentId,
    amount: Math.round(eligibility.amount * 1000)
  });
  
  // Update booking
  await updateBookingRefundStatus(bookingId, refund.id, eligibility.amount);
  
  return { success: true, refundId: refund.id };
});
```

#### 2. Environment Variables

**Development (.env)**
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51...
```

**Production (Firebase Functions Config)**
```bash
firebase functions:config:set \
  stripe.secret_key="sk_live_..." \
  stripe.webhook_secret="whsec_..." \
  stripe.publishable_key="pk_live_..."
```

#### 3. Frontend Integration

Update `Reserve.tsx` to integrate payment flow:

```typescript
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe';
import { PriceBreakdown } from '@/components/PriceBreakdown';
import { calculatePriceBreakdown } from '@/lib/priceCalculations';

// In component:
const stripePromise = getStripe();
const priceBreakdown = calculatePriceBreakdown(
  camp.price,
  nights,
  guests
);

// Wrap payment form with Stripe Elements
<Elements stripe={stripePromise}>
  <PaymentForm 
    amount={priceBreakdown.total}
    bookingId={bookingId}
    onSuccess={handlePaymentSuccess}
  />
</Elements>
```

## 🧪 Testing

### Stripe Test Cards

**Success:**
- `4242 4242 4242 4242` - Visa
- `5555 5555 5555 4444` - Mastercard

**Decline:**
- `4000 0000 0000 0002` - Generic decline
- `4000 0000 0000 9995` - Insufficient funds

**Full list**: https://stripe.com/docs/testing

### Test Scenarios

1. **Successful Payment**
   - Create booking
   - Enter test card
   - Verify payment completes
   - Check booking status updates

2. **Failed Payment**
   - Use decline test card
   - Verify error handling
   - Check booking remains pending

3. **Refund Request**
   - Create completed booking
   - Request refund (> 48 hours before)
   - Verify refund amount calculation
   - Check refund processes correctly

## 🔒 Security Best Practices

### ✅ Implemented
- Type-safe interfaces
- Refund eligibility validation
- Transaction logging
- User authorization checks

### ⚠️ Required
- Stripe webhook signature verification
- Rate limiting on payment attempts
- PCI compliance (use Stripe Elements)
- HTTPS enforcement
- API key security (environment variables)

## 📊 Database Schema

### Bookings Collection
```typescript
{
  id: string;
  // ... existing fields ...
  
  // Payment fields
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'card' | 'apple_pay';
  paymentIntentId: string;
  campPrice: number;
  serviceFee: number;
  taxes: number;
  totalPrice: number;
  currency: 'BHD';
  
  // Refund fields
  refundPolicy: 'refundable' | 'non-refundable';
  refundStatus: 'none' | 'requested' | 'completed';
  refundAmount: number;
  refundReason: string;
}
```

### Transactions Collection
```typescript
{
  id: string;
  bookingId: string;
  userId: string;
  type: 'payment' | 'refund';
  status: 'completed' | 'failed';
  amount: number;
  currency: 'BHD';
  stripePaymentIntentId: string;
  paymentMethod: 'card' | 'apple_pay';
  createdAt: Timestamp;
}
```

## 📈 Monitoring & Analytics

### Key Metrics to Track
- Payment success rate (target: >98%)
- Average transaction value
- Refund rate (target: <5%)
- Payment method distribution
- Failed payment reasons

### Recommended Tools
- Stripe Dashboard (built-in analytics)
- Firebase Analytics
- Custom transaction reports

## 🚀 Deployment Checklist

- [ ] Set up Firebase Cloud Functions
- [ ] Deploy backend functions
- [ ] Configure Stripe webhook endpoint
- [ ] Set production environment variables
- [ ] Test with real cards (small amounts)
- [ ] Enable Stripe Radar (fraud detection)
- [ ] Set up monitoring alerts
- [ ] Train support team on refund process
- [ ] Create user documentation
- [ ] Launch payment system

## 📞 Support & Resources

### Documentation
- [Stripe API Docs](https://stripe.com/docs/api)
- [Firebase Functions](https://firebase.google.com/docs/functions)
- [Stripe Testing](https://stripe.com/docs/testing)

### Internal Docs
- System Design: `/docs/design/payment_system_design.md`
- PRD: `/docs/design/payment_prd.md`
- Implementation TODO: `/docs/payment_implementation_todo.md`

## 🐛 Troubleshooting

### Common Issues

**1. Payment Intent Creation Fails**
- Check backend function is deployed
- Verify Stripe API keys are correct
- Check user authentication

**2. Webhook Not Receiving Events**
- Verify webhook URL is correct
- Check webhook signature verification
- Test with Stripe CLI: `stripe listen --forward-to localhost:5001/webhook`

**3. Refund Not Processing**
- Check refund eligibility calculation
- Verify payment intent ID is correct
- Check Stripe account has sufficient balance

## 📝 License & Credits

Built for Sahra Desert Camp Booking Platform
Payment processing by Stripe
Implementation by MetaGPT Team