import React from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { goBack } from '@/lib/nav';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { AppText } from './AppText';
import { PatternSadu } from './BackgroundPatterns';

interface PageHeroProps {
  /** Banner image (Metro require or remote source) shown behind the night-indigo wash. */
  banner: any;
  /** Decorative section icon shown in the trailing badge. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Section accent color (amber for camps/market, Gulf teal for kashtas). */
  accent: string;
  title: string;
  tagline: string;
  /** Live result count shown in a pill next to the title. */
  count?: number;
  searchPlaceholder: string;
  query: string;
  onQueryChange: (v: string) => void;
  /** Prefix for testIDs: `${testPrefix}-back`, `${testPrefix}-search`, `${testPrefix}-search-clear`. */
  testPrefix: string;
  /** Where the back button lands when there is no history (fresh deep link). */
  backFallback?: string;
}

/** Shared night-indigo hero band for section pages: banner photo under the
 *  brand wash + sadu pattern, back button, title with live count, tagline,
 *  and an in-page search field. */
export function PageHero({
  banner, icon, accent, title, tagline, count,
  searchPlaceholder, query, onQueryChange, testPrefix, backFallback,
}: PageHeroProps) {
  const colors = useColors();
  const insets = useScreenInsets();
  const { isRTL } = useI18n();

  return (
    <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
      <ImageBackground source={banner} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.9 }} />
      <LinearGradient colors={['rgba(10,17,40,0.55)', 'rgba(10,17,40,0.94)']} style={StyleSheet.absoluteFill} />
      <PatternSadu color="#FDFBF7" opacity={0.07} />

      <View style={[styles.topRow, isRTL ? styles.rtlRow : null]}>
        <TouchableOpacity testID={`${testPrefix}-back`} onPress={() => (backFallback ? goBack(backFallback as never) : goBack())} style={styles.backBtn}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <View style={[styles.titleRow, isRTL ? styles.rtlRow : null]}>
            <AppText variant="h2" color="#FFF" weight="bold">{title}</AppText>
            {typeof count === 'number' ? (
              <View style={styles.countPill}>
                <AppText variant="labelSm" color="#FFF" weight="semibold">{count}</AppText>
              </View>
            ) : null}
          </View>
          <AppText variant="labelSm" color="rgba(255,255,255,0.65)" style={{ marginTop: 2 }} numberOfLines={1}>
            {tagline}
          </AppText>
        </View>
        <View style={styles.iconBadge}>
          <Ionicons name={icon} size={22} color={accent} />
        </View>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }, isRTL ? styles.rtlRow : null]}>
        <Ionicons name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          testID={`${testPrefix}-search`}
          style={[styles.searchInput, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={onQueryChange}
          returnKeyType="search"
        />
        {query !== '' ? (
          <TouchableOpacity testID={`${testPrefix}-search-clear`} onPress={() => onQueryChange('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rtlRow: { flexDirection: 'row-reverse' },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countPill: {
    marginHorizontal: 8,
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  iconBadge: {
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 15,
    paddingVertical: 0,
  },
});
