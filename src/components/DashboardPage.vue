<template>
  <div class="dashboard-page">
    <!-- Loading Overlay -->
    <Transition name="fade">
      <div v-if="isLoadingCase" class="loading-overlay">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <span class="loading-text">Loading case...</span>
        </div>
      </div>
    </Transition>

    <!-- Shared App Header -->
    <AppHeader />

    <!-- Dashboard Content - No page scroll -->
    <div class="dashboard-content">
      <!-- Top Row: Greeting + Stats + Progress Ring -->
      <div class="top-row">
        <!-- Left: Greeting + CTA -->
        <div class="greeting-section">
          <div class="greeting-minimal">
            <h1>{{ greeting }}</h1>
            <div class="streak-inline" v-if="stats.streak > 0">
              <span class="streak-fire">🔥</span>
              <span class="streak-text">{{ stats.streak }} day streak</span>
            </div>
          </div>

          <div class="primary-action">
            <button class="hero-button" @click="startLearning">
              <div class="button-content">
                <div class="button-main">
                  <v-icon size="24">mdi-play</v-icon>
                  <span>{{ hasCompletedBaseline ? 'Continue Learning' : 'Start Baseline' }}</span>
                </div>
                <div class="button-subtitle" v-if="!hasCompletedBaseline">
                  {{ calibration.completed }}/{{ calibration.total }} cases to personalize your path
                </div>
              </div>
              <div class="button-arrow">
                <v-icon size="20">mdi-arrow-right</v-icon>
              </div>
            </button>
          </div>
        </div>

        <!-- Center: Performance Header + Stats -->
        <div class="stats-section">
          <div class="section-header-inline">
            <h2>Your Performance</h2>
            <div class="period-toggle">
              <button
                v-for="p in periods"
                :key="p.value"
                @click="period = p.value"
                :class="{ active: period === p.value }"
                class="period-btn"
              >
                {{ p.label }}
              </button>
            </div>
          </div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">{{ stats.accuracy > 0 ? stats.accuracy + '%' : '-' }}</div>
              <div class="stat-label">Accuracy</div>
              <div class="stat-trend" v-if="stats.accuracy > 0" :class="{ up: stats.accuracyTrend > 0 }">
                <v-icon size="12">{{ stats.accuracyTrend > 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>
                {{ Math.abs(stats.accuracyTrend) }}%
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ stats.weeklyCompleted > 0 ? stats.weeklyCompleted : '-' }}</div>
              <div class="stat-label">This Week</div>
              <div class="stat-benchmark">Goal: {{ stats.weeklyGoal }}</div>
            </div>
          </div>
        </div>

        <!-- Right: Weekly Progress Ring -->
        <div class="progress-section">
          <div class="progress-visual">
            <svg viewBox="0 0 200 200" class="progress-svg">
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                stroke-width="8"
              />
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="url(#gradient)"
                stroke-width="8"
                stroke-linecap="round"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="progressOffset"
                transform="rotate(-90 100 100)"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#4263eb" />
                  <stop offset="100%" stop-color="#667eea" />
                </linearGradient>
              </defs>
            </svg>
            <div class="progress-center">
              <div class="progress-big">{{ weeklyProgress > 0 ? Math.round(weeklyProgress) + '%' : '-' }}</div>
              <div class="progress-label">Weekly Goal</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Row: Practice Cards -->
      <div class="bottom-row">
        <!-- Practice by Finding/Scenario -->
        <div class="practice-card findings-card">
          <div class="practice-header">
            <span class="practice-label">Practice by</span>
            <div class="practice-toggle">
              <button
                @click="practiceMode = 'finding'"
                :class="{ active: practiceMode === 'finding' }"
              >Finding</button>
              <button
                @click="practiceMode = 'scenario'"
                :class="{ active: practiceMode === 'scenario' }"
              >Scenario</button>
            </div>
          </div>
          <div class="finding-list-scroll">
            <!-- Finding Mode -->
            <template v-if="practiceMode === 'finding'">
              <!-- Baseline Assessment Row - First Item, highlighted when incomplete -->
              <button
                class="finding-row baseline-row"
                :class="{ 'baseline-complete': hasCompletedBaseline, 'baseline-highlight': !hasCompletedBaseline }"
                @click="startCalibration"
              >
                <div class="baseline-icon" v-if="!hasCompletedBaseline">
                  <v-icon size="18" color="#4263eb">mdi-clipboard-check-outline</v-icon>
                </div>
                <div class="baseline-icon baseline-icon-complete" v-else>
                  <v-icon size="18" color="#22c55e">mdi-check-circle</v-icon>
                </div>
                <div class="finding-info">
                  <span class="finding-name">{{ hasCompletedBaseline ? 'Baseline Complete' : 'Baseline Assessment' }}</span>
                  <span class="finding-cases">{{ hasCompletedBaseline ? 'Personalized learning unlocked' : `${calibration.completed}/${calibration.total} cases · Complete to unlock findings` }}</span>
                </div>
                <div class="finding-stats" v-if="!hasCompletedBaseline">
                  <div class="finding-bar-mini baseline-bar">
                    <div
                      class="finding-bar-fill-mini"
                      :style="{
                        width: calibrationProgress + '%',
                        background: '#4263eb'
                      }"
                    ></div>
                  </div>
                  <span class="finding-percent" style="color: #4263eb;">
                    {{ Math.round(calibrationProgress) }}%
                  </span>
                </div>
                <v-icon size="18" class="finding-arrow">{{ hasCompletedBaseline ? 'mdi-check' : 'mdi-chevron-right' }}</v-icon>
              </button>

              <!-- Finding Rows - Locked until Baseline complete -->
              <button
                v-for="finding in findings"
                :key="finding.name"
                class="finding-row"
                :class="{ 'finding-row-locked': !hasCompletedBaseline }"
                :disabled="!hasCompletedBaseline"
                @click="hasCompletedBaseline && startFocusedPractice(finding.name)"
              >
                <div class="finding-info">
                  <span class="finding-name">{{ finding.name }}</span>
                  <span class="finding-cases">{{ finding.cases }} {{ finding.cases === 1 ? 'case' : 'cases' }}{{ finding.completed > 0 ? ` · ${finding.completed} reviewed` : '' }}</span>
                </div>
                <div class="finding-stats" v-if="hasCompletedBaseline">
                  <div class="finding-bar-mini">
                    <div
                      v-if="finding.accuracy !== null"
                      class="finding-bar-fill-mini"
                      :style="{
                        width: finding.accuracy + '%',
                        background: getColor(finding.accuracy)
                      }"
                    ></div>
                  </div>
                  <span class="finding-percent" :style="{ color: finding.accuracy !== null ? getColor(finding.accuracy) : 'rgba(255,255,255,0.3)' }">
                    {{ finding.accuracy !== null ? finding.accuracy + '%' : '--' }}
                  </span>
                </div>
                <v-icon size="18" class="finding-arrow">{{ hasCompletedBaseline ? 'mdi-chevron-right' : 'mdi-lock' }}</v-icon>
              </button>
            </template>

            <!-- Scenario Mode -->
            <template v-else>
              <div class="scenario-coming-soon">
                <div class="coming-soon-content">
                  <v-icon size="48" color="rgba(255,255,255,0.2)">mdi-timer-sand</v-icon>
                  <h4>Coming Soon</h4>
                  <p>Timed clinical scenarios are being developed. Check back soon for immersive simulation practice.</p>
                </div>
              </div>
              <div class="scenario-list-preview">
                <button
                  v-for="scenario in scenarios"
                  :key="scenario.name"
                  class="finding-row scenario-row-disabled"
                  disabled
                >
                  <div class="scenario-icon">
                    <v-icon size="18" :color="scenario.color">{{ scenario.icon }}</v-icon>
                  </div>
                  <div class="finding-info">
                    <span class="finding-name">{{ scenario.name }}</span>
                    <span class="finding-cases">{{ scenario.cases }} cases · {{ scenario.timeLimit }}</span>
                  </div>
                  <v-icon size="18" class="finding-arrow">mdi-lock</v-icon>
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- Activity Calendar -->
        <div class="practice-card">
          <h3>Activity This Month</h3>
          <div class="calendar-minimal">
            <div class="calendar-labels">
              <span>M</span><span>T</span><span>W</span><span>T</span>
              <span>F</span><span>S</span><span>S</span>
            </div>
            <div class="calendar-grid">
              <div
                v-for="(day, i) in calendarDays"
                :key="i"
                class="cal-day"
                :class="{
                  active: day.active,
                  today: day.today,
                  empty: !day.date
                }"
                :style="{
                  opacity: day.active ? (0.3 + (day.intensity * 0.7)) : 1
                }"
              >
              </div>
            </div>
            <div class="calendar-legend">
              <span>Less</span>
              <div class="legend-scale">
                <span v-for="i in 5" :key="i" :style="{ opacity: 0.2 + (i * 0.2) }"></span>
              </div>
              <span>More</span>
            </div>
          </div>
        </div>

        <!-- Mastery Progress -->
        <div class="practice-card">
          <h3>Mastery Progress</h3>
          <div class="mastery-content">
            <div class="mastery-total">
              <span class="mastery-big">{{ masteryStats.seen > 0 ? masteryStats.seen : '-' }}</span>
              <span class="mastery-of">/ {{ masteryStats.totalCases }}</span>
              <span class="mastery-label">cases seen</span>
            </div>
            <div class="mastery-bar">
              <div
                class="mastery-segment mastered"
                :style="{ width: (masteryStats.mastered / masteryStats.totalCases * 100) + '%' }"
              ></div>
              <div
                class="mastery-segment learning"
                :style="{ width: (masteryStats.learning / masteryStats.totalCases * 100) + '%' }"
              ></div>
            </div>
            <div class="mastery-legend">
              <span class="legend-item"><span class="dot mastered"></span>{{ masteryStats.mastered > 0 ? masteryStats.mastered : '-' }} mastered</span>
              <span class="legend-item"><span class="dot learning"></span>{{ masteryStats.learning > 0 ? masteryStats.learning : '-' }} learning</span>
              <span class="legend-item"><span class="dot not-started"></span>{{ masteryStats.notStarted }} new</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppHeader from './AppHeader.vue';
import { useAuthStore } from '@/src/store/auth';
import { useLearningStore } from '@/src/store/learning';
import { useCaseLibraryStore } from '@/src/store/case-library';
import { loadUrls } from '@/src/actions/loadUserFiles';

const router = useRouter();
const authStore = useAuthStore();
const learningStore = useLearningStore();
const caseLibraryStore = useCaseLibraryStore();

// Loading state
const isLoadingCase = ref(false);

// State
const period = ref('week');
const periods = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'all', label: 'All' }
];

// Practice mode toggle
const practiceMode = ref<'finding' | 'scenario'>('finding');

// Baseline completion status
const hasCompletedBaseline = computed(() => learningStore.hasCompletedBaseline);

// Greeting
const greeting = computed(() => {
  const hour = new Date().getHours();
  const firstName = authStore.userProfile?.displayName?.split(' ')[0];
  let timeGreeting = '';

  if (hour < 12) timeGreeting = 'Good morning';
  else if (hour < 17) timeGreeting = 'Good afternoon';
  else timeGreeting = 'Good evening';

  return firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
});

// Stats - computed from learning store data
const stats = computed(() => {
  const learningData = learningStore.learningData;
  const allHistory = Object.values(learningData).flatMap(d => d.performanceHistory || []);

  // Filter history based on selected period
  let filteredHistory = allHistory;
  const now = new Date();

  if (period.value === 'week') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    filteredHistory = allHistory.filter(h => new Date(h.date) >= weekAgo);
  } else if (period.value === 'month') {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    filteredHistory = allHistory.filter(h => new Date(h.date) >= monthAgo);
  }
  // 'all' uses allHistory as-is

  // Calculate accuracy for the selected period
  const totalScore = filteredHistory.reduce((sum, h) => sum + (h.score || 0), 0);
  const accuracy = filteredHistory.length > 0 ? Math.round(totalScore / filteredHistory.length) : 0;

  // Calculate accuracy trend (compare current period to previous period)
  let accuracyTrend = 0;
  if (period.value === 'week') {
    // This week vs last week
    const weekAgoDate = new Date();
    weekAgoDate.setDate(weekAgoDate.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const thisWeekHistory = allHistory.filter(h => new Date(h.date) >= weekAgoDate);
    const lastWeekHistory = allHistory.filter(h => {
      const d = new Date(h.date);
      return d >= twoWeeksAgo && d < weekAgoDate;
    });

    const thisWeekAvg = thisWeekHistory.length > 0
      ? thisWeekHistory.reduce((s, h) => s + (h.score || 0), 0) / thisWeekHistory.length
      : 0;
    const lastWeekAvg = lastWeekHistory.length > 0
      ? lastWeekHistory.reduce((s, h) => s + (h.score || 0), 0) / lastWeekHistory.length
      : 0;

    if (lastWeekAvg > 0) {
      accuracyTrend = Math.round(thisWeekAvg - lastWeekAvg);
    }
  } else if (period.value === 'month') {
    // This month vs last month
    const monthAgoDate = new Date();
    monthAgoDate.setMonth(monthAgoDate.getMonth() - 1);
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const thisMonthHistory = allHistory.filter(h => new Date(h.date) >= monthAgoDate);
    const lastMonthHistory = allHistory.filter(h => {
      const d = new Date(h.date);
      return d >= twoMonthsAgo && d < monthAgoDate;
    });

    const thisMonthAvg = thisMonthHistory.length > 0
      ? thisMonthHistory.reduce((s, h) => s + (h.score || 0), 0) / thisMonthHistory.length
      : 0;
    const lastMonthAvg = lastMonthHistory.length > 0
      ? lastMonthHistory.reduce((s, h) => s + (h.score || 0), 0) / lastMonthHistory.length
      : 0;

    if (lastMonthAvg > 0) {
      accuracyTrend = Math.round(thisMonthAvg - lastMonthAvg);
    }
  }
  // For 'all', trend doesn't make sense - keep as 0

  // Calculate streak (consecutive days with activity)
  const streak = calculateStreak(learningData);

  // Weekly stats for the "This Week" card
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekHistory = allHistory.filter(h => new Date(h.date) >= weekAgo);

  return {
    streak,
    accuracy,
    accuracyTrend,
    dueToday: learningStore.casesDueToday,
    weeklyCompleted: weekHistory.length,
    weeklyGoal: 50
  };
});

// Calculate streak from learning data
function calculateStreak(learningData: Record<string, any>): number {
  const allHistory = Object.values(learningData).flatMap(d => d.performanceHistory || []);
  if (allHistory.length === 0) return 0;

  // Get unique dates with activity
  const activeDates = new Set<string>();
  allHistory.forEach(h => {
    const date = new Date(h.date);
    activeDates.add(date.toDateString());
  });

  // Count consecutive days ending today
  let streak = 0;
  const checkDate = new Date();

  while (activeDates.has(checkDate.toDateString())) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

// Calibration progress (first 20 cases reviewed)
const calibration = computed(() => {
  const totalReviewed = Object.values(learningStore.learningData).filter(d => d.timesReviewed > 0).length;
  return {
    completed: Math.min(totalReviewed, 20),
    total: 20
  };
});

// Findings data - computed from actual performance
const findings = computed(() => {
  const findingTypes = ['Pneumonia', 'Cardiomegaly', 'Effusion', 'Atelectasis', 'Pneumothorax', 'Mass', 'Nodule'];
  const learningData = learningStore.learningData;
  const cases = caseLibraryStore.cases;

  return findingTypes.map(name => {
    // Find cases that have this specific finding
    const casesWithThisFinding = cases.filter(c =>
      c.findings?.some(f => f.name.toLowerCase() === name.toLowerCase())
    );

    // Get learning data for those specific cases
    let totalScore = 0;
    let reviewCount = 0;

    casesWithThisFinding.forEach(caseItem => {
      const caseData = learningData[caseItem.id];
      if (caseData?.performanceHistory) {
        caseData.performanceHistory.forEach((h: any) => {
          totalScore += h.score || 0;
          reviewCount++;
        });
      }
    });

    const accuracy = reviewCount > 0 ? Math.round(totalScore / reviewCount) : null;

    return {
      name,
      accuracy, // null if no data (will show "--" in UI)
      cases: casesWithThisFinding.length, // Total available cases with this finding
      completed: reviewCount // How many times reviewed
    };
  });
});

// Scenarios data (timed clinical simulations)
const scenarios = ref([
  { name: 'Emergency Room', icon: 'mdi-ambulance', color: '#ef4444', cases: 45, timeLimit: '2 min/case', accuracy: 74 },
  { name: 'ICU Rounds', icon: 'mdi-heart-pulse', color: '#f97316', cases: 38, timeLimit: '3 min/case', accuracy: 81 },
  { name: 'Rapid Triage', icon: 'mdi-timer-alert', color: '#eab308', cases: 60, timeLimit: '1 min/case', accuracy: 68 },
  { name: 'Outpatient Clinic', icon: 'mdi-hospital-building', color: '#22c55e', cases: 85, timeLimit: '5 min/case', accuracy: 91 },
  { name: 'Night Shift', icon: 'mdi-weather-night', color: '#8b5cf6', cases: 32, timeLimit: '2 min/case', accuracy: 77 },
  { name: 'Multi-Trauma', icon: 'mdi-car-emergency', color: '#ec4899', cases: 28, timeLimit: '90 sec/case', accuracy: 65 }
]);

// Mastery progress - shows overall progress through the case library
const masteryStats = computed(() => {
  const totalCases = caseLibraryStore.cases.length || 861; // Default to 861 if not loaded
  const learningData = learningStore.learningData;
  const reviewed = Object.values(learningData);

  // Mastered: >80% accuracy AND 3+ reviews
  const mastered = reviewed.filter(d => {
    if (!d.performanceHistory || d.performanceHistory.length === 0) return false;
    const avgScore = d.performanceHistory.reduce((s, h) => s + (h.score || 0), 0) / d.performanceHistory.length;
    return avgScore >= 80 && d.timesReviewed >= 3;
  }).length;

  // Learning: reviewed but not yet mastered
  const learning = reviewed.filter(d => {
    if (!d.performanceHistory || d.performanceHistory.length === 0) return d.timesReviewed > 0;
    const avgScore = d.performanceHistory.reduce((s, h) => s + (h.score || 0), 0) / d.performanceHistory.length;
    return d.timesReviewed > 0 && (avgScore < 80 || d.timesReviewed < 3);
  }).length;

  const notStarted = Math.max(0, totalCases - mastered - learning);
  const seen = mastered + learning;

  return { totalCases, mastered, learning, notStarted, seen };
});

// Calendar days - computed from actual activity history
const calendarDays = computed(() => {
  const learningData = learningStore.learningData;
  const allHistory = Object.values(learningData).flatMap(d => d.performanceHistory || []);

  // Get activity dates for the last 35 days
  const today = new Date();
  const activityByDate = new Map<string, number>();

  allHistory.forEach(h => {
    const date = new Date(h.date);
    const dateStr = date.toDateString();
    activityByDate.set(dateStr, (activityByDate.get(dateStr) || 0) + 1);
  });

  // Generate calendar grid (5 weeks)
  return Array(35).fill(null).map((_, i) => {
    const date = new Date();
    date.setDate(today.getDate() - (34 - i)); // Start from 34 days ago
    const dateStr = date.toDateString();
    const activity = activityByDate.get(dateStr) || 0;

    return {
      date: true,
      active: activity > 0,
      intensity: Math.min(activity / 10, 1), // Normalize intensity (max 10 cases = full intensity)
      today: i === 34
    };
  });
});

// Computed
const weeklyProgress = computed(() => (stats.value.weeklyCompleted / stats.value.weeklyGoal) * 100);
const calibrationProgress = computed(() => (calibration.value.completed / calibration.value.total) * 100);

// Progress ring
const circumference = 2 * Math.PI * 90;
const progressOffset = computed(() => {
  const progress = weeklyProgress.value / 100;
  return circumference - (progress * circumference);
});

// Methods
function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getColor(accuracy: number) {
  if (accuracy >= 85) return '#22c55e';
  if (accuracy >= 70) return '#fbbf24';
  return '#ef4444';
}

async function startLearning() {
  isLoadingCase.value = true;
  try {
    // Start mixed practice session
    await learningStore.startMixedSession();

    // Load the current case
    const currentCaseData = learningStore.currentCase;
    if (currentCaseData) {
      caseLibraryStore.selectCaseByMetadata(currentCaseData);

      // Load the image files - ensure paths are absolute
      const rawPaths = Array.isArray(currentCaseData.files.imagePath)
        ? currentCaseData.files.imagePath
        : [currentCaseData.files.imagePath];
      // Ensure paths start with / for absolute resolution
      const imagePaths = rawPaths.map((p: string) => p.startsWith('/') ? p : `/${p}`);
      await loadUrls({ urls: imagePaths });

      // Navigate to viewer
      router.push('/app');
    } else {
      console.warn('No case available to load');
    }
  } catch (error) {
    console.error('Failed to start learning session:', error);
  } finally {
    isLoadingCase.value = false;
  }
}

async function startCalibration() {
  // Start calibration - uses mixed session for now
  // TODO: Implement dedicated calibration mode
  await startLearning();
}

async function startScenario(scenarioName: string) {
  // Start timed scenario session
  // TODO: Implement scenario mode with timer
  console.log('Starting scenario:', scenarioName);
  await startLearning();
}

async function startFocusedPractice(finding: string) {
  isLoadingCase.value = true;
  try {
    // Start focused session on specific finding
    await learningStore.startFocusedSession(finding);

    // Load the current case
    const currentCaseData = learningStore.currentCase;
    if (currentCaseData) {
      caseLibraryStore.selectCaseByMetadata(currentCaseData);

      // Load the image files - ensure paths are absolute
      const rawPaths = Array.isArray(currentCaseData.files.imagePath)
        ? currentCaseData.files.imagePath
        : [currentCaseData.files.imagePath];
      // Ensure paths start with / for absolute resolution
      const imagePaths = rawPaths.map((p: string) => p.startsWith('/') ? p : `/${p}`);
      await loadUrls({ urls: imagePaths });

      // Navigate to viewer
      router.push('/app');
    } else {
      console.warn('No case available for finding:', finding);
    }
  } catch (error) {
    console.error('Failed to start focused practice:', error);
  } finally {
    isLoadingCase.value = false;
  }
}

// Initialize case library on mount
onMounted(async () => {
  // Load learning progress from Firestore if authenticated
  if (authStore.isAuthenticated) {
    await learningStore.loadFromFirestore();
  }

  if (!caseLibraryStore.hasCases) {
    try {
      await caseLibraryStore.loadLibrary('/cases/nih-learning/master-index.json');
    } catch (error) {
      console.warn('Could not load NIH learning cases, trying default library');
      try {
        await caseLibraryStore.loadLibrary('/cases/chest-xray-library.json');
      } catch (err) {
        console.error('Could not load any case library');
      }
    }
  }

  // Initialize learning store with cases
  if (caseLibraryStore.cases.length > 0) {
    learningStore.initializeFromCaseLibrary(caseLibraryStore.cases);
  }
});
</script>

<style scoped>
.dashboard-page {
  width: 100%;
  height: 100vh;
  background: #000;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dashboard-content {
  flex: 1;
  padding: 100px 48px 40px 48px;
  max-width: 1920px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 32px;
  overflow: hidden;
}

/* Top Row - Fixed height */
.top-row {
  display: grid;
  grid-template-columns: 1fr 1.2fr 220px;
  gap: 32px;
  align-items: start;
  flex-shrink: 0;
}

.greeting-section {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.greeting-minimal h1 {
  font-size: 42px;
  font-weight: 600;
  letter-spacing: -1px;
  margin: 0 0 8px 0;
}

.streak-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.2);
  border-radius: 20px;
  width: fit-content;
}

.streak-fire {
  font-size: 16px;
}

.streak-text {
  font-size: 14px;
  font-weight: 500;
  color: #ff9800;
}

/* Primary Action */
.primary-action {
  margin: 24px 0 0 0;
}

.hero-button {
  width: 100%;
  max-width: 360px;
  padding: 18px 20px;
  background: linear-gradient(135deg, #4263eb, #5273ff);
  border: none;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
  box-shadow: 0 8px 24px rgba(66, 99, 235, 0.3);
}

.hero-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(66, 99, 235, 0.4);
}

.button-content {
  text-align: left;
}

.button-main {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 4px;
}

.button-subtitle {
  font-size: 13px;
  opacity: 0.9;
  margin-left: 36px;
}

.button-arrow {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 8px;
}

/* Stats Section */
.stats-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header-inline {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header-inline h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
}

.period-toggle {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.period-btn {
  padding: 6px 16px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.period-btn.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-card {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
}

.stat-card .stat-number {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 2px;
}

.stat-card .stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 6px;
}

.stat-card .stat-trend {
  font-size: 12px;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-card .stat-trend.up {
  color: #22c55e;
}

.stat-card .stat-progress {
  margin-top: 4px;
}

.stat-card .stat-progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.stat-card .stat-progress-fill {
  height: 100%;
  background: #4263eb;
  border-radius: 2px;
}

.stat-card .stat-benchmark {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
}

/* Progress Section */
.progress-section {
  display: flex;
  justify-content: center;
  align-items: center;
}

.progress-visual {
  position: relative;
  width: 180px;
  height: 180px;
}

.progress-svg {
  width: 100%;
  height: 100%;
}

.progress-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.progress-big {
  font-size: 42px;
  font-weight: 600;
  letter-spacing: -1px;
}

.progress-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.5);
}

/* Bottom Row - Fills remaining space */
.bottom-row {
  flex: 1;
  display: grid;
  grid-template-columns: 2fr 1.2fr 1.2fr;
  gap: 24px;
  min-height: 0;
}

.practice-card {
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: hidden;
  min-height: 0;
}

.practice-card h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}

/* Findings Card */
.findings-card {
  padding: 0 !important;
}

.practice-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 16px;
  flex-shrink: 0;
}

.practice-label {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.practice-toggle {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.practice-toggle button {
  padding: 6px 14px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.practice-toggle button.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.practice-toggle button:hover:not(.active) {
  color: rgba(255, 255, 255, 0.7);
}

.scenario-icon {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Scenario Coming Soon Overlay */
.scenario-coming-soon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.coming-soon-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.coming-soon-content h4 {
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.coming-soon-content p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
  max-width: 280px;
  line-height: 1.5;
}

.scenario-list-preview {
  opacity: 0.5;
}

.scenario-row-disabled {
  pointer-events: none;
  cursor: not-allowed;
}

.scenario-row-disabled .finding-name {
  color: rgba(255, 255, 255, 0.5);
}

.scenario-row-disabled .finding-cases {
  color: rgba(255, 255, 255, 0.25);
}

.scenario-row-disabled .finding-arrow {
  color: rgba(255, 255, 255, 0.2);
}

.finding-list-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.finding-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: transparent;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  width: 100%;
}

.finding-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.finding-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.finding-name {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 500;
}

.finding-cases {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

.finding-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.finding-bar-mini {
  width: 60px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.finding-bar-fill-mini {
  height: 100%;
  border-radius: 2px;
}

.finding-percent {
  font-size: 13px;
  font-weight: 600;
  min-width: 36px;
  text-align: right;
}

.finding-arrow {
  color: rgba(255, 255, 255, 0.3);
  transition: all 0.15s;
  flex-shrink: 0;
}

.finding-row:hover .finding-arrow {
  color: rgba(255, 255, 255, 0.6);
  transform: translateX(2px);
}

/* Baseline row styling */
.baseline-row {
  border-top: none !important;
}

.baseline-icon {
  width: 36px;
  height: 36px;
  background: rgba(66, 99, 235, 0.15);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.baseline-icon-complete {
  background: rgba(34, 197, 94, 0.15);
}

.baseline-highlight {
  background: rgba(66, 99, 235, 0.08);
  border-bottom: 1px solid rgba(66, 99, 235, 0.15) !important;
}

.baseline-highlight:hover {
  background: rgba(66, 99, 235, 0.12);
}

.baseline-highlight .finding-name {
  color: #4263eb;
  font-weight: 600;
}

.baseline-complete {
  opacity: 0.7;
}

.baseline-complete .finding-name {
  color: #22c55e;
}

.baseline-complete .finding-arrow {
  color: #22c55e;
}

.baseline-bar {
  width: 80px;
}

/* Locked finding rows */
.finding-row-locked {
  cursor: not-allowed;
  opacity: 0.5;
}

.finding-row-locked:hover {
  background: transparent;
}

.finding-row-locked .finding-arrow {
  color: rgba(255, 255, 255, 0.25);
}

.finding-row-locked:hover .finding-arrow {
  transform: none;
  color: rgba(255, 255, 255, 0.25);
}

/* Calendar */
.calendar-minimal {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.calendar-labels {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  text-align: center;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.cal-day {
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.cal-day.active {
  background: #4263eb;
}

.cal-day.today {
  box-shadow: 0 0 0 2px #4263eb;
}

.cal-day.empty {
  background: transparent;
}

.calendar-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 8px;
}

.legend-scale {
  display: flex;
  gap: 3px;
}

.legend-scale span {
  width: 12px;
  height: 12px;
  background: #4263eb;
  border-radius: 2px;
}

/* Mastery Progress */
.mastery-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mastery-total {
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex-wrap: wrap;
}

.mastery-big {
  font-size: 32px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
}

.mastery-of {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.5);
}

.mastery-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  margin-left: 8px;
}

.mastery-bar {
  height: 12px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  display: flex;
  overflow: hidden;
}

.mastery-segment {
  height: 100%;
  transition: width 0.3s ease;
}

.mastery-segment.mastered {
  background: linear-gradient(90deg, #22c55e, #16a34a);
}

.mastery-segment.learning {
  background: linear-gradient(90deg, #fbbf24, #f59e0b);
}

.mastery-legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.legend-item .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-item .dot.mastered {
  background: #22c55e;
}

.legend-item .dot.learning {
  background: #fbbf24;
}

.legend-item .dot.not-started {
  background: rgba(255, 255, 255, 0.2);
}

/* Scrollbar styling */
.finding-list-scroll::-webkit-scrollbar {
  width: 4px;
}

.finding-list-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.finding-list-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.finding-list-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Responsive */
@media (max-width: 1200px) {
  .bottom-row {
    grid-template-columns: 1fr 1fr;
  }

  .top-row {
    grid-template-columns: 1fr 1fr;
  }

  .progress-section {
    display: none;
  }
}

@media (max-width: 900px) {
  .dashboard-content {
    padding: 24px;
  }

  .top-row {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .bottom-row {
    grid-template-columns: 1fr;
  }

  .greeting-minimal h1 {
    font-size: 28px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #4263eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
