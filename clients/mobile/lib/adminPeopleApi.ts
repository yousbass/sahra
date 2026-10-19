import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export type AdminUser = {
  id: string;
  displayName?: string;
  email?: string;
  phone?: string;
  status?: string;
  isAdmin?: boolean;
  isHost?: boolean;
  isSeller?: boolean;
  createdAt?: unknown;
};

export type AdminApplication = Record<string, any> & {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
};

async function adminRequest(path: string, body: Record<string, unknown>) {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error('You must be signed in as an administrator');
  const response = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/sahra${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) throw new Error(data?.error || 'Request failed');
  return data;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  if (!db) throw new Error('Firestore is not initialized');
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as AdminUser);
}

export async function updateAdminUserStatus(userId: string, status: 'active' | 'suspended') {
  if (!db) throw new Error('Firestore is not initialized');
  await updateDoc(doc(db, 'users', userId), { status });
}

export async function getAdminApplications(kind: 'host' | 'seller'): Promise<AdminApplication[]> {
  if (!db) throw new Error('Firestore is not initialized');
  const snapshot = await getDocs(collection(db, kind === 'host' ? 'hostApplications' : 'sellerApplications'));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as AdminApplication);
}

/** The server performs the role grant and application decision atomically. */
export async function decideAdminApplication(
  kind: 'host' | 'seller',
  applicationId: string,
  decision: 'approved' | 'rejected',
  rejectionReason?: string,
) {
  return adminRequest(`/admin/applications/${kind}/${applicationId}/decision`, {
    decision,
    ...(rejectionReason ? { rejectionReason } : {}),
  });
}