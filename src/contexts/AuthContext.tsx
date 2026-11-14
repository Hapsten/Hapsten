import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import {
  auth,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from '@/firebase/config';
import { ensureUserProfile } from '@/firebase/users';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = { children: ReactNode };

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          await ensureUserProfile(firebaseUser);
        } catch {
          // A missing profile must not block sign-in; it will be retried next launch.
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Redirect to /auth when not signed in
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth' as never);
    }
  }, [loading, user]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/' as never);
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Sign in failed', error?.message ?? 'Something went wrong');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      if (name && userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      if (userCredential.user) {
        await ensureUserProfile(userCredential.user);
      }
      router.replace('/' as never);
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Sign up failed', error?.message ?? 'Something went wrong');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      router.replace('/auth' as never);
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Sign out failed', error?.message ?? 'Something went wrong');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
