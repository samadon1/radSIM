<template>
  <div class="case-browser fill-height">
    <div class="browser-container">
      <!-- Header -->
      <div class="header-section">
        <h2 class="section-title">CASE LIBRARY</h2>
        <p class="section-subtitle">Browse cases or start a practice session</p>
      </div>

      <!-- Practice Mode Section -->
      <div class="practice-section">
        <h3 class="subsection-title">PRACTICE MODE</h3>

        <!-- Mode Selection -->
        <div
          class="mode-card"
          :class="{ 'mode-active': selectedMode === 'focused' }"
          @click="selectedMode = 'focused'"
        >
          <div class="mode-header">
            <v-icon size="20" class="mode-icon">mdi-target</v-icon>
            <h4>Focused Practice</h4>
          </div>
          <p class="mode-description">Master one finding type at a time</p>
        </div>

        <div
          class="mode-card"
          :class="{ 'mode-active': selectedMode === 'mixed' }"
          @click="selectedMode = 'mixed'"
        >
          <div class="mode-header">
            <v-icon size="20" class="mode-icon">mdi-shuffle-variant</v-icon>
            <h4>Mixed Practice</h4>
          </div>
          <p class="mode-description">Spaced repetition across all findings</p>
        </div>

        <!-- Finding Categories (for Focused Mode) -->
        <div v-if="selectedMode === 'focused'" class="categories-list">
          <h4 class="list-title">Select Finding:</h4>
          <div
            v-for="category in findingCategories"
            :key="category.finding"
            class="category-item"
            @click="startFocusedPractice(category.finding)"
          >
            <div class="category-header">
              <v-icon :color="category.color" size="18">{{ category.icon }}</v-icon>
              <span class="category-name">{{ category.finding }}</span>
            </div>
            <div class="category-meta">
              <span class="meta-text">{{ category.totalCases }} cases</span>
              <span v-if="category.dueForReview > 0" class="meta-due">{{ category.dueForReview }} due</span>
            </div>
            <v-progress-linear
              :model-value="category.totalCases > 0 ? (category.reviewed / category.totalCases) * 100 : 0"
              :color="category.color"
              height="2"
              class="category-progress"
            />
          </div>
        </div>

        <!-- Start Button for Mixed Mode -->
        <div v-if="selectedMode === 'mixed'" class="action-area">
          <v-btn
            color="primary"
            block
            size="large"
            @click="startMixedPractice"
          >
            <v-icon class="mr-2">mdi-play</v-icon>
            Start Mixed Practice
          </v-btn>
        </div>
      </div>

      <!-- Divider -->
      <v-divider class="section-divider" />

      <!-- Case Library Section -->
      <div class="library-section">
        <h3 class="subsection-title">BROWSE CASES</h3>

        <div v-if="cases.length === 0" class="empty-state">
          <v-icon size="48" color="grey">mdi-folder-open-outline</v-icon>
          <p>No cases loaded</p>
          <p class="empty-hint">Cases will appear here when loaded</p>
        </div>

        <div v-else class="case-list">
          <div
            v-for="caseItem in cases"
            :key="caseItem.id"
            class="case-item"
            @click="selectCase(caseItem)"
          >
            <div class="case-info">
              <h4 class="case-title">{{ caseItem.id }}</h4>
              <p class="case-meta">
                {{ caseItem.modality }} • {{ caseItem.demographics?.age }}yo {{ caseItem.demographics?.sex }}
              </p>
              <div class="case-findings">
                <v-chip
                  v-for="finding in caseItem.findings.slice(0, 2)"
                  :key="finding.name"
                  size="x-small"
                  variant="outlined"
                  class="finding-chip"
                >
                  {{ finding.name }}
                </v-chip>
                <span v-if="caseItem.findings.length > 2" class="more-findings">
                  +{{ caseItem.findings.length - 2 }}
                </span>
              </div>
            </div>
            <v-icon size="20" color="grey">mdi-chevron-right</v-icon>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import { useLearningStore } from '@/src/store/learning';
import { useCaseLibraryStore } from '@/src/store/case-library';
import type { RadiologyCaseMetadata } from '@/src/types/caseLibrary';

const learningStore = useLearningStore();
const caseLibraryStore = useCaseLibraryStore();

// Inject the function to switch tabs
const switchToTab = inject<(tabIndex: number) => void>('switchToTab');

// State
const selectedMode = ref<'focused' | 'mixed'>('focused');

// Finding categories for dashboard
const findingCategories = computed(() => {
  const categories = [
    { finding: 'Pneumonia', color: '#E74C3C', icon: 'mdi-lungs' },
    { finding: 'Cardiomegaly', color: '#E91E63', icon: 'mdi-heart' },
    { finding: 'Effusion', color: '#3498DB', icon: 'mdi-water' },
    { finding: 'Atelectasis', color: '#9B59B6', icon: 'mdi-arrow-collapse' },
    { finding: 'Pneumothorax', color: '#F39C12', icon: 'mdi-alert' },
    { finding: 'Mass', color: '#E67E22', icon: 'mdi-circle' },
    { finding: 'Nodule', color: '#95A5A6', icon: 'mdi-circle-small' },
    { finding: 'Infiltration', color: '#1ABC9C', icon: 'mdi-blur' },
  ];

  return categories.map(cat => {
    const progress = learningStore.getCategoryProgress(cat.finding);
    return {
      ...cat,
      totalCases: progress.totalCases,
      reviewed: progress.reviewed,
      dueForReview: progress.dueForReview,
    };
  });
});

// Cases from library
const cases = computed(() => caseLibraryStore.cases);

// Actions
async function startFocusedPractice(finding: string) {
  await learningStore.startFocusedSession(finding);

  // Load the first case image from the current session
  const currentCaseData = learningStore.currentCase;
  if (currentCaseData) {
    caseLibraryStore.selectCaseByMetadata(currentCaseData);
  }

  // Switch to Learning tab (index 2: Cases=0, RADSIM AI=1, Learning=2)
  if (switchToTab) {
    switchToTab(2);
  }
}

async function startMixedPractice() {
  await learningStore.startMixedSession();

  // Load the first case image from the current session
  const currentCaseData = learningStore.currentCase;
  if (currentCaseData) {
    caseLibraryStore.selectCaseByMetadata(currentCaseData);
  }

  // Switch to Learning tab
  if (switchToTab) {
    switchToTab(2);
  }
}

function selectCase(caseItem: RadiologyCaseMetadata) {
  caseLibraryStore.selectCaseByMetadata(caseItem);

  // Optionally switch to RADSIM AI tab to analyze the case
  if (switchToTab) {
    switchToTab(1);
  }
}

// Initialize
onMounted(async () => {
  // Load case library if not already loaded
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

  // Initialize learning store
  learningStore.initializeFromCaseLibrary(caseLibraryStore.cases);
});
</script>

<style scoped>
.case-browser {
  display: flex;
  flex-direction: column;
  background: #0a0a0a;
  overflow: hidden;
}

.browser-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* Header Section */
.header-section {
  margin-bottom: 28px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1.5px;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 6px;
}

.section-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

/* Practice Section */
.practice-section {
  margin-bottom: 24px;
}

.subsection-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 14px;
}

.mode-card {
  padding: 14px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.2);
}

.mode-card.mode-active {
  background: rgba(33, 150, 243, 0.1);
  border-color: #2196F3;
}

.mode-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.mode-header h4 {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.mode-icon {
  color: rgba(255, 255, 255, 0.6);
}

.mode-description {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  padding-left: 30px;
}

/* Categories List */
.categories-list {
  margin-top: 16px;
}

.list-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 10px;
}

.category-item {
  padding: 12px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateX(2px);
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.category-name {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.category-meta {
  display: flex;
  gap: 10px;
  margin-bottom: 6px;
  font-size: 10px;
}

.meta-text {
  color: rgba(255, 255, 255, 0.5);
}

.meta-due {
  color: #2196F3;
  font-weight: 500;
}

.category-progress {
  margin-top: 6px;
}

/* Action Area */
.action-area {
  margin-top: 16px;
}

/* Divider */
.section-divider {
  margin: 24px 0;
  border-color: rgba(255, 255, 255, 0.1);
}

/* Library Section */
.library-section {
  margin-bottom: 20px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.4);
}

.empty-state p {
  margin-top: 12px;
  font-size: 13px;
}

.empty-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
}

/* Case List */
.case-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.case-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.case-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateX(2px);
}

.case-info {
  flex: 1;
}

.case-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 4px;
}

.case-meta {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
}

.case-findings {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.finding-chip {
  font-size: 10px !important;
}

.more-findings {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  margin-left: 4px;
}

/* Scrollbar Styling */
.browser-container::-webkit-scrollbar {
  width: 6px;
}

.browser-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.browser-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.browser-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
