import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Pressable, Modal } from 'react-native';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { AppText } from '@/components/AppText';
import {
  registerNotifier,
  unregisterNotifier,
  NotifierHandlers,
  ToastKind,
  ConfirmOptions,
} from '@/lib/notifier';

interface ToastState {
  id: number;
  title: string;
  message?: string;
  kind: ToastKind;
}

interface ConfirmState {
  opts: ConfirmOptions;
  resolve: (value: boolean) => void;
}

const AUTO_DISMISS_MS = 3500;
const AUTO_DISMISS_LONG_MS = 5000;

export function NotifierHost() {
  const colors = useColors();
  const insets = useScreenInsets();
  const { isRTL } = useI18n();

  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearTimer();
    Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setToast(null);
    });
  }, [anim, clearTimer]);

  const displayToast = useCallback(
    (title: string, message: string | undefined, kind: ToastKind) => {
      clearTimer();
      toastIdRef.current += 1;
      setToast({ id: toastIdRef.current, title, message, kind });
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 18,
        bounciness: 6,
      }).start();
      timerRef.current = setTimeout(
        hideToast,
        message ? AUTO_DISMISS_LONG_MS : AUTO_DISMISS_MS
      );
    },
    [anim, clearTimer, hideToast]
  );

  const displayConfirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      setConfirm(prev => {
        // If a confirm is somehow already open, treat it as cancelled.
        if (prev) prev.resolve(false);
        return { opts, resolve };
      });
    });
  }, []);

  // Keep a ref to the active confirm so unmount cleanup can settle it —
  // otherwise a caller awaiting confirmDialog() would hang forever.
  const confirmRef = useRef<ConfirmState | null>(null);
  useEffect(() => {
    confirmRef.current = confirm;
  }, [confirm]);

  useEffect(() => {
    const h: NotifierHandlers = {
      showToast: displayToast,
      showConfirm: displayConfirm,
    };
    registerNotifier(h);
    return () => {
      unregisterNotifier(h);
      clearTimer();
      if (confirmRef.current) {
        confirmRef.current.resolve(false);
        confirmRef.current = null;
      }
    };
  }, [displayToast, displayConfirm, clearTimer]);

  const answerConfirm = (value: boolean) => {
    setConfirm(prev => {
      if (prev) prev.resolve(value);
      return null;
    });
  };

  const kindStyles = (kind: ToastKind) => {
    if (kind === 'success') {
      return { bg: colors.kashta, icon: 'checkmark-circle' as const, tint: '#FFFFFF' };
    }
    if (kind === 'error') {
      return { bg: colors.destructive, icon: 'alert-circle' as const, tint: colors.destructiveForeground };
    }
    return { bg: colors.primary, icon: 'information-circle' as const, tint: colors.primaryForeground };
  };

  const k = toast ? kindStyles(toast.kind) : null;

  return (
    <>
      {/* Toast */}
      {toast && k ? (
        <View style={styles.toastOverlay} pointerEvents="box-none">
          <Animated.View
            style={{
              opacity: anim,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-24, 0],
                  }),
                },
              ],
              marginTop: insets.top + 12,
              width: '92%',
              maxWidth: 480,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={hideToast}
              style={[
                styles.toastCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                isRTL && styles.rtlRow,
              ]}
            >
              <View style={[styles.toastIconCircle, { backgroundColor: k.bg }]}>
                <Ionicons name={k.icon} size={22} color={k.tint} />
              </View>
              <View style={[styles.toastTextWrap, isRTL && { alignItems: 'flex-end' }]}>
                <AppText variant="label" weight="semibold" numberOfLines={2} style={isRTL ? styles.textRight : null}>
                  {toast.title}
                </AppText>
                {toast.message ? (
                  <AppText
                    variant="bodySm"
                    color={colors.mutedForeground}
                    numberOfLines={3}
                    style={[{ marginTop: 2 }, isRTL ? styles.textRight : null]}
                  >
                    {toast.message}
                  </AppText>
                ) : null}
              </View>
              <Ionicons name="close" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      ) : null}

      {/* Confirm dialog */}
      <Modal
        visible={confirm !== null}
        transparent
        animationType="fade"
        onRequestClose={() => answerConfirm(false)}
      >
        <View style={styles.confirmBackdropWrap}>
          <Pressable style={styles.confirmBackdrop} onPress={() => answerConfirm(false)} />
          <View style={[styles.confirmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AppText variant="h3" style={isRTL ? styles.textRight : null}>
              {confirm ? confirm.opts.title : ''}
            </AppText>
            <AppText
              variant="bodySm"
              color={colors.mutedForeground}
              style={[{ marginTop: 10, lineHeight: 20 }, isRTL ? styles.textRight : null]}
            >
              {confirm ? confirm.opts.message : ''}
            </AppText>
            <View style={[styles.confirmButtons, isRTL && styles.rtlRow]}>
              <TouchableOpacity
                onPress={() => answerConfirm(false)}
                style={[styles.confirmBtn, styles.confirmBtnOutline, { borderColor: colors.border }]}
              >
                <AppText variant="label" weight="semibold" numberOfLines={1}>
                  {confirm ? confirm.opts.cancelLabel : ''}
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => answerConfirm(true)}
                // Deeper red than the destructive token: white label text needs
                // >=4.5:1 contrast, which the token shades don't reach.
                style={[styles.confirmBtn, { backgroundColor: '#B93A36' }]}
              >
                <AppText variant="label" weight="semibold" numberOfLines={1} color="#FFFFFF">
                  {confirm ? confirm.opts.confirmLabel : ''}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  toastOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  rtlRow: { flexDirection: 'row-reverse' },
  textRight: { textAlign: 'right' },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
  toastIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastTextWrap: { flex: 1 },
  confirmBackdropWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 17, 40, 0.55)',
  },
  confirmCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  confirmBtnOutline: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
});
