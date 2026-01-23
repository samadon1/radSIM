<template>
  <div class="minimal-dashboard">
    <!-- Simplified Header with Key Metrics -->
    <div class="dashboard-header">
      <div class="header-content">
        <div class="greeting">
          <h1>Welcome back</h1>
          <p>{{ userStats.casesCompleted }} cases reviewed • {{ userStats.streakDays }} day streak 🔥</p>
        </div>
        <div class="header-metrics">
          <div class="metric">
            <span class="metric-value">{{ userStats.accuracy }}%</span>
            <span class="metric-label">Accuracy</span>
          </div>
          <div class="metric">
            <span class="metric-value">{{ userStats.dueForReview }}</span>
            <span class="metric-label">Due Today</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Combined Progress & Quick Actions -->
    <div class="main-content">
      <!-- Left: Today's Focus -->
      <div class="today-section">
        <div class="section-header">
          <h2>Today's Focus</h2>
          <span class="progress-indicator">{{ completedToday }}/{{ dailyGoal }} completed</span>
        </div>

        <!-- Progress Ring -->
        <div class="progress-ring-container">
          <svg class="progress-ring" width="180" height="180">
            <circle
              class="progress-ring-bg"
              cx="90"
              cy="90"
              r="80"
              stroke-width="12"
            />
            <circle
              class="progress-ring-fill"
              cx="90"
              cy="90"
              r="80"
              stroke-width="12"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="progressOffset"
            />
          </svg>
          <div class="progress-center">
            <div class="progress-percentage">{{ todayProgress }}%</div>
            <div class="progress-label">Daily Goal</div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <button class="action-button primary" @click="continueLearning">
            <v-icon size="20">mdi-play</v-icon>
            Continue Session
          </button>
          <button class="action-button secondary" @click="startSmartReview">
            <v-icon size="20">mdi-brain</v-icon>
            Smart Review
          </button>
        </div>

        <!-- Recent Mistakes (Minimized) -->
        <div class="mistakes-mini">
          <h3>Focus Areas</h3>
          <div class="mistake-pills">
            <span v-for="area in topMistakes" :key="area" class="mistake-pill">
              {{ area }}
            </span>
          </div>
        </div>
      </div>

      <!-- Right: Performance Overview -->
      <div class="performance-section">
        <div class="section-header">
          <h2>Performance</h2>
          <div class="time-selector">
            <button
              v-for="period in ['7d', '30d', 'All']"
              :key="period"
              class="time-button"
              :class="{ active: selectedPeriod === period }"
              @click="selectedPeriod = period"
            >
              {{ period }}
            </button>
          </div>
        </div>

        <!-- Simplified Performance Chart -->
        <div class="performance-chart">
          <div class="chart-header">
            <span class="chart-title">Accuracy by Finding</span>
          </div>
          <div class="finding-bars">
            <div v-for="finding in findings" :key="finding.name" class="finding-row">
              <span class="finding-name">{{ finding.name }}</span>
              <div class="finding-bar">
                <div
                  class="finding-fill"
                  :style="{
                    width: `${finding.accuracy}%`,
                    backgroundColor: getBarColor(finding.accuracy)
                  }"
                ></div>
                <span class="finding-value">{{ finding.accuracy }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Learning Streak Calendar -->
        <div class="streak-calendar">
          <h3>Activity Streak</h3>
          <div class="calendar-grid">
            <div
              v-for="(day, index) in last30Days"
              :key="index"
              class="calendar-day"
              :class="{
                active: day.hasActivity,
                today: day.isToday
              }"
              :title="`${day.date}: ${day.cases} cases`"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom: Current Learning Path (Minimal) -->
    <div class="learning-path-minimal">
      <div class="path-info">
        <div class="path-icon">
          <v-icon size="24" :color="currentPath.color">{{ currentPath.icon }}</v-icon>
        </div>
        <div class="path-details">
          <h3>{{ currentPath.name }}</h3>
          <p>{{ currentPath.progress }}% complete • {{ currentPath.nextModule }}</p>
        </div>
      </div>
      <div class="path-progress">
        <div class="path-bar">
          <div class="path-fill" :style="{ width: `${currentPath.progress}%` }"></div>
        </div>
      </div>
      <button class="path-continue">
        Continue Path
        <v-icon size="16">mdi-arrow-right</v-icon>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// State
const selectedPeriod = ref('7d');
const dailyGoal = 10;
const completedToday = ref(7);

// User Stats
const userStats = ref({
  streakDays: 15,
  accuracy: 78,
  casesCompleted: 234,
  dueForReview: 12
});

// Progress calculation
const todayProgress = computed(() => Math.round((completedToday.value / dailyGoal) * 100));
const circumference = 2 * Math.PI * 80;
const progressOffset = computed(() => circumference - (todayProgress.value / 100) * circumference);

// Performance data
const findings = ref([
  { name: 'Pneumonia', accuracy: 85 },
  { name: 'Effusion', accuracy: 78 },
  { name: 'Cardiomegaly', accuracy: 92 },
  { name: 'Pneumothorax', accuracy: 71 },
  { name: 'Nodules', accuracy: 68 }
]);

// Top mistakes (simplified)
const topMistakes = ref(['Upper lobe nodules', 'Subtle pneumothorax', 'Costophrenic angles']);

// Current learning path
const currentPath = ref({
  name: 'Chest Imaging Mastery',
  icon: 'mdi-lungs',
  color: '#4263eb',
  progress: 65,
  nextModule: 'Module 14: Subtle Findings'
});

// Last 30 days activity (simplified)
const last30Days = ref(
  Array.from({ length: 30 }, (_, i) => ({
    hasActivity: Math.random() > 0.3,
    isToday: i === 29,
    cases: Math.floor(Math.random() * 15),
    date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString()
  }))
);

// Methods
function getBarColor(accuracy: number) {
  if (accuracy >= 80) return '#4caf50';
  if (accuracy >= 70) return '#ff9800';
  return '#f44336';
}

function continueLearning() {
  // Continue learning
}

function startSmartReview() {
  // Start smart review
}
</script>

<style scoped>
.minimal-dashboard {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: #0a0a0a;
  padding: 40px;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
}

/* Header */
.dashboard-header {
  margin-bottom: 40px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.greeting h1 {
  font-size: 32px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.greeting p {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.header-metrics {
  display: flex;
  gap: 40px;
}

.metric {
  text-align: center;
}

.metric-value {
  display: block;
  font-size: 32px;
  font-weight: 600;
  color: #fff;
  letter-spacing: -0.5px;
}

.metric-label {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

/* Main Content Grid */
.main-content {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 40px;
  margin-bottom: 32px;
}

/* Today Section */
.today-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 28px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.progress-indicator {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

/* Progress Ring */
.progress-ring-container {
  position: relative;
  width: 180px;
  height: 180px;
  margin: 0 auto 28px;
}

.progress-ring {
  transform: rotate(-90deg);
}

.progress-ring-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
}

.progress-ring-fill {
  fill: none;
  stroke: #4263eb;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.progress-percentage {
  font-size: 36px;
  font-weight: 600;
  color: #fff;
}

.progress-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 28px;
}

.action-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button.primary {
  background: #4263eb;
  color: white;
}

.action-button.primary:hover {
  background: #5273ff;
  transform: translateY(-1px);
}

.action-button.secondary {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
}

.action-button.secondary:hover {
  background: rgba(255, 255, 255, 0.12);
}

/* Mistakes Mini */
.mistakes-mini h3 {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 12px 0;
}

.mistake-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mistake-pill {
  padding: 6px 12px;
  background: rgba(255, 152, 0, 0.15);
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: 20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

/* Performance Section */
.performance-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 28px;
}

.time-selector {
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px;
  border-radius: 6px;
}

.time-button {
  padding: 6px 12px;
  border: none;
  background: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.time-button.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* Performance Chart */
.performance-chart {
  margin-bottom: 28px;
}

.chart-header {
  margin-bottom: 16px;
}

.chart-title {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.finding-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.finding-row {
  display: grid;
  grid-template-columns: 100px 1fr;
  align-items: center;
  gap: 16px;
}

.finding-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.finding-bar {
  position: relative;
  height: 24px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
}

.finding-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.finding-value {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

/* Streak Calendar */
.streak-calendar h3 {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 12px 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
}

.calendar-day {
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
}

.calendar-day.active {
  background: rgba(66, 99, 235, 0.6);
}

.calendar-day.today {
  border: 1px solid #4263eb;
}

.calendar-day:hover {
  transform: scale(1.2);
}

/* Learning Path Minimal */
.learning-path-minimal {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(66, 99, 235, 0.08), rgba(66, 99, 235, 0.03));
  border: 1px solid rgba(66, 99, 235, 0.2);
  border-radius: 12px;
}

.path-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.path-icon {
  width: 48px;
  height: 48px;
  background: rgba(66, 99, 235, 0.15);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.path-details h3 {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 4px 0;
}

.path-details p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.path-progress {
  flex: 1;
  max-width: 300px;
}

.path-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.path-fill {
  height: 100%;
  background: #4263eb;
  border-radius: 3px;
  transition: width 0.5s;
}

.path-continue {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.path-continue:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateX(2px);
}

/* Responsive */
@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
  }

  .today-section {
    max-width: 600px;
    margin: 0 auto;
  }
}

@media (max-width: 768px) {
  .minimal-dashboard {
    padding: 20px;
  }

  .header-content {
    flex-direction: column;
    gap: 24px;
  }

  .header-metrics {
    width: 100%;
    justify-content: space-around;
  }

  .learning-path-minimal {
    flex-direction: column;
    text-align: center;
  }

  .path-info {
    flex-direction: column;
  }

  .path-progress {
    width: 100%;
  }
}
</style>