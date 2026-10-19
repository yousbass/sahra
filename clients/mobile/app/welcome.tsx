import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity, Animated, ImageBackground } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppText } from '@/components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableScale } from '@/components/PressableScale';

const slides = [
  {
    key: 'slide1',
    image: require('../assets/images/banner-desert.jpg'),
    titleKey: 'welcome1Title',
    descKey: 'welcome1Desc',
  },
  {
    key: 'slide2',
    image: require('../assets/images/banner-beach.jpg'),
    titleKey: 'welcome2Title',
    descKey: 'welcome2Desc',
  },
  {
    key: 'slide3',
    image: require('../assets/images/texture-night.jpg'),
    titleKey: 'welcome3Title',
    descKey: 'welcome3Desc',
  }
];

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useScreenInsets();
  const { isRTL } = useI18n();
  // Reactive dimensions: a module-scope Dimensions.get would go stale on
  // resize/rotation, making scrollTo target wrong offsets (carousel then
  // snaps back and appears stuck).
  const { width, height } = useWindowDimensions();
  
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  // The real scroll offset is the single source of truth for which page
  // we're on — no optimistic state, no busy flags, no timers (those raced
  // each other on react-native-web where momentum events never fire).
  const scrollPos = useRef(0);
  const finishing = useRef(false);

  useEffect(() => {
    const id = scrollX.addListener(({ value }) => {
      scrollPos.current = value;
    });
    return () => scrollX.removeListener(id);
  }, [scrollX]);

  // Keep the current slide aligned if the viewport size changes
  // (resize/rotation would otherwise leave the pager between pages).
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ x: currentIndex * width, animated: false });
    // Intentionally width-only: runs on the re-render caused by the resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  // Drives the dots (via scrollX) and keeps the button label in sync.
  // onScroll fires on every platform, including during animated scrollTo
  // and manual swipes (unlike onMomentumScrollEnd, absent on web).
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (e: any) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / width);
        if (idx >= 0 && idx < slides.length) {
          setCurrentIndex(prev => (prev === idx ? prev : idx));
        }
      },
    }
  );

  const finishOnboarding = async () => {
    if (finishing.current) return; // ignore double-taps on Get Started
    finishing.current = true;
    try {
      await AsyncStorage.setItem('@mukhymat_onboarded', 'true');
    } catch (e) {}
    router.replace('/(tabs)');
  };

  const nextSlide = () => {
    // Read the page from the actual scroll offset at press time. Taps that
    // land mid-transition just re-target the next page (idempotent), so
    // rapid taps can neither skip pages nor deadlock the button.
    const lastIndex = slides.length - 1;
    const page = scrollPos.current / width;
    // Finish only when actually settled on the final slide (small tolerance
    // for sub-pixel offsets) — never from a rounded in-flight position.
    if (page >= lastIndex - 0.02) {
      finishOnboarding();
      return;
    }
    const pageAtPress = Math.max(0, Math.round(page));
    scrollViewRef.current?.scrollTo({
      x: Math.min(pageAtPress + 1, lastIndex) * width,
      animated: true,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={StyleSheet.absoluteFill}
      >
        {slides.map((slide, i) => {
          return (
            <View key={slide.key} style={[styles.slide, { width, height }]}>
              <ImageBackground source={slide.image} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.8 }} />
              <LinearGradient 
                colors={['transparent', colors.background, colors.background]} 
                locations={[0, 0.6, 1]}
                style={StyleSheet.absoluteFill} 
              />
              <View style={[styles.content, { paddingBottom: insets.bottom + 120, paddingHorizontal: 24 }]}>
                <AppText variant="h1" color={colors.foreground} align="center" style={{ marginBottom: 16 }}>
                  {t(slide.titleKey as any)}
                </AppText>
                <AppText variant="bodyLg" color={colors.mutedForeground} align="center" style={{ lineHeight: 28, paddingHorizontal: 16 }}>
                  {t(slide.descKey as any)}
                </AppText>
              </View>
            </View>
          );
        })}
      </Animated.ScrollView>

      <View style={[styles.overlay, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.pagination}>
          {slides.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View 
                key={i} 
                style={[styles.dot, { width: dotWidth, opacity, backgroundColor: colors.primary }]} 
              />
            );
          })}
        </View>
        <View style={[styles.actions, isRTL ? styles.rtlRow : null]}>
          <TouchableOpacity onPress={finishOnboarding} style={styles.skipBtn}>
            <AppText variant="label" color={colors.mutedForeground}>{t('browseAsGuest', 'Browse without signing up')}</AppText>
          </TouchableOpacity>
          <PressableScale onPress={nextSlide} style={[styles.nextBtn, { backgroundColor: colors.primary }]}>
            <AppText variant="label" color={colors.primaryForeground} weight="bold">
              {currentIndex === slides.length - 1 ? t('getStarted') : t('continue')}
            </AppText>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: { justifyContent: 'flex-end', alignItems: 'center' },
  content: { width: '100%', alignItems: 'center' },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 24 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rtlRow: { flexDirection: 'row-reverse' },
  skipBtn: { paddingVertical: 16, paddingHorizontal: 8 },
  nextBtn: { paddingVertical: 16, paddingHorizontal: 32, borderRadius: 24 },
});