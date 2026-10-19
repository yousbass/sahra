import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

export interface HostApplication {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  phoneNumber: string;
  cprNumber: string;
  phoneVerified: boolean;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string | Timestamp;
  reviewedAt?: string | Timestamp;
  reviewedBy?: string;
  rejectionReason?: string;
}

export const createHostApplication = async (
  userId: string,
  userEmail: string,
  userName: string,
  phoneNumber: string,
  cprNumber: string,
  phoneVerified: boolean
): Promise<string> => {
  if (!db) throw new Error('Firestore is not initialized');

  const applicationData = {
    userId,
    userEmail,
    userName,
    phoneNumber,
    cprNumber,
    phoneVerified,
    status: 'pending',
    submittedAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'hostApplications'), applicationData);
  return docRef.id;
};

export const getHostApplicationByUserId = async (userId: string): Promise<HostApplication | null> => {
  if (!db) throw new Error('Firestore is not initialized');

  // Load existing: getDocs(query(collection(db, 'hostApplications'), where('userId', '==', uid))) — no other filters, no orderBy
  const applicationsRef = collection(db, 'hostApplications');
  const q = query(applicationsRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  // Since we don't have orderBy, if there are multiple, we'll sort in memory by submittedAt to get the latest
  const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HostApplication));
  docs.sort((a, b) => {
    const timeA = a.submittedAt && typeof a.submittedAt === 'object' && 'seconds' in a.submittedAt ? a.submittedAt.seconds : 0;
    const timeB = b.submittedAt && typeof b.submittedAt === 'object' && 'seconds' in b.submittedAt ? b.submittedAt.seconds : 0;
    return timeB - timeA;
  });

  return docs[0];
};
