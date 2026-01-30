import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { RadiologyCaseMetadata } from '@/src/types/caseLibrary';
import { useCaseLibraryStore } from './case-library';
import { useAuthStore } from './auth';
import {
  getUserData,
  createUserData,
  syncCaseProgress,
  updateStreak,
  addSessionToHistory
} from '@/src/firebase/userDataService';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/src/firebase/config';

// ============================================================================
// Types
// ============================================================================

export type LearningMode = 'focused' | 'mixed' | null;

export interface CaseLearningData {
  caseId: string;
  timesReviewed: number;
  lastReviewDate: Date;
  nextReviewDate: Date;
  easeFactor: number;        // SM-2 algorithm (min 1.3)
  interval: number;          // Days until next review
  repetitions: number;       // Consecutive correct reviews
  consecutiveCorrect: number;
  performanceHistory: {
    date: Date;
    score: number;
    timeSpent: number;       // seconds
    confidence: number;      // 1-5
  }[];
}

export interface FindingPerformance {
  findingType: string;
  totalCases: number;
  reviewedCases: number;
  accuracy: number;           // 0-100
  averageConfidence: number;  // 1-5
  masteryLevel: 'novice' | 'learning' | 'competent' | 'proficient' | 'expert';
}

export interface SessionStats {
  casesReviewed: number;
  correctFindings: number;   // Number of cases answered correctly
  missedFindings: number;    // Number of cases answered incorrectly
  falsePositives: number;    // Reserved for future use
  averageConfidence: number;
  averageTime: number;
  averageScore: number;
}

export interface UserResponse {
  findings: string[];
  diagnosis: string;
  confidence: number;       // 1-5
  annotations: any[];       // Annotation objects from tools
}

export interface AssessmentResult {
  score: number;            // 0-100
  correct: string[];
  missed: string[];
  falsePositives: string[];
  timeSpent: number;
  confidence: number;
}

// Alias for Firestore compatibility
export type CaseProgress = CaseLearningData;

// ============================================================================
// Spaced Repetition Algorithm (SM-2)
// ============================================================================

/**
 * Calculate next review date using SuperMemo 2 algorithm
 * Based on: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */
function calculateNextReview(
  caseLearningData: CaseLearningData,
  performanceScore: number // 0-100
): { nextReviewDate: Date; easeFactor: number; interval: number; repetitions: number } {
  // Convert 0-100 score to SM-2 quality (0-5)
  // 0-20: quality 0
  // 20-40: quality 1
  // 40-60: quality 2
  // 60-75: quality 3
  // 75-90: quality 4
  // 90-100: quality 5
  let quality: number;
  if (performanceScore >= 90) quality = 5;
  else if (performanceScore >= 75) quality = 4;
  else if (performanceScore >= 60) quality = 3;
  else if (performanceScore >= 40) quality = 2;
  else if (performanceScore >= 20) quality = 1;
  else quality = 0;

  let { easeFactor, interval, repetitions } = caseLearningData;

  if (quality >= 3) {
    // Correct response - increase interval
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  } else {
    // Incorrect - reset to beginning
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor based on quality
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, easeFactor); // Minimum ease factor

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return { nextReviewDate, easeFactor, interval, repetitions };
}

/**
 * Create new case learning data
 */
function createNewCaseData(caseId: string): CaseLearningData {
  const now = new Date();
  return {
    caseId,
    timesReviewed: 0,
    lastReviewDate: now,
    nextReviewDate: now, // Due immediately
    easeFactor: 2.5,     // Default SM-2 ease factor
    interval: 0,
    repetitions: 0,
    consecutiveCorrect: 0,
    performanceHistory: []
  };
}

// ============================================================================
// Case Selection Algorithms
// ============================================================================

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.toDateString() === date2.toDateString();
}

function averageScore(history: { score: number }[]): number {
  if (history.length === 0) return 0;
  return history.reduce((sum, h) => sum + h.score, 0) / history.length;
}

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function randomSample<T>(array: T[], count: number): T[] {
  const shuffled = shuffle(array);
  return shuffled.slice(0, Math.min(count, array.length));
}

// ============================================================================
// Store Definition
// ============================================================================

export const useLearningStore = defineStore('learning', () => {
  const caseLibrary = useCaseLibraryStore();

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  // Current session
  const currentMode = ref<LearningMode>(null);
  const currentFindingType = ref<string | null>(null);
  const sessionCases = ref<RadiologyCaseMetadata[]>([]);
  const currentCaseIndex = ref(0);

  // User response (before feedback)
  const userResponse = ref<UserResponse | null>(null);
  const responseStartTime = ref<Date | null>(null);
  const hasCommitted = ref(false);

  // Session stats
  const sessionStats = ref<SessionStats>({
    casesReviewed: 0,
    correctFindings: 0,
    missedFindings: 0,
    falsePositives: 0,
    averageConfidence: 0,
    averageTime: 0,
    averageScore: 0
  });

  // Saved baseline session stats (persisted to localStorage and Firestore)
  const baselineSessionStats = ref<SessionStats | null>(null);

  // Track cases that were answered incorrectly in this session (for Review Mistakes)
  const sessionMissedCases = ref<RadiologyCaseMetadata[]>([]);

  // Learning progress (persisted to localStorage)
  const learningData = ref<{ [caseId: string]: CaseLearningData }>({});

  // Finding-specific performance
  const findingStats = ref<{ [findingType: string]: FindingPerformance }>({});

  // Annotation attachment for learning chat
  const annotationAttachment = ref<{
    image: File;
    thumbnail: string;
    description: string;
  } | null>(null);

  // -------------------------------------------------------------------------
  // Computed
  // -------------------------------------------------------------------------

  const currentCase = computed(() => {
    if (currentCaseIndex.value < sessionCases.value.length) {
      return sessionCases.value[currentCaseIndex.value];
    }
    return null;
  });

  const isSessionActive = computed(() => currentMode.value !== null);

  // Exit confirmation modal state (can be triggered from anywhere)
  const showExitConfirmation = ref(false);

  function requestExitConfirmation() {
    if (isSessionActive.value) {
      showExitConfirmation.value = true;
    }
  }

  function cancelExitConfirmation() {
    showExitConfirmation.value = false;
  }

  // Resume session modal state
  const showResumeSessionModal = ref(false);
  const savedSessionData = ref<{
    mode: LearningMode;
    findingType: string | null;
    cases: RadiologyCaseMetadata[];
    caseIndex: number;
    stats: SessionStats;
  } | null>(null);

  const sessionProgress = computed(() => {
    if (sessionCases.value.length === 0) return 0;
    return Math.round((currentCaseIndex.value / sessionCases.value.length) * 100);
  });

  const casesDueToday = computed(() => {
    const today = new Date();
    // Only count cases that have been reviewed before (timesReviewed > 0)
    // New/unreviewed cases shouldn't count as "due"
    return Object.values(learningData.value).filter(
      data => data.timesReviewed > 0 && data.nextReviewDate <= today
    ).length;
  });

  // Baseline completion - user must complete 20 cases before unlocking focused practice
  const BASELINE_REQUIRED_CASES = 20;

  const hasCompletedBaseline = computed(() => {
    const reviewedCases = Object.values(learningData.value).filter(
      data => data.timesReviewed > 0
    ).length;
    return reviewedCases >= BASELINE_REQUIRED_CASES;
  });

  const baselineProgress = computed(() => {
    const reviewedCases = Object.values(learningData.value).filter(
      data => data.timesReviewed > 0
    ).length;
    return {
      completed: Math.min(reviewedCases, BASELINE_REQUIRED_CASES),
      total: BASELINE_REQUIRED_CASES,
      percentage: Math.min((reviewedCases / BASELINE_REQUIRED_CASES) * 100, 100)
    };
  });

  // -------------------------------------------------------------------------
  // Actions: Session Management
  // -------------------------------------------------------------------------

  async function startFocusedSession(findingType: string, caseCount: number = 15) {
    currentMode.value = 'focused';
    currentFindingType.value = findingType;

    // Load finding-specific library
    const libraryPath = `/cases/nih-learning/${findingType.toLowerCase()}.json`;
    await caseLibrary.loadLibrary(libraryPath);

    // Use spaced repetition for focused sessions too
    const allCases = caseLibrary.cases;
    sessionCases.value = selectCasesWithSpacedRepetition(allCases, caseCount);

    // Reset session state
    currentCaseIndex.value = 0;
    resetSessionStats();

    // Start timing the first case
    startCase();
  }

  /**
   * Select cases using spaced repetition algorithm
   * Works for both mixed and focused sessions
   */
  function selectCasesWithSpacedRepetition(allCases: RadiologyCaseMetadata[], count: number): RadiologyCaseMetadata[] {
    const selected: RadiologyCaseMetadata[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if user is still in baseline phase
    const reviewedCases = Object.values(learningData.value).filter(
      data => data.timesReviewed > 0
    ).length;
    const isBaselinePhase = reviewedCases < BASELINE_REQUIRED_CASES;

    // During baseline: prioritize new cases to build up initial data
    if (isBaselinePhase) {
      const newCases = allCases.filter(c => !learningData.value[c.id] || learningData.value[c.id].timesReviewed === 0);
      selected.push(...randomSample(newCases, Math.min(count, newCases.length)));

      // If we don't have enough new cases, fill with any unselected cases
      if (selected.length < count) {
        const remaining = allCases.filter(c => !selected.includes(c));
        selected.push(...randomSample(remaining, count - selected.length));
      }

      return shuffle(selected.slice(0, count));
    }

    // After baseline: use spaced repetition algorithm

    // Priority 1: Overdue cases (past due date)
    const overdue = allCases
      .filter(c => {
        const data = learningData.value[c.id];
        if (!data || !data.nextReviewDate) return false;
        const nextReview = new Date(data.nextReviewDate);
        return nextReview < today;
      })
      .sort((a, b) => {
        const aData = learningData.value[a.id];
        const bData = learningData.value[b.id];
        const aDate = aData?.nextReviewDate ? new Date(aData.nextReviewDate) : new Date();
        const bDate = bData?.nextReviewDate ? new Date(bData.nextReviewDate) : new Date();
        return aDate.getTime() - bDate.getTime();
      });

    selected.push(...overdue.slice(0, count));

    // Priority 2: Due today
    if (selected.length < count) {
      const dueToday = allCases
        .filter(c => {
          const data = learningData.value[c.id];
          if (!data || !data.nextReviewDate) return false;
          const nextReview = new Date(data.nextReviewDate);
          return isSameDay(nextReview, today) && !selected.includes(c);
        });
      selected.push(...dueToday.slice(0, count - selected.length));
    }

    // Priority 3: Struggling cases (low consecutive correct)
    if (selected.length < count) {
      const struggling = allCases
        .filter(c => {
          const data = learningData.value[c.id];
          return data && data.consecutiveCorrect < 2 && data.timesReviewed >= 2 && !selected.includes(c);
        })
        .sort((a, b) => {
          const aAvg = averageScore(learningData.value[a.id].performanceHistory);
          const bAvg = averageScore(learningData.value[b.id].performanceHistory);
          return aAvg - bAvg;
        });
      selected.push(...struggling.slice(0, count - selected.length));
    }

    // Priority 4: New cases (never reviewed) - limit to 25%
    if (selected.length < count) {
      const newCases = allCases.filter(c => !learningData.value[c.id] && !selected.includes(c));
      const newCasesLimit = Math.min(
        Math.floor(count * 0.25),
        count - selected.length
      );
      selected.push(...randomSample(newCases, newCasesLimit));
    }

    // Fill remaining with any cases
    if (selected.length < count) {
      const remaining = allCases.filter(c => !selected.includes(c));
      selected.push(...randomSample(remaining, count - selected.length));
    }

    return shuffle(selected.slice(0, count));
  }

  async function startMixedSession(caseCount: number = 20) {
    currentMode.value = 'mixed';
    currentFindingType.value = null;

    // Load master index
    await caseLibrary.loadLibrary('/cases/nih-learning/master-index.json');

    // Select cases using spaced repetition
    sessionCases.value = selectCasesWithSpacedRepetition(caseLibrary.cases, caseCount);

    // Reset session state
    currentCaseIndex.value = 0;
    resetSessionStats();

    // Start timing the first case
    startCase();
  }

  function endSession() {
    currentMode.value = null;
    currentFindingType.value = null;
    sessionCases.value = [];
    currentCaseIndex.value = 0;
    userResponse.value = null;
    responseStartTime.value = null;
    hasCommitted.value = false;
  }

  function resetSessionStats() {
    sessionStats.value = {
      casesReviewed: 0,
      correctFindings: 0,
      missedFindings: 0,
      falsePositives: 0,
      averageConfidence: 0,
      averageTime: 0,
      averageScore: 0
    };
    sessionMissedCases.value = [];
  }

  /**
   * Check if baseline just completed and save session stats
   * Called after updateLearningProgress to check if we hit 20 cases
   */
  function checkAndSaveBaselineCompletion() {
    const reviewedCases = Object.values(learningData.value).filter(
      data => data.timesReviewed > 0
    ).length;

    // If we just completed exactly 20 cases and haven't saved baseline stats yet
    if (reviewedCases === BASELINE_REQUIRED_CASES && !baselineSessionStats.value) {
      console.log('[LearningStore] Baseline complete! Saving session stats:', sessionStats.value);

      // Save the current session stats as baseline stats
      baselineSessionStats.value = { ...sessionStats.value };

      // Persist to localStorage and Firestore
      saveLearningData();
      syncToFirestore();
    }
  }

  // Start a review session with only the missed cases
  function startReviewMistakesSession() {
    if (sessionMissedCases.value.length === 0) return false;

    // Copy missed cases before resetting
    const casesToReview = [...sessionMissedCases.value];

    // Reset stats for new session
    resetSessionStats();

    // Start new session with missed cases
    currentMode.value = 'mixed';
    sessionCases.value = casesToReview;
    currentCaseIndex.value = 0;
    hasCommitted.value = false;
    userResponse.value = null;

    return true;
  }

  // -------------------------------------------------------------------------
  // Actions: Case Navigation
  // -------------------------------------------------------------------------

  function startCase() {
    responseStartTime.value = new Date();
    hasCommitted.value = false;
    userResponse.value = null;
  }

  function submitResponse(response: UserResponse) {
    userResponse.value = response;
    hasCommitted.value = true;
  }

  function assessResponse(): AssessmentResult {
    if (!currentCase.value || !userResponse.value) {
      throw new Error('No case or response to assess');
    }

    const groundTruth = currentCase.value.findings.map(f => f.name.toLowerCase());
    const userFindings = userResponse.value.findings.map(f => f.toLowerCase());

    // Calculate correct, missed, false positives
    const correct = userFindings.filter(f => groundTruth.includes(f));
    const missed = groundTruth.filter(f => !userFindings.includes(f));
    const falsePositives = userFindings.filter(f => !groundTruth.includes(f));

    // Calculate score
    // Score = (correct / (correct + missed + false positives)) * 100
    const totalFindings = correct.length + missed.length + falsePositives.length;
    const score = totalFindings > 0 ? Math.round((correct.length / totalFindings) * 100) : 0;

    // Calculate time spent
    const timeSpent = responseStartTime.value
      ? Math.round((new Date().getTime() - responseStartTime.value.getTime()) / 1000)
      : 0;

    return {
      score,
      correct,
      missed,
      falsePositives,
      timeSpent,
      confidence: userResponse.value.confidence
    };
  }

  /**
   * Update finding-level statistics based on case completion
   */
  function updateFindingStats(caseData: RadiologyCaseMetadata, assessment: AssessmentResult) {
    // Get all findings in this case
    const findingsInCase = caseData.findings?.map(f => f.name) || [];

    // Update stats for each finding type in this case
    findingsInCase.forEach(findingType => {
      const existing = findingStats.value[findingType];

      if (!existing) {
        // Initialize new finding stats
        const caseLibraryStore = useCaseLibraryStore();
        const totalCasesWithFinding = caseLibraryStore.cases.filter(c =>
          c.findings?.some(f => f.name.toLowerCase() === findingType.toLowerCase())
        ).length;

        findingStats.value[findingType] = {
          findingType,
          totalCases: totalCasesWithFinding,
          reviewedCases: 1,
          accuracy: assessment.score,
          averageConfidence: assessment.confidence,
          masteryLevel: getMasteryLevel(1, assessment.score)
        };
      } else {
        // Update existing stats
        const newReviewedCases = existing.reviewedCases + 1;

        // Recalculate accuracy as running average
        const newAccuracy = ((existing.accuracy * existing.reviewedCases) + assessment.score) / newReviewedCases;

        // Recalculate average confidence
        const newAvgConfidence = ((existing.averageConfidence * existing.reviewedCases) + assessment.confidence) / newReviewedCases;

        findingStats.value[findingType] = {
          ...existing,
          reviewedCases: newReviewedCases,
          accuracy: Math.round(newAccuracy),
          averageConfidence: Math.round(newAvgConfidence * 10) / 10, // Round to 1 decimal
          masteryLevel: getMasteryLevel(newReviewedCases, newAccuracy)
        };
      }
    });
  }

  /**
   * Determine mastery level based on cases reviewed and accuracy
   */
  function getMasteryLevel(reviewedCases: number, accuracy: number): 'novice' | 'learning' | 'competent' | 'proficient' | 'expert' {
    if (reviewedCases < 3) return 'novice';
    if (reviewedCases < 10) return 'learning';
    if (accuracy < 70) return 'competent';
    if (accuracy < 85) return 'proficient';
    return 'expert';
  }

  function updateLearningProgress(assessment: AssessmentResult) {
    if (!currentCase.value) return;

    const caseId = currentCase.value.id;
    const existing = learningData.value[caseId] || createNewCaseData(caseId);

    // Add to performance history
    existing.performanceHistory.push({
      date: new Date(),
      score: assessment.score,
      timeSpent: assessment.timeSpent,
      confidence: assessment.confidence
    });

    // Update consecutive correct
    if (assessment.score >= 80) {
      existing.consecutiveCorrect++;
    } else {
      existing.consecutiveCorrect = 0;
    }

    // Calculate next review using SM-2
    const nextReview = calculateNextReview(existing, assessment.score);
    existing.nextReviewDate = nextReview.nextReviewDate;
    existing.easeFactor = nextReview.easeFactor;
    existing.interval = nextReview.interval;
    existing.repetitions = nextReview.repetitions;
    existing.timesReviewed++;
    existing.lastReviewDate = new Date();

    // Save
    learningData.value[caseId] = existing;

    // Update finding-level stats
    updateFindingStats(currentCase.value, assessment);

    saveLearningData();

    // Update session stats - count cases not individual findings
    sessionStats.value.casesReviewed++;
    // A case is considered "correct" if:
    // - All findings were identified (no missed findings)
    // - No false positives were identified
    // This handles both cases with findings and normal cases (no findings)
    const hasMissedFindings = assessment.missed.length > 0;
    const hasFalsePositives = assessment.falsePositives.length > 0;

    if (!hasMissedFindings && !hasFalsePositives) {
      // Perfect response - got everything right
      sessionStats.value.correctFindings++;
    } else {
      // Had errors (missed findings or false positives)
      sessionStats.value.missedFindings++;
      // Track this case for "Review Mistakes" feature
      const currentCaseData = currentCase.value;
      if (currentCaseData && !sessionMissedCases.value.find(c => c.id === currentCaseData.id)) {
        sessionMissedCases.value.push(currentCaseData);
      }
    }
    sessionStats.value.falsePositives += assessment.falsePositives.length;

    const totalReviewed = sessionStats.value.casesReviewed;
    sessionStats.value.averageConfidence =
      (sessionStats.value.averageConfidence * (totalReviewed - 1) + assessment.confidence) / totalReviewed;
    sessionStats.value.averageTime =
      (sessionStats.value.averageTime * (totalReviewed - 1) + assessment.timeSpent) / totalReviewed;
    sessionStats.value.averageScore =
      (sessionStats.value.averageScore * (totalReviewed - 1) + assessment.score) / totalReviewed;

    // Check if baseline just completed and save stats
    checkAndSaveBaselineCompletion();
  }

  function nextCase() {
    currentCaseIndex.value++;
    hasCommitted.value = false;
    userResponse.value = null;
    responseStartTime.value = null;
  }

  // -------------------------------------------------------------------------
  // Actions: Persistence (localStorage + Firestore)
  // -------------------------------------------------------------------------

  const isSyncing = ref(false);
  const lastSyncTime = ref<Date | null>(null);

  function getStorageKey() {
    const authStore = useAuthStore();
    const userId = authStore.userProfile?.uid || 'anonymous';
    return `radsim_learning_data_${userId}`;
  }

  function saveLearningData() {
    // Save to localStorage (offline-first) with user-specific key
    try {
      const data = {
        learningData: learningData.value,
        findingStats: findingStats.value,
        baselineSessionStats: baselineSessionStats.value
      };
      localStorage.setItem(getStorageKey(), JSON.stringify(data, (key, value) => {
        // Convert Dates to ISO strings for storage
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }));
    } catch (error) {
      console.error('Failed to save learning data to localStorage:', error);
    }

    // Sync to Firestore if authenticated (debounced)
    debouncedFirestoreSync();
  }

  // Debounce Firestore sync to avoid too many writes
  let syncTimeout: NodeJS.Timeout | null = null;
  function debouncedFirestoreSync() {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      syncToFirestore();
    }, 2000); // Wait 2 seconds after last change
  }

  async function syncToFirestore() {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated || !authStore.userProfile) return;

    isSyncing.value = true;
    try {
      // Convert learning data to Firestore-compatible format
      const caseProgress: Record<string, CaseProgress> = {};
      for (const [caseId, data] of Object.entries(learningData.value)) {
        caseProgress[caseId] = {
          ...data,
          // Ensure dates are serializable
          lastReviewDate: data.lastReviewDate instanceof Date
            ? data.lastReviewDate
            : new Date(data.lastReviewDate),
          nextReviewDate: data.nextReviewDate instanceof Date
            ? data.nextReviewDate
            : new Date(data.nextReviewDate),
          performanceHistory: data.performanceHistory.map(h => ({
            ...h,
            date: h.date instanceof Date ? h.date : new Date(h.date)
          }))
        };
      }

      await syncCaseProgress(authStore.userProfile.uid, caseProgress);

      // Sync baseline session stats and finding stats to user document
      const userRef = doc(db, 'users', authStore.userProfile.uid);
      const userUpdateData: any = {
        updatedAt: serverTimestamp()
      };

      if (baselineSessionStats.value) {
        userUpdateData.baselineSessionStats = baselineSessionStats.value;
      }

      // Sync finding stats if they exist
      if (Object.keys(findingStats.value).length > 0) {
        userUpdateData.findingStats = findingStats.value;
      }

      await updateDoc(userRef, userUpdateData);

      await updateStreak(authStore.userProfile.uid);
      lastSyncTime.value = new Date();
      console.log('[LearningStore] Synced to Firestore');
    } catch (error) {
      console.error('Failed to sync to Firestore:', error);
    } finally {
      isSyncing.value = false;
    }
  }

  async function loadFromFirestore() {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated || !authStore.userProfile) return false;

    try {
      const userData = await getUserData(authStore.userProfile.uid);

      if (userData) {
        // Merge Firestore data with local data (Firestore wins for conflicts)
        const firestoreProgress = userData.caseProgress || {};

        for (const [caseId, progress] of Object.entries(firestoreProgress)) {
          // Convert any string dates to Date objects
          const convertedProgress = {
            ...progress,
            lastReviewDate: progress.lastReviewDate instanceof Date
              ? progress.lastReviewDate
              : new Date(progress.lastReviewDate as any),
            nextReviewDate: progress.nextReviewDate instanceof Date
              ? progress.nextReviewDate
              : new Date(progress.nextReviewDate as any),
            performanceHistory: (progress.performanceHistory || []).map((h: any) => ({
              ...h,
              date: h.date instanceof Date ? h.date : new Date(h.date?.toDate?.() || h.date)
            }))
          };

          // Use Firestore data if it's newer
          const localData = learningData.value[caseId];
          if (!localData || convertedProgress.timesReviewed > localData.timesReviewed) {
            learningData.value[caseId] = convertedProgress;
          }
        }

        // Also load baseline session stats if it exists
        if (userData.baselineSessionStats) {
          baselineSessionStats.value = userData.baselineSessionStats;
        }

        // Save merged data back to localStorage
        saveLearningDataToLocalStorage();
        console.log('[LearningStore] Loaded from Firestore');
        return true;
      } else {
        // Create new user document
        await createUserData(authStore.userProfile.uid, {
          email: authStore.userProfile.email,
          displayName: authStore.userProfile.displayName,
          photoURL: authStore.userProfile.photoURL
        });
        console.log('[LearningStore] Created new Firestore user document');
        return true;
      }
    } catch (error) {
      console.error('Failed to load from Firestore:', error);
      return false;
    }
  }

  function saveLearningDataToLocalStorage() {
    try {
      const data = {
        learningData: learningData.value,
        findingStats: findingStats.value,
        baselineSessionStats: baselineSessionStats.value
      };
      localStorage.setItem(getStorageKey(), JSON.stringify(data, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  function loadLearningData() {
    try {
      const stored = localStorage.getItem(getStorageKey());
      if (stored) {
        const data = JSON.parse(stored, (key, value) => {
          // Convert ISO strings back to Dates
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
            return new Date(value);
          }
          return value;
        });

        learningData.value = data.learningData || {};
        findingStats.value = data.findingStats || {};
        baselineSessionStats.value = data.baselineSessionStats || null;
      } else {
        // No data for this user - start fresh
        learningData.value = {};
        findingStats.value = {};
        baselineSessionStats.value = null;
      }
    } catch (error) {
      console.error('Failed to load learning data:', error);
    }
  }

  function clearLearningData() {
    learningData.value = {};
    findingStats.value = {};
    localStorage.removeItem(getStorageKey());
  }

  // Save session to Firestore when completed
  async function saveSessionToFirestore() {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated || !authStore.userProfile) return;

    try {
      await addSessionToHistory(authStore.userProfile.uid, sessionStats.value);
    } catch (error) {
      console.error('Failed to save session to Firestore:', error);
    }
  }

  // -------------------------------------------------------------------------
  // Session Persistence (survives page refresh)
  // -------------------------------------------------------------------------

  function getSessionStorageKey() {
    const authStore = useAuthStore();
    const userId = authStore.userProfile?.uid || 'anonymous';
    return `radsim_active_session_${userId}`;
  }

  function saveActiveSession() {
    if (!isSessionActive.value) {
      localStorage.removeItem(getSessionStorageKey());
      return;
    }

    try {
      const sessionData = {
        mode: currentMode.value,
        findingType: currentFindingType.value,
        cases: sessionCases.value,
        caseIndex: currentCaseIndex.value,
        stats: sessionStats.value,
        hasCommitted: hasCommitted.value,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(getSessionStorageKey(), JSON.stringify(sessionData));
      console.log('[LearningStore] Active session saved');
    } catch (error) {
      console.error('Failed to save active session:', error);
    }
  }

  function loadActiveSession(): boolean {
    try {
      const stored = localStorage.getItem(getSessionStorageKey());
      if (!stored) return false;

      const sessionData = JSON.parse(stored);

      // Check if session is not too old (max 24 hours)
      const timestamp = new Date(sessionData.timestamp);
      const now = new Date();
      const hoursDiff = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 24) {
        console.log('[LearningStore] Saved session expired, clearing');
        localStorage.removeItem(getSessionStorageKey());
        return false;
      }

      // Restore session state
      currentMode.value = sessionData.mode;
      currentFindingType.value = sessionData.findingType;
      sessionCases.value = sessionData.cases;
      currentCaseIndex.value = sessionData.caseIndex;
      sessionStats.value = sessionData.stats;
      hasCommitted.value = sessionData.hasCommitted || false;

      console.log('[LearningStore] Active session restored:', {
        mode: currentMode.value,
        caseIndex: currentCaseIndex.value,
        totalCases: sessionCases.value.length
      });

      return true;
    } catch (error) {
      console.error('Failed to load active session:', error);
      localStorage.removeItem(getSessionStorageKey());
      return false;
    }
  }

  function clearSavedSession() {
    localStorage.removeItem(getSessionStorageKey());
  }

  // Watch for session changes and auto-save
  watch(
    [currentMode, currentCaseIndex, sessionStats, hasCommitted],
    () => {
      if (isSessionActive.value) {
        saveActiveSession();
      }
    },
    { deep: true }
  );

  // Clear saved session when session ends
  watch(isSessionActive, (active) => {
    if (!active) {
      clearSavedSession();
    }
  });

  // -------------------------------------------------------------------------
  // Helper Methods
  // -------------------------------------------------------------------------

  function getCategoryProgress(findingType: string) {
    const allCases = caseLibrary.cases;
    const casesWithFinding = allCases.filter(c =>
      c.findings.some(f => f.name === findingType)
    );

    const totalCases = casesWithFinding.length;
    const reviewed = casesWithFinding.filter(c => learningData.value[c.id]).length;

    const today = new Date();
    const dueForReview = casesWithFinding.filter(c => {
      const data = learningData.value[c.id];
      return data && data.nextReviewDate <= today;
    }).length;

    return {
      totalCases,
      reviewed,
      dueForReview
    };
  }

  function initializeFromCaseLibrary(cases: RadiologyCaseMetadata[]) {
    // Initialize learning data for any new cases
    cases.forEach(caseItem => {
      if (!learningData.value[caseItem.id]) {
        learningData.value[caseItem.id] = createNewCaseData(caseItem.id);
      }
    });
    saveLearningData();
  }

  async function startSingleCaseSession(caseItem: RadiologyCaseMetadata) {
    // Start a single-case learning session (for when user clicks a specific case)
    currentMode.value = 'focused';
    currentFindingType.value = null; // No specific finding filter

    sessionCases.value = [caseItem];
    currentCaseIndex.value = 0;
    resetSessionStats();

    // Start the case immediately
    startCase();
  }

  // -------------------------------------------------------------------------
  // Initialization & Auth State Handling
  // -------------------------------------------------------------------------

  // Function to reload data when user changes (login/logout/switch)
  async function onAuthStateChange() {
    console.log('[LearningStore] Auth state changed, reloading user data');
    // Clear current session data
    endSession();
    resetSessionStats();
    // Load user-specific data from localStorage first
    loadLearningData();
    // Then load from Firestore if authenticated
    await loadFromFirestore();
  }

  // Load finding stats and baseline stats from Firestore
  async function loadFromFirestore() {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated || !authStore.userProfile) return;

    try {
      const userData = await getUserData(authStore.userProfile.uid);
      if (userData) {
        // Load finding stats from Firestore if available
        if (userData.findingStats) {
          findingStats.value = userData.findingStats;
          console.log('[LearningStore] Loaded findingStats from Firestore:', userData.findingStats);
        }
        // Load baseline session stats from Firestore if available
        if (userData.baselineSessionStats) {
          baselineSessionStats.value = userData.baselineSessionStats;
          console.log('[LearningStore] Loaded baselineSessionStats from Firestore');
        }
        // Save to localStorage to keep in sync
        saveLearningDataToLocalStorage();
      }
    } catch (error) {
      console.error('[LearningStore] Failed to load from Firestore:', error);
    }
  }

  // Load persisted data on store creation
  loadLearningData();

  // -------------------------------------------------------------------------
  // Annotation Management
  // -------------------------------------------------------------------------

  function setAnnotationAttachment(image: File, description: string) {
    annotationAttachment.value = {
      image,
      thumbnail: URL.createObjectURL(image),
      description
    };
    console.log('[LearningStore] Annotation attachment set:', description);
  }

  function clearAnnotationAttachment() {
    if (annotationAttachment.value) {
      URL.revokeObjectURL(annotationAttachment.value.thumbnail);
      annotationAttachment.value = null;
    }
  }

  // Ground truth annotation overlay state
  const groundTruthAnnotations = ref<Array<{
    name: string;
    location?: string;
    roi?: { x: number; y: number; width: number; height: number };
  }> | null>(null);

  function showGroundTruthAnnotations(findings: Array<{
    name: string;
    location?: string;
    roi?: { x: number; y: number; width: number; height: number };
  }>) {
    groundTruthAnnotations.value = findings;
    console.log('[LearningStore] Ground truth annotations set:', findings);
    // The actual overlay rendering is handled by the viewer component
    // which watches this state
  }

  function clearGroundTruthAnnotations() {
    groundTruthAnnotations.value = null;
  }

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------

  return {
    // State
    currentMode,
    currentFindingType,
    sessionCases,
    currentCaseIndex,
    currentCase,
    userResponse,
    hasCommitted,
    sessionStats,
    baselineSessionStats,
    learningData,
    findingStats,
    annotationAttachment,
    groundTruthAnnotations,
    isSyncing,
    lastSyncTime,
    showExitConfirmation,

    // Computed
    isSessionActive,
    sessionProgress,
    casesDueToday,
    hasCompletedBaseline,
    baselineProgress,

    // Actions
    startFocusedSession,
    startMixedSession,
    startSingleCaseSession,
    endSession,
    startCase,
    submitResponse,
    assessResponse,
    updateLearningProgress,
    nextCase,
    saveLearningData,
    loadLearningData,
    clearLearningData,
    onAuthStateChange,
    setAnnotationAttachment,
    clearAnnotationAttachment,
    showGroundTruthAnnotations,
    clearGroundTruthAnnotations,
    requestExitConfirmation,
    cancelExitConfirmation,
    sessionMissedCases,
    startReviewMistakesSession,

    // Firestore sync
    syncToFirestore,
    loadFromFirestore,
    saveSessionToFirestore,

    // Session persistence
    saveActiveSession,
    loadActiveSession,
    clearSavedSession,

    // Helpers
    getCategoryProgress,
    initializeFromCaseLibrary
  };
});
