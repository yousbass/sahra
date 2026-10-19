import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, initFirebase } from '../lib/firebase';
import { registerAndSavePushToken } from '../lib/pushNotifications';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  phone?: string;
  photoURL?: string;
  isHost: boolean;
  isAdmin: boolean;
  createdAt: any;
}

interface AuthContextType {
  user: User | null;
  userData: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  initialized: false,
  refreshUserData: async () => {},
});

export const AuthProvider = ({ children, onInit }: { children: React.ReactNode, onInit?: () => void }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const refreshUserData = async () => {
    const firebaseUser = auth?.currentUser;
    if (!firebaseUser || !db) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      setUserData(userDoc.exists() ? ({ id: userDoc.id, ...userDoc.data() } as UserProfile) : null);
    } catch (e) {
      console.error('Error refreshing user data:', e);
    }
  };

  useEffect(() => {
    let unsubscribe: () => void;

    const setup = async () => {
      try {
        await initFirebase();
        setInitialized(true);
        if (onInit) onInit();

        if (auth) {
          unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser && db) {
              try {
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (userDoc.exists()) {
                  setUserData({ id: userDoc.id, ...userDoc.data() } as UserProfile);
                } else {
                  setUserData(null);
                }
              } catch (e) {
                console.error("Error fetching user data:", e);
                setUserData(null);
              }
              // Best-effort: register for push notifications and persist the
              // token so the server can target this device. Never blocks sign-in.
              registerAndSavePushToken(firebaseUser.uid).catch(() => {});
            } else {
              setUserData(null);
            }
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Firebase init error", err);
        setLoading(false);
        setInitialized(true);
        if (onInit) onInit();
      }
    };

    setup();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, initialized, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
