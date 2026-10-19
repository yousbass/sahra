import { useI18nContext as useI18n } from '@/contexts/I18nContext';

export const typography = {
  latin: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semibold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
  },
  arabic: {
    regular: 'Cairo_400Regular',
    medium: 'Cairo_500Medium',
    semibold: 'Cairo_600SemiBold',
    bold: 'Cairo_700Bold',
  },
};

export function useTypography() {
  const { isRTL } = useI18n();
  const family = isRTL ? typography.arabic : typography.latin;

  return {
    h1: { fontFamily: family.bold, fontSize: 32, lineHeight: 40 },
    h2: { fontFamily: family.bold, fontSize: 24, lineHeight: 32 },
    h3: { fontFamily: family.semibold, fontSize: 20, lineHeight: 28 },
    bodyLg: { fontFamily: family.regular, fontSize: 18, lineHeight: 28 },
    body: { fontFamily: family.regular, fontSize: 16, lineHeight: 24 },
    bodySm: { fontFamily: family.regular, fontSize: 14, lineHeight: 20 },
    label: { fontFamily: family.medium, fontSize: 14, lineHeight: 20 },
    labelSm: { fontFamily: family.medium, fontSize: 12, lineHeight: 16 },
    fontFamily: family,
  };
}
