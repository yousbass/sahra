import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

/**
 * Checks the current foreground location permission without automatically
 * prompting. Call `request()` when the user explicitly taps "Enable location".
 */
export function useMapPermission() {
  const [status, setStatus] = useState<PermissionStatus>('undetermined');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setStatus('denied');
      setChecking(false);
      return;
    }
    (async () => {
      try {
        const { status: s } = await Location.getForegroundPermissionsAsync();
        setStatus(s === 'granted' ? 'granted' : s === 'denied' ? 'denied' : 'undetermined');
      } catch {
        setStatus('undetermined');
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const request = async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    try {
      const { status: s } = await Location.requestForegroundPermissionsAsync();
      const granted = s === 'granted';
      setStatus(granted ? 'granted' : 'denied');
      return granted;
    } catch {
      setStatus('denied');
      return false;
    }
  };

  return { status, checking, request };
}
