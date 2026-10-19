import { auth } from './firebase';

const endpoint = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/sahra`;

async function request<T>(path: string, method = 'GET', body?: Record<string, unknown>): Promise<T> {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error('You must be signed in as an administrator');
  const response = await fetch(`${endpoint}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) throw new Error(data?.error || `Request failed (${response.status})`);
  return data as T;
}

export type AdminRefund = Record<string, unknown> & { id: string };
export type AdminDispute = Record<string, unknown> & { id: string };
export const listAdminRefunds = () => request<{ refunds: AdminRefund[] }>('/admin/refunds');
export const updateAdminRefund = (id: string, body: {
  status: 'pending' | 'processing' | 'refunded' | 'failed' | 'failed_will_retry' | 'not_applicable';
  adminNotes?: string;
  manualSettlementConfirmed?: boolean;
}) => request<{ refundStatus?: string }>('/admin/refunds/' + encodeURIComponent(id) + '/status', 'POST', body);
export const listAdminDisputes = () => request<{ disputes: AdminDispute[] }>('/admin/disputes');
export const resolveAdminDispute = (id: string, adminNote?: string) =>
  request<void>('/admin/disputes/' + encodeURIComponent(id) + '/resolve', 'POST', adminNote ? { adminNote } : {});