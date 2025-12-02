# Payment System Implementation - TODO

## ✅ Phase 1: Foundation (COMPLETED)
- [x] Install Stripe SDKs (@stripe/stripe-js, @stripe/react-stripe-js)
- [x] Create stripe.ts integration module
- [x] Create priceCalculations.ts utility
- [x] Create refundEligibility.ts utility
- [x] Update firestore.ts with payment-related types and functions
- [x] Create PriceBreakdown component
- [x] Create RefundPolicyBadge component

## 🚧 Phase 2: Backend Setup (REQUIRED FOR PRODUCTION)

### Critical: Cloud Functions Setup
The payment system requires backend implementation for security. The following must be implemented as Firebase Cloud Functions:

1. **Payment Intent Creation**
   - Endpoint: `/api/create-payment-intent`
   - Function: Creates Stripe Payment Intent
   - Security: Validates user authentication and booking details

2. **Payment Confirmation**
   - Endpoint: `/api/confirm-payment`
   - Function: Confirms payment status
   - Security: Verifies payment belongs to authenticated user

3. **Refund Processing**
   - Endpoint: `/api/process-refund`
   - Function: Creates Stripe refund
   - Security: Validates refund eligibility and user authorization

4. **Webhook Handler**
   - Endpoint: `/webhooks/stripe`
   - Function: Handles Stripe webhook events
   - Security: Verifies webhook signatures

### Environment Variables Required
```bash
# .env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # Frontend
STRIPE_SECRET_KEY=sk_test_...           # Backend only
STRIPE_WEBHOOK_SECRET=whsec_...         # Backend only
```

## 📋 Phase 3: Frontend Integration (NEXT STEPS)

### Reserve.tsx Updates Needed
- [ ] Add Stripe Elements provider
- [ ] Integrate PriceBreakdown component
- [ ] Add payment method selection
- [ ] Implement payment processing flow
- [ ] Add payment confirmation page
- [ ] Update booking creation to include payment fields

### Additional Components to Create
- [ ] PaymentMethodSelector.tsx
- [ ] StripePaymentForm.tsx
- [ ] ApplePayButton.tsx
- [ ] PaymentConfirmation.tsx (page)
- [ ] RefundRequestModal.tsx

### Bookings.tsx Updates Needed
- [ ] Display refund policy badges
- [ ] Add "Request Refund" button for eligible bookings
- [ ] Integrate RefundRequestModal

## 🔒 Security Checklist
- [ ] Never store card details in Firestore
- [ ] Use Stripe Elements for card input (PCI compliant)
- [ ] Implement rate limiting on payment attempts
- [ ] Verify webhook signatures
- [ ] Use HTTPS for all payment pages
- [ ] Implement proper error handling

## 📊 Testing Checklist
- [ ] Test with Stripe test cards
- [ ] Test payment success flow
- [ ] Test payment failure scenarios
- [ ] Test refund eligibility calculations
- [ ] Test refund request flow
- [ ] Test Apple Pay (on iOS devices)

## 🚀 Deployment Checklist
- [ ] Set up Cloud Functions
- [ ] Configure production Stripe keys
- [ ] Set up webhook endpoint
- [ ] Enable Stripe Radar (fraud detection)
- [ ] Test end-to-end in production
- [ ] Monitor payment success rate

## 📚 Documentation
- [x] System design document (docs/design/payment_system_design.md)
- [x] PRD document (docs/design/payment_prd.md)
- [x] Code documentation (inline comments)
- [ ] User guide for payments
- [ ] Admin guide for refunds

## ⚠️ Important Notes

### Current Status
The payment system foundation has been implemented with:
- Type definitions for payments, transactions, and refunds
- Price calculation utilities
- Refund eligibility checking
- Firestore functions for payment tracking
- Basic UI components

### What's Missing
**Backend Implementation is REQUIRED** before the payment system can be used in production. The current implementation includes frontend stubs that throw errors indicating backend setup is needed.

### Next Steps for Full Implementation
1. Set up Firebase Cloud Functions project
2. Implement the 4 critical backend endpoints listed above
3. Configure Stripe webhook endpoint
4. Update Reserve.tsx to integrate payment flow
5. Create remaining payment UI components
6. Test thoroughly with Stripe test mode
7. Deploy to production with live Stripe keys

### Development Mode
For development without backend:
- The system can track bookings with payment status
- Price calculations work correctly
- Refund eligibility can be checked
- Actual payment processing will fail (as expected)

### Production Requirements
- Firebase Cloud Functions (Blaze plan)
- Stripe account (test and live modes)
- HTTPS domain for webhook endpoint
- Environment variables properly configured