import { db } from './firebase';
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  query,
  where,
  updateDoc,
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
  verificationCode?: string;
  verificationCodeExpiry?: string | Timestamp;
}

// Create a new host application and immediately make user a host
export const createHostApplication = async (
  userId: string,
  userEmail: string,
  userName: string,
  phoneNumber: string,
  cprNumber: string
): Promise<string> => {
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const applicationsRef = collection(db, 'hostApplications');
    
    // Check if user already has an application
    const existingQuery = query(
      applicationsRef,
      where('userId', '==', userId)
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    for (const docSnap of existingSnapshot.docs) {
      const status = docSnap.data().status as string;
      if (status === 'approved') {
        throw new Error('You are already a host');
      }
      if (status === 'pending') {
        throw new Error('Your host application is already under review');
      }
    }

    // Create a PENDING application — an admin must approve it before the
    // user gains host privileges (users must never self-promote).
    const applicationData = {
      userId,
      userEmail,
      userName,
      phoneNumber,
      cprNumber,
      phoneVerified: true,
      status: 'pending',
      submittedAt: serverTimestamp()
    };

    const docRef = await addDoc(applicationsRef, applicationData);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating host application:', error);
    throw error;
  }
};

// Get host application by user ID.
// Fetches all applications for the user and sorts client-side so that no
// composite Firestore index is required. Priority: approved > pending > most
// recently submitted rejected application.
export const getHostApplicationByUserId = async (userId: string): Promise<HostApplication | null> => {
  if (!db) throw new Error('Firestore is not initialized');

  const toMillis = (v: string | Timestamp | undefined): number => {
    if (!v) return 0;
    if (v instanceof Timestamp) return v.toMillis();
    const t = new Date(v as string).getTime();
    return isNaN(t) ? 0 : t;
  };

  try {
    const applicationsRef = collection(db, 'hostApplications');
    const q = query(applicationsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const applications = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    } as HostApplication));

    // Sort newest-first so find() below picks the latest approved/pending/rejected
    applications.sort((a, b) => toMillis(b.submittedAt) - toMillis(a.submittedAt));

    return (
      applications.find((a) => a.status === 'approved') ||
      applications.find((a) => a.status === 'pending') ||
      applications[0]
    );
  } catch (error) {
    console.error('❌ Error fetching host application:', error);
    throw error;
  }
};

// Get host application by ID
export const getHostApplicationById = async (applicationId: string): Promise<HostApplication | null> => {
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const applicationDoc = doc(db, 'hostApplications', applicationId);
    const snapshot = await getDoc(applicationDoc);

    if (!snapshot.exists()) return null;

    return {
      id: snapshot.id,
      ...snapshot.data()
    } as HostApplication;
  } catch (error) {
    console.error('❌ Error fetching host application:', error);
    throw error;
  }
};

// Update phone verification status
export const updatePhoneVerification = async (
  applicationId: string,
  verified: boolean
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const applicationDoc = doc(db, 'hostApplications', applicationId);
    await updateDoc(applicationDoc, {
      phoneVerified: verified
    });
    console.log('✅ Phone verification status updated');
  } catch (error) {
    console.error('❌ Error updating phone verification:', error);
    throw error;
  }
};

// Approve a host application (admin only) — marks the application approved.
// Caller must also set isHost on the user (see toggleUserHostStatus in firestore.ts).
export const approveHostApplication = async (
  applicationId: string,
  reviewedBy: string
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');

  const applicationDoc = doc(db, 'hostApplications', applicationId);
  await updateDoc(applicationDoc, {
    status: 'approved',
    reviewedAt: serverTimestamp(),
    reviewedBy
  });
};

// Reject a host application (admin only) with a reason
export const rejectHostApplication = async (
  applicationId: string,
  reviewedBy: string,
  rejectionReason: string
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');

  const applicationDoc = doc(db, 'hostApplications', applicationId);
  await updateDoc(applicationDoc, {
    status: 'rejected',
    reviewedAt: serverTimestamp(),
    reviewedBy,
    rejectionReason
  });
};

// Get all host applications (admin only)
export const getAllHostApplications = async (): Promise<HostApplication[]> => {
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const applicationsRef = collection(db, 'hostApplications');
    const snapshot = await getDocs(applicationsRef);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as HostApplication));
  } catch (error) {
    console.error('❌ Error fetching host applications:', error);
    throw error;
  }
};