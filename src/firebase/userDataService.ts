import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  type DocumentData
} from 'firebase/firestore';
import { db } from './config';
import type { CaseProgress, SessionStats, FindingPerformance } from '@/src/store/learning';

// Subscription tier types
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | null;

// User document structure in Firestore
export interface UserData {
  // Profile info
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;

  // Learning data
  caseProgress: Record<string, CaseProgress>;
  sessionHistory: SessionStats[];
  findingStats?: Record<string, FindingPerformance>;
  baselineSessionStats?: SessionStats;

  // Stats
  totalCasesReviewed: number;
  totalSessionsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;

  // Onboarding
  hasSeenWelcome?: boolean;

  // Subscription
  subscriptionTier?: SubscriptionTier;
  subscriptionStatus?: SubscriptionStatus;
  paystackCustomerCode?: string | null;
  paystackSubscriptionCode?: string | null;
  subscriptionStartDate?: any;
  subscriptionEndDate?: any;

  // Timestamps
  createdAt: any;
  updatedAt: any;
}

// Get user data from Firestore
export async function getUserData(uid: string): Promise<UserData | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserData;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
}

// Create initial user document
export async function createUserData(
  uid: string,
  profile: { email: string | null; displayName: string | null; photoURL: string | null }
): Promise<UserData> {
  const userData: UserData = {
    uid,
    email: profile.email,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    caseProgress: {},
    sessionHistory: [],
    totalCasesReviewed: 0,
    totalSessionsCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, userData);
    return userData;
  } catch (error) {
    console.error('Error creating user data:', error);
    throw error;
  }
}

// Update case progress
export async function updateCaseProgress(
  uid: string,
  caseId: string,
  progress: CaseProgress
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      [`caseProgress.${caseId}`]: progress,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating case progress:', error);
    throw error;
  }
}

// Batch update all case progress (for syncing)
export async function syncCaseProgress(
  uid: string,
  caseProgress: Record<string, CaseProgress>
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      caseProgress,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error syncing case progress:', error);
    throw error;
  }
}

// Add session to history
export async function addSessionToHistory(
  uid: string,
  session: SessionStats
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data() as UserData;
      const sessionHistory = [...userData.sessionHistory, session];

      // Keep only last 100 sessions
      if (sessionHistory.length > 100) {
        sessionHistory.shift();
      }

      await updateDoc(userRef, {
        sessionHistory,
        totalSessionsCompleted: userData.totalSessionsCompleted + 1,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error adding session to history:', error);
    throw error;
  }
}

// Update user stats
export async function updateUserStats(
  uid: string,
  stats: {
    totalCasesReviewed?: number;
    currentStreak?: number;
    longestStreak?: number;
    lastActiveDate?: string;
  }
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...stats,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user stats:', error);
    throw error;
  }
}

// Calculate and update streak
export async function updateStreak(uid: string): Promise<{ currentStreak: number; longestStreak: number }> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    const userData = userSnap.data() as UserData;
    const today = new Date().toISOString().split('T')[0];
    const lastActive = userData.lastActiveDate;

    let currentStreak = userData.currentStreak;

    if (!lastActive) {
      // First activity ever
      currentStreak = 1;
    } else {
      const lastDate = new Date(lastActive);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day, no change
      } else if (diffDays === 1) {
        // Consecutive day
        currentStreak += 1;
      } else {
        // Streak broken
        currentStreak = 1;
      }
    }

    const longestStreak = Math.max(currentStreak, userData.longestStreak);

    await updateDoc(userRef, {
      currentStreak,
      longestStreak,
      lastActiveDate: today,
      updatedAt: serverTimestamp()
    });

    return { currentStreak, longestStreak };
  } catch (error) {
    console.error('Error updating streak:', error);
    throw error;
  }
}
