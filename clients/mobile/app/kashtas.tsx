import React from 'react';
import { useColors } from '@/hooks/useColors';
import { StaysSection } from '@/components/StaysSection';

const beachBanner = require('../assets/images/banner-beach.jpg');

/** Beach Kashtas section — Gulf teal, shoreline and the day jalsa. */
export default function KashtasScreen() {
  const colors = useColors();
  return (
    <StaysSection
      listingType="kashta"
      banner={beachBanner}
      icon="water"
      accent={colors.kashta}
      titleKey="beachSpots"
      taglineKey="kashtasTagline"
      emptyIcon="water-outline"
      testPrefix="kashtas"
    />
  );
}
