import React from 'react';
import { ApplicationSection } from './ApplicationSection';

export type HostApplicationsSectionProps = { onChanged?: () => void };
export function HostApplicationsSection({ onChanged }: HostApplicationsSectionProps) {
  return <ApplicationSection kind="host" onChanged={onChanged} />;
}