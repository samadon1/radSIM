import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { auth, googleProvider } from '@/src/firebase/config';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);

  // Computed
  const isAuthenticated = computed(() => !!user.value);
  const userProfile = computed<UserProfile | null>(() => {
    if (!user.value) return null;
    return {
      uid: user.value.uid,
      email: user.value.email,
      displayName: user.value.displayName,
      photoURL: user.value.photoURL
    };
  });

  // Actions
  async function signInWithGoogle() {
    error.value = null;
    try {
      // Use popup instead of redirect - more reliable and doesn't have timing issues
      const result = await signInWithPopup(auth, googleProvider);
      user.value = result.user;
      return result.user;
    } catch (e: any) {
      error.value = e.message || 'Failed to sign in with Google';
      console.error('Google sign-in error:', e);
      throw e;
    }
  }

  async function signInWithEmail(email: string, password: string) {
    error.value = null;
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      user.value = result.user;
      return result.user;
    } catch (e: any) {
      // Provide user-friendly error messages
      const errorCode = e.code;
      if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        error.value = 'Invalid email or password';
      } else if (errorCode === 'auth/too-many-requests') {
        error.value = 'Too many failed attempts. Please try again later.';
      } else {
        error.value = e.message || 'Failed to sign in';
      }
      console.error('Email sign-in error:', e);
      throw e;
    }
  }

  async function signUpWithEmail(email: string, password: string) {
    error.value = null;
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      user.value = result.user;
      return result.user;
    } catch (e: any) {
      // Provide user-friendly error messages
      const errorCode = e.code;
      if (errorCode === 'auth/email-already-in-use') {
        error.value = 'An account with this email already exists';
      } else if (errorCode === 'auth/weak-password') {
        error.value = 'Password should be at least 6 characters';
      } else if (errorCode === 'auth/invalid-email') {
        error.value = 'Please enter a valid email address';
      } else {
        error.value = e.message || 'Failed to create account';
      }
      console.error('Email sign-up error:', e);
      throw e;
    }
  }

  async function signOut() {
    error.value = null;
    try {
      await firebaseSignOut(auth);
      user.value = null;
    } catch (e: any) {
      error.value = e.message || 'Failed to sign out';
      console.error('Sign out error:', e);
      throw e;
    }
  }

  // Initialize auth state listener
  async function initAuth() {
    console.log('[Auth] initAuth started');

    return new Promise<User | null>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        console.log('[Auth] onAuthStateChanged:', firebaseUser?.email || 'null');
        user.value = firebaseUser;
        loading.value = false;
        resolve(firebaseUser);
      });
    });
  }

  return {
    // State
    user,
    loading,
    error,
    // Computed
    isAuthenticated,
    userProfile,
    // Actions
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    initAuth
  };
});
