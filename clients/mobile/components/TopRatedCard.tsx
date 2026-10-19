import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { Camp } from '@/lib/firestore';
import { getLocationLabel } from '@/lib/locations';
import { getReviewSnippet } from '@/lib/reviewSnippet';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

const desertBanner = require('../assets/images/banner-desert.jpg');
const beachBanner = require('../assets/images/banner-beach.jpg');

export function TopRatedCard({ item, style }: { item: Camp, style?: any }) {
  const colors = useColors();
  const { isRTL } = useI18n();

  const reviewSnippet = (item.reviews ?? 0) > 0 ? getReviewSnippet(item.latestReviewText) : null;

  const img = item.images && item.images.length > 0
    ? item.images[0]
    : (item.listingType === 'kashta' ? beachBanner : desertBanner);

  return (
    <PressableScale
      onPress={() => router.push(`/camp/${item.id}`)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}
    >
      <Image source={img} style={styles.image} contentFit="cover" transition={300} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.gradient} />
      
      <View style={styles.content}>
        <AppText variant="h3" color="#FFF" weight="bold" numberOfLines={1}>{item.title}</AppText>
        
        <View style={[styles.row, isRTL ? styles.rtlRow : null, { marginTop: 6, justifyContent: 'space-between' }]}>
          <View style={[styles.row, isRTL ? styles.rtlRow : null, { flex: 1, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }]}>
            <Ionicons name="location" size={12} color="#FFF" />
            <AppText variant="labelSm" color="rgba(255,255,255,0.8)" numberOfLines={1} style={{ marginHorizontal: 4 }}>
              {getLocationLabel(item.location) || item.location}
            </AppText>
          </View>
          
          <View style={[styles.ratingBadge, isRTL ? styles.rtlRow : null]}>
            <Ionicons name="star" size={12} color={colors.primary} />
            <AppText variant="labelSm" color="#FFF" weight="bold" style={{ marginHorizontal: 4 }}>
              {item.rating?.toFixed(1) || '5.0'}
            </AppText>
          </View>
        </View>

        {reviewSnippet !== null && (
          <AppText
            variant="labelSm"
            color="rgba(255,255,255,0.85)"
            numberOfLines={1}
            style={[styles.reviewSnippet, { textAlign: isRTL ? 'right' : 'left' }]}
          >
            “{reviewSnippet}”
          </AppText>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 260,
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 140,
  },
  content: {
    position: 'absolute',
    bottom: 16, left: 16, right: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  reviewSnippet: {
    marginTop: 6,
    fontStyle: 'italic',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  }
});
