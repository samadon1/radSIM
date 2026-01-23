<template>
  <div class="timed-assessment">
    <!-- Timer Display -->
    <div class="timer-container" :class="{ 'timer-warning': timeRemaining < 60 }">
      <v-icon size="20" class="timer-icon">mdi-timer-outline</v-icon>
      <span class="timer-text">{{ formattedTime }}</span>
    </div>

    <!-- Navigation Controls -->
    <div class="navigation-controls">
      <v-btn
        variant="outlined"
        color="primary"
        size="small"
        @click="previousCase"
        :disabled="currentIndex === 0"
        class="nav-btn"
      >
        <v-icon size="16" start>mdi-chevron-left</v-icon>
        Previous
      </v-btn>

      <div class="case-counter">
        Case {{ currentIndex + 1 }} of {{ totalCases }}
      </div>

      <v-btn
        variant="outlined"
        color="primary"
        size="small"
        @click="nextCase"
        :disabled="currentIndex >= totalCases - 1"
        class="nav-btn"
      >
        Next
        <v-icon size="16" end>mdi-chevron-right</v-icon>
      </v-btn>

      <v-btn
        variant="tonal"
        color="error"
        size="small"
        @click="endAssessment"
        class="end-btn"
      >
        <v-icon size="16" start>mdi-stop-circle-outline</v-icon>
        End Assessment
      </v-btn>
    </div>

    <!-- End Assessment Dialog -->
    <v-dialog v-model="showEndDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-h5">
          End Assessment?
        </v-card-title>
        <v-card-text>
          <p>Are you sure you want to end this assessment?</p>
          <div class="assessment-summary">
            <div class="summary-item">
              <v-icon size="20">mdi-clock-outline</v-icon>
              <span>Time Elapsed: {{ formattedElapsedTime }}</span>
            </div>
            <div class="summary-item">
              <v-icon size="20">mdi-file-document-outline</v-icon>
              <span>Cases Reviewed: {{ casesReviewed }} of {{ totalCases }}</span>
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showEndDialog = false">
            Continue
          </v-btn>
          <v-btn color="primary" variant="flat" @click="confirmEndAssessment">
            End Assessment
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDatasetStore } from '@/src/store/datasets';
import type { RadiologyCaseMetadata } from '@/src/types/caseLibrary';

interface Props {
  cases: RadiologyCaseMetadata[];
  timeLimit?: number; // in seconds, optional
  autoAdvance?: boolean; // automatically go to next case after certain time
}

const props = withDefaults(defineProps<Props>(), {
  timeLimit: 0, // 0 means no limit
  autoAdvance: false
});

const emit = defineEmits<{
  'case-changed': [index: number];
  'assessment-ended': [summary: AssessmentSummary];
}>();

interface AssessmentSummary {
  timeElapsed: number;
  casesReviewed: number;
  totalCases: number;
  completionRate: number;
}

// State
const currentIndex = ref(0);
const timeElapsed = ref(0);
const timeRemaining = ref(props.timeLimit);
const showEndDialog = ref(false);
const casesViewed = ref(new Set<number>());
let timerInterval: number | null = null;

const router = useRouter();
const datasetStore = useDatasetStore();

// Computed
const totalCases = computed(() => props.cases.length);

const casesReviewed = computed(() => casesViewed.value.size);

const formattedTime = computed(() => {
  const time = props.timeLimit > 0 ? timeRemaining.value : timeElapsed.value;
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = time % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

const formattedElapsedTime = computed(() => {
  const hours = Math.floor(timeElapsed.value / 3600);
  const minutes = Math.floor((timeElapsed.value % 3600) / 60);
  const seconds = timeElapsed.value % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
});

// Methods
const startTimer = () => {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = window.setInterval(() => {
    timeElapsed.value++;

    if (props.timeLimit > 0) {
      timeRemaining.value = Math.max(0, props.timeLimit - timeElapsed.value);

      if (timeRemaining.value === 0) {
        endAssessment();
      }
    }
  }, 1000);
};

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

const loadCase = async (caseData: RadiologyCaseMetadata) => {
  try {
    // Mark case as viewed
    casesViewed.value.add(currentIndex.value);

    // Load the case image
    const imagePath = Array.isArray(caseData.files.imagePath)
      ? caseData.files.imagePath[0]
      : caseData.files.imagePath;

    // Fetch and load the image
    const response = await fetch(imagePath);
    const blob = await response.blob();
    const file = new File([blob], caseData.title, { type: blob.type });

    // Load into dataset store
    await datasetStore.loadFiles([file]);

    // Emit case changed event
    emit('case-changed', currentIndex.value);
  } catch (error) {
    console.error('Failed to load case:', error);
  }
};

const previousCase = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    loadCase(props.cases[currentIndex.value]);
  }
};

const nextCase = () => {
  if (currentIndex.value < totalCases.value - 1) {
    currentIndex.value++;
    loadCase(props.cases[currentIndex.value]);
  }
};

const endAssessment = () => {
  showEndDialog.value = true;
};

const confirmEndAssessment = () => {
  stopTimer();

  const summary: AssessmentSummary = {
    timeElapsed: timeElapsed.value,
    casesReviewed: casesReviewed.value,
    totalCases: totalCases.value,
    completionRate: (casesReviewed.value / totalCases.value) * 100
  };

  emit('assessment-ended', summary);
  showEndDialog.value = false;

  // Navigate back to case gallery or show results
  router.push('/welcome');
};

// Lifecycle
onMounted(() => {
  startTimer();
  if (props.cases.length > 0) {
    loadCase(props.cases[0]);
  }
});

onUnmounted(() => {
  stopTimer();
});

// Auto-advance logic
watch(currentIndex, () => {
  if (props.autoAdvance) {
    setTimeout(() => {
      if (currentIndex.value < totalCases.value - 1) {
        nextCase();
      }
    }, 30000); // Auto-advance after 30 seconds
  }
});
</script>

<style scoped>
.timed-assessment {
  position: fixed;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: rgba(30, 30, 40, 0.95);
  backdrop-filter: blur(10px);
  padding: 12px 20px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.timer-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.timer-warning {
  color: #ff6b6b;
}

.timer-icon {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}

.navigation-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.case-counter {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}

.nav-btn {
  min-width: 100px;
}

.end-btn {
  margin-left: 16px;
}

.assessment-summary {
  margin-top: 16px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.summary-item:last-child {
  margin-bottom: 0;
}
</style>