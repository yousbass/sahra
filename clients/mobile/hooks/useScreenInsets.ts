import { Platform } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';

// Web builds (including the Replit phone-frame preview and WebViews) report
// env(safe-area-inset-*) as 0, so anything positioned with raw insets renders
// underneath the status bar / notch overlay. These are the standard web
// minimums: 67px covers the tallest status bar (Dynamic Island), 34px covers
// the home indicator.
const WEB_MIN_TOP = 67;
const WEB_MIN_BOTTOM = 34;

/**
 * Drop-in replacement for `useSafeAreaInsets()` used by every screen.
 * On iOS/Android the native insets pass through unchanged; on web the top and
 * bottom are floored so headers and footers clear the simulated notch and
 * home indicator. (The tab bar in `(tabs)/_layout.tsx` intentionally keeps raw
 * insets — it already uses a fixed 84px height on web instead.)
 */
export function useScreenInsets(): EdgeInsets {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'web') {
    return insets;
  }
  return {
    ...insets,
    top: Math.max(insets.top, WEB_MIN_TOP),
    bottom: Math.max(insets.bottom, WEB_MIN_BOTTOM),
  };
}
