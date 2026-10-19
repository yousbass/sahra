import { auth } from './firebase';
import {
  RecaptchaVerifier,
  linkWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';

let recaptchaVerifier: RecaptchaVerifier | null = null;
let confirmationResult: ConfirmationResult | null = null;

// Initialize reCAPTCHA verifier
export const initializeRecaptcha = (containerId: string): RecaptchaVerifier => {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
  }

  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible'
  });

  return recaptchaVerifier;
};

// Send OTP to the phone number and link it to the CURRENT signed-in user.
// (linkWithPhoneNumber keeps the existing session; signInWithPhoneNumber
// would replace it with a phone-only account.)
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

    confirmationResult = await linkWithPhoneNumber(
      auth.currentUser,
      formattedPhone,
      recaptchaVerifier
    );

    return true;
  } catch (error) {
    console.error('Error sending OTP:', error);

    // Reset reCAPTCHA on error
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      recaptchaVerifier = null;
    }

    throw error;
  }
};

// Verify OTP code (completes linking the phone to the current account)
export const verifyOTP = async (code: string): Promise<boolean> => {
  try {
    if (!confirmationResult) {
      throw new Error('No confirmation result available. Please request OTP first.');
    }

    const result = await confirmationResult.confirm(code);
    return !!result.user;
  } catch (error) {
    console.error('Error verifying OTP:', error);
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
