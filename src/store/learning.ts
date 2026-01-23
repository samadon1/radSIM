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
  correctFindings: number;
  missedFindings: number;
  falsePositives: number;
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

    // Select cases (for now, random selection - can enhance with difficulty matching)
    const allCases = caseLibrary.cases;
    sessionCases.value = randomSample(allCases, caseCount);

    // Reset session state
    currentCaseIndex.value = 0;
    resetSessionStats();
  }

  async function startMixedSession(caseCount: number = 20) {
    currentMode.value = 'mixed';
    currentFindingType.value = null;

    // Load master index
    await caseLibrary.loadLibrary('/cases/nih-learning/master-index.json');

    // Select cases using spaced repetition
    sessionCases.value = selectCasesForMixedMode(caseCount);

    // Reset session state
    currentCaseIndex.value = 0;
    resetSessionStats();
  }

  function selectCasesForMixedMode(count: number): RadiologyCaseMetadata[] {
    const allCases = caseLibrary.cases;
    const today = new Date();
    const selected: RadiologyCaseMetadata[] = [];

    // Priority 1: Overdue cases (past due date)
    const overdue = allCases
      .filter(c => {
        const data = learningData.value[c.id];
        return data && data.nextReviewDate < today;
      })
      .sort((a, b) => {
        const aDate = learningData.value[a.id].nextReviewDate;
        const bDate = learningData.value[b.id].nextReviewDate;
        return aDate.getTime() - bDate.getTime(); // Oldest first
      });

    selected.push(...overdue.slice(0, count));

    // Priority 2: Due today
    if (selected.length < count) {
      const dueToday = allCases
        .filter(c => {
          const data = learningData.value[c.id];
          return data && isSameDay(data.nextReviewDate, today) && !selected.includes(c);
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
          return aAvg - bAvg; // Lowest scores first
        });
      selected.push(...struggling.slice(0, count - selected.length));
    }

    // Priority 4: New cases (never reviewed) - limit to 25%
    if (selected.length < count) {
      const newCases = allCases.filter(c => !learningData.value[c.id]);
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
    saveLearningData();

    // Update session stats
    sessionStats.value.casesReviewed++;
    sessionStats.value.correctFindings += assessment.correct.length;
    sessionStats.value.missedFindings += assessment.missed.length;
    sessionStats.value.falsePositives += assessment.falsePositives.length;

    const totalReviewed = sessionStats.value.casesReviewed;
    sessionStats.value.averageConfidence =
      (sessionStats.value.averageConfidence * (totalReviewed - 1) + assessment.confidence) / totalReviewed;
    sessionStats.value.averageTime =
      (sessionStats.value.averageTime * (totalReviewed - 1) + assessment.timeSpent) / totalReviewed;
    sessionStats.value.averageScore =
      (sessionStats.value.averageScore * (totalReviewed - 1) + assessment.score) / totalReviewed;
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

  function saveLearningData() {
    // Save to localStorage (offline-first)
    try {
      const data = {
        learningData: learningData.value,
        findingStats: findingStats.value
      };
      localStorage.setItem('radsim_learning_data', JSON.stringify(data, (key, value) => {
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
        findingStats: findingStats.value
      };
      localStorage.setItem('radsim_learning_data', JSON.stringify(data, (key, value) => {
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
      const stored = localStorage.getItem('radsim_learning_data');
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
      }
    } catch (error) {
      console.error('Failed to load learning data:', error);
    }
  }

  function clearLearningData() {
    learningData.value = {};
    findingStats.value = {};
    localStorage.removeItem('radsim_learning_data');
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

  const SESSION_STORAGE_KEY = 'radsim_active_session';

  function saveActiveSession() {
    if (!isSessionActive.value) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
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
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      console.log('[LearningStore] Active session saved');
    } catch (error) {
      console.error('Failed to save active session:', error);
    }
  }

  function loadActiveSession(): boolean {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return false;

      const sessionData = JSON.parse(stored);

      // Check if session is not too old (max 24 hours)
      const timestamp = new Date(sessionData.timestamp);
      const now = new Date();
      const hoursDiff = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 24) {
        console.log('[LearningStore] Saved session expired, clearing');
        localStorage.removeItem(SESSION_STORAGE_KEY);
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
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return false;
    }
  }

  function clearSavedSession() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
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
  // Initialization
  // -------------------------------------------------------------------------

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
    setAnnotationAttachment,
    clearAnnotationAttachment,
    showGroundTruthAnnotations,
    clearGroundTruthAnnotations,
    requestExitConfirmation,
    cancelExitConfirmation,

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
