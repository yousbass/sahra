import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { AppText } from './AppText';

interface RatingPillProps {
  rating: number;
  reviews?: number;
  size?: 'small' | 'large';
  style?: any;
}

export function RatingPill({ rating, reviews, size = 'small', style }: RatingPillProps) {
  const colors = useColors();
  const isLarge = size === 'large';

  return (
    <View style={[
      styles.container,
      { backgroundColor: colors.background, borderColor: colors.border },
      isLarge && styles.containerLarge,
      style
    ]}>
      <Ionicons name="star" size={isLarge ? 16 : 12} color={colors.primary} />
      <AppText variant={isLarge ? 'label' : 'labelSm'} weight="bold" style={styles.text}>
        {(Number.isFinite(Number(rating)) ? Number(rating) : 0).toFixed(1)}
      </AppText>
      {reviews !== undefined && (
        <AppText variant={isLarge ? 'bodySm' : 'labelSm'} color={colors.mutedForeground} style={styles.reviews}>
          ({reviews})
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  containerLarge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  text: {
    lineHeight: 0,
  },
  reviews: {
    marginLeft: 2,
  }
});
