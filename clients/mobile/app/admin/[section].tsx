import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AdminScreen } from '@/components/admin/AdminScreen';

const sections = ['users', 'host-applications', 'seller-applications', 'camps', 'bookings', 'reviews', 'analytics', 'refunds', 'disputes', 'settings'] as const;
export default function AdminSection() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const safe = sections.includes(section as typeof sections[number]) ? section as typeof sections[number] : 'dashboard';
  return <AdminScreen section={safe} />;
}