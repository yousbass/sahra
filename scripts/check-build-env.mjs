// Fail the build rather than publish a blank page with missing Firebase config.
const required = [
  'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_APP_ID',
];
const missing = required.filter(key => !process.env[key]?.trim());
if (missing.length) throw new Error('Missing Vercel build environment variables: ' + missing.join(', '));
