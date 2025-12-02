# Payment Backend Deployment Guide

This guide covers the complete setup and deployment of the Sahra payment backend using Firebase Cloud Functions and Stripe.

## Prerequisites

1. **Firebase Account** with Blaze (Pay as you go) plan
2. **Stripe Account** (test and live modes)
3. **Node.js** 18 or higher
4. **Firebase CLI** installed globally

```bash
npm install -g firebase-tools
```

## Step 1: Firebase Project Setup

### 1.1 Login to Firebase

```bash
firebase login
```

### 1.2 Verify Project Connection

```bash
firebase projects:list
```

Your project `sahara-7e0ba` should be listed.

### 1.3 Set Active Project

```bash
firebase use sahara-7e0ba
```

## Step 2: Stripe Account Configuration

### 2.1 Get Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers > API keys**
3. Copy your keys:
   - **Publishable key** (pk_test_... or pk_live_...)
   - **Secret key** (sk_test_... or sk_live_...)

### 2.2 Set Up Webhook

1. Go to **Developers > Webhooks**
2. Click **Add endpoint**
3. For local testing:
   - Use Stripe CLI (see Local Testing section)
4. For production:
   - Endpoint URL: `https://us-central1-sahara-7e0ba.cloudfunctions.net/stripeWebhook`
   - Events to send:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`
5. Copy the **Signing secret** (whsec_...)

## Step 3: Environment Configuration

### 3.1 Frontend Environment Variables

Create `/workspace/shadcn-ui/.env`:

```bash
# Stripe Publishable Key (safe to expose in frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

For production, update to live key:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key_here
```

### 3.2 Backend Environment Variables

**Option A: Using Firebase Functions Config (Recommended for Production)**

```bash
cd /workspace/shadcn-ui

# Set Stripe configuration
firebase functions:config:set \
  stripe.secret_key="sk_test_your_secret_key_here" \
  stripe.webhook_secret="whsec_your_webhook_secret_here"

# View current configuration
firebase functions:config:get
```

For production:

```bash
firebase functions:config:set \
  stripe.secret_key="sk_live_your_live_secret_key_here" \
  stripe.webhook_secret="whsec_your_live_webhook_secret_here"
```

**Option B: Using .env for Local Testing**

Create `/workspace/shadcn-ui/functions/.env.local`:

```bash
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**⚠️ IMPORTANT**: Never commit `.env` or `.env.local` files to Git!

## Step 4: Install Dependencies

```bash
cd /workspace/shadcn-ui/functions
npm install
```

## Step 5: Build Functions

```bash
cd /workspace/shadcn-ui/functions
npm run build
```

Verify that the `lib/` directory is created with compiled JavaScript files.

## Step 6: Local Testing

### 6.1 Start Firebase Emulators

```bash
cd /workspace/shadcn-ui
firebase emulators:start
```

This starts:
- Functions emulator on `http://localhost:5001`
- Hosting emulator on `http://localhost:5000`
- Emulator UI on `http://localhost:4000`

### 6.2 Test with Stripe CLI

Install Stripe CLI:

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop install stripe

# Linux
# Download from https://github.com/stripe/stripe-cli/releases
```

Login to Stripe:

```bash
stripe login
```

Forward webhooks to local emulator:

```bash
stripe listen --forward-to http://localhost:5001/sahara-7e0ba/us-central1/stripeWebhook
```

This will output a webhook signing secret. Copy it and update your local `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 6.3 Test Payment Flow

1. Start the frontend dev server:

```bash
cd /workspace/shadcn-ui
pnpm run dev
```

2. Navigate to a booking page
3. Use Stripe test cards:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - **3D Secure**: `4000 0027 6000 3184`

4. Monitor logs:
   - Firebase Emulator UI: `http://localhost:4000`
   - Stripe CLI: Shows webhook events
   - Browser console: Shows frontend logs

### 6.4 Test Refund Flow

1. Complete a booking with test card
2. Request a refund through the UI
3. Verify refund appears in:
   - Stripe Dashboard
   - Firebase Firestore
   - Transaction logs

## Step 7: Production Deployment

### 7.1 Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] Production Stripe keys configured
- [ ] Firebase Blaze plan active
- [ ] Webhook endpoint configured in Stripe
- [ ] Environment variables set for production
- [ ] Code reviewed and approved

### 7.2 Deploy Functions

```bash
cd /workspace/shadcn-ui

# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:createPaymentIntent
firebase deploy --only functions:stripeWebhook
firebase deploy --only functions:processRefund
```

### 7.3 Deploy Frontend

```bash
cd /workspace/shadcn-ui

# Build frontend
pnpm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### 7.4 Verify Deployment

1. Check Functions in Firebase Console:
   - Go to Firebase Console > Functions
   - Verify all 3 functions are deployed
   - Check function logs

2. Test webhook endpoint:

```bash
curl https://us-central1-sahara-7e0ba.cloudfunctions.net/healthCheck
```

Should return:

```json
{
  "status": "healthy",
  "timestamp": "2025-11-13T...",
  "service": "Sahra Payment Backend"
}
```

3. Update Stripe webhook URL:
   - Go to Stripe Dashboard > Webhooks
   - Update endpoint URL to production URL
   - Test webhook delivery

## Step 8: Monitoring & Maintenance

### 8.1 View Function Logs

```bash
# Real-time logs
firebase functions:log

# Filter by function
firebase functions:log --only createPaymentIntent

# View in Firebase Console
# Go to Firebase Console > Functions > [Function Name] > Logs
```

### 8.2 Monitor Stripe Dashboard

- **Payments**: Monitor successful/failed payments
- **Refunds**: Track refund requests
- **Radar**: Check fraud detection alerts
- **Webhooks**: Verify webhook delivery success rate

### 8.3 Set Up Alerts

1. **Firebase Alerts**:
   - Go to Firebase Console > Functions
   - Set up alerts for:
     - Function errors
     - High execution time
     - High invocation count

2. **Stripe Alerts**:
   - Go to Stripe Dashboard > Settings > Notifications
   - Enable alerts for:
     - Failed payments
     - Refund requests
     - Webhook failures

## Step 9: Testing in Production

### 9.1 Small Amount Test

1. Create a test booking with a small amount (e.g., 1 BD)
2. Use a real card (your own)
3. Complete the payment
4. Verify:
   - Payment appears in Stripe Dashboard
   - Booking status updated in Firestore
   - Transaction recorded
   - Email notification sent (if implemented)

5. Request a refund
6. Verify:
   - Refund appears in Stripe Dashboard
   - Booking status updated
   - Refund transaction recorded

### 9.2 Load Testing

Use Stripe test mode to simulate high volume:

```bash
# Install k6 for load testing
brew install k6

# Run load test script
k6 run load-test.js
```

## Step 10: Rollback Plan

If issues occur in production:

### 10.1 Rollback Functions

```bash
# List function versions
firebase functions:log

# Rollback to previous version
firebase functions:delete createPaymentIntent
firebase deploy --only functions:createPaymentIntent
```

### 10.2 Emergency Disable

If critical issue occurs:

1. **Disable webhook in Stripe**:
   - Go to Stripe Dashboard > Webhooks
   - Disable the production webhook

2. **Disable functions**:

```bash
firebase functions:delete createPaymentIntent
firebase functions:delete processRefund
```

3. **Revert frontend**:

```bash
git revert HEAD
pnpm run build
firebase deploy --only hosting
```

## Troubleshooting

### Issue: Function deployment fails

**Solution**:

```bash
# Check Node version
node --version  # Should be 18+

# Clear cache
npm cache clean --force

# Reinstall dependencies
cd functions
rm -rf node_modules package-lock.json
npm install

# Try deployment again
firebase deploy --only functions
```

### Issue: Webhook signature verification fails

**Solution**:

1. Verify webhook secret is correct:

```bash
firebase functions:config:get stripe.webhook_secret
```

2. Check webhook endpoint URL in Stripe Dashboard

3. Test with Stripe CLI:

```bash
stripe listen --forward-to https://us-central1-sahara-7e0ba.cloudfunctions.net/stripeWebhook
```

### Issue: Payment Intent creation fails

**Solution**:

1. Check Stripe API key:

```bash
firebase functions:config:get stripe.secret_key
```

2. Verify key starts with `sk_test_` or `sk_live_`

3. Check function logs:

```bash
firebase functions:log --only createPaymentIntent
```

### Issue: CORS errors

**Solution**:

Cloud Functions automatically handle CORS. If issues persist:

1. Check Firebase Hosting configuration
2. Verify function is callable (not HTTP)
3. Check browser console for specific error

## Security Best Practices

1. **Never commit secrets**:
   - Add `.env*` to `.gitignore`
   - Use Firebase Functions Config for production

2. **Rotate keys regularly**:
   - Rotate Stripe API keys every 90 days
   - Update webhook secrets after rotation

3. **Monitor for suspicious activity**:
   - Enable Stripe Radar
   - Set up fraud detection rules
   - Monitor failed payment attempts

4. **Implement rate limiting**:
   - Limit payment attempts per user
   - Implement CAPTCHA for high-risk transactions

5. **Regular security audits**:
   - Review function permissions
   - Check Firestore security rules
   - Audit transaction logs

## Cost Optimization

### Firebase Functions Pricing

- **Free tier**: 2M invocations/month
- **Paid**: $0.40 per million invocations
- **Compute time**: $0.0000025 per GB-second

### Optimization Tips

1. **Reduce cold starts**:
   - Keep functions warm with scheduled pings
   - Use minimum instances for critical functions

2. **Optimize function memory**:
   - Start with 256MB
   - Monitor and adjust based on usage

3. **Batch operations**:
   - Process multiple transactions in one invocation
   - Use Firestore batch writes

## Support & Resources

- **Firebase Documentation**: https://firebase.google.com/docs/functions
- **Stripe Documentation**: https://stripe.com/docs/api
- **Firebase Support**: https://firebase.google.com/support
- **Stripe Support**: https://support.stripe.com

## Changelog

- **v1.0.0** (2025-11-13): Initial deployment guide
  - Created Cloud Functions for payment processing
  - Configured Stripe integration
  - Set up webhook handling
  - Implemented refund processing

---

**Last Updated**: November 13, 2025  
**Maintained By**: Sahra Development Team