import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { router, type Href } from 'expo-router';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { EmptyState } from '@/components/EmptyState';
import { CampfireLoader } from '@/components/CampfireLoader';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { goBack } from '@/lib/nav';

/** Shared header for host screens: back button + centered title + right slot. */
export function HostHeader({
  title,
  fallback = '/host',
  right,
}: {
  title: string;
  fallback?: Href;
  right?: React.ReactNode;
}) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const insets = useScreenInsets();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 8,
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
        isRTL ? styles.rtlRow : null,
      ]}
    >
      <PressableScale
        onPress={() => goBack(fallback)}
        style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Ionicons
          name={isRTL ? 'arrow-forward' : 'arrow-back'}
          size={20}
          color={colors.foreground}
        />
      </PressableScale>
      <AppText variant="h3" align="center" numberOfLines={1} style={styles.headerTitle}>
        {title}
      </AppText>
      <View style={styles.rightSlot}>{right ? right : null}</View>
    </View>
  );
}

/**
 * Client-side host gating, same rule as the web (users.isHost). Renders
 * loading / sign-in / not-a-host states instead of the children.
 */
export function HostGate({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const colors = useColors();
  const { t } = useTranslation();

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <CampfireLoader size="lg" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="lock-closed-outline"
          title={t('signIn')}
          description={t('hostSignInDesc')}
          action={
            <PressableScale
              onPress={() => router.push('/auth')}
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            >
              <AppText variant="label" color={colors.primaryForeground} weight="bold">
                {t('signIn')}
              </AppText>
            </PressableScale>
          }
        />
      </View>
    );
  }

  if (!userData?.isHost) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="key-outline"
          title={t('hostOnlyTitle')}
          description={t('hostOnlyDesc')}
          action={
            <PressableScale
              onPress={() => goBack('/(tabs)/profile')}
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            >
              <AppText variant="label" color={colors.primaryForeground} weight="bold">
                {t('hostGoToProfile')}
              </AppText>
            </PressableScale>
          }
        />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
  },
  rightSlot: {
    width: 40,
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  actionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
