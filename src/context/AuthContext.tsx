import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, logOut } from '../lib/firebase';
import { ensureUserProfile, subscribeUserProfile, seedCourseCatalogIfEmpty, seedCalendarIfEmpty } from '../lib/firestoreService';
import { UserProfile, UserLevel } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  changeLevel: (level: UserLevel) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
  changeLevel: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize background data seed (course catalog and calendar)
  useEffect(() => {
    seedCourseCatalogIfEmpty().catch(console.error);
    seedCalendarIfEmpty().catch(console.error);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await ensureUserProfile(user);
          setUserProfile(profile);
          // Subscribe for real-time user document changes
          const unsubProfile = subscribeUserProfile(user.uid, (updated) => {
            if (updated) setUserProfile(updated);
          });
          setLoading(false);
          return () => unsubProfile();
        } catch (err) {
          console.error('Error ensuring user profile:', err);
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      const user = await signInWithGoogle();
      const profile = await ensureUserProfile(user);
      setUserProfile(profile);
    } catch (err) {
      console.error('Sign-in failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      setUserProfile(null);
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      const profile = await ensureUserProfile(currentUser);
      setUserProfile(profile);
    }
  };

  const changeLevel = async (level: UserLevel) => {
    if (userProfile && currentUser) {
      setUserProfile({ ...userProfile, level });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        signIn: handleSignIn,
        signOut: handleSignOut,
        refreshProfile,
        changeLevel,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
