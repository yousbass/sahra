import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';
import { CampfireLoader } from '@/components/CampfireLoader';

/**
 * Covers the brief gap while Expo Router changes screens. PageLoader takes
 * over if the destination then needs to fetch its essential data.
 */
export function NavigationLoadingOverlay({ visible }: { visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? 160 : 240,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [opacity, visible]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading next page"
      pointerEvents={visible ? 'auto' : 'none'}
      accessible={visible}
      importantForAccessibility={visible ? 'yes' : 'no-hide-descendants'}
      style={[styles.overlay, { opacity }]}
    >
      <CampfireLoader size="lg" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    // Let the outgoing screen remain faintly visible as the campfire arrives.
    // An opaque light background created a distracting white flash on fast
    // navigation, especially when switching tabs.
    backgroundColor: 'rgba(10, 17, 40, 0.16)',
    zIndex: 1000,
    elevation: 1000,
  },
});