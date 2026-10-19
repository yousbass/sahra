import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, Auth } from 'firebase/auth';
// getReactNativePersistence exists at runtime but is missing from the web
// entry's type declarations in firebase v12.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: unknown) => import('firebase/auth').Persistence;
};
import {
  getFirestore,
  initializeFirestore,
  Firestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export let app: FirebaseApp | null = null;
export let auth: Auth | null = null;
export let db: Firestore | null = null;
export let storage: FirebaseStorage | null = null;

export const initFirebase = async () => {
  if (getApps().length > 0) {
    app = getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    return { app, auth, db };
  }

  const configUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/firebase-config`;
  const cached = await AsyncStorage.getItem('firebase_config');
  let config = cached ? JSON.parse(cached) : null;
  
  try {
    const res = await fetch(configUrl);
    const data = await res.json();
    if (data.success && data.config) {
      config = data.config;
      await AsyncStorage.setItem('firebase_config', JSON.stringify(config));
    }
  } catch (e) {
    console.log('Failed to fetch config, using cached', e);
  }

  if (!config) throw new Error('No Firebase config available');

  app = initializeApp(config);
  
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }

  // Enable Firestore offline persistence so camps/bookings load from cache
  // when the device is offline. Wrapped in try/catch — fails silently if
  // persistence is unsupported on the current platform (e.g. older Expo).
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
    });
  } catch (e) {
    console.log('Firestore persistence unavailable, falling back to memory cache', e);
    db = getFirestore(app);
  }

  storage = getStorage(app);
  return { app, auth, db };
};
