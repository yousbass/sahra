import { router, type Href } from 'expo-router';

/**
 * Safe back navigation. On web a fresh page load has no history stack, so
 * router.back() is a silent no-op and the button appears dead. Always fall
 * back to a sensible route instead.
 */
export function goBack(fallback: Href = '/(tabs)') {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
