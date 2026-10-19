import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path, Circle, Line, Ellipse, G,
  Defs, LinearGradient as SvgGradient, RadialGradient, Stop,
} from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';

/**
 * Animated splash: the MUKHYMAT tent gets "built" in front of you.
 * Sequence — stars & moon appear, dunes roll in, the centre pole rises,
 * the canvas springs up over it, guy ropes flick out, the door glows
 * warm and the campfire crackles on. Then the wordmark settles in.
 *
 * Night-indigo + amber palette matches the app icon (Camp Glow identity).
 */

const W = 300;
const H = 240;
const GROUND_Y = 200;

// scale-about-a-point helpers (transform origin tricks)
const ORIGIN_GROUND = GROUND_Y - H / 2;      // scale tent/pole from the ground line
const ORIGIN_FIRE = 224 - H / 2;             // scale flame from its base

// Dev-only escape hatch (mirrors `?skipSplash=1` in _layout): render the
// finished scene immediately so automated web screenshots can verify it.
const SHOW_FINAL_FRAME =
  typeof window !== 'undefined' &&
  typeof window.location !== 'undefined' &&
  window.location.search.includes('splashFinal=1');

export function Splash({ onAnimationComplete }: { onAnimationComplete: () => void }) {
  const val = (initial: number, finalValue: number) =>
    new Animated.Value(SHOW_FINAL_FRAME ? finalValue : initial);

  // entrance tracks
  const stars1 = useRef(val(0, 1)).current;
  const stars2 = useRef(val(0, 1)).current;
  const stars3 = useRef(val(0, 1)).current;
  const moonIn = useRef(val(0, 1)).current;
  const groundIn = useRef(val(0, 1)).current;
  const poleScale = useRef(val(0, 1)).current;
  const tentScale = useRef(val(0.05, 1)).current;
  const tentOpacity = useRef(val(0, 1)).current;
  const seams = useRef(val(0, 0.35)).current;
  const ropeL = useRef(val(0, 1)).current;
  const ropeR = useRef(val(0, 1)).current;
  const door = useRef(val(0, 1)).current;
  const logs = useRef(val(0, 1)).current;
  const flamePop = useRef(val(0, 1)).current;
  const wordIn = useRef(val(0, 1)).current;
  const underline = useRef(val(0, 1)).current;
  // ambient loops
  const sparkle = useRef(val(0, 0.8)).current;
  const glowPulse = useRef(val(0, 0.3)).current;
  const flick = useRef(new Animated.Value(1)).current;
  // exit
  const contentFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const mk = (v: Animated.Value, toValue: number, duration: number, easing = Easing.out(Easing.cubic)) =>
      Animated.timing(v, { toValue, duration, easing, useNativeDriver: true });
    const track = (delay: number, anim: Animated.CompositeAnimation) =>
      Animated.sequence([Animated.delay(delay), anim]);

    if (SHOW_FINAL_FRAME) {
      // Hold the finished scene for visual verification; never advance.
      const flickLoopOnly = Animated.loop(Animated.sequence([
        mk(flick, 1.12, 140, Easing.inOut(Easing.quad)),
        mk(flick, 0.94, 170, Easing.inOut(Easing.quad)),
        mk(flick, 1.08, 150, Easing.inOut(Easing.quad)),
        mk(flick, 1.0, 160, Easing.inOut(Easing.quad)),
      ]));
      flickLoopOnly.start();
      return () => flickLoopOnly.stop();
    }

    const build = Animated.parallel([
      // night sky
      track(0, mk(stars1, 1, 350)),
      track(150, mk(stars2, 1, 350)),
      track(300, mk(stars3, 1, 350)),
      track(100, mk(moonIn, 1, 550)),
      // ground
      track(260, mk(groundIn, 1, 500)),
      // the tent gets built
      track(620, Animated.spring(poleScale, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true })),
      track(800, Animated.parallel([
        mk(tentOpacity, 1, 140),
        Animated.spring(tentScale, { toValue: 1, friction: 6.5, tension: 46, useNativeDriver: true }),
      ])),
      track(1280, mk(seams, 0.35, 300)),
      track(1280, mk(ropeL, 1, 180)),
      track(1380, mk(ropeR, 1, 180)),
      // light it up
      track(1450, mk(door, 1, 380)),
      track(1560, mk(logs, 1, 220)),
      track(1680, Animated.spring(flamePop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true })),
      // wordmark
      track(1700, mk(wordIn, 1, 420)),
      track(1850, mk(underline, 1, 330, Easing.out(Easing.back(1.6)))),
    ]);

    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    let completed = false;
    build.start(({ finished }) => {
      if (!finished) return;
      holdTimer = setTimeout(() => {
        Animated.timing(contentFade, {
          toValue: 0, duration: 360, easing: Easing.in(Easing.cubic), useNativeDriver: true,
        }).start(({ finished: fadeDone }) => {
          if (fadeDone && !completed) {
            completed = true;
            onAnimationComplete();
          }
        });
      }, 300);
    });

    // ambient loops (run until unmount)
    const sparkleLoop = Animated.sequence([
      Animated.delay(600),
      Animated.loop(Animated.sequence([
        mk(sparkle, 1, 420, Easing.inOut(Easing.quad)),
        mk(sparkle, 0.45, 520, Easing.inOut(Easing.quad)),
        mk(sparkle, 0.9, 430, Easing.inOut(Easing.quad)),
        mk(sparkle, 0.55, 520, Easing.inOut(Easing.quad)),
      ])),
    ]);
    const glowLoop = Animated.sequence([
      Animated.delay(1800),
      Animated.loop(Animated.sequence([
        mk(glowPulse, 0.42, 600, Easing.inOut(Easing.quad)),
        mk(glowPulse, 0.2, 700, Easing.inOut(Easing.quad)),
      ])),
    ]);
    const flickLoop = Animated.sequence([
      Animated.delay(1900),
      Animated.loop(Animated.sequence([
        mk(flick, 1.12, 140, Easing.inOut(Easing.quad)),
        mk(flick, 0.94, 170, Easing.inOut(Easing.quad)),
        mk(flick, 1.08, 150, Easing.inOut(Easing.quad)),
        mk(flick, 1.0, 160, Easing.inOut(Easing.quad)),
      ])),
    ]);
    sparkleLoop.start();
    glowLoop.start();
    flickLoop.start();

    return () => {
      completed = true; // never fire onAnimationComplete after unmount
      if (holdTimer) clearTimeout(holdTimer);
      build.stop();
      sparkleLoop.stop();
      glowLoop.stop();
      flickLoop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // derived transforms
  const moonY = moonIn.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] });
  const groundY = groundIn.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const wordY = wordIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  const fromGround = (scale: Animated.Value | Animated.AnimatedInterpolation<number>) => [
    { translateY: ORIGIN_GROUND }, { scaleY: scale as Animated.Value }, { translateY: -ORIGIN_GROUND },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0A1128', '#16244B']} style={StyleSheet.absoluteFill} />

      <Animated.View style={[styles.content, { opacity: contentFade }]}>
        <View style={styles.scene}>

          {/* stars */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: stars1 }]}>
            <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <Circle cx={40} cy={60} r={1.3} fill="#E8EDF7" />
              <Circle cx={120} cy={30} r={1.1} fill="#E8EDF7" />
              <Circle cx={180} cy={55} r={1.4} fill="#E8EDF7" />
            </Svg>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: stars2 }]}>
            <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <Circle cx={270} cy={30} r={1.2} fill="#E8EDF7" />
              <Circle cx={60} cy={110} r={1.1} fill="#E8EDF7" />
              <Circle cx={205} cy={20} r={1.3} fill="#E8EDF7" />
            </Svg>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: stars3 }]}>
            <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <Circle cx={285} cy={75} r={1.1} fill="#E8EDF7" />
              <Circle cx={105} cy={80} r={1.2} fill="#E8EDF7" />
            </Svg>
          </Animated.View>

          {/* twinkling sparkles */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: sparkle }]}>
            <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <Path d="M80 35 L81.4 38.6 L85 40 L81.4 41.4 L80 45 L78.6 41.4 L75 40 L78.6 38.6 Z" fill="#F5E9CE" />
              <Path d="M247 94 L248.1 96.9 L251 98 L248.1 99.1 L247 102 L245.9 99.1 L243 98 L245.9 96.9 Z" fill="#F5E9CE" />
            </Svg>
          </Animated.View>

          {/* crescent moon */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: moonIn, transform: [{ translateY: moonY }] }]}>
            <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <Circle cx={222} cy={52} r={26} fill="#F5DFAE" opacity={0.08} />
              <Circle cx={222} cy={52} r={20} fill="#F5DFAE" />
              <Circle cx={214} cy={45} r={17} fill="#0C1633" />
            </Svg>
          </Animated.View>

          {/* dunes + palm silhouette */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: groundIn, transform: [{ translateY: groundY }] }]}>
            <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <Path d={`M0 ${GROUND_Y} Q60 188 120 198 T300 196 L300 ${H} L0 ${H} Z`} fill="#101B3A" />
              <Path d="M0 200 Q60 188 120 198 T300 196" stroke="#2A3A6A" strokeWidth={1} fill="none" />
              {/* palm */}
              <G stroke="#1A2750" fill="none" strokeLinecap="round">
                <Path d="M30 200 Q34 168 30 150" strokeWidth={3} />
                <Path d="M30 150 Q20 140 12 138" strokeWidth={2.4} />
                <Path d="M30 150 Q22 132 18 128" strokeWidth={2.4} />
                <Path d="M30 150 Q30 130 36 124" strokeWidth={2.4} />
                <Path d="M30 150 Q40 134 48 130" strokeWidth={2.4} />
                <Path d="M30 150 Q42 144 50 142" strokeWidth={2.4} />
              </G>
            </Svg>
          </Animated.View>

          {/* centre pole + pennant (rises first) */}
          <Animated.View style={[StyleSheet.absoluteFill, { transform: fromGround(poleScale) }]}>
            <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <Line x1={150} y1={GROUND_Y} x2={150} y2={78} stroke="#8A5A2B" strokeWidth={3} strokeLinecap="round" />
              <Circle cx={150} cy={75} r={2.5} fill="#F0A03C" />
              <Path d="M150 74 L165 80 L150 86 Z" fill="#F0A03C" />
            </Svg>
          </Animated.View>

          {/* tent canvas (springs up over the pole) */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: tentOpacity, transform: fromGround(tentScale) }]}>
            <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <Defs>
                <SvgGradient id="canvas" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#EBBE7F" />
                  <Stop offset="1" stopColor="#C88F45" />
                </SvgGradient>
              </Defs>
              <Path d={`M55 ${GROUND_Y} Q92 128 150 92 Q208 128 245 ${GROUND_Y} Z`} fill="url(#canvas)" />
            </Svg>
          </Animated.View>

          {/* roof seams */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: seams }]}>
            <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <G stroke="#7A4E22" strokeWidth={1} fill="none">
                <Path d={`M150 92 Q118 138 85 ${GROUND_Y}`} />
                <Path d={`M150 92 Q135 142 115 ${GROUND_Y}`} />
                <Path d={`M150 92 Q165 142 185 ${GROUND_Y}`} />
                <Path d={`M150 92 Q182 138 215 ${GROUND_Y}`} />
              </G>
            </Svg>
          </Animated.View>

          {/* guy ropes */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: ropeL }]}>
            <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <Line x1={55} y1={GROUND_Y} x2={30} y2={214} stroke="#B98A50" strokeWidth={1.2} />
            </Svg>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: ropeR }]}>
            <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <Line x1={245} y1={GROUND_Y} x2={270} y2={214} stroke="#B98A50" strokeWidth={1.2} />
            </Svg>
          </Animated.View>

          {/* glowing door */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: door }]}>
            <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <Defs>
                <RadialGradient id="doorGlow" cx="0.5" cy="0.85" r="0.9">
                  <Stop offset="0" stopColor="#FFE3B0" />
                  <Stop offset="1" stopColor="#E9A94F" />
                </RadialGradient>
              </Defs>
              <Path d={`M128 ${GROUND_Y} Q150 138 172 ${GROUND_Y} Z`} fill="url(#doorGlow)" />
            </Svg>
          </Animated.View>
          {/* door glow pulse */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: glowPulse }]}>
            <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <Ellipse cx={150} cy={194} rx={26} ry={9} fill="#FFD9A0" />
            </Svg>
          </Animated.View>

          {/* campfire logs */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: logs }]}>
            <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <Ellipse cx={150} cy={224} rx={18} ry={6} fill="#F0A03C" opacity={0.18} />
              <G fill="#6B4A2A">
                <Path d="M138 220 L162 226 L161 229 L137 223 Z" />
                <Path d="M162 220 L138 226 L139 229 L163 223 Z" />
              </G>
            </Svg>
          </Animated.View>

          {/* flame (pops on, then flickers) */}
          <Animated.View style={[StyleSheet.absoluteFill, {
            transform: [
              { translateY: ORIGIN_FIRE }, { scaleY: flamePop }, { scaleX: flamePop }, { translateY: -ORIGIN_FIRE },
            ],
          }]}>
            <Animated.View style={[StyleSheet.absoluteFill, {
              transform: [{ translateY: ORIGIN_FIRE }, { scaleY: flick }, { translateY: -ORIGIN_FIRE }],
            }]}>
              <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
                <Path d="M150 202 Q140 214 150 224 Q160 214 150 202 Z" fill="#F0A03C" />
                <Path d="M150 208 Q145 215 150 221 Q155 215 150 208 Z" fill="#FFD9A0" />
              </Svg>
            </Animated.View>
          </Animated.View>
        </View>

        {/* wordmark */}
        <Animated.View style={[styles.wordmark, { opacity: wordIn, transform: [{ translateY: wordY }] }]}>
          <Text style={styles.title}>MUKHYMAT</Text>
          <Text style={styles.subtitle}>مخيمات</Text>
          <Animated.View style={[styles.underline, { transform: [{ scaleX: underline }] }]} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  scene: {
    width: W,
    height: H,
  },
  wordmark: {
    alignItems: 'center',
    marginTop: 18,
  },
  title: {
    fontSize: 30,
    letterSpacing: 5,
    color: '#F7F2E8',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
    color: '#E5CFA5',
    opacity: 0.85,
    fontFamily: 'Cairo_600SemiBold',
  },
  underline: {
    width: 64,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#F0A03C',
    marginTop: 12,
  },
});
