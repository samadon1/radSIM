<template>
  <v-card
    class="finding-card"
    :class="masteryClass"
    elevation="2"
    hover
    @click="$emit('practice')"
  >
    <div class="card-header" :style="{ background: finding.color }">
      <v-icon size="48" color="white">{{ finding.icon }}</v-icon>
    </div>

    <v-card-title class="finding-name">
      {{ finding.displayName }}
    </v-card-title>

    <v-card-text>
      <p class="finding-description">{{ finding.description }}</p>

      <!-- Progress stats -->
      <div class="stats">
        <div class="stat-row">
          <span class="stat-label">Reviewed:</span>
          <span class="stat-value">{{ reviewedCount }} / {{ totalCases }}</span>
        </div>

        <div class="stat-row">
          <span class="stat-label">Accuracy:</span>
          <span class="stat-value" :class="accuracyClass">{{ accuracy }}%</span>
        </div>

        <div class="stat-row">
          <span class="stat-label">Level:</span>
          <v-chip :color="skillLevelColor" size="small" label>
            {{ finding.skillLevel }}
          </v-chip>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="progress-section">
        <v-progress-linear
          :model-value="progressPercent"
          :color="progressColor"
          height="8"
          rounded
        />
        <div class="progress-label">
          {{ masteryLabel }}
        </div>
      </div>

      <!-- Due badge -->
      <div v-if="dueCount > 0" class="due-badge">
        {{ dueCount }} due for review
      </div>
    </v-card-text>

    <v-card-actions>
      <v-btn
        block
        :color="finding.color"
        variant="elevated"
      >
        <v-icon left>mdi-play</v-icon>
        Practice
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLearningStore } from '@/src/store/learning';

const props = defineProps<{
  finding: {
    type: string;
    displayName: string;
    description: string;
    skillLevel: string;
    icon: string;
    color: string;
  };
}>();

const emit = defineEmits(['practice']);

const learningStore = useLearningStore();

// Calculate stats from learning data
// TODO: Connect to actual learning data for this finding type
const totalCases = computed(() => {
  // In production, this would come from the finding-specific case library
  return 60; // Placeholder
});

const reviewedCount = computed(() => {
  // Count how many cases of this finding type have been reviewed
  const findingType = props.finding.type;
  const reviewed = Object.values(learningStore.learningData).filter(data => {
    // Check if caseId starts with finding type
    return data.caseId.includes(findingType) && data.timesReviewed > 0;
  });
  return reviewed.length;
});

const accuracy = computed(() => {
  // Calculate average accuracy for this finding type
  const findingType = props.finding.type;
  const relevantData = Object.values(learningStore.learningData).filter(data =>
    data.caseId.includes(findingType) && data.performanceHistory.length > 0
  );

  if (relevantData.length === 0) return 0;

  const totalScore = relevantData.reduce((sum, data) => {
    const avgScore = data.performanceHistory.reduce((s, h) => s + h.score, 0) / data.performanceHistory.length;
    return sum + avgScore;
  }, 0);

  return Math.round(totalScore / relevantData.length);
});

const dueCount = computed(() => {
  // Count cases due for review
  const today = new Date();
  const findingType = props.finding.type;

  return Object.values(learningStore.learningData).filter(data =>
    data.caseId.includes(findingType) && data.nextReviewDate <= today
  ).length;
});

const progressPercent = computed(() => {
  if (totalCases.value === 0) return 0;
  return (reviewedCount.value / totalCases.value) * 100;
});

const masteryLevel = computed<'novice' | 'learning' | 'competent' | 'proficient' | 'expert'>(() => {
  const acc = accuracy.value;
  const progress = progressPercent.value;

  if (progress === 0) return 'novice';
  if (progress < 25) return 'learning';
  if (acc >= 90 && progress >= 75) return 'expert';
  if (acc >= 75 && progress >= 50) return 'proficient';
  if (acc >= 60) return 'competent';
  return 'learning';
});

const masteryLabel = computed(() => {
  const labels = {
    novice: 'Not Started',
    learning: 'Learning',
    competent: 'Competent',
    proficient: 'Proficient',
    expert: 'Expert'
  };
  return labels[masteryLevel.value];
});

const masteryClass = computed(() => `mastery-${masteryLevel.value}`);

const progressColor = computed(() => {
  const colors = {
    novice: '#9E9E9E',
    learning: '#FFC107',
    competent: '#2196F3',
    proficient: '#4CAF50',
    expert: '#9C27B0'
  };
  return colors[masteryLevel.value];
});

const accuracyClass = computed(() => {
  const acc = accuracy.value;
  if (acc === 0) return '';
  if (acc >= 90) return 'accuracy-excellent';
  if (acc >= 75) return 'accuracy-good';
  if (acc >= 60) return 'accuracy-fair';
  return 'accuracy-poor';
});

const skillLevelColor = computed(() => {
  const colors: Record<string, string> = {
    beginner: 'green',
    intermediate: 'orange',
    advanced: 'red'
  };
  return colors[props.finding.skillLevel] || 'grey';
});
</script>

<style scoped>
.finding-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.finding-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
}

/* Mastery level borders */
.mastery-novice {
  border-color: #9E9E9E;
}

.mastery-learning {
  border-color: #FFC107;
}

.mastery-competent {
  border-color: #2196F3;
}

.mastery-proficient {
  border-color: #4CAF50;
}

.mastery-expert {
  border-color: #9C27B0;
  box-shadow: 0 0 20px rgba(156, 39, 176, 0.3);
}

.card-header {
  padding: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 120px;
}

.finding-name {
  font-size: 20px;
  font-weight: 600;
  padding-bottom: 8px;
}

.finding-description {
  color: #888;
  font-size: 13px;
  margin-bottom: 16px;
  min-height: 40px;
}

.stats {
  margin-bottom: 16px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.stat-label {
  color: #888;
  font-weight: 500;
}

.stat-value {
  font-weight: 600;
}

.accuracy-excellent {
  color: #4CAF50;
}

.accuracy-good {
  color: #2196F3;
}

.accuracy-fair {
  color: #FFC107;
}

.accuracy-poor {
  color: #F44336;
}

.progress-section {
  margin-top: 16px;
}

.progress-label {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  margin-top: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.due-badge {
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(244, 67, 54, 0.1);
  border-left: 3px solid #F44336;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #F44336;
}
</style>
