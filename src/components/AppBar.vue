<script setup>
import { computed } from 'vue';
import { useLearningStore } from '@/src/store/learning';
import { useCaseLibraryStore } from '@/src/store/case-library';
import { loadUrls } from '@/src/actions/loadUserFiles';

const emit = defineEmits(['click:left-menu']);

const learningStore = useLearningStore();
const caseLibraryStore = useCaseLibraryStore();

const isLearningActive = computed(() => learningStore.isSessionActive);
const viewPosition = computed(() => learningStore.currentCase?.viewPosition || 'PA');
const currentCaseNumber = computed(() => learningStore.currentCaseIndex + 1);
const totalCases = computed(() => learningStore.sessionCases.length);

function exitLearningSession() {
  // Show confirmation modal instead of directly exiting
  learningStore.requestExitConfirmation();
}

async function handleNextCase() {
  // Move to next case in the session
  learningStore.nextCase();

  // Load the new case image
  const currentCase = learningStore.currentCase;
  if (currentCase) {
    caseLibraryStore.selectCaseByMetadata(currentCase);

    // Load the actual image files into the viewer
    const imagePaths = Array.isArray(currentCase.files.imagePath)
      ? currentCase.files.imagePath
      : [currentCase.files.imagePath];
    await loadUrls({ urls: imagePaths });
  } else {
    // Session complete
    learningStore.endSession();
  }
}
</script>

<template>
  <v-app-bar app clipped-left :height="64" color="black" class="app-header">
    <v-btn icon="mdi-menu" @click="emit('click:left-menu')" />
    <v-toolbar-title class="d-flex flex-row align-center">
      <div class="radsim-logo">
        <span class="logo-text">RADSIM</span>
      </div>
    </v-toolbar-title>
    <v-spacer></v-spacer>
    <template v-if="isLearningActive">
      <div class="case-counter">
        Case {{ currentCaseNumber }} of {{ totalCases }}
      </div>
      <v-btn
        variant="tonal"
        size="large"
        @click="exitLearningSession"
        class="control-btn"
      >
        Exit
      </v-btn>
      <v-btn
        variant="tonal"
        size="large"
        @click="handleNextCase"
        class="control-btn"
      >
        Next Case
      </v-btn>
    </template>
  </v-app-bar>
</template>

<style src="@/src/components/styles/utils.css"></style>
<style scoped>
.radsim-logo {
  display: flex;
  align-items: center;
  padding: 0 8px;
}

.logo-text {
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
}

.app-header {
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

.case-counter {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-right: 8px;
}

.control-btn {
  font-size: 16px;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  height: 44px;
  margin-left: 12px;
  background: rgba(255, 255, 255, 0.08) !important;
  color: rgba(255, 255, 255, 0.9);
}
</style>
