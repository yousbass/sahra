import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';
import { CampfireLoader } from '@/components/CampfireLoader';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { AppText } from '@/components/AppText';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const colors = useColors();
  const { t } = useTranslation();
  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><CampfireLoader size="lg" /></View>;
  if (!user || !userData?.isAdmin) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="shield-outline"
          title={t('adminAccessDenied', { defaultValue: 'Admin access required' })}
          description={t('adminAccessDeniedDesc', { defaultValue: 'This area is only available to authorized administrators.' })}
          action={<PressableScale onPress={() => router.replace('/(tabs)/profile')} style={[styles.button, { backgroundColor: colors.primary }]}><AppText variant="label" color={colors.primaryForeground}>{t('adminBackToProfile', { defaultValue: 'Back to profile' })}</AppText></PressableScale>}
        />
      </View>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  button: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
});