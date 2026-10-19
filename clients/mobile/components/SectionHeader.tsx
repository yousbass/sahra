import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { AppText } from './AppText';

interface SectionHeaderProps {
  title: string;
  actionText?: string;
  onAction?: () => void;
  style?: any;
}

export function SectionHeader({ title, actionText, onAction, style }: SectionHeaderProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const { isRTL } = useI18n();

  return (
    <View style={[styles.container, isRTL && styles.rtlContainer, style]}>
      <AppText variant="h3">{title}</AppText>
      {onAction && (
        <Pressable onPress={onAction} style={styles.actionButton}>
          <AppText variant="label" color={colors.primary}>
            {actionText || t('seeAll')}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  rtlContainer: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    padding: 4,
  },
});
