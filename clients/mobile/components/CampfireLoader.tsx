import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, Platform } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  Path,
  Line,
  Ellipse,
  G,
} from 'react-native-svg';
import { AppText } from '@/components/AppText';

/**
 * MUKHYMAT signature loader — "Night at the camp".
 * Port of the website loader: a glowing tent under an indigo night sky
 * with a live campfire, rising embers and twinkling stars.
 * `sm` renders a compact flickering flame (for buttons); `md`/`lg`
 * render the full night scene. Message text uses the app font (AppText).
 */

const NATIVE = Platform.OS !== 'web';

// Scene canvas (matches the web SVG viewBox)
const W = 280;
const H = 190;

function useLoop(duration: number, delay = 0, reverse = true) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const forward = Animated.timing(v, {
      toValue: 1,
      duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: NATIVE,
    });
    const back = Animated.timing(v, {
      toValue: 0,
      duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: NATIVE,
    });
    const anim = Animated.loop(
      reverse
        ? Animated.sequence([forward, back])
        : Animated.timing(v, {
            toValue: 1,
            duration,
            easing: Easing.linear,
            useNativeDriver: NATIVE,
          }),
    );
    const starter = delay
      ? Animated.sequence([Animated.delay(delay), anim])
      : anim;
    starter.start();
    return () => {
      starter.stop();
      v.setValue(0);
    };
  }, [v, duration, delay, reverse]);
  return v;
}

/** The three flame tongues, cropped from the scene (x 204-228, y 124-162). */
function Flames({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox="204 124 24 38">
      <Path
        d="M 216 126 C 208 138 206 146 210 154 C 213 159 219 159 222 154 C 226 146 224 138 216 126 Z"
        fill="#E86A2E"
      />
      <Path
        d="M 216 134 C 211 142 210 148 213 153 C 215 157 219 157 221 153 C 223 148 221 142 216 134 Z"
        fill="#F59E0B"
      />
      <Path
        d="M 216 142 C 213 147 212 150 214 153 C 215.5 155.5 218.5 155.5 219.5 153 C 221 150 219 147 216 142 Z"
        fill="#FFD583"
      />
    </Svg>
  );
}

/** Compact flickering flame for inline/button use. */
function MiniFlame() {
  const flick = useLoop(550);
  return (
    <Animated.View
      style={{
        opacity: flick.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }),
        transform: [
          { scaleY: flick.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) },
        ],
      }}
    >
      <Flames width={17} height={26} />
    </Animated.View>
  );
}

function Ember({
  x,
  y,
  size,
  duration,
  delay,
  driftX,
}: {
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  driftX: number;
}) {
  const v = useLoop(duration, delay, false);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FFC96B',
        opacity: v.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 0.95, 0.5, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -28] }) },
          { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, driftX, -driftX / 2] }) },
        ],
      }}
    />
  );
}

function TwinkleStar({
  x,
  y,
  size,
  duration,
  delay,
}: {
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}) {
  const v = useLoop(duration, delay);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FFF8E7',
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }),
      }}
    />
  );
}

/** Full "night at the camp" animated scene. */
function NightScene({ scale }: { scale: number }) {
  const flick = useLoop(600);
  const breathe = useLoop(1400);
  const float = useLoop(3000);

  return (
    <View
      style={[
        styles.card,
        {
          width: W,
          height: H,
          transform: [{ scale }],
        },
      ]}
    >
      <View style={styles.cardInner}>
        {/* Static base scene */}
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <LinearGradient id="mkSky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#070D22" />
              <Stop offset="0.55" stopColor="#0F1735" />
              <Stop offset="1" stopColor="#28305E" />
            </LinearGradient>
            <RadialGradient id="mkMoonHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#F6E7C1" stopOpacity="0.45" />
              <Stop offset="1" stopColor="#F6E7C1" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="mkFireGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFAE5C" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#FFAE5C" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="mkDoorLight" cx="50%" cy="35%" r="65%">
              <Stop offset="0" stopColor="#FFD98A" />
              <Stop offset="0.7" stopColor="#F2A93B" />
              <Stop offset="1" stopColor="#C97E1F" />
            </RadialGradient>
            <RadialGradient id="mkLightPool" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFC46B" stopOpacity="0.5" />
              <Stop offset="1" stopColor="#FFC46B" stopOpacity="0" />
            </RadialGradient>
            <LinearGradient id="mkCanvasL" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#F0B95C" />
              <Stop offset="1" stopColor="#D2932F" />
            </LinearGradient>
            <LinearGradient id="mkCanvasR" x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#C8892B" />
              <Stop offset="1" stopColor="#9E6A1E" />
            </LinearGradient>
          </Defs>

          {/* Sky */}
          <Rect x="0" y="0" width={W} height={H} fill="url(#mkSky)" />

          {/* Stars (static base — four of them twinkle as overlays) */}
          <G fill="#FFF8E7" opacity="0.45">
            <Circle cx="30" cy="30" r="1.6" />
            <Circle cx="70" cy="18" r="1.1" />
            <Circle cx="118" cy="34" r="1.4" />
            <Circle cx="160" cy="16" r="1.1" />
            <Circle cx="196" cy="40" r="1.3" />
            <Circle cx="252" cy="26" r="1.5" />
            <Circle cx="216" cy="14" r="1.0" />
            <Circle cx="94" cy="52" r="1.0" />
          </G>

          {/* Moon halo (static) */}
          <Circle cx="232" cy="52" r="30" fill="url(#mkMoonHalo)" />

          {/* Far dunes */}
          <Path d="M-10,138 Q60,116 130,136 T290,132 L290,200 L-10,200 Z" fill="#1A2248" />
          {/* Near dunes / ground */}
          <Path d="M-10,156 Q80,138 170,154 T290,150 L290,200 L-10,200 Z" fill="#10173A" />

          {/* Light pool spilling from tent door */}
          <Ellipse cx="126" cy="166" rx="46" ry="12" fill="url(#mkLightPool)" />

          {/* Tent */}
          <G>
            <Line x1="88" y1="120" x2="66" y2="164" stroke="#6E5A33" strokeWidth="1.2" />
            <Line x1="164" y1="120" x2="186" y2="164" stroke="#6E5A33" strokeWidth="1.2" />
            <Path d="M 126 84 L 70 164 L 126 164 Z" fill="url(#mkCanvasL)" />
            <Path d="M 126 84 L 182 164 L 126 164 Z" fill="url(#mkCanvasR)" />
            <Path d="M 126 84 L 126 164" stroke="#FFDF9E" strokeWidth="1.4" opacity="0.5" />
            {/* Door base (breathing overlay sits on top) */}
            <Path d="M 126 108 L 108 164 L 144 164 Z" fill="url(#mkDoorLight)" opacity="0.72" />
            <Path d="M 126 108 L 144 164 L 136 164 Q 128 132 126 108 Z" fill="#7A4E14" opacity="0.85" />
            <Line x1="126" y1="70" x2="126" y2="84" stroke="#8A5B1E" strokeWidth="2" strokeLinecap="round" />
            <Path d="M 126 70 L 142 74 L 126 79 Z" fill="#E8A33D" />
          </G>

          {/* Campfire glow + logs (flames are an animated overlay) */}
          <Ellipse cx="216" cy="158" rx="34" ry="16" fill="url(#mkFireGlow)" />
          <G stroke="#5C3A1A" strokeWidth="4" strokeLinecap="round">
            <Line x1="204" y1="164" x2="228" y2="158" />
            <Line x1="206" y1="158" x2="226" y2="164" />
          </G>
        </Svg>

        {/* Moon (floats gently) */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 202,
            top: 22,
            transform: [
              { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
            ],
          }}
        >
          <Svg width={60} height={60} viewBox="202 22 60 60">
            <Path d="M 238 38 A 15 15 0 1 0 238 66 A 12.5 12.5 0 1 1 238 38 Z" fill="#F6E7C1" />
          </Svg>
        </Animated.View>

        {/* Door light breathing */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 108,
            top: 108,
            opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
          }}
        >
          <Svg width={36} height={56} viewBox="108 108 36 56">
            <Defs>
              <RadialGradient id="mkDoorLight2" cx="50%" cy="35%" r="65%">
                <Stop offset="0" stopColor="#FFD98A" />
                <Stop offset="0.7" stopColor="#F2A93B" />
                <Stop offset="1" stopColor="#C97E1F" />
              </RadialGradient>
            </Defs>
            <Path d="M 126 108 L 108 164 L 144 164 Z" fill="url(#mkDoorLight2)" />
          </Svg>
        </Animated.View>

        {/* Flames flickering (scaleY anchored to the fire base) */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 204,
            top: 124,
            opacity: flick.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
            transform: [
              { translateY: flick.interpolate({ inputRange: [0, 1], outputRange: [1.5, -1.5] }) },
              { scaleY: flick.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.1] }) },
            ],
          }}
        >
          <Flames width={24} height={38} />
        </Animated.View>

        {/* Rising embers */}
        <Ember x={212} y={140} size={3.4} duration={1900} delay={0} driftX={4} />
        <Ember x={220} y={142} size={2.6} duration={2300} delay={500} driftX={-3} />
        <Ember x={216} y={138} size={2.2} duration={1600} delay={900} driftX={2} />
        <Ember x={224} y={140} size={3.0} duration={2100} delay={1300} driftX={5} />

        {/* Twinkling stars */}
        <TwinkleStar x={30} y={30} size={3.2} duration={1200} delay={0} />
        <TwinkleStar x={118} y={34} size={2.8} duration={1600} delay={400} />
        <TwinkleStar x={196} y={40} size={2.6} duration={1400} delay={800} />
        <TwinkleStar x={252} y={26} size={3.0} duration={1800} delay={200} />
      </View>
    </View>
  );
}

export const CampfireLoader = ({
  size = 'md',
  message,
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}) => {
  if (size === 'sm') {
    return (
      <View style={styles.container}>
        <MiniFlame />
      </View>
    );
  }

  const scale = size === 'lg' ? 1 : 0.88;

  return (
    <View style={styles.container}>
      <NightScene scale={scale} />
      {message ? (
        <View style={{ marginTop: size === 'lg' ? 18 : 8 }}>
          <AppText variant="label">{message}</AppText>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 24,
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 14,
    backgroundColor: '#0F1735',
  },
  cardInner: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
});
