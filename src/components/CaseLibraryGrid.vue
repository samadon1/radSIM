<template>
  <div class="case-library-grid">
    <!-- Loading Overlay - shown while case is loading to prevent dashboard flash -->
    <Transition name="fade">
      <div v-if="isLoadingCase" class="loading-overlay">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <span class="loading-text">Loading case...</span>
        </div>
      </div>
    </Transition>

    <!-- Ultra Minimal Dashboard View -->
    <UltraMinimalDashboard
      v-if="viewMode === 'dashboard'"
      @start-learning="handleStartLearning"
      @start-focused-practice="handleFocusedPractice"
    />

    <!-- Original Practice View -->
    <div v-else>
      <!-- Header -->
      <div class="grid-header">
        <div class="header-content">
          <h1 class="library-title">Practice Mode</h1>
          <p class="library-subtitle">Master radiology through deliberate practice and spaced repetition</p>
        </div>
      </div>

    <!-- Practice Mode Selection -->
    <div class="practice-mode-section">
      <div class="mode-selector">
        <div
          class="mode-option"
          :class="{ 'mode-selected': practiceType === 'focused' }"
          @click="practiceType = 'focused'"
        >
          <div class="mode-icon-wrapper">
            <v-icon size="40" class="mode-icon-main">mdi-target</v-icon>
          </div>
          <div class="mode-content">
            <h3 class="mode-title">Focused Practice</h3>
            <p class="mode-desc">Deep dive into one finding type. Build expertise through concentrated repetition.</p>
          </div>
          <v-icon class="mode-check" size="24">mdi-check-circle</v-icon>
        </div>

        <div
          class="mode-option"
          :class="{ 'mode-selected': practiceType === 'mixed' }"
          @click="practiceType = 'mixed'"
        >
          <div class="mode-icon-wrapper">
            <v-icon size="40" class="mode-icon-main">mdi-shuffle-variant</v-icon>
          </div>
          <div class="mode-content">
            <h3 class="mode-title">Mixed Practice</h3>
            <p class="mode-desc">Spaced repetition across all findings. Optimize long-term retention and recall.</p>
          </div>
          <v-icon class="mode-check" size="24">mdi-check-circle</v-icon>
        </div>
      </div>

      <!-- Finding Categories (for Focused Mode) -->
      <div v-if="practiceType === 'focused'" class="findings-section">
        <div class="section-header-row">
          <h2 class="section-heading">Select a Finding Type</h2>
          <p class="section-subheading">Choose a pathology to focus your practice session</p>
        </div>

        <div class="findings-grid">
          <div
            v-for="category in findingCategories"
            :key="category.finding"
            class="finding-card"
            @click="startFocusedPractice(category.finding)"
          >
            <div class="finding-card-header">
              <div class="icon-badge" :style="{ backgroundColor: category.color + '20', borderColor: category.color }">
                <v-icon :color="category.color" size="28">{{ category.icon }}</v-icon>
              </div>
              <h3 class="finding-name">{{ category.finding }}</h3>
            </div>

            <div class="stats-row">
              <div class="stat-item">
                <span class="stat-number">{{ category.totalCases }}</span>
                <span class="stat-text">cases</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="stat-number">{{ category.reviewed }}</span>
                <span class="stat-text">reviewed</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="stat-number" :class="{ 'stat-highlight': category.dueForReview > 0 }">
                  {{ category.dueForReview }}
                </span>
                <span class="stat-text">due</span>
              </div>
            </div>

            <div class="progress-section">
              <div class="progress-bar-wrapper">
                <div
                  class="progress-bar-fill"
                  :style="{
                    width: `${category.totalCases > 0 ? (category.reviewed / category.totalCases) * 100 : 0}%`,
                    backgroundColor: category.color
                  }"
                ></div>
              </div>
              <span class="progress-text">
                {{ category.totalCases > 0 ? Math.round((category.reviewed / category.totalCases) * 100) : 0 }}% complete
              </span>
            </div>

            <div class="card-action">
              <v-icon size="20">mdi-arrow-right</v-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- Start Mixed Practice Button -->
      <div v-if="practiceType === 'mixed'" class="mixed-start-section">
        <div class="start-container">
          <div class="start-content">
            <h2 class="start-title">Ready to Begin?</h2>
            <p class="start-description">
              Your session will intelligently select cases based on spaced repetition principles,
              prioritizing cases that are due for review to maximize retention.
            </p>
          </div>
          <v-btn
            color="primary"
            size="x-large"
            class="start-button"
            @click="startMixedPractice"
          >
            <v-icon class="mr-2" size="24">mdi-play-circle</v-icon>
            Start Mixed Practice
          </v-btn>
        </div>
      </div>
    </div>
    </div><!-- Close v-else -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useLearningStore } from '@/src/store/learning';
import { useCaseLibraryStore } from '@/src/store/case-library';
import type { RadiologyCaseMetadata } from '@/src/types/caseLibrary';
import { loadUrls } from '@/src/actions/loadUserFiles';
import UltraMinimalDashboard from './UltraMinimalDashboard.vue';

const emit = defineEmits<{
  (e: 'open-sidebar', tabIndex: number): void;
}>();

const learningStore = useLearningStore();
const caseLibraryStore = useCaseLibraryStore();

// State
const viewMode = ref<'dashboard' | 'practice'>('dashboard');
const practiceType = ref<'focused' | 'mixed'>('focused');
const isLoadingCase = ref(false);

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

// Actions
async function startFocusedPractice(finding: string) {
  // Show loading state immediately to prevent dashboard flash
  isLoadingCase.value = true;

  await learningStore.startFocusedSession(finding);

  // Open sidebar FIRST (index 0: Learning=0, Annotations=1)
  emit('open-sidebar', 0);

  // Load the first case image from the current session
  const currentCaseData = learningStore.currentCase;
  if (currentCaseData) {
    caseLibraryStore.selectCaseByMetadata(currentCaseData);
    emit('case-selected', currentCaseData);

    // Load the actual image files into the viewer
    const imagePaths = Array.isArray(currentCaseData.files.imagePath)
      ? currentCaseData.files.imagePath
      : [currentCaseData.files.imagePath];
    await loadUrls({ urls: imagePaths });
  }

  // Hide loading state after image is loaded
  isLoadingCase.value = false;
}

async function startMixedPractice() {
  // Show loading state immediately to prevent dashboard flash
  isLoadingCase.value = true;

  await learningStore.startMixedSession();

  // Open sidebar FIRST (Learning tab is now index 0)
  emit('open-sidebar', 0);

  // Load the first case image from the current session
  const currentCaseData = learningStore.currentCase;
  if (currentCaseData) {
    caseLibraryStore.selectCaseByMetadata(currentCaseData);
    emit('case-selected', currentCaseData);

    // Load the actual image files into the viewer
    const imagePaths = Array.isArray(currentCaseData.files.imagePath)
      ? currentCaseData.files.imagePath
      : [currentCaseData.files.imagePath];
    await loadUrls({ urls: imagePaths });
  }

  // Hide loading state after image is loaded
  isLoadingCase.value = false;
}

// Handle start learning from dashboard (mixed practice)
function handleStartLearning() {
  // Start mixed practice session directly (skip practice view to avoid flash)
  startMixedPractice();
}

// Handle focused practice from dashboard
function handleFocusedPractice(finding: string) {
  // Start focused practice directly (skip practice view to avoid flash)
  startFocusedPractice(finding);
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
.case-library-grid {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  position: relative;
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #0a0a0a;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #5b7dff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Header */
.grid-header {
  padding: 56px 64px 48px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  margin-bottom: 48px;
}

.grid-header::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 64px;
  right: 64px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(66, 99, 235, 0.5), transparent);
}

.header-content {
  max-width: 800px;
  text-align: center;
  margin: 0 auto;
}

.library-title {
  font-size: 48px;
  font-weight: 700;
  letter-spacing: -1px;
  margin: 0 0 12px 0;
  line-height: 1.1;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.85));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.library-subtitle {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.65);
  margin: 0;
  line-height: 1.6;
  font-weight: 400;
}

/* Practice Mode Section */
.practice-mode-section {
  padding: 0 64px 64px;
}

.mode-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 56px;
}

.mode-option {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 32px;
  background: rgba(255, 255, 255, 0.025);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.mode-option::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 0;
  background: linear-gradient(135deg, rgba(66, 99, 235, 0.4), rgba(102, 126, 234, 0.4));
  transition: height 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.mode-option:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.mode-option.mode-selected {
  background: rgba(66, 99, 235, 0.08);
  border-color: rgba(66, 99, 235, 0.5);
  box-shadow: 0 8px 24px rgba(66, 99, 235, 0.15);
}

.mode-option.mode-selected::before {
  height: 3px;
}

.mode-icon-wrapper {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.mode-icon-wrapper::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.25s;
}

.mode-selected .mode-icon-wrapper {
  background: rgba(66, 99, 235, 0.15);
}

.mode-selected .mode-icon-wrapper::after {
  border-color: rgba(66, 99, 235, 0.3);
}

.mode-icon-main {
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.25s;
}

.mode-selected .mode-icon-main {
  color: #5b7dff;
}

.mode-content {
  flex: 1;
  padding-top: 4px;
}

.mode-title {
  font-size: 20px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.98);
  margin: 0 0 8px 0;
  letter-spacing: -0.3px;
  transition: color 0.25s;
}

.mode-selected .mode-title {
  color: #fff;
}

.mode-desc {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.55);
  margin: 0;
  transition: color 0.25s;
}

.mode-selected .mode-desc {
  color: rgba(255, 255, 255, 0.7);
}

.mode-check {
  position: absolute;
  top: 28px;
  right: 28px;
  opacity: 0;
  color: #5b7dff;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(0.8);
}

.mode-selected .mode-check {
  opacity: 1;
  transform: scale(1);
}

/* Findings Section */
.findings-section {
  margin-top: 48px;
}

.section-header-row {
  margin-bottom: 28px;
  padding-left: 4px;
}

.section-heading {
  font-size: 24px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.98);
  margin: 0 0 6px 0;
  letter-spacing: -0.5px;
}

.section-subheading {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.findings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.finding-card {
  position: relative;
  padding: 24px;
  background: rgba(255, 255, 255, 0.025);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.finding-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 0;
  background: linear-gradient(90deg, transparent, currentColor, transparent);
  opacity: 0.6;
  transition: height 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.finding-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.finding-card:hover::before {
  height: 3px;
}

.finding-card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.icon-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  border: 1.5px solid;
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.25s;
}

.finding-card:hover .icon-badge {
  transform: scale(1.05);
}

.finding-name {
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.98);
  margin: 0;
  letter-spacing: -0.3px;
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  gap: 4px;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1;
  letter-spacing: -0.5px;
}

.stat-highlight {
  color: #5b7dff;
}

.stat-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 600;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar-wrapper {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.progress-bar-wrapper::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.progress-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 8px currentColor;
}

.progress-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
  white-space: nowrap;
  min-width: 65px;
  text-align: right;
}

.card-action {
  position: absolute;
  top: 24px;
  right: 24px;
  opacity: 0;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  color: rgba(255, 255, 255, 0.4);
  transform: translateX(-4px);
}

.finding-card:hover .card-action {
  opacity: 1;
  transform: translateX(0);
}

/* Mixed Practice Start */
.mixed-start-section {
  display: flex;
  justify-content: center;
  margin-top: 80px;
}

.start-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 36px;
  max-width: 700px;
  width: 100%;
  padding: 72px 56px;
  background: linear-gradient(135deg, rgba(66, 99, 235, 0.05) 0%, rgba(102, 126, 234, 0.02) 100%);
  border: 1.5px solid rgba(66, 99, 235, 0.2);
  border-radius: 20px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.start-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, #5b7dff, transparent);
}

.start-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.start-title {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.8px;
  color: rgba(255, 255, 255, 0.98);
  margin: 0;
  line-height: 1.2;
}

.start-description {
  font-size: 17px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.65);
  margin: 0;
  max-width: 560px;
}

.start-button {
  font-size: 16px !important;
  font-weight: 600 !important;
  letter-spacing: -0.2px !important;
  height: 56px !important;
  padding: 0 40px !important;
  border-radius: 12px !important;
  text-transform: none !important;
  box-shadow: 0 8px 24px rgba(66, 99, 235, 0.3) !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.start-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(66, 99, 235, 0.4) !important;
}


/* Responsive adjustments */
@media (max-width: 1200px) {
  .findings-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

@media (max-width: 900px) {
  .grid-header {
    padding: 40px 32px 36px;
  }

  .grid-header::after {
    left: 32px;
    right: 32px;
  }

  .library-title {
    font-size: 36px;
  }

  .library-subtitle {
    font-size: 16px;
  }

  .practice-mode-section {
    padding: 0 32px 48px;
  }

  .mode-selector {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .findings-grid {
    grid-template-columns: 1fr;
  }

  .start-container {
    padding: 56px 40px;
  }

  .start-title {
    font-size: 28px;
  }

  .start-description {
    font-size: 16px;
  }
}

/* Scrollbar styling */
.case-library-grid::-webkit-scrollbar {
  width: 8px;
}

.case-library-grid::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
}

.case-library-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  transition: background 0.2s;
}

.case-library-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.mode-option {
  animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) backwards;
}

.mode-option:nth-child(1) { animation-delay: 0.1s; }
.mode-option:nth-child(2) { animation-delay: 0.15s; }

.finding-card {
  animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) backwards;
}

.finding-card:nth-child(1) { animation-delay: 0.05s; }
.finding-card:nth-child(2) { animation-delay: 0.1s; }
.finding-card:nth-child(3) { animation-delay: 0.15s; }
.finding-card:nth-child(4) { animation-delay: 0.2s; }
.finding-card:nth-child(5) { animation-delay: 0.25s; }
.finding-card:nth-child(6) { animation-delay: 0.3s; }
.finding-card:nth-child(7) { animation-delay: 0.35s; }
.finding-card:nth-child(8) { animation-delay: 0.4s; }

.start-container {
  animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.2s backwards;
}
</style>
