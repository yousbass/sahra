// Centralized configuration for environment variables with fallback values

export const config = {
  // Support contact information
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@sahra.com',
  supportPhone: import.meta.env.VITE_SUPPORT_PHONE || '+973 XXXX XXXX',
  
  // Firebase configuration
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  }
} as const;