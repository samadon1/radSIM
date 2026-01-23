<template>
  <div class="session-summary">
    <div class="summary-container">
      <!-- Header -->
      <div class="summary-header">
        <v-icon size="80" color="success">mdi-check-circle</v-icon>
        <h1 class="summary-title">Session Complete!</h1>
        <p class="summary-subtitle">Great work on completing your practice session</p>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <v-icon size="40" color="primary">mdi-clipboard-check</v-icon>
          </div>
          <div class="stat-value">{{ stats.casesReviewed }}</div>
          <div class="stat-label">Cases Reviewed</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <v-icon size="40" color="success">mdi-check-all</v-icon>
          </div>
          <div class="stat-value">{{ Math.round(stats.averageScore) }}%</div>
          <div class="stat-label">Average Score</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <v-icon size="40" color="info">mdi-clock-outline</v-icon>
          </div>
          <div class="stat-value">{{ formatTime(Math.round(stats.averageTime)) }}</div>
          <div class="stat-label">Avg Time/Case</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <v-icon size="40" color="warning">mdi-star</v-icon>
          </div>
          <div class="stat-value">{{ stats.averageConfidence.toFixed(1) }}/5</div>
          <div class="stat-label">Avg Confidence</div>
        </div>
      </div>

      <!-- Performance Breakdown -->
      <v-card class="performance-card" elevation="4">
        <v-card-title>Performance Breakdown</v-card-title>
        <v-card-text>
          <div class="performance-row">
            <span class="performance-label">
              <v-icon left color="success">mdi-check</v-icon>
              Correct Findings:
            </span>
            <span class="performance-value success">{{ stats.correctFindings }}</span>
          </div>

          <div class="performance-row">
            <span class="performance-label">
              <v-icon left color="warning">mdi-alert</v-icon>
              Missed Findings:
            </span>
            <span class="performance-value warning">{{ stats.missedFindings }}</span>
          </div>

          <div class="performance-row">
            <span class="performance-label">
              <v-icon left color="error">mdi-close</v-icon>
              False Positives:
            </span>
            <span class="performance-value error">{{ stats.falsePositives }}</span>
          </div>

          <!-- Progress bar -->
          <div class="accuracy-bar">
            <div class="bar-label">Overall Accuracy</div>
            <v-progress-linear
              :model-value="overallAccuracy"
              :color="accuracyColor"
              height="24"
              rounded
            >
              <strong>{{ overallAccuracy.toFixed(0) }}%</strong>
            </v-progress-linear>
          </div>
        </v-card-text>
      </v-card>

      <!-- Actions -->
      <div class="action-buttons">
        <v-btn
          size="x-large"
          variant="outlined"
          color="primary"
          @click="$emit('review-mistakes')"
        >
          <v-icon left>mdi-school</v-icon>
          Review Mistakes
        </v-btn>

        <v-btn
          size="x-large"
          color="primary"
          @click="$emit('return-dashboard')"
        >
          Return to Dashboard
          <v-icon right>mdi-home</v-icon>
        </v-btn>
      </div>

      <!-- Encouragement Message -->
      <div class="encouragement-box">
        <p class="encouragement-text">{{ encouragementMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SessionStats } from '@/src/store/learning';

const props = defineProps<{
  stats: SessionStats;
}>();

const emit = defineEmits(['return-dashboard', 'review-mistakes']);

const overallAccuracy = computed(() => {
  const total = props.stats.correctFindings + props.stats.missedFindings + props.stats.falsePositives;
  if (total === 0) return 100;
  return (props.stats.correctFindings / total) * 100;
});

const accuracyColor = computed(() => {
  const acc = overallAccuracy.value;
  if (acc >= 90) return 'success';
  if (acc >= 75) return 'info';
  if (acc >= 60) return 'warning';
  return 'error';
});

const encouragementMessage = computed(() => {
  const score = props.stats.averageScore;
  if (score >= 90) {
    return '🌟 Outstanding performance! You\'re showing expert-level interpretation skills. Keep up the excellent work!';
  } else if (score >= 75) {
    return '👏 Great job! You\'re making solid progress. Review your missed findings to reach expert level.';
  } else if (score >= 60) {
    return '💪 Good effort! You\'re building your skills. Focus on the areas you missed to improve further.';
  } else {
    return '📚 Keep practicing! Every case helps you improve. Review the teaching points and try again.';
  }
});

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
</script>

<style scoped>
.session-summary {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow-y: auto;
  padding: 40px 20px;
}

.summary-container {
  max-width: 1000px;
  margin: 0 auto;
}

.summary-header {
  text-align: center;
  margin-bottom: 50px;
  animation: fadeInDown 0.6s ease-out;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.summary-title {
  font-size: 48px;
  font-weight: 700;
  color: white;
  margin: 20px 0 10px;
}

.summary-subtitle {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.9);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.stat-card {
  background: white;
  padding: 30px 20px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  animation: scaleIn 0.5s ease-out;
  animation-fill-mode: both;
}

.stat-card:nth-child(1) { animation-delay: 0.1s; }
.stat-card:nth-child(2) { animation-delay: 0.2s; }
.stat-card:nth-child(3) { animation-delay: 0.3s; }
.stat-card:nth-child(4) { animation-delay: 0.4s; }

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.stat-icon {
  margin-bottom: 12px;
}

.stat-value {
  font-size: 42px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.performance-card {
  margin-bottom: 40px;
  animation: slideInUp 0.6s ease-out 0.5s;
  animation-fill-mode: both;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.performance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.performance-row:last-child {
  border-bottom: none;
}

.performance-label {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
}

.performance-value {
  font-size: 24px;
  font-weight: 700;
}

.performance-value.success {
  color: #4CAF50;
}

.performance-value.warning {
  color: #FFC107;
}

.performance-value.error {
  color: #F44336;
}

.accuracy-bar {
  margin-top: 24px;
}

.bar-label {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #666;
}

.action-buttons {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  animation: fadeIn 0.6s ease-out 0.7s;
  animation-fill-mode: both;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.action-buttons > * {
  flex: 1;
}

.encouragement-box {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.3);
  animation: fadeIn 0.6s ease-out 0.9s;
  animation-fill-mode: both;
}

.encouragement-text {
  font-size: 18px;
  color: white;
  margin: 0;
  line-height: 1.6;
}
</style>
