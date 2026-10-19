import React from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, ViewStyle, Animated } from 'react-native';

interface PressableScaleProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}

/**
 * Layout props must live on the outer Pressable — it is the element that
 * participates in the parent's flex layout. Everything else (padding, colors,
 * radius, internal alignment) stays on the inner Animated.View that carries
 * the press-scale transform. Without this split, styles like `flex: 1` or
 * `width: '100%'` never reach the parent row and buttons collapse to hug
 * their text (the "tight pill" bug).
 */
const OUTER_KEYS: readonly string[] = [
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf',
  'width', 'minWidth', 'maxWidth',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'marginHorizontal', 'marginVertical', 'marginStart', 'marginEnd',
  'position', 'top', 'bottom', 'left', 'right', 'start', 'end', 'zIndex',
];

export function PressableScale({ style, scaleTo = 0.96, children, onPressIn, onPressOut, ...props }: PressableScaleProps) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: any) => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
    if (onPressIn) onPressIn(e);
  };

  const handlePressOut = (e: any) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
    if (onPressOut) onPressOut(e);
  };

  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, any>;
  const outer: Record<string, any> = {};
  const inner: Record<string, any> = {};
  for (const key of Object.keys(flat)) {
    if (OUTER_KEYS.includes(key)) outer[key] = flat[key];
    else inner[key] = flat[key];
  }

  // When the caller sizes the button via flex/width/absolute edges, the inner
  // view must stretch to fill the Pressable, which now owns that size.
  const stretchW =
    flat.flex != null || flat.flexGrow != null || flat.flexBasis != null ||
    flat.width != null || flat.alignSelf === 'stretch' ||
    (flat.position === 'absolute' && flat.left != null && flat.right != null);
  const stretchH = flat.position === 'absolute' && flat.top != null && flat.bottom != null;

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={outer}
      {...props}
    >
      <Animated.View
        style={[
          inner,
          stretchW ? { width: '100%' } : null,
          stretchH ? { height: '100%' } : null,
          { transform: [{ scale }] },
        ]}
      >
        {typeof children === 'function' ? children({ pressed: false, hovered: false } as any) : children}
      </Animated.View>
    </Pressable>
  );
}
