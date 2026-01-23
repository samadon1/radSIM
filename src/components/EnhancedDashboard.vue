<template>
  <div class="enhanced-dashboard">
    <!-- Header with User Stats -->
    <div class="dashboard-header">
      <div class="header-top">
        <div class="welcome-section">
          <h1 class="welcome-title">Welcome back, Dr. Smith</h1>
          <p class="welcome-subtitle">{{ getCurrentGreeting() }}</p>
        </div>
        <div class="streak-badge" v-if="userStats.streakDays > 0">
          <v-icon size="20" color="orange">mdi-fire</v-icon>
          <span class="streak-number">{{ userStats.streakDays }}</span>
          <span class="streak-label">day streak</span>
        </div>
      </div>
    </div>

    <!-- Progress Overview Cards -->
    <div class="progress-overview">
      <div class="stat-card">
        <div class="stat-icon">
          <v-icon size="24" color="primary">mdi-chart-line</v-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ userStats.accuracy }}%</div>
          <div class="stat-label">Accuracy</div>
          <div class="stat-change" :class="{ positive: userStats.accuracyTrend > 0 }">
            <v-icon size="14">{{ userStats.accuracyTrend > 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>
            {{ Math.abs(userStats.accuracyTrend) }}% this week
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <v-icon size="24" color="success">mdi-file-check</v-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ userStats.casesCompleted }}</div>
          <div class="stat-label">Cases Reviewed</div>
          <div class="stat-progress">
            <div class="mini-progress-bar">
              <div class="mini-progress-fill" :style="{ width: `${(userStats.casesCompleted / userStats.totalCases) * 100}%` }"></div>
            </div>
            <span class="progress-fraction">{{ userStats.casesCompleted }}/{{ userStats.totalCases }}</span>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <v-icon size="24" color="info">mdi-clock-outline</v-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ userStats.avgTime }}</div>
          <div class="stat-label">Avg Time/Case</div>
          <div class="stat-benchmark">
            Target: &lt;3 min
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <v-icon size="24" color="warning">mdi-brain</v-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ userStats.dueForReview }}</div>
          <div class="stat-label">Due for Review</div>
          <div class="stat-action">
            <v-btn size="x-small" variant="tonal" color="warning">Review Now</v-btn>
          </div>
        </div>
      </div>
    </div>

    <!-- Today's Goals -->
    <div class="daily-goals-section">
      <div class="section-header">
        <h2 class="section-title">Today's Goals</h2>
        <div class="goal-progress">{{ completedGoals }}/{{ dailyGoals.length }} completed</div>
      </div>
      <div class="goals-list">
        <div v-for="goal in dailyGoals" :key="goal.id" class="goal-item" :class="{ completed: goal.completed }">
          <div class="goal-checkbox">
            <v-icon v-if="goal.completed" size="20" color="success">mdi-check-circle</v-icon>
            <v-icon v-else size="20">mdi-circle-outline</v-icon>
          </div>
          <div class="goal-content">
            <div class="goal-text">{{ goal.text }}</div>
            <div class="goal-progress-bar" v-if="goal.progress">
              <div class="goal-progress-fill" :style="{ width: `${goal.progress}%` }"></div>
            </div>
          </div>
          <div class="goal-reward" v-if="goal.points">
            <v-icon size="14">mdi-star</v-icon>
            {{ goal.points }} pts
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <h2 class="section-title">Quick Start</h2>
      <div class="action-grid">
        <div class="action-card continue-learning" @click="continueLearning">
          <div class="action-icon">
            <v-icon size="32" color="white">mdi-play-circle</v-icon>
          </div>
          <div class="action-content">
            <h3>Continue Learning</h3>
            <p>Pick up where you left off</p>
            <div class="action-meta">{{ lastCase }}</div>
          </div>
          <v-icon class="action-arrow" size="20">mdi-arrow-right</v-icon>
        </div>

        <div class="action-card smart-review" @click="startSmartReview">
          <div class="action-icon">
            <v-icon size="32">mdi-brain</v-icon>
          </div>
          <div class="action-content">
            <h3>Smart Review</h3>
            <p>AI-selected cases for optimal learning</p>
            <div class="action-meta">{{ userStats.dueForReview }} cases due</div>
          </div>
        </div>

        <div class="action-card challenge-mode" @click="startChallenge">
          <div class="action-icon">
            <v-icon size="32">mdi-trophy</v-icon>
          </div>
          <div class="action-content">
            <h3>Daily Challenge</h3>
            <p>5 difficult cases, timed</p>
            <div class="action-meta">Best: 89% accuracy</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance Analytics -->
    <div class="analytics-section">
      <div class="section-header">
        <h2 class="section-title">Your Performance</h2>
        <v-btn-toggle v-model="analyticsTimeframe" mandatory density="compact" variant="outlined">
          <v-btn value="week">Week</v-btn>
          <v-btn value="month">Month</v-btn>
          <v-btn value="all">All Time</v-btn>
        </v-btn-toggle>
      </div>

      <div class="analytics-grid">
        <div class="chart-card">
          <h3 class="chart-title">Accuracy Trend</h3>
          <canvas ref="accuracyChart"></canvas>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">Finding Distribution</h3>
          <div class="finding-bars">
            <div v-for="finding in topFindings" :key="finding.name" class="finding-bar-item">
              <div class="finding-bar-label">
                <span>{{ finding.name }}</span>
                <span class="finding-accuracy">{{ finding.accuracy }}%</span>
              </div>
              <div class="finding-bar-track">
                <div class="finding-bar-fill" :style="{ width: `${finding.accuracy}%`, backgroundColor: finding.color }"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="mistake-patterns">
          <h3 class="chart-title">Common Mistakes</h3>
          <div class="mistake-list">
            <div v-for="mistake in commonMistakes" :key="mistake.id" class="mistake-item">
              <v-icon size="16" color="warning">mdi-alert</v-icon>
              <span class="mistake-text">{{ mistake.description }}</span>
              <v-chip size="x-small" color="error">{{ mistake.count }}x</v-chip>
            </div>
          </div>
          <v-btn size="small" variant="tonal" class="mt-3">View Focused Training</v-btn>
        </div>
      </div>
    </div>

    <!-- Learning Paths -->
    <div class="learning-paths-section">
      <h2 class="section-title">Your Learning Paths</h2>
      <div class="paths-grid">
        <div v-for="path in learningPaths" :key="path.id" class="path-card" :class="{ active: path.active }">
          <div class="path-header">
            <div class="path-icon" :style="{ backgroundColor: path.color + '20' }">
              <v-icon :color="path.color" size="24">{{ path.icon }}</v-icon>
            </div>
            <v-chip v-if="path.active" size="small" color="success">Active</v-chip>
          </div>
          <h3 class="path-title">{{ path.title }}</h3>
          <p class="path-description">{{ path.description }}</p>
          <div class="path-progress">
            <div class="path-progress-bar">
              <div class="path-progress-fill" :style="{ width: `${path.progress}%`, backgroundColor: path.color }"></div>
            </div>
            <span class="path-progress-text">{{ path.completed }}/{{ path.total }} modules</span>
          </div>
          <v-btn v-if="path.active" size="small" :color="path.color" variant="tonal">Continue</v-btn>
          <v-btn v-else size="small" variant="outlined">Start Path</v-btn>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="recent-activity">
      <h2 class="section-title">Recent Activity</h2>
      <div class="activity-timeline">
        <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
          <div class="activity-dot" :class="activity.type"></div>
          <div class="activity-content">
            <div class="activity-title">{{ activity.title }}</div>
            <div class="activity-meta">{{ activity.time }} • {{ activity.details }}</div>
          </div>
          <div class="activity-score" v-if="activity.score">
            <v-chip size="small" :color="getScoreColor(activity.score)">{{ activity.score }}%</v-chip>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useLearningStore } from '@/src/store/learning';

const learningStore = useLearningStore();

// Reactive data
const analyticsTimeframe = ref('week');

// User statistics
const userStats = ref({
  streakDays: 15,
  accuracy: 78,
  accuracyTrend: 3.5,
  casesCompleted: 234,
  totalCases: 500,
  avgTime: '2.3 min',
  dueForReview: 23
});

// Daily goals
const dailyGoals = ref([
  { id: 1, text: 'Complete 5 chest X-rays', completed: true, progress: 100, points: 50 },
  { id: 2, text: 'Review pneumonia cases', completed: true, progress: 100, points: 30 },
  { id: 3, text: 'Practice emergency cases', completed: false, progress: 40, points: 40 },
  { id: 4, text: 'Achieve 80% accuracy', completed: false, progress: 78, points: 60 }
]);

// Learning paths
const learningPaths = ref([
  {
    id: 1,
    title: 'Chest Imaging Mastery',
    description: 'Master chest X-ray interpretation',
    icon: 'mdi-lungs',
    color: '#E74C3C',
    progress: 65,
    completed: 13,
    total: 20,
    active: true
  },
  {
    id: 2,
    title: 'Emergency Radiology',
    description: 'Critical findings in emergency settings',
    icon: 'mdi-ambulance',
    color: '#F39C12',
    progress: 30,
    completed: 6,
    total: 20,
    active: false
  },
  {
    id: 3,
    title: 'Neuro Fundamentals',
    description: 'Brain and spine imaging basics',
    icon: 'mdi-brain',
    color: '#9B59B6',
    progress: 10,
    completed: 2,
    total: 20,
    active: false
  }
]);

// Recent activities
const recentActivities = ref([
  {
    id: 1,
    type: 'success',
    title: 'Completed Pneumonia Module',
    time: '2 hours ago',
    details: '5 cases reviewed',
    score: 92
  },
  {
    id: 2,
    type: 'practice',
    title: 'Mixed Practice Session',
    time: '5 hours ago',
    details: '8 cases, 2 mistakes',
    score: 75
  },
  {
    id: 3,
    type: 'achievement',
    title: 'Unlocked: Subtle Findings Expert',
    time: 'Yesterday',
    details: 'Detected 10 subtle nodules correctly'
  }
]);

// Top findings for performance chart
const topFindings = ref([
  { name: 'Pneumonia', accuracy: 85, color: '#E74C3C' },
  { name: 'Cardiomegaly', accuracy: 92, color: '#E91E63' },
  { name: 'Effusion', accuracy: 78, color: '#3498DB' },
  { name: 'Pneumothorax', accuracy: 71, color: '#F39C12' },
  { name: 'Nodules', accuracy: 68, color: '#95A5A6' }
]);

// Common mistakes
const commonMistakes = ref([
  { id: 1, description: 'Missing subtle nodules in upper lobes', count: 12 },
  { id: 2, description: 'Over-calling pneumothorax', count: 8 },
  { id: 3, description: 'Confusing atelectasis with infiltrate', count: 5 }
]);

// Computed
const completedGoals = computed(() => dailyGoals.value.filter(g => g.completed).length);
const lastCase = computed(() => 'Chest X-ray - Pneumonia case #45');

// Methods
function getCurrentGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Ready for morning rounds?";
  if (hour < 17) return "Let's continue your afternoon practice";
  return "Evening review session";
}

function getScoreColor(score: number) {
  if (score >= 90) return 'success';
  if (score >= 70) return 'warning';
  return 'error';
}

function continueLearning() {
  // Continue from last session
}

function startSmartReview() {
  // Start AI-powered review
}

function startChallenge() {
  // Start daily challenge
}

onMounted(() => {
  // Initialize charts here
});
</script>

<style scoped>
.enhanced-dashboard {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  padding: 32px;
}

/* Header */
.dashboard-header {
  margin-bottom: 32px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.welcome-title {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: rgba(255, 255, 255, 0.98);
  margin: 0 0 4px 0;
}

.welcome-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
}

.streak-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.15), rgba(255, 87, 34, 0.15));
  border: 1.5px solid rgba(255, 152, 0, 0.3);
  border-radius: 12px;
}

.streak-number {
  font-size: 24px;
  font-weight: 700;
  color: #ff9800;
}

.streak-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

/* Progress Overview */
.progress-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  display: flex;
  gap: 16px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.03);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-2px);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.98);
  letter-spacing: -0.5px;
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 4px 0;
}

.stat-change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.stat-change.positive {
  color: #4caf50;
}

.mini-progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin: 8px 0 4px;
}

.mini-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4263eb, #667eea);
  border-radius: 2px;
  transition: width 0.3s;
}

.progress-fraction {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

/* Daily Goals */
.daily-goals-section {
  margin-bottom: 40px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: -0.3px;
}

.goal-progress {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

.goals-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.goal-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  transition: all 0.2s;
}

.goal-item.completed {
  opacity: 0.6;
}

.goal-text {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
}

.goal-progress-bar {
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin-top: 6px;
  overflow: hidden;
}

.goal-progress-fill {
  height: 100%;
  background: #4263eb;
  transition: width 0.3s;
}

.goal-reward {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #ffc107;
  margin-left: auto;
}

/* Quick Actions */
.quick-actions {
  margin-bottom: 40px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.03);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.action-card:hover {
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.continue-learning {
  background: linear-gradient(135deg, rgba(66, 99, 235, 0.1), rgba(102, 126, 234, 0.05));
  border-color: rgba(66, 99, 235, 0.3);
}

.action-content h3 {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 4px 0;
}

.action-content p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 8px 0;
}

.action-meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.action-arrow {
  position: absolute;
  right: 24px;
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.25s;
}

.action-card:hover .action-arrow {
  opacity: 1;
  transform: translateX(0);
}

/* Analytics Section */
.analytics-section {
  margin-bottom: 40px;
}

.analytics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 20px;
}

.chart-card,
.mistake-patterns {
  padding: 24px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 16px 0;
}

.finding-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.finding-bar-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.finding-bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.finding-bar-track {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.finding-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.mistake-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mistake-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.mistake-text {
  flex: 1;
}

/* Learning Paths */
.learning-paths-section {
  margin-bottom: 40px;
}

.paths-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.path-card {
  padding: 24px;
  background: rgba(255, 255, 255, 0.02);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  transition: all 0.25s;
}

.path-card.active {
  border-color: rgba(66, 99, 235, 0.3);
  background: rgba(66, 99, 235, 0.05);
}

.path-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.path-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.path-title {
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 8px 0;
}

.path-description {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 16px 0;
}

.path-progress {
  margin-bottom: 16px;
}

.path-progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.path-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s;
}

.path-progress-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

/* Recent Activity */
.recent-activity {
  margin-bottom: 40px;
}

.activity-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  position: relative;
}

.activity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
}

.activity-dot.success {
  background: #4caf50;
}

.activity-dot.practice {
  background: #2196f3;
}

.activity-dot.achievement {
  background: #ffc107;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-size: 15px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 4px;
}

.activity-meta {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

/* Responsive */
@media (max-width: 1200px) {
  .analytics-grid {
    grid-template-columns: 1fr;
  }

  .progress-overview {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}

@media (max-width: 768px) {
  .enhanced-dashboard {
    padding: 20px;
  }

  .action-grid,
  .paths-grid {
    grid-template-columns: 1fr;
  }
}
</style>