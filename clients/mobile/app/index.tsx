import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColors';

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);
  const colors = useColors();

  useEffect(() => {
    // Dev/screenshot escape hatch (same param the splash uses): a fresh
    // browser has no onboarding flag, so ?skipSplash=1 also skips /welcome.
    if (
      __DEV__ &&
      typeof window !== 'undefined' &&
      window.location?.search?.includes('skipSplash=1')
    ) {
      setTarget('/(tabs)');
      return;
    }
    AsyncStorage.getItem('@mukhymat_onboarded')
      .then(seen => {
        setTarget(seen === 'true' ? '/(tabs)' : '/welcome');
      })
      .catch(() => {
        setTarget('/(tabs)');
      });
  }, []);

  if (!target) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return <Redirect href={target as any} />;
}