import { useEffect, useState } from 'react';
import { 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '@/lib/firebase';
import { createUserProfile, getUserProfile, updateUserProfile, UserProfile } from '@/lib/firestore';
import { toast } from 'sonner';

interface AuthError {
  code?: string;
  message?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase authentication listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Try to get user profile
          let profile = await getUserProfile(firebaseUser.uid);
          
          // If profile doesn't exist, create it (handles orphaned Auth accounts)
          if (!profile) {
            console.log('⚠️ User profile not found, creating one...');
            const newUserData: Omit<UserProfile, 'id' | 'createdAt'> = {
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              photoURL: firebaseUser.photoURL || undefined,
              isHost: false,
            };
            
            await createUserProfile(firebaseUser.uid, newUserData);
            profile = await getUserProfile(firebaseUser.uid);
          }
          
          setUserData(profile);
        } catch (error) {
          console.error('Error fetching/creating user data:', error);
          toast.error('Failed to load user profile');
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    // Firebase authentication
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(userCredential.user, { displayName: name });
      
      const newUserData: Omit<UserProfile, 'id' | 'createdAt'> = {
        email: userCredential.user.email || '',
        displayName: name,
        isHost: false,
      };
      
      // Create user profile with retry logic
      try {
        await createUserProfile(userCredential.user.uid, newUserData);
      } catch (firestoreError) {
        console.error('Failed to create user profile:', firestoreError);
        toast.error('Account created but profile setup failed. Please try signing in again.');
        // Don't throw - let the user sign in to retry profile creation
      }
      
      const profile = await getUserProfile(userCredential.user.uid);
      setUserData(profile);
      
      toast.success('Account created successfully!');
      return userCredential.user;
    } catch (error) {
      let message = 'Failed to create account';
      const authError = error as AuthError;
      
      if (authError.code === 'auth/email-already-in-use') {
        message = 'Email already registered';
      } else if (authError.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters';
      } else if (authError.code === 'auth/invalid-email') {
        message = 'Invalid email address';
      } else if (authError.message) {
        message = authError.message;
      }
      
      toast.error(message);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    // Firebase authentication
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back!');
      return userCredential.user;
    } catch (error) {
      let message = 'Failed to sign in';
      const authError = error as AuthError;
      
      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password') {
        message = 'Invalid email or password';
      } else if (authError.code === 'auth/invalid-email') {
        message = 'Invalid email address';
      } else if (authError.message) {
        message = authError.message;
      }
      
      toast.error(message);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    if (!email) {
      toast.error('Please enter your email to reset your password.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent. Check your inbox.');
    } catch (error) {
      const authError = error as AuthError;
      let message = 'Failed to send reset email';

      if (authError.code === 'auth/user-not-found') {
        message = 'No account found for that email';
      } else if (authError.code === 'auth/invalid-email') {
        message = 'Invalid email address';
      } else if (authError.message) {
        message = authError.message;
      }

      toast.error(message);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check if profile exists, create if it doesn't (idempotent)
      const existingProfile = await getUserProfile(result.user.uid);
      if (!existingProfile) {
        // FIXED: Remove undefined values, only include fields with actual values
        const newUserData: Omit<UserProfile, 'id' | 'createdAt'> = {
          email: result.user.email || '',
          displayName: result.user.displayName || 'User',
          isHost: false,
        };
        
        // Only add photoURL if it exists
        if (result.user.photoURL) {
          newUserData.photoURL = result.user.photoURL;
        }
        
        try {
          await createUserProfile(result.user.uid, newUserData);
        } catch (firestoreError) {
          console.error('Failed to create user profile:', firestoreError);
          toast.error('Sign-in successful but profile setup failed. Please refresh the page.');
        }
      }
      
      toast.success('Signed in with Google!');
      return result.user;
    } catch (error) {
      const authError = error as AuthError;
      let message = 'Failed to sign in with Google';
      
      if (authError.code === 'auth/popup-closed-by-user') {
        message = 'Sign-in cancelled';
      } else if (authError.code === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized. Please add it in Firebase Console.';
      } else if (authError.message) {
        message = authError.message;
      }
      
      toast.error(message);
      throw error;
    }
  };

  const signInWithFacebook = async () => {
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      
      // Check if profile exists, create if it doesn't (idempotent)
      const existingProfile = await getUserProfile(result.user.uid);
      if (!existingProfile) {
        // FIXED: Remove undefined values, only include fields with actual values
        const newUserData: Omit<UserProfile, 'id' | 'createdAt'> = {
          email: result.user.email || '',
          displayName: result.user.displayName || 'User',
          isHost: false,
        };
        
        // Only add photoURL if it exists
        if (result.user.photoURL) {
          newUserData.photoURL = result.user.photoURL;
        }
        
        try {
          await createUserProfile(result.user.uid, newUserData);
        } catch (firestoreError) {
          console.error('Failed to create user profile:', firestoreError);
          toast.error('Sign-in successful but profile setup failed. Please refresh the page.');
        }
      }
      
      toast.success('Signed in with Facebook!');
      return result.user;
    } catch (error) {
      const authError = error as AuthError;
      let message = 'Failed to sign in with Facebook';
      
      if (authError.code === 'auth/popup-closed-by-user') {
        message = 'Sign-in cancelled';
      } else if (authError.code === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized. Please add it in Firebase Console.';
      } else if (authError.message) {
        message = authError.message;
      }
      
      toast.error(message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUserData(null);
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
      throw error;
    }
  };

  const becomeHost = async () => {
    if (!userData) return;

    try {
      await updateUserProfile(user!.uid, { isHost: true });
      const updatedProfile = await getUserProfile(user!.uid);
      setUserData(updatedProfile);
      toast.success('You are now a host!');
    } catch (error) {
      toast.error('Failed to become a host');
      throw error;
    }
  };

  return {
    user,
    userData,
    loading,
    signUp,
    signIn,
    resetPassword,
    signInWithGoogle,
    signInWithFacebook,
    signOut,
    becomeHost,
  };
}
