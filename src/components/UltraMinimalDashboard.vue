<template>
  <div class="ultra-dashboard">
    <!-- Shared App Header -->
    <AppHeader />

    <!-- Dashboard Content with padding -->
    <div class="dashboard-content">
      <!-- Hero Section - Compact 3-column layout -->
      <div class="hero-section">
        <!-- Left: Greeting + CTA -->
        <div class="hero-col hero-main">
          <div class="greeting-minimal">
            <h1>{{ getGreeting() }}</h1>
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
                  <span>Continue Learning</span>
                </div>
                <div class="button-subtitle">{{ stats.dueToday }} cases due today</div>
              </div>
              <div class="button-arrow">
                <v-icon size="20">mdi-arrow-right</v-icon>
              </div>
            </button>
          </div>
        </div>

        <!-- Center: Stats -->
        <div class="hero-col hero-stats">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">{{ stats.accuracy }}%</div>
              <div class="stat-label">Accuracy</div>
              <div class="stat-trend" :class="{ up: stats.accuracyTrend > 0 }">
                <v-icon size="12">{{ stats.accuracyTrend > 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>
                {{ Math.abs(stats.accuracyTrend) }}%
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ stats.todayCompleted }}/{{ stats.dailyGoal }}</div>
              <div class="stat-label">Today</div>
              <div class="stat-progress">
                <div class="stat-progress-bar">
                  <div class="stat-progress-fill" :style="{ width: todayProgress + '%' }"></div>
                </div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ formatTime(stats.avgTime) }}</div>
              <div class="stat-label">Avg Time</div>
              <div class="stat-benchmark">Target: &lt;3min</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ stats.weeklyCompleted }}</div>
              <div class="stat-label">This Week</div>
              <div class="stat-benchmark">Goal: {{ stats.weeklyGoal }}</div>
            </div>
          </div>
        </div>

        <!-- Right: Weekly Progress Ring -->
        <div class="hero-col hero-progress">
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
              <div class="progress-big">{{ Math.round(weeklyProgress) }}%</div>
              <div class="progress-label">Weekly Goal</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Overview - Simplified -->
      <div class="performance-section">
        <div class="section-header-minimal">
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

        <div class="performance-grid">
          <!-- Finding Performance - Clickable for focused practice -->
          <div class="performance-card findings-card">
            <h3>Practice by Finding</h3>
            <div class="finding-list">
              <button
                v-for="finding in findings"
                :key="finding.name"
                class="finding-row"
                @click="startFocusedPractice(finding.name)"
              >
                <div class="finding-info">
                  <span class="finding-name">{{ finding.name }}</span>
                  <span class="finding-cases">{{ finding.cases }} cases</span>
                </div>
                <div class="finding-stats">
                  <div class="finding-bar-mini">
                    <div
                      class="finding-bar-fill-mini"
                      :style="{
                        width: finding.accuracy + '%',
                        background: getColor(finding.accuracy)
                      }"
                    ></div>
                  </div>
                  <span class="finding-percent" :style="{ color: getColor(finding.accuracy) }">
                    {{ finding.accuracy }}%
                  </span>
                </div>
                <v-icon size="18" class="finding-arrow">mdi-chevron-right</v-icon>
              </button>
            </div>
          </div>

          <!-- Streak Calendar -->
          <div class="performance-card">
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

          <!-- Focus Areas -->
          <div class="performance-card">
            <h3>Focus Areas</h3>
            <div class="focus-list">
              <div v-for="area in focusAreas" :key="area.id" class="focus-item">
                <v-icon size="16" color="warning">mdi-alert-circle</v-icon>
                <span class="focus-text">{{ area.text }}</span>
                <span class="focus-count">{{ area.count }}×</span>
              </div>
            </div>
            <button class="focus-action">
              Practice These
              <v-icon size="14">mdi-arrow-right</v-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Current Path - Ultra Minimal -->
      <div class="path-bar">
        <div class="path-content">
          <v-icon size="20" color="#4263eb">mdi-school</v-icon>
          <span class="path-name">{{ currentPath.name }}</span>
          <span class="path-progress">{{ currentPath.completed }}/{{ currentPath.total }} modules</span>
        </div>
        <div class="path-bar-bg">
          <div class="path-bar-fill" :style="{ width: pathProgress + '%' }"></div>
        </div>
        <button class="path-continue">Continue Path</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import AppHeader from './AppHeader.vue';
import { useAuthStore } from '@/src/store/auth';

// Auth
const authStore = useAuthStore();

// State
const period = ref('week');
const periods = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'all', label: 'All' }
];

// Stats
const stats = ref({
  streak: 15,
  accuracy: 82,
  accuracyTrend: 3,
  todayCompleted: 7,
  dailyGoal: 10,
  dueToday: 8,
  avgTime: 138, // seconds
  weeklyCompleted: 42,
  weeklyGoal: 50
});

// Findings data - matches NIH dataset findings
const findings = ref([
  { name: 'Pneumonia', accuracy: 89, cases: 120 },
  { name: 'Cardiomegaly', accuracy: 94, cases: 146 },
  { name: 'Effusion', accuracy: 76, cases: 153 },
  { name: 'Atelectasis', accuracy: 82, cases: 180 },
  { name: 'Pneumothorax', accuracy: 68, cases: 98 },
  { name: 'Mass', accuracy: 71, cases: 85 },
  { name: 'Nodule', accuracy: 72, cases: 79 }
]);

// Focus areas
const focusAreas = ref([
  { id: 1, text: 'Subtle upper lobe nodules', count: 8 },
  { id: 2, text: 'Costophrenic angle evaluation', count: 5 },
  { id: 3, text: 'Pneumothorax vs skin fold', count: 3 }
]);

// Current path
const currentPath = ref({
  name: 'Chest Imaging Fundamentals',
  completed: 12,
  total: 20
});

// Calendar days (simplified)
const calendarDays = ref(
  Array(35).fill(null).map((_, i) => ({
    date: i >= 3 && i <= 33,
    active: i >= 3 && i <= 33 && Math.random() > 0.3,
    intensity: Math.random(),
    today: i === 33
  }))
);

// Computed
const todayProgress = computed(() => (stats.value.todayCompleted / stats.value.dailyGoal) * 100);
const weeklyProgress = computed(() => (stats.value.weeklyCompleted / stats.value.weeklyGoal) * 100);
const pathProgress = computed(() => (currentPath.value.completed / currentPath.value.total) * 100);

// Progress ring
const circumference = 2 * Math.PI * 90;
const progressOffset = computed(() => {
  const progress = weeklyProgress.value / 100;
  return circumference - (progress * circumference);
});

// Methods
function getGreeting() {
  const hour = new Date().getHours();
  const firstName = authStore.userProfile?.displayName?.split(' ')[0];
  let greeting = '';

  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  else greeting = 'Good evening';

  return firstName ? `${greeting}, ${firstName}` : greeting;
}

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

const emit = defineEmits<{
  (e: 'start-learning'): void;
  (e: 'start-focused-practice', finding: string): void;
}>();

function startLearning() {
  emit('start-learning');
}

function startFocusedPractice(finding: string) {
  emit('start-focused-practice', finding);
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.ultra-dashboard {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: #000;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
  position: relative;
}

.dashboard-content {
  padding: 48px;
}

/* Hero Section - 3 Column Layout */
.hero-section {
  display: grid;
  grid-template-columns: 1fr 1.2fr 220px;
  gap: 32px;
  margin-bottom: 40px;
  align-items: center;
}

.hero-col {
  display: flex;
  flex-direction: column;
}

.hero-main {
  justify-content: center;
}

.hero-stats {
  justify-content: center;
}

.hero-progress {
  justify-content: center;
  align-items: center;
  padding-right: 8px;
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

/* Stats Grid - 2x2 layout */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
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

/* Old stats bar - keep for potential use */
.stats-bar {
  display: none; /* Hidden, using stats-grid instead */
  max-width: 400px;
}

.stat-item {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 4px;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.stat-trend.up {
  color: #22c55e;
}

.stat-progress-bar {
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.stat-progress-fill {
  height: 100%;
  background: #4263eb;
  transition: width 0.5s;
}

.stat-benchmark {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.06);
}

/* Hero Right - Progress Visual */
.hero-right {
  width: 200px;
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

/* Performance Section */
.performance-section {
  margin-bottom: 32px;
}

.section-header-minimal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header-minimal h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
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

.performance-grid {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr;
  gap: 24px;
}

.performance-card {
  padding: 24px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}

.performance-card h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 20px 0;
  color: rgba(255, 255, 255, 0.8);
}

/* Finding Chart */
.finding-chart {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Finding rows - always visible buttons */
.findings-card {
  padding: 0 !important;
  overflow: hidden;
}

.findings-card h3 {
  padding: 20px 20px 12px;
}

.finding-list {
  display: flex;
  flex-direction: column;
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

.finding-row:active {
  background: rgba(255, 255, 255, 0.08);
}

.finding-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
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
  transition: width 0.3s;
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
}

.finding-row:hover .finding-arrow {
  color: rgba(255, 255, 255, 0.6);
  transform: translateX(2px);
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
  gap: 3px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  text-align: center;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.cal-day {
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
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
  gap: 2px;
}

.legend-scale span {
  width: 12px;
  height: 12px;
  background: #4263eb;
  border-radius: 2px;
}

/* Focus Areas */
.focus-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.focus-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.focus-text {
  flex: 1;
  color: rgba(255, 255, 255, 0.8);
}

.focus-count {
  font-size: 11px;
  padding: 2px 6px;
  background: rgba(255, 152, 0, 0.15);
  border-radius: 4px;
  color: #ff9800;
}

.focus-action {
  width: 100%;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
}

.focus-action:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* Path Bar */
.path-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
  background: rgba(66, 99, 235, 0.05);
  border: 1px solid rgba(66, 99, 235, 0.15);
  border-radius: 10px;
}

.path-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.path-name {
  font-size: 14px;
  font-weight: 600;
}

.path-progress {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.path-bar-bg {
  flex: 1;
  max-width: 200px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.path-bar-fill {
  height: 100%;
  background: #4263eb;
  transition: width 0.5s;
}

.path-continue {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.path-continue:hover {
  background: rgba(255, 255, 255, 0.12);
}

/* Responsive */
@media (max-width: 1200px) {
  .performance-grid {
    grid-template-columns: 1fr;
  }

  .hero-section {
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }

  .hero-progress {
    grid-column: 1 / -1;
    order: -1;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 900px) {
  .hero-section {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .hero-progress {
    order: 0;
  }

  .progress-visual {
    width: 150px;
    height: 150px;
  }
}

@media (max-width: 768px) {
  .ultra-dashboard {
    padding: 24px;
  }

  .greeting-minimal h1 {
    font-size: 32px;
  }

  .stats-bar {
    flex-direction: column;
    gap: 16px;
  }

  .stat-divider {
    display: none;
  }

  .path-bar {
    flex-direction: column;
    gap: 12px;
  }

  .path-bar-bg {
    max-width: 100%;
  }
}
</style>