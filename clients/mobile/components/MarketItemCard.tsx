import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { MarketItem } from '@/lib/marketplace';

/** Grid card for marketplace items (hub + category pages). */
export function MarketItemCard({ item, onPress }: { item: MarketItem; onPress: (item: MarketItem) => void }) {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const { isRTL } = useI18n();
  const isAr = (i18n.language || 'en').startsWith('ar');

  return (
    <PressableScale
      testID={`market-item-${item.id}`}
      onPress={() => onPress(item)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.cardImageWrap}>
        <Image source={item.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        <LinearGradient colors={['transparent', 'rgba(10,17,40,0.30)']} style={StyleSheet.absoluteFill} />
        <View style={[styles.soonBadge, isRTL ? styles.soonBadgeRtl : null]}>
          <AppText variant="labelSm" color="#FFF" weight="semibold" style={{ fontSize: 12 }}>{t('comingSoon')}</AppText>
        </View>
      </View>
      <View style={{ padding: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
        <AppText variant="label" weight="semibold" numberOfLines={1}>{isAr ? item.nameAr : item.nameEn}</AppText>
        <View style={[styles.priceRow, isRTL ? styles.rtlRow : null]}>
          <AppText variant="label" weight="bold" color={colors.primary} style={{ fontVariant: ['tabular-nums'] }}>
            {item.price} {isAr ? 'د.ب' : 'BD'}
          </AppText>
          <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginHorizontal: 4 }} numberOfLines={1}>
            / {isAr ? item.unitAr : item.unitEn}
          </AppText>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  rtlRow: { flexDirection: 'row-reverse' },
  card: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImageWrap: {
    height: 118,
    overflow: 'hidden',
  },
  soonBadge: {
    position: 'absolute',
    top: 8, right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(10,17,40,0.55)',
  },
  soonBadgeRtl: {
    right: undefined,
    left: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
});
