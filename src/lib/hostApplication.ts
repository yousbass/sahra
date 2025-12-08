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
    
    if (!existingSnapshot.empty) {
      const existingApp = existingSnapshot.docs[0].data();
      if (existingApp.status === 'approved') {
        throw new Error('You are already a host');
      }
    }

    // Create application record for record-keeping
    const applicationData: Omit<HostApplication, 'id'> = {
      userId,
      userEmail,
      userName,
      phoneNumber,
      cprNumber,
      phoneVerified: true,
      status: 'approved',
      submittedAt: serverTimestamp(),
      reviewedAt: serverTimestamp()
    };

    const docRef = await addDoc(applicationsRef, applicationData);
    console.log('✅ Host application created:', docRef.id);
    
    // Immediately update user to be a host
    const userDoc = doc(db, 'users', userId);
    await updateDoc(userDoc, {
      isHost: true,
      phone: phoneNumber,
      cprNumber: cprNumber
    });
    console.log('✅ User upgraded to host status');
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating host application:', error);
    throw error;
  }
};

// Get host application by user ID
export const getHostApplicationByUserId = async (userId: string): Promise<HostApplication | null> => {
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const applicationsRef = collection(db, 'hostApplications');
    const q = query(applicationsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as HostApplication;
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