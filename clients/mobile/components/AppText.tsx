import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { useTypography } from '@/lib/typography';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';

export interface AppTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'bodyLg' | 'body' | 'bodySm' | 'label' | 'labelSm';
  color?: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function AppText({
  variant = 'body',
  color,
  weight,
  align,
  style,
  children,
  ...props
}: AppTextProps) {
  const typo = useTypography();
  const colors = useColors();
  const { isRTL } = useI18n();

  const variantStyle = typo[variant];
  
  // Apply weight override if specified
  let fontFamily = variantStyle.fontFamily;
  if (weight) {
    fontFamily = typo.fontFamily[weight];
  }

  // Handle default text alignment based on RTL
  const defaultAlign = isRTL ? 'right' : 'left';
  const textAlign = align || defaultAlign;

  return (
    <Text
      style={[
        {
          fontFamily,
          fontSize: variantStyle.fontSize,
          lineHeight: variantStyle.lineHeight,
          color: color || colors.text,
          textAlign,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}
