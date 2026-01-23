<template>
  <div class="learning-dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <h1>Learning Mode</h1>
      <p class="subtitle">Master chest X-ray interpretation through spaced repetition</p>

      <!-- Today's Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value">{{ todayStats.casesReviewed }}</div>
          <div class="stat-label">Cases Today</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ todayStats.accuracy }}%</div>
          <div class="stat-label">Accuracy</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ learningStore.casesDueToday }}</div>
          <div class="stat-label">Due Today</div>
        </div>
      </div>
    </div>

    <!-- Finding Categories -->
    <div class="categories-section">
      <h2>Practice by Finding Type</h2>

      <div class="finding-cards-grid">
        <finding-card
          v-for="finding in findingCategories"
          :key="finding.type"
          :finding="finding"
          @practice="startFocusedPractice(finding.type)"
        />
      </div>
    </div>

    <!-- Mixed Practice CTA -->
    <div class="mixed-practice-section">
      <v-card class="mixed-practice-card" elevation="2">
        <v-card-title>
          <v-icon left>mdi-shuffle-variant</v-icon>
          Mixed Practice (Spaced Repetition)
        </v-card-title>
        <v-card-text>
          <p>{{ learningStore.casesDueToday }} cases due for review today</p>
          <p class="help-text">
            Our spaced repetition algorithm will select cases optimized for long-term retention
          </p>
        </v-card-text>
        <v-card-actions>
          <v-btn
            color="primary"
            size="large"
            block
            @click="startMixedPractice"
          >
            Start Mixed Practice
            <v-icon right>mdi-arrow-right</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useLearningStore } from '@/src/store/learning';
import FindingCard from './FindingCard.vue';

const router = useRouter();
const learningStore = useLearningStore();

// Finding categories with metadata
const findingCategories = ref([
  {
    type: 'atelectasis',
    displayName: 'Atelectasis',
    description: 'Lung collapse or incomplete expansion',
    skillLevel: 'intermediate',
    icon: 'mdi-lungs',
    color: '#FF6B6B'
  },
  {
    type: 'cardiomegaly',
    displayName: 'Cardiomegaly',
    description: 'Enlarged cardiac silhouette',
    skillLevel: 'beginner',
    icon: 'mdi-heart',
    color: '#4ECDC4'
  },
  {
    type: 'consolidation',
    displayName: 'Consolidation',
    description: 'Lung parenchymal opacification',
    skillLevel: 'intermediate',
    icon: 'mdi-cloud',
    color: '#45B7D1'
  },
  {
    type: 'edema',
    displayName: 'Edema',
    description: 'Pulmonary edema patterns',
    skillLevel: 'intermediate',
    icon: 'mdi-water',
    color: '#96CEB4'
  },
  {
    type: 'effusion',
    displayName: 'Effusion',
    description: 'Pleural fluid accumulation',
    skillLevel: 'beginner',
    icon: 'mdi-cup-water',
    color: '#FFEAA7'
  },
  {
    type: 'emphysema',
    displayName: 'Emphysema',
    description: 'Chronic obstructive lung disease',
    skillLevel: 'advanced',
    icon: 'mdi-air-filter',
    color: '#DFE6E9'
  },
  {
    type: 'fibrosis',
    displayName: 'Fibrosis',
    description: 'Interstitial lung disease',
    skillLevel: 'advanced',
    icon: 'mdi-texture',
    color: '#A29BFE'
  },
  {
    type: 'hernia',
    displayName: 'Hernia',
    description: 'Hiatal or diaphragmatic hernia',
    skillLevel: 'advanced',
    icon: 'mdi-stomach',
    color: '#FD79A8'
  },
  {
    type: 'infiltration',
    displayName: 'Infiltration',
    description: 'Pulmonary infiltrates',
    skillLevel: 'intermediate',
    icon: 'mdi-dots-hexagon',
    color: '#FDCB6E'
  },
  {
    type: 'mass',
    displayName: 'Mass',
    description: 'Pulmonary mass lesion',
    skillLevel: 'advanced',
    icon: 'mdi-circle',
    color: '#E17055'
  },
  {
    type: 'nodule',
    displayName: 'Nodule',
    description: 'Pulmonary nodule',
    skillLevel: 'advanced',
    icon: 'mdi-circle-small',
    color: '#6C5CE7'
  },
  {
    type: 'pleural_thickening',
    displayName: 'Pleural Thickening',
    description: 'Pleural thickening patterns',
    skillLevel: 'intermediate',
    icon: 'mdi-layers',
    color: '#74B9FF'
  },
  {
    type: 'pneumonia',
    displayName: 'Pneumonia',
    description: 'Infectious consolidation',
    skillLevel: 'beginner',
    icon: 'mdi-bacteria',
    color: '#FF7675'
  },
  {
    type: 'pneumothorax',
    displayName: 'Pneumothorax',
    description: 'Collapsed lung with air in pleural space',
    skillLevel: 'beginner',
    icon: 'mdi-lung',
    color: '#00B894'
  }
]);

// Today's stats (mock for now - will calculate from learningData)
const todayStats = computed(() => {
  // TODO: Calculate from learningData performanceHistory for today
  return {
    casesReviewed: 0,
    accuracy: 0
  };
});

// Actions
async function startFocusedPractice(findingType: string) {
  try {
    await learningStore.startFocusedSession(findingType, 15);
    router.push({ name: 'PracticeFlow', params: { mode: 'focused' } });
  } catch (error) {
    console.error('Failed to start focused practice:', error);
    alert('Failed to load cases. Please make sure the dataset has been downloaded.');
  }
}

async function startMixedPractice() {
  try {
    await learningStore.startMixedSession(20);
    router.push({ name: 'PracticeFlow', params: { mode: 'mixed' } });
  } catch (error) {
    console.error('Failed to start mixed practice:', error);
    alert('Failed to load cases. Please make sure the dataset has been downloaded.');
  }
}

onMounted(() => {
  // Load learning data from localStorage
  learningStore.loadLearningData();
});
</script>

<style scoped>
.learning-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 50px;
}

.dashboard-header h1 {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 20px;
  color: #888;
  margin-bottom: 30px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  color: white;
}

.stat-value {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.categories-section {
  margin-bottom: 50px;
}

.categories-section h2 {
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 30px;
}

.finding-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.mixed-practice-section {
  max-width: 800px;
  margin: 50px auto 0;
}

.mixed-practice-card {
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
  border: 2px solid rgba(102, 126, 234, 0.3);
}

.help-text {
  color: #888;
  font-size: 14px;
  margin-top: 10px;
}
</style>
