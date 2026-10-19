import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Custom HTML shell for web builds (expo-router).
 *
 * `viewport-fit=cover` is essential: without it, phones with a notch /
 * Dynamic Island report safe-area insets of 0 to react-native-safe-area-context
 * on web, so headers render underneath the camera cutout when the app is
 * viewed in a mobile browser or WebView. With it, env(safe-area-inset-*)
 * is populated and every screen's `useSafeAreaInsets()` offset works.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <ScrollViewStyleReset />
        {/* Keyboard focus ring — visible indicator for web keyboard navigation (WCAG 2.4.7) */}
        <style>{`
          :focus-visible {
            outline: 2px solid #F0A03C !important;
            outline-offset: 2px !important;
            border-radius: 4px;
          }
        `}</style>
        {/* Boot diagnostics live in entry.js (runs before any app module),
            not here — the dev server serves its own HTML shell and ignores
            +html.tsx, so scripts added here never reach the dev preview. */}
      </head>
      <body>{children}</body>
    </html>
  );
}
