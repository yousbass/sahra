import React from 'react';
import { ApplicationSection } from './ApplicationSection';

export type SellerApplicationsSectionProps = { onChanged?: () => void };
export function SellerApplicationsSection({ onChanged }: SellerApplicationsSectionProps) {
  return <ApplicationSection kind="seller" onChanged={onChanged} />;
}