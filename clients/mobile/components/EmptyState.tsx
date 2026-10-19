import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { AppText } from './AppText';
import { PatternDunes } from './BackgroundPatterns';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = 'moon', title, description, action }: EmptyStateProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <PatternDunes color={colors.foreground} opacity={0.05} />
      <View style={[styles.iconWrapper, { backgroundColor: colors.secondary }]}>
        <Ionicons name={icon} size={48} color={colors.primary} />
      </View>
      <AppText variant="h3" align="center" style={styles.title}>
        {title}
      </AppText>
      {description && (
        <AppText variant="body" align="center" color={colors.mutedForeground} style={styles.description}>
          {description}
        </AppText>
      )}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    overflow: 'hidden',
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 24,
  },
  action: {
    marginTop: 8,
  }
});
