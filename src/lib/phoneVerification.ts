import { auth } from './firebase';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  PhoneAuthProvider,
  linkWithCredential
} from 'firebase/auth';

let recaptchaVerifier: RecaptchaVerifier | null = null;
let confirmationResult: ConfirmationResult | null = null;

// Initialize reCAPTCHA verifier
export const initializeRecaptcha = (containerId: string): RecaptchaVerifier => {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
  }

  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      console.log('✅ reCAPTCHA verified');
    },
    'expired-callback': () => {
      console.warn('⚠️ reCAPTCHA expired');
    }
  });

  return recaptchaVerifier;
};

// Send OTP to phone number
export const sendOTP = async (phoneNumber: string): Promise<boolean> => {
  try {
    if (!auth.currentUser) {
      throw new Error('User must be signed in');
    }

    if (!recaptchaVerifier) {
      throw new Error('reCAPTCHA not initialized');
    }

    // Format phone number to E.164 format if not already
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+973${phoneNumber}`;

    console.log('📱 Sending OTP to:', formattedPhone);

    confirmationResult = await signInWithPhoneNumber(
      auth,
      formattedPhone,
      recaptchaVerifier
    );

    console.log('✅ OTP sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    
    // Reset reCAPTCHA on error
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      recaptchaVerifier = null;
    }
    
    throw error;
  }
};

// Verify OTP code
export const verifyOTP = async (code: string): Promise<boolean> => {
  try {
    if (!confirmationResult) {
      throw new Error('No confirmation result available. Please request OTP first.');
    }

    if (!auth.currentUser) {
      throw new Error('User must be signed in');
    }

    console.log('🔐 Verifying OTP code...');

    // Confirm the OTP code
    const result = await confirmationResult.confirm(code);

    if (result.user) {
      console.log('✅ Phone number verified successfully');
      
      // Link phone credential to current user if not already linked
      if (!auth.currentUser.phoneNumber) {
        const credential = PhoneAuthProvider.credential(
          confirmationResult.verificationId,
          code
        );
        await linkWithCredential(auth.currentUser, credential);
        console.log('✅ Phone number linked to user account');
      }
      
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    throw error;
  }
};

// Clean up reCAPTCHA
export const cleanupRecaptcha = (): void => {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
  confirmationResult = null;
};