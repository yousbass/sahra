import React from 'react';
import { useColors } from '@/hooks/useColors';
import { StaysSection } from '@/components/StaysSection';

const desertBanner = require('../assets/images/banner-desert.jpg');

/** Desert Camps section — amber, dunes and firelight. */
export default function CampsScreen() {
  const colors = useColors();
  return (
    <StaysSection
      listingType="camp"
      banner={desertBanner}
      icon="bonfire"
      accent={colors.primary}
      titleKey="desertCamps"
      taglineKey="campsTagline"
      emptyIcon="bonfire-outline"
      testPrefix="camps"
    />
  );
}
