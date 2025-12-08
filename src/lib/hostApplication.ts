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

// Create a new host application
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
    
    // Check if user already has a pending or approved application
    const existingQuery = query(
      applicationsRef,
      where('userId', '==', userId)
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      const existingApp = existingSnapshot.docs[0].data();
      if (existingApp.status === 'pending') {
        throw new Error('You already have a pending application');
      }
      if (existingApp.status === 'approved') {
        throw new Error('You are already a host');
      }
    }

    const applicationData: Omit<HostApplication, 'id'> = {
      userId,
      userEmail,
      userName,
      phoneNumber,
      cprNumber,
      phoneVerified: false,
      status: 'pending',
      submittedAt: serverTimestamp()
    };

    const docRef = await addDoc(applicationsRef, applicationData);
    console.log('✅ Host application created:', docRef.id);
    
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

// Store verification code (for SMS OTP)
export const storeVerificationCode = async (
  applicationId: string,
  code: string,
  expiryMinutes: number = 10
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const applicationDoc = doc(db, 'hostApplications', applicationId);
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + expiryMinutes);

    await updateDoc(applicationDoc, {
      verificationCode: code,
      verificationCodeExpiry: expiry.toISOString()
    });
    console.log('✅ Verification code stored');
  } catch (error) {
    console.error('❌ Error storing verification code:', error);
    throw error;
  }
};

// Verify code
export const verifyCode = async (
  applicationId: string,
  code: string
): Promise<boolean> => {
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const application = await getHostApplicationById(applicationId);
    
    if (!application) {
      throw new Error('Application not found');
    }

    if (!application.verificationCode || !application.verificationCodeExpiry) {
      throw new Error('No verification code found');
    }

    const expiry = typeof application.verificationCodeExpiry === 'string'
      ? new Date(application.verificationCodeExpiry)
      : application.verificationCodeExpiry.toDate();

    if (new Date() > expiry) {
      throw new Error('Verification code expired');
    }

    if (application.verificationCode !== code) {
      return false;
    }

    // Code is valid, mark phone as verified
    await updatePhoneVerification(applicationId, true);
    return true;
  } catch (error) {
    console.error('❌ Error verifying code:', error);
    throw error;
  }
};

// Approve host application (admin only)
export const approveHostApplication = async (
  applicationId: string,
  adminId: string
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const application = await getHostApplicationById(applicationId);
    
    if (!application) {
      throw new Error('Application not found');
    }

    if (!application.phoneVerified) {
      throw new Error('Phone number must be verified before approval');
    }

    // Update application status
    const applicationDoc = doc(db, 'hostApplications', applicationId);
    await updateDoc(applicationDoc, {
      status: 'approved',
      reviewedAt: serverTimestamp(),
      reviewedBy: adminId
    });

    // Update user profile to mark as host
    const userDoc = doc(db, 'users', application.userId);
    await updateDoc(userDoc, {
      isHost: true,
      phone: application.phoneNumber
    });

    console.log('✅ Host application approved');
  } catch (error) {
    console.error('❌ Error approving host application:', error);
    throw error;
  }
};

// Reject host application (admin only)
export const rejectHostApplication = async (
  applicationId: string,
  adminId: string,
  reason: string
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const applicationDoc = doc(db, 'hostApplications', applicationId);
    await updateDoc(applicationDoc, {
      status: 'rejected',
      reviewedAt: serverTimestamp(),
      reviewedBy: adminId,
      rejectionReason: reason
    });

    console.log('✅ Host application rejected');
  } catch (error) {
    console.error('❌ Error rejecting host application:', error);
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