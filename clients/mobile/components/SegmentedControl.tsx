import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface SegmentedControlProps {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function SegmentedControl({ values, selectedIndex, onChange }: SegmentedControlProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
      {values.map((val, i) => {
        const isSelected = i === selectedIndex;
        return (
          <TouchableOpacity
            key={i}
            activeOpacity={0.8}
            onPress={() => onChange(i)}
            style={[
              styles.segment,
              { borderRadius: colors.radius - 2 },
              isSelected && { backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
            ]}
          >
            <Text
              style={[
                styles.text,
                { color: isSelected ? colors.foreground : colors.mutedForeground, fontWeight: isSelected ? '600' : '500' }
              ]}
            >
              {val}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 2,
    height: 40,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
  }
});
