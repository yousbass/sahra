# Deployment layout

The root website is exported from artifacts/sahra in the development workspace.
The current Express API is in server/ and is served by one Vercel function:
api/index.ts. Legacy unauthenticated email functions are no longer deployed.
clients/alternate-web preserves the alternate design; clients/mobile contains
the Expo app, including phone admin tools. Neither client changes the live
website root and both are excluded from the Vercel upload.

## Vercel

Use the repository root. vercel.json selects npm ci, npm run build, and dist.
NODEJS_HELPERS=0 preserves raw request bytes for Tap webhook verification.
All API paths remain /api/... and page navigation falls back to index.html.
Do not set VITE_API_URL_FORCE unless deliberately using a separate API host.

Existing Vercel environment variables are not copied from the workspace.
Configure the six VITE_FIREBASE_* values for the existing Firebase project;
the backend also needs FIREBASE_SERVICE_ACCOUNT_JSON, TAP_SECRET_KEY,
RESEND_API_KEY, and FROM_EMAIL. Set ALLOWED_ORIGIN to the live website origin
and PAYMENT_REDIRECT_URL to its /payment/success page. MOBILE_APP_SCHEME must
match the Expo scheme for native payment redirects. Do not commit credentials.

The long-running workspace expiry interval does not run in Vercel functions.
Use an external scheduler to POST /api/internal/sweep/expired-bookings with
the X-Sweep-Secret header matching INTERNAL_SWEEP_SECRET. Schedule at the
existing five-minute cadence. Keep this endpoint private.

Git pushes do not deploy Firestore or Storage rules: review and apply those
through the existing Firebase release process before enabling new features.
No database data or user uploads are included in this source update.

## Phone app

In clients/mobile, install dependencies, set EXPO_PUBLIC_DOMAIN to the API host
(hostname only, without https:// or a trailing slash), and run npm start.
Firebase client configuration is fetched from the API's /api/firebase-config.
Updating GitHub/Vercel does not distribute native app binaries; create and
distribute a separate Expo/native release for installed phone applications.

## Validation

npm run typecheck
npm run typecheck:server
npm run test:server
npm run build
