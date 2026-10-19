import { Alert, Platform } from 'react-native';
import { showToast, showConfirm, ToastKind } from './notifier';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Designed in-app notifications (toast card + styled confirm dialog) rendered
// by NotifierHost; falls back to system dialogs only if the host isn't mounted.
export function notify(title: string, message?: string, kind: ToastKind = 'info') {
  showToast(title, message, kind);
}

export function confirmDialog(opts: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}): Promise<boolean> {
  return showConfirm(opts);
}

export interface StartPaymentOptions {
  bookingId: string;
  amount: number;
  customerName: string;
  customerEmail?: string;
}

export interface StartPaymentResult {
  started: boolean;
  error?: string;
  // 'already_settled' = booking is paid/refunded/cancelled/confirmed — do NOT charge again.
  // 'expired'         = booking passed its 30-min payment window; guest cancelled own slot.
  reason?: 'already_settled' | 'not_found' | 'start_failed' | 'expired';
}

export interface VerifyPaymentResult {
  /** true when the server was reached and answered authoritatively */
  checked: boolean;
  /** true when the booking is settled (paid/confirmed) server-side */
  settled?: boolean;
  /** raw Tap charge status (e.g. CAPTURED, INITIATED) when available */
  status?: string;
  error?: string;
}

/**
 * Re-checks a pending online booking's payment against the authenticated
 * server verify endpoint using its stored Tap charge ID. Read-only: this
 * NEVER writes to Firestore and NEVER cancels a booking — when the charge
 * is settled, the webhook has already updated the booking and the realtime
 * listener will surface it. Used on app resume, bookings-screen open, and
 * the manual per-booking "verify payment" action.
 */
export async function verifyBookingPayment(
  bookingId: string,
  tapChargeId: string,
): Promise<VerifyPaymentResult> {
  try {
    const idToken = await auth?.currentUser?.getIdToken().catch(() => null) ?? null;
    if (!idToken) return { checked: false, error: 'not_authenticated' };
    const url =
      `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/payments/verify` +
      `?tap_id=${encodeURIComponent(tapChargeId)}&bookingId=${encodeURIComponent(bookingId)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { checked: false, error: data?.error || `HTTP ${res.status}` };
    }
    return {
      checked: true,
      settled: !!data.verified,
      status: data.status ? String(data.status) : undefined,
    };
  } catch (e: any) {
    return { checked: false, error: e?.message };
  }
}

// Starts a Tap payment session for an existing booking and routes to
// /payment-result with the outcome. Mirrors the web app's payment contract:
// this NEVER cancels a booking — failure paths land on /payment-result which
// marks paymentStatus 'failed' while keeping status 'pending'.
export async function startTapPayment({
  bookingId,
  amount,
  customerName,
  customerEmail,
}: StartPaymentOptions): Promise<StartPaymentResult> {
  try {
    // Double-charge guard: re-read the booking fresh before creating a Tap
    // session. A stale card (shows pending/failed while the backend already
    // moved to paid) must never trigger a second real charge.
    if (!db) return { started: false, reason: 'start_failed' };
    const snap = await getDoc(doc(db, 'bookings', bookingId));
    if (!snap.exists()) return { started: false, reason: 'not_found' };
    const b = snap.data() as Record<string, any>;
    if (
      ['paid', 'refunded'].includes(String(b.paymentStatus)) ||
      ['cancelled', 'confirmed'].includes(String(b.status))
    ) {
      return { started: false, reason: 'already_settled' };
    }

    // Expired payment window: surface 'expired' so the UI shows the truthful
    // state, but NEVER cancel from the client — the server/webhook owns
    // booking state transitions. The /payments/create server route enforces
    // expiry at the payment layer too (returns 410) as a second guard, so no
    // charge can be created for an expired booking either way.
    if (
      b.status === 'pending' &&
      typeof b.expiresAt === 'number' &&
      b.expiresAt < Date.now()
    ) {
      return { started: false, reason: 'expired' };
    }

    // Attach the caller's ID token. The server uses it to:
    //  • Verify booking ownership via Firestore rules
    //  • Check for an existing INITIATED charge (reuse URL instead of new charge)
    //  • Detect CAPTURED/AUTHORIZED charges (return 409 instead of new charge)
    //  • Persist the new charge ID back to the booking (awaited before URL return)
    const idToken = await auth?.currentUser?.getIdToken().catch(() => null) ?? null;

    // NOTE: do NOT add bookingId here — /api/payments/create appends
    // bookingId to the redirect URL itself; adding it client-side would
    // produce duplicate params and break the /payment-result verify match.
    const redirectUrl = Linking.createURL('payment-result');
    const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/payments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({
        bookingId,
        customer: {
          name: customerName,
          email: customerEmail,
        },
        redirectUrl,
        platform: "native",
      }),
    });

    // Handle authoritative server responses before parsing body.
    if (res.status === 409) {
      // Server confirmed this booking is already paid — treat as settled.
      return { started: false, reason: 'already_settled' };
    }
    if (res.status === 410) {
      // Server confirmed the booking window has expired.
      return { started: false, reason: 'expired' };
    }

    const data = await res.json();

    if (!data.success || !data.paymentUrl) {
      return { started: false, error: data?.error, reason: 'start_failed' };
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Mobile in-app browsers block popups, so never use a popup on web:
      // navigate this tab to Tap. Tap redirects back to
      // /payment-result?bookingId=...&tap_id=... where verification runs.
      // Inside an embedded iframe (e.g. the Replit preview pane) Tap's
      // checkout refuses to run ("Feature-Policy: payment"), so break out
      // to the top-level window when framed.
      try {
        if (window.top && window.top !== window.self) {
          window.top.location.href = data.paymentUrl;
          return { started: true };
        }
      } catch {
        // Sandboxed frame refused top navigation — fall back to this frame.
      }
      window.location.assign(data.paymentUrl);
      return { started: true };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.paymentUrl, redirectUrl);

    if (result.type === 'success' && result.url) {
      const parsed = Linking.parse(result.url);
      const tapId = parsed.queryParams?.tap_id;
      if (tapId) {
        router.replace({ pathname: '/payment-result', params: { bookingId, tap_id: String(tapId) } });
      } else {
        router.replace({ pathname: '/payment-result', params: { bookingId, error: 'missing_id' } });
      }
    } else {
      router.replace({ pathname: '/payment-result', params: { bookingId, error: 'cancelled' } });
    }
    return { started: true };
  } catch (e: any) {
    return { started: false, error: e?.message, reason: 'start_failed' };
  }
}
