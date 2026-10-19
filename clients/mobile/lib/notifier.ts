import { Alert, Platform } from 'react-native';

// In-app designed notifications. The NotifierHost component (mounted in the
// root layout) registers itself here; until it does, we fall back to the old
// system dialogs so no message is ever silently lost.

export type ToastKind = 'info' | 'success' | 'error';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

export interface NotifierHandlers {
  showToast: (title: string, message: string | undefined, kind: ToastKind) => void;
  showConfirm: (opts: ConfirmOptions) => Promise<boolean>;
}

let handlers: NotifierHandlers | null = null;

export function registerNotifier(h: NotifierHandlers): void {
  handlers = h;
}

export function unregisterNotifier(h: NotifierHandlers): void {
  if (handlers === h) handlers = null;
}

export function showToast(title: string, message?: string, kind: ToastKind = 'info'): void {
  if (handlers) {
    handlers.showToast(title, message, kind);
    return;
  }
  // Fallback: host not mounted (e.g. during splash)
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

export function showConfirm(opts: ConfirmOptions): Promise<boolean> {
  if (handlers) return handlers.showConfirm(opts);
  // Fallback: host not mounted
  if (Platform.OS === 'web') {
    return Promise.resolve(
      typeof window !== 'undefined' && window.confirm(`${opts.title}\n\n${opts.message}`)
    );
  }
  return new Promise(resolve => {
    Alert.alert(opts.title, opts.message, [
      { text: opts.cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: opts.confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
