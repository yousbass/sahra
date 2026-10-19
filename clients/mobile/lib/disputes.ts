import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from './firebase';

export type DisputeType =
  | 'not_as_described'
  | 'missing_amenity'
  | 'safety_concern'
  | 'other';

const MAX_SIZE = 10 * 1024 * 1024; // storage rules cap images at 10MB

/**
 * Upload an optional dispute evidence photo to the caller's own storage
 * folder (users/{uid}/...) — the only path the live storage rules allow the
 * user to write to. Returns the public download URL.
 */
export async function uploadDisputePhoto(localUri: string, userId: string): Promise<string> {
  if (!storage) throw new Error('Firebase Storage is not initialized');

  const res = await fetch(localUri);
  const blob = await res.blob();
  if (blob.size > MAX_SIZE) {
    throw new Error('image-too-large');
  }
  const contentType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  const filename = `users/${userId}/dispute_${Date.now()}.jpg`;
  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, blob, { contentType });
  return getDownloadURL(storageRef);
}

export interface GuestDisputeStatus {
  id: string;
  bookingId: string;
  type: string;
  status: 'open' | 'resolved';
  createdAt?: string;
  resolvedAt?: string;
}

/**
 * Fetches the current user's own dispute reports via the authenticated
 * server endpoint so resolution status can be shown to the guest.
 * Returns an empty list on any failure — the notice is best-effort UI.
 */
export async function getMyDisputes(): Promise<GuestDisputeStatus[]> {
  try {
    const idToken = await auth?.currentUser?.getIdToken().catch(() => null) ?? null;
    if (!idToken) return [];
    const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/sahra/my-disputes`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success || !Array.isArray(data.disputes)) return [];
    return data.disputes.map((d: any): GuestDisputeStatus => ({
      id: String(d?.id ?? ''),
      bookingId: String(d?.bookingId ?? ''),
      type: String(d?.type ?? 'other'),
      status: d?.status === 'resolved' ? 'resolved' : 'open',
      createdAt: d?.createdAt != null ? String(d.createdAt) : undefined,
      resolvedAt: d?.resolvedAt != null ? String(d.resolvedAt) : undefined,
    }));
  } catch {
    return [];
  }
}

export interface SubmitDisputeResult {
  ok: boolean;
  disputeId?: string;
  error?: string;
}

/**
 * Files a structured "report an issue" dispute against a past booking via
 * the authenticated server endpoint. The server verifies booking ownership
 * and writes the dispute document — the client never touches the
 * `disputes` collection directly.
 */
export async function submitDispute(params: {
  bookingId: string;
  type: DisputeType;
  description: string;
  photoUrl?: string;
}): Promise<SubmitDisputeResult> {
  try {
    const idToken = await auth?.currentUser?.getIdToken().catch(() => null) ?? null;
    if (!idToken) return { ok: false, error: 'not_authenticated' };

    const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/sahra/dispute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        bookingId: params.bookingId,
        type: params.type,
        description: params.description.slice(0, 1000),
        ...(params.photoUrl ? { photoUrl: params.photoUrl } : {}),
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }
    return { ok: true, disputeId: data.disputeId ? String(data.disputeId) : undefined };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'network_error' };
  }
}
