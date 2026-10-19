import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';

interface ButtonProps {
  title?: string;
  onPress: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: any;
}

export function Button({ title, onPress, variant = 'default', size = 'md', icon, loading, disabled, style }: ButtonProps) {
  const colors = useColors();
  
  let bg = colors.primary;
  let textCol = colors.primaryForeground;
  let border = 'transparent';

  if (variant === 'outline') {
    bg = 'transparent';
    textCol = colors.foreground;
    border = colors.border;
  } else if (variant === 'ghost') {
    bg = 'transparent';
    textCol = colors.foreground;
  } else if (variant === 'destructive') {
    bg = colors.destructive;
    textCol = colors.destructiveForeground;
  }

  if (disabled) {
    bg = variant === 'default' ? colors.muted : 'transparent';
    textCol = colors.mutedForeground;
    border = variant === 'outline' ? colors.muted : 'transparent';
  }

  const h = size === 'sm' ? 36 : size === 'lg' ? 56 : size === 'icon' ? 44 : 44;
  const px = size === 'icon' ? 0 : size === 'sm' ? 12 : size === 'lg' ? 24 : 16;
  const w = size === 'icon' ? 44 : undefined;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: bg, borderColor: border, borderWidth: variant === 'outline' ? 1 : 0, borderRadius: colors.radius, height: h, paddingHorizontal: px, width: w },
        // Lantern glow: soft amber halo on primary CTAs (Camp Glow identity)
        variant === 'default' && !disabled ? {
          shadowColor: colors.primary,
          shadowOpacity: 0.35,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
        } : null,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textCol} />
      ) : (
        <View style={styles.content}>
          {icon && <Ionicons name={icon} size={20} color={textCol} style={title ? { marginRight: 8 } : {}} />}
          {title && <Text style={[styles.title, { color: textCol }]}>{title}</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  }
});
