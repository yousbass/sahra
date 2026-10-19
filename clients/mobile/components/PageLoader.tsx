import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { CampfireLoader } from '@/components/CampfireLoader';

/**
 * The single full-page loading treatment for MUKHYMAT.
 *
 * Keep inline skeletons and button-level progress indicators for partial
 * updates, but use this component whenever an entire screen is waiting for
 * its essential data.
 */
export function PageLoader() {
  const colors = useColors();
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 260,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [entrance]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Animated.View
        style={{
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 0],
              }),
            },
          ],
        }}
      >
        <CampfireLoader size="lg" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});