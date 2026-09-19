import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  signUp: (fullName: string, email: string, password: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  confirmReset: (oobCode: string, newPassword: string) => Promise<void>;
  updateFullName: (fullName: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateOneDriveConnection: (onedriveData: Partial<import('../types').OneDriveConnectionInfo> | null) => Promise<void>;
  updateAIConnection: (aiData: import('../types').AIConnectionInfo | null) => Promise<void>;
  setOnboardingDismissed: (dismissed: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (currentUser) {
        setProfileLoading(true);
        const userDocRef = doc(db, 'users', currentUser.uid);

        // Listen to live profile updates in Firestore
        unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile({
              uid: currentUser.uid,
              email: currentUser.email || '',
              fullName: data.fullName || currentUser.displayName || 'Workspace Member',
              avatarColor: data.avatarColor || '#2563EB',
              title: data.title || '',
              department: data.department || '',
              bio: data.bio || '',
              createdAt: data.createdAt ? (typeof data.createdAt === 'string' ? data.createdAt : data.createdAt.toDate?.()?.toISOString()) : undefined,
              updatedAt: data.updatedAt ? (typeof data.updatedAt === 'string' ? data.updatedAt : data.updatedAt.toDate?.()?.toISOString()) : undefined,
              onedrive: data.onedrive || undefined,
              aiConnection: data.aiConnection || undefined,
              onboardingDismissed: !!data.onboardingDismissed,
            });
          } else {
            // Profile does not exist yet in Firestore, create it
            const defaultProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              fullName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Workspace Member',
              avatarColor: '#2563EB',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            try {
              await setDoc(userDocRef, {
                ...defaultProfile,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              setUserProfile(defaultProfile);
            } catch (err) {
              console.error('Failed to create default Firestore user doc:', err);
              setUserProfile(defaultProfile);
            }
          }
          setProfileLoading(false);
        }, (err) => {
          console.error('Firestore user profile snapshot error:', err);
          // Fallback profile
          setUserProfile({
            uid: currentUser.uid,
            email: currentUser.email || '',
            fullName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Workspace Member',
            avatarColor: '#2563EB',
          });
          setProfileLoading(false);
        });
      } else {
        setUserProfile(null);
        setProfileLoading(false);
      }

      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signUp = async (fullName: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const createdUser = cred.user;

    // Update Firebase Auth display name
    await updateProfile(createdUser, {
      displayName: fullName,
    });

    // Store user profile in Firestore
    const userDocRef = doc(db, 'users', createdUser.uid);
    const profilePayload = {
      uid: createdUser.uid,
      email: createdUser.email || email,
      fullName: fullName.trim(),
      avatarColor: '#2563EB',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userDocRef, profilePayload);
  };

  const logIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  const sendResetEmail = async (email: string) => {
    // Configure action code settings to return to current application URL
    const currentOrigin = window.location.origin;
    await sendPasswordResetEmail(auth, email, {
      url: currentOrigin,
      handleCodeInApp: true,
    });
  };

  const confirmReset = async (oobCode: string, newPassword: string) => {
    await confirmPasswordReset(auth, oobCode, newPassword);
  };

  const updateFullName = async (fullName: string) => {
    if (!user) throw new Error('No authenticated user found');
    const trimmed = fullName.trim();
    if (!trimmed) throw new Error('Full name cannot be empty');

    // Update Firebase Auth profile
    await updateProfile(user, { displayName: trimmed });

    // Update Firestore user document
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      fullName: trimmed,
      updatedAt: serverTimestamp(),
    });

    setUserProfile((prev) => (prev ? { ...prev, fullName: trimmed } : null));
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) throw new Error('No authenticated user with an email found');
    
    // Re-authenticate user with current password
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);
  };

  const updateOneDriveConnection = async (
    onedriveData: Partial<import('../types').OneDriveConnectionInfo> | null
  ) => {
    if (!user) throw new Error('No authenticated user found');
    const userDocRef = doc(db, 'users', user.uid);

    if (onedriveData === null) {
      // Disconnect: remove onedrive field
      await updateDoc(userDocRef, {
        onedrive: {
          connected: false,
          accountEmail: '',
          accountName: '',
          connectedAt: '',
          encryptedAccessToken: '',
          encryptedRefreshToken: '',
          expiresAt: 0,
        },
        updatedAt: serverTimestamp(),
      });
      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              onedrive: {
                connected: false,
              },
            }
          : null
      );
    } else {
      const mergedOneDrive = {
        ...(userProfile?.onedrive || {}),
        ...onedriveData,
        connected: onedriveData.connected ?? true,
      };

      await updateDoc(userDocRef, {
        onedrive: mergedOneDrive,
        updatedAt: serverTimestamp(),
      });

      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              onedrive: mergedOneDrive,
            }
          : null
      );
    }
  };

  const updateAIConnection = async (aiData: import('../types').AIConnectionInfo | null) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    if (aiData === null) {
      await updateDoc(userDocRef, {
        aiConnection: null,
        updatedAt: serverTimestamp(),
      });
      setUserProfile((prev) => (prev ? { ...prev, aiConnection: undefined } : null));
    } else {
      await updateDoc(userDocRef, {
        aiConnection: aiData,
        updatedAt: serverTimestamp(),
      });
      setUserProfile((prev) => (prev ? { ...prev, aiConnection: aiData } : null));
    }
  };

  const setOnboardingDismissed = async (dismissed: boolean) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        onboardingDismissed: dismissed,
        updatedAt: serverTimestamp(),
      });
      setUserProfile((prev) => (prev ? { ...prev, onboardingDismissed: dismissed } : null));
    } catch (e) {
      console.warn('Failed to persist onboarding dismissed state:', e);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data();
        setUserProfile({
          uid: user.uid,
          email: user.email || '',
          fullName: data.fullName || user.displayName || 'Workspace Member',
          avatarColor: data.avatarColor || '#2563EB',
          title: data.title,
          department: data.department,
          bio: data.bio,
          onedrive: data.onedrive || undefined,
          aiConnection: data.aiConnection || undefined,
          onboardingDismissed: !!data.onboardingDismissed,
        });
      }
    } catch (e) {
      console.error('Refresh profile error:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        profileLoading,
        signUp,
        logIn,
        logOut,
        sendResetEmail,
        confirmReset,
        updateFullName,
        changePassword,
        refreshProfile,
        updateOneDriveConnection,
        updateAIConnection,
        setOnboardingDismissed,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
