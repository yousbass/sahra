import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { AppText } from './AppText';
import { formatPrice } from '@/lib/priceCalculations';
import { useTranslation } from 'react-i18next';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';

interface PricePillProps {
  price: number;
  currency?: string;
  isPerDay?: boolean;
  /** Prefixes a translated "from" when the camp has peak-night pricing. */
  isFrom?: boolean;
  style?: any;
}

export function PricePill({ price, currency = 'BHD', isPerDay = true, isFrom = false, style }: PricePillProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const { isRTL } = useI18n();

  return (
    <View style={[
      styles.container, 
      { backgroundColor: colors.background, borderColor: colors.border },
      isRTL && styles.rtlContainer,
      style
    ]}>
      {isFrom && (
        <AppText variant="labelSm" color={colors.mutedForeground}>
          {t('priceFrom')}
        </AppText>
      )}
      <AppText variant="label" weight="bold" color={colors.foreground}>
        {formatPrice(price, currency)}
      </AppText>
      {isPerDay && (
        <AppText variant="labelSm" color={colors.mutedForeground}>
          / {t('pricePerDay')}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  rtlContainer: {
    flexDirection: 'row-reverse',
  }
});
