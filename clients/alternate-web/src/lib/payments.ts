import { auth } from '@/lib/firebase';

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
 * listener will surface it.
 */
export async function verifyBookingPayment(
  bookingId: string,
  tapChargeId: string,
): Promise<VerifyPaymentResult> {
  try {
    const idToken = await auth?.currentUser?.getIdToken().catch(() => null) ?? null;
    if (!idToken) return { checked: false, error: 'not_authenticated' };

    const configured = import.meta.env.VITE_API_URL?.trim();
    const useExternal =
      configured &&
      (configured.includes('localhost') ||
        configured.includes('127.0.0.1') ||
        import.meta.env.VITE_API_URL_FORCE === 'true');
    const apiBase = useExternal ? configured : '';

    const url =
      `${apiBase}/api/payments/verify` +
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
  } catch (e: unknown) {
    return { checked: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export interface PaymentSessionRequest {
  amount: number;
  currency: string;
  bookingId: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  redirectUrl?: string;
}

export interface PaymentSessionResponse {
  success: boolean;
  paymentUrl?: string;
  error?: string;
  /** 'already_paid' returned as 409 when the booking is already settled. */
  alreadyPaid?: boolean;
  /** 'booking_expired' returned as 410 when the payment window passed. */
  expired?: boolean;
}

/**
 * Create (or reuse) a Tap payment session for the given booking.
 * Automatically attaches the current user's Firebase ID token so the server
 * can validate ownership, derive the booking state, and persist the charge ID
 * idempotently without trusting client-supplied amounts.
 */
export async function createPaymentSession(
  payload: PaymentSessionRequest,
): Promise<PaymentSessionResponse> {
  try {
    // Attach caller's ID token — required for server-side ownership validation
    // and idempotent charge handling.
    const idToken = await auth?.currentUser?.getIdToken().catch(() => null) ?? null;
    if (!idToken) {
      return { success: false, error: 'Not authenticated' };
    }

    const configured = import.meta.env.VITE_API_URL?.trim();
    const useExternal =
      configured &&
      (configured.includes('localhost') ||
        configured.includes('127.0.0.1') ||
        import.meta.env.VITE_API_URL_FORCE === 'true');

    const apiBase = useExternal ? configured : '';

    const res = await fetch(`${apiBase}/api/payments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 409) {
      return { success: false, error: 'already_paid', alreadyPaid: true };
    }
    if (res.status === 410) {
      return { success: false, error: 'booking_expired', expired: true };
    }

    const data = await res.json();
    return data as PaymentSessionResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create payment session';
    return { success: false, error: message };
  }
}
