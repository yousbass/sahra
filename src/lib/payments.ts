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
}

export async function createPaymentSession(
  payload: PaymentSessionRequest
): Promise<PaymentSessionResponse> {
  try {
    const configured = import.meta.env.VITE_API_URL?.trim();
    const useExternal =
      configured &&
      (configured.includes('localhost') ||
        configured.includes('127.0.0.1') ||
        import.meta.env.VITE_API_URL_FORCE === 'true');

    const apiBase = useExternal ? configured : '';

    const res = await fetch(`${apiBase}/api/payments/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data as PaymentSessionResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create payment session';
    return { success: false, error: message };
  }
}
