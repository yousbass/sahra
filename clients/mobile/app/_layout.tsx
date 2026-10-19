import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  useFonts as usePlusJakarta,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  useFonts as useCairo,
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nProvider } from '@/contexts/I18nContext';
import { UnreadBookingsProvider } from '@/contexts/UnreadBookingsContext';
import { Splash } from '@/components/Splash';
import { NotifierHost } from '@/components/NotifierHost';
import { NavigationLoadingOverlay } from '@/components/NavigationLoadingOverlay';

SplashScreen.preventAutoHideAsync();

// Web (SPA output): the generated HTML lacks `viewport-fit=cover`, so phones
// with a notch / Dynamic Island report safe-area insets of 0 and headers
// render under the camera cutout. Patch the viewport meta at module scope —
// before SafeAreaProvider mounts — so env(safe-area-inset-*) is populated.
if (typeof document !== 'undefined') {
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (viewportMeta) {
    const content = viewportMeta.getAttribute('content') || '';
    if (!content.includes('viewport-fit')) {
      viewportMeta.setAttribute('content', `${content}, viewport-fit=cover`);
    }
    if (__DEV__) {
      console.log('[viewport]', viewportMeta.getAttribute('content'));
    }
  }
}

// DEV, web only: surface fatal boot errors on the page itself instead of a
// silent white screen — the user's browser console is not visible to us
// remotely, so a crash before React mounts must paint something readable.
if (__DEV__ && typeof document !== 'undefined') {
  const showBootError = (msg: string) => {
    let el = document.getElementById('boot-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'boot-error';
      el.style.cssText =
        'position:fixed;top:0;left:0;right:0;z-index:99999;background:#B00020;color:#fff;' +
        'font:12px/1.5 monospace;padding:10px 12px;white-space:pre-wrap;word-break:break-word;';
      document.body.appendChild(el);
    }
    el.textContent = 'App failed to start: ' + msg;
  };
  window.addEventListener('error', (e) =>
    showBootError(e.message || String((e as ErrorEvent).error))
  );
  window.addEventListener('unhandledrejection', (e) => {
    const r = (e as PromiseRejectionEvent).reason;
    showBootError(String((r && (r.message || r.stack)) || r));
  });
}

const queryClient = new QueryClient();

function RootLayoutNav() {
  const clearLoaderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const showNavigationLoader = useCallback(() => {
    if (clearLoaderTimer.current) clearTimeout(clearLoaderTimer.current);
    setIsNavigating(true);
    clearLoaderTimer.current = setTimeout(() => {
      setIsNavigating(false);
      clearLoaderTimer.current = null;
    }, 360);
  }, []);

  const hideNavigationLoader = useCallback(() => {
    if (clearLoaderTimer.current) clearTimeout(clearLoaderTimer.current);
    // Let the native screen transition settle before fading the loader away.
    // This avoids a one-frame flash between the old and new screens.
    clearLoaderTimer.current = setTimeout(() => {
      setIsNavigating(false);
      clearLoaderTimer.current = null;
    }, 100);
  }, []);

  useEffect(
    () => () => {
      if (clearLoaderTimer.current) clearTimeout(clearLoaderTimer.current);
    },
    [],
  );

  return (
    <View style={styles.navigator}>
      <Stack
        screenOptions={{ headerBackTitle: 'Back', headerShown: false }}
        screenListeners={{
          transitionStart: showNavigationLoader,
          transitionEnd: hideNavigationLoader,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="become-host" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="market/index" />
        <Stack.Screen name="market/[category]" />
        <Stack.Screen name="camps" />
        <Stack.Screen name="kashtas" />
        <Stack.Screen name="camp/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="reserve/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="payment-result" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
      </Stack>
      <NavigationLoadingOverlay visible={isNavigating} />
    </View>
  );
}

export default function RootLayout() {
  const [jakartaLoaded, jakartaError] = usePlusJakarta({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const [cairoLoaded, cairoError] = useCairo({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  const fontsLoaded = jakartaLoaded && cairoLoaded;
  const fontError = jakartaError || cairoError;

  // On web, skip the native splash animation entirely — it's a mobile-native
  // experience and blocks the preview panel. Firebase still initialises; we
  // just don't show the tent animation while it does.
  const isWeb = typeof document !== 'undefined';

  const [splashDone, setSplashDone] = useState(isWeb);
  const [firebaseReady, setFirebaseReady] = useState(isWeb);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Native: hold the (native) splash screen until fonts are ready — a flash
  // of fallback fonts looks broken in a compiled app.
  // Web: never block first paint on font downloads. The browser renders with
  // fallback fonts and swaps when the @font-face files arrive, which is the
  // standard web behavior — blocking here left the preview blank for seconds.
  if (!isWeb && !fontsLoaded && !fontError) return null;

  if (!splashDone || !firebaseReady) {
    return (
      <AuthProvider onInit={() => setFirebaseReady(true)}>
        <Splash onAnimationComplete={() => setSplashDone(true)} />
      </AuthProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <I18nProvider>
              <AuthProvider>
                <UnreadBookingsProvider>
                  <RootLayoutNav />
                  <NotifierHost />
                </UnreadBookingsProvider>
              </AuthProvider>
            </I18nProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  navigator: {
    flex: 1,
  },
});
