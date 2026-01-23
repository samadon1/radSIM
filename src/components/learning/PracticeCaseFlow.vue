<template>
  <div class="practice-flow">
    <!-- Progress Header -->
    <div class="practice-header">
      <v-btn icon @click="confirmExit" variant="text">
        <v-icon>mdi-close</v-icon>
      </v-btn>

      <div class="progress-info">
        <span class="case-counter">
          Case {{ learningStore.currentCaseIndex + 1 }} of {{ learningStore.sessionCases.length }}
        </span>
        <v-progress-linear
          :model-value="learningStore.sessionProgress"
          color="primary"
          height="4"
          class="progress-bar"
        />
      </div>

      <div class="mode-badge">
        <v-chip :color="modeBadgeColor" size="small">
          {{ modeBadgeText }}
        </v-chip>
      </div>
    </div>

    <!-- Main Content: 4-Screen Flow -->
    <div class="practice-content">
      <!-- Screen 1: Case Presentation -->
      <case-presentation-screen
        v-if="currentScreen === 'presentation'"
        :case-data="currentCase"
        @begin-interpretation="advanceToInterpretation"
      />

      <!-- Screen 2: Interpretation (Commitment Phase) -->
      <interpretation-screen
        v-else-if="currentScreen === 'interpretation'"
        :case-data="currentCase"
        @submit="handleSubmission"
      />

      <!-- Screen 3: Feedback -->
      <feedback-screen
        v-else-if="currentScreen === 'feedback'"
        :case-data="currentCase"
        :assessment="currentAssessment"
        @show-deep-dive="showDeepDive"
        @next-case="handleNextCase"
      />

      <!-- Screen 4: Deep Dive (Optional) -->
      <deep-dive-screen
        v-else-if="currentScreen === 'deepdive'"
        :case-data="currentCase"
        :finding="deepDiveFinding"
        @continue="returnToFeedback"
      />

      <!-- Session Complete -->
      <session-summary
        v-else-if="currentScreen === 'summary'"
        :stats="learningStore.sessionStats"
        @return-dashboard="returnToDashboard"
        @review-mistakes="reviewMistakes"
      />
    </div>

    <!-- Exit Confirmation Dialog -->
    <v-dialog v-model="showExitDialog" max-width="400">
      <v-card>
        <v-card-title>Exit Session?</v-card-title>
        <v-card-text>
          Your progress will be saved, but you'll lose your current session.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showExitDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="exitSession">Exit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useLearningStore } from '@/src/store/learning';
import type { UserResponse, AssessmentResult } from '@/src/store/learning';
import CasePresentationScreen from './CasePresentationScreen.vue';
import InterpretationScreen from './InterpretationScreen.vue';
import FeedbackScreen from './FeedbackScreen.vue';
import DeepDiveScreen from './DeepDiveScreen.vue';
import SessionSummary from './SessionSummary.vue';

const router = useRouter();
const learningStore = useLearningStore();

// State
type ScreenType = 'presentation' | 'interpretation' | 'feedback' | 'deepdive' | 'summary';
const currentScreen = ref<ScreenType>('presentation');
const currentAssessment = ref<AssessmentResult | null>(null);
const deepDiveFinding = ref<any>(null);
const showExitDialog = ref(false);

// Computed
const currentCase = computed(() => learningStore.currentCase);

const modeBadgeText = computed(() => {
  if (learningStore.currentMode === 'focused') {
    return `Focused: ${learningStore.currentFindingType}`;
  }
  return 'Mixed Practice';
});

const modeBadgeColor = computed(() => {
  return learningStore.currentMode === 'focused' ? 'primary' : 'secondary';
});

// Actions
function advanceToInterpretation() {
  learningStore.startCase();
  currentScreen.value = 'interpretation';
}

function handleSubmission(response: UserResponse) {
  // Store user response
  learningStore.submitResponse(response);

  // Assess the response
  currentAssessment.value = learningStore.assessResponse();

  // Update learning progress (SM-2 algorithm)
  learningStore.updateLearningProgress(currentAssessment.value);

  // Show feedback
  currentScreen.value = 'feedback';
}

function showDeepDive(finding: any) {
  deepDiveFinding.value = finding;
  currentScreen.value = 'deepdive';
}

function returnToFeedback() {
  currentScreen.value = 'feedback';
}

function handleNextCase() {
  // Check if session complete
  if (learningStore.currentCaseIndex >= learningStore.sessionCases.length - 1) {
    // Show summary
    currentScreen.value = 'summary';
  } else {
    // Advance to next case
    learningStore.nextCase();
    currentScreen.value = 'presentation';
    currentAssessment.value = null;
  }
}

function confirmExit() {
  showExitDialog.value = true;
}

function exitSession() {
  learningStore.endSession();
  router.push({ name: 'Learning' });
}

function returnToDashboard() {
  learningStore.endSession();
  router.push({ name: 'Learning' });
}

function reviewMistakes() {
  // TODO: Filter session to only show cases where score < 80%
  alert('Review mistakes feature coming soon!');
}

// Keyboard shortcuts
function handleKeyPress(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    confirmExit();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyPress);

  // Ensure we have cases loaded
  if (learningStore.sessionCases.length === 0) {
    console.error('No cases loaded in session');
    router.push({ name: 'Learning' });
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress);
});
</script>

<style scoped>
.practice-flow {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #000;
  color: #fff;
}

.practice-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 24px;
  background: rgba(30, 30, 30, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.progress-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.case-counter {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.progress-bar {
  max-width: 300px;
}

.mode-badge {
  text-transform: capitalize;
}

.practice-content {
  flex: 1;
  overflow: hidden;
}
</style>
