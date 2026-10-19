import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { MarketCategory } from './marketplace';

/**
 * Seller application flow — mirrors the host application flow.
 * A signed-in user applies to sell products (food, firewood, gear) on the
 * MUKHYMAT marketplace. An admin reviews the application; approval flips
 * `isSeller` on the user profile (done by the caller, like isHost).
 */
export interface SellerApplication {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  phoneNumber: string;
  businessNameEn: string;
  businessNameAr: string;
  categories: MarketCategory[];
  crNumber: string;
  description: string;
  phoneVerified: boolean;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string | Timestamp;
  reviewedAt?: string | Timestamp;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface NewSellerApplicationInput {
  userId: string;
  userEmail: string;
  userName: string;
  phoneNumber: string;
  businessNameEn: string;
  businessNameAr: string;
  categories: MarketCategory[];
  crNumber: string;
  description: string;
}

const COLLECTION = 'sellerApplications';

const mapDoc = (id: string, data: Record<string, unknown>): SellerApplication => ({
  id,
  userId: (data.userId as string) || '',
  userEmail: (data.userEmail as string) || '',
  userName: (data.userName as string) || '',
  phoneNumber: (data.phoneNumber as string) || '',
  businessNameEn: (data.businessNameEn as string) || '',
  businessNameAr: (data.businessNameAr as string) || '',
  categories: Array.isArray(data.categories) ? (data.categories as MarketCategory[]) : [],
  crNumber: (data.crNumber as string) || '',
  description: (data.description as string) || '',
  phoneVerified: data.phoneVerified === true,
  status:
    data.status === 'approved' || data.status === 'rejected' ? data.status : 'pending',
  submittedAt: data.submittedAt as string | Timestamp,
  reviewedAt: data.reviewedAt as string | Timestamp | undefined,
  reviewedBy: data.reviewedBy as string | undefined,
  rejectionReason: data.rejectionReason as string | undefined,
});

/**
 * Create a new seller application. Rejected applicants may re-apply;
 * pending and approved applicants may not submit another application.
 */
export const createSellerApplication = async (
  input: NewSellerApplicationInput
): Promise<string> => {
  if (!db) throw new Error('Firestore is not initialized');

  const existingQuery = query(
    collection(db, COLLECTION),
    where('userId', '==', input.userId)
  );
  const existingDocs = await getDocs(existingQuery);

  for (const snapshot of existingDocs.docs) {
    const status = snapshot.data().status;
    if (status === 'approved') {
      throw new Error('You are already a seller on MUKHYMAT');
    }
    if (status === 'pending') {
      throw new Error('Your seller application is already under review');
    }
  }

  const docRef = await addDoc(collection(db, COLLECTION), {
    userId: input.userId,
    userEmail: input.userEmail,
    userName: input.userName,
    phoneNumber: input.phoneNumber,
    businessNameEn: input.businessNameEn,
    businessNameAr: input.businessNameAr,
    categories: input.categories,
    crNumber: input.crNumber,
    description: input.description,
    phoneVerified: true,
    status: 'pending',
    submittedAt: serverTimestamp(),
  });

  return docRef.id;
};

/** Latest application for a user (rejected users may have several — newest wins). */
export const getSellerApplicationByUserId = async (
  userId: string
): Promise<SellerApplication | null> => {
  if (!db) throw new Error('Firestore is not initialized');

  const q = query(collection(db, COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const applications = snapshot.docs.map((d) => mapDoc(d.id, d.data()));
  // Prefer an approved or pending application over older rejected ones,
  // otherwise return the most recently submitted.
  const toMillis = (v: string | Timestamp | undefined): number => {
    if (!v) return 0;
    if (v instanceof Timestamp) return v.toMillis();
    const t = new Date(v).getTime();
    return isNaN(t) ? 0 : t;
  };
  applications.sort((a, b) => toMillis(b.submittedAt) - toMillis(a.submittedAt));
  return (
    applications.find((a) => a.status === 'approved') ||
    applications.find((a) => a.status === 'pending') ||
    applications[0]
  );
};

/**
 * Approve an application. NOTE: like host approvals, the caller must also
 * set `isSeller: true` on the user profile (toggleUserSellerStatus).
 */
export const approveSellerApplication = async (
  applicationId: string,
  reviewedBy: string
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');

  await updateDoc(doc(db, COLLECTION, applicationId), {
    status: 'approved',
    reviewedAt: serverTimestamp(),
    reviewedBy,
  });
};

export const rejectSellerApplication = async (
  applicationId: string,
  reviewedBy: string,
  rejectionReason: string
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');

  await updateDoc(doc(db, COLLECTION, applicationId), {
    status: 'rejected',
    reviewedAt: serverTimestamp(),
    reviewedBy,
    rejectionReason,
  });
};

/** Admin: all seller applications (rules restrict listing to admins). */
export const getAllSellerApplications = async (): Promise<SellerApplication[]> => {
  if (!db) throw new Error('Firestore is not initialized');

  const snapshot = await getDocs(collection(db, COLLECTION));
  const applications: SellerApplication[] = [];
  snapshot.forEach((d) => {
    try {
      applications.push(mapDoc(d.id, d.data()));
    } catch (error) {
      console.error('Skipping malformed seller application', d.id, error);
    }
  });
  return applications;
};
