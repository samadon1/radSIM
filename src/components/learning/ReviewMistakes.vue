<template>
  <div class="review-mistakes">
    <div class="review-container">
      <!-- Header -->
      <div class="review-header">
        <button class="exit-btn" @click="$emit('exit-review')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Exit Review
        </button>
        <div class="review-progress">
          {{ currentIndex + 1 }} of {{ cases.length }} mistakes
        </div>
      </div>

      <!-- Case Content -->
      <div class="case-content" v-if="currentCase">
        <!-- Image Section -->
        <div class="image-section">
          <div class="image-container">
            <img
              :src="imageUrl"
              alt="X-ray"
              class="xray-image"
              @load="onImageLoad"
            />
            <!-- Ground Truth Overlay -->
            <div
              v-for="(finding, idx) in currentCase.findings"
              :key="idx"
              class="finding-overlay"
              :style="getOverlayStyle(finding)"
            >
              <div class="finding-label">{{ finding.name }}</div>
            </div>
          </div>
        </div>

        <!-- Info Section -->
        <div class="info-section">
          <!-- Clinical History -->
          <div class="info-card">
            <h3>Clinical History</h3>
            <p>
              Age {{ currentCase.demographics?.age }} {{ currentCase.demographics?.sex === 'M' ? 'Male' : 'Female' }}.
              {{ currentCase.clinicalHistory || 'No clinical history provided.' }}
            </p>
          </div>

          <!-- Diagnosis -->
          <div class="info-card diagnosis-card">
            <h3>Correct Answer</h3>
            <div class="diagnosis-value">{{ currentCase.diagnosis }}</div>
            <div class="diagnosis-type" v-if="currentCase.findings?.length">
              {{ currentCase.findings.length }} finding{{ currentCase.findings.length > 1 ? 's' : '' }} present
            </div>
          </div>

          <!-- Findings List -->
          <div class="info-card" v-if="currentCase.findings?.length">
            <h3>Key Findings</h3>
            <ul class="findings-list">
              <li v-for="(finding, idx) in currentCase.findings" :key="idx">
                <strong>{{ finding.name }}</strong>
                <span v-if="finding.location"> - {{ finding.location }}</span>
              </li>
            </ul>
          </div>

          <!-- Expert Analysis Button -->
          <button
            class="expert-btn"
            @click="showExpertAnalysis"
            :disabled="isLoadingExpert"
          >
            <span v-if="isLoadingExpert">Generating Analysis...</span>
            <span v-else-if="expertAnalysisShown">View Expert Analysis</span>
            <span v-else>Get Expert Analysis</span>
          </button>

          <!-- Expert Analysis Content -->
          <div class="info-card expert-card" v-if="expertContent">
            <h3>Expert Analysis</h3>
            <div class="expert-content" v-html="expertContent"></div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="review-navigation">
        <button
          class="nav-btn"
          @click="previousCase"
          :disabled="currentIndex === 0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Previous
        </button>

        <button
          class="nav-btn primary"
          @click="nextCase"
          :disabled="currentIndex === cases.length - 1"
        >
          Next
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { RadiologyCaseMetadata } from '@/src/types/caseLibrary';
import { useGemini } from '@/src/composables/useGemini';
import { marked } from 'marked';

const props = defineProps<{
  cases: RadiologyCaseMetadata[];
}>();

const emit = defineEmits(['exit-review']);

const { generateExpertAnalysisStreaming } = useGemini();

const currentIndex = ref(0);
const expertContent = ref<string | null>(null);
const expertAnalysisShown = ref(false);
const isLoadingExpert = ref(false);
const imageLoaded = ref(false);

const currentCase = computed(() => props.cases[currentIndex.value]);

const imageUrl = computed(() => {
  if (!currentCase.value?.files?.imagePath) return '';
  const path = currentCase.value.files.imagePath;
  return path.startsWith('/') ? path : `/${path}`;
});

function onImageLoad() {
  imageLoaded.value = true;
}

function getOverlayStyle(finding: any) {
  // If finding has ROI coordinates, position the overlay
  if (finding.roi) {
    return {
      left: `${finding.roi.x}%`,
      top: `${finding.roi.y}%`,
      width: `${finding.roi.width}%`,
      height: `${finding.roi.height}%`
    };
  }
  // Default: show label at bottom
  return {
    bottom: '10px',
    left: '10px',
    width: 'auto',
    height: 'auto'
  };
}

function previousCase() {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    resetExpertAnalysis();
  }
}

function nextCase() {
  if (currentIndex.value < props.cases.length - 1) {
    currentIndex.value++;
    resetExpertAnalysis();
  }
}

function resetExpertAnalysis() {
  expertContent.value = null;
  expertAnalysisShown.value = false;
}

async function showExpertAnalysis() {
  if (expertContent.value) {
    // Already have content, just scroll to it
    return;
  }

  if (!currentCase.value) return;

  isLoadingExpert.value = true;
  expertAnalysisShown.value = true;

  try {
    // Fetch the image
    const imageResponse = await fetch(imageUrl.value);
    if (!imageResponse.ok) throw new Error('Failed to load image');
    const imageBlob = await imageResponse.blob();
    const imageFile = new File([imageBlob], 'xray.png', { type: imageBlob.type || 'image/png' });

    // Stream expert analysis
    await generateExpertAnalysisStreaming(
      currentCase.value,
      imageFile,
      (chunk: string) => {
        expertContent.value = marked.parse(chunk) as string;
      }
    );
  } catch (error) {
    console.error('Failed to generate expert analysis:', error);
    expertContent.value = '<p>Unable to generate expert analysis. Please try again.</p>';
  } finally {
    isLoadingExpert.value = false;
  }
}

// Reset when cases change
watch(() => props.cases, () => {
  currentIndex.value = 0;
  resetExpertAnalysis();
});
</script>

<style scoped>
.review-mistakes {
  position: fixed;
  inset: 0;
  background: #000;
  color: #fff;
  overflow-y: auto;
  z-index: 1000;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
}

.review-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header */
.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.exit-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.exit-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.review-progress {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

/* Case Content */
.case-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 32px;
}

/* Image Section */
.image-section {
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.image-container {
  position: relative;
  max-width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.xray-image {
  display: block;
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.finding-overlay {
  position: absolute;
  border: 2px solid #22c55e;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 4px;
  pointer-events: none;
}

.finding-label {
  position: absolute;
  bottom: 100%;
  left: 0;
  background: #22c55e;
  color: #000;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px 4px 0 0;
  white-space: nowrap;
}

/* Info Section */
.info-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 20px;
}

.info-card h3 {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 12px 0;
}

.info-card p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.8);
}

.diagnosis-card {
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.2);
}

.diagnosis-value {
  font-size: 24px;
  font-weight: 600;
  color: #22c55e;
  margin-bottom: 4px;
}

.diagnosis-type {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.findings-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.findings-list li {
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.findings-list li:last-child {
  border-bottom: none;
}

.findings-list strong {
  color: #fff;
}

/* Expert Button */
.expert-btn {
  width: 100%;
  padding: 14px 20px;
  background: rgba(66, 99, 235, 0.1);
  border: 1px solid rgba(66, 99, 235, 0.3);
  border-radius: 10px;
  color: #4263eb;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.expert-btn:hover:not(:disabled) {
  background: rgba(66, 99, 235, 0.15);
  border-color: rgba(66, 99, 235, 0.4);
}

.expert-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Expert Card */
.expert-card {
  background: rgba(66, 99, 235, 0.05);
  border-color: rgba(66, 99, 235, 0.15);
}

.expert-content {
  font-size: 14px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.85);
}

.expert-content :deep(h1),
.expert-content :deep(h2),
.expert-content :deep(h3) {
  color: #fff;
  margin-top: 16px;
  margin-bottom: 8px;
}

.expert-content :deep(strong) {
  color: #fff;
}

.expert-content :deep(ul),
.expert-content :deep(ol) {
  padding-left: 20px;
  margin: 8px 0;
}

.expert-content :deep(li) {
  margin: 4px 0;
}

/* Navigation */
.review-navigation {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.nav-btn.primary {
  background: linear-gradient(135deg, #4263eb, #5273ff);
  border: none;
  color: #fff;
}

.nav-btn.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 99, 235, 0.3);
}

/* Responsive */
@media (max-width: 900px) {
  .case-content {
    grid-template-columns: 1fr;
  }

  .image-section {
    order: 1;
  }

  .info-section {
    order: 2;
  }

  .xray-image {
    max-height: 50vh;
  }
}
</style>
