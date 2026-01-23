<template>
  <div class="feedback-screen">
    <!-- Left: Image with Overlays -->
    <div class="image-section">
      <slice-viewer
        v-if="imageId"
        id="learning-feedback-view"
        :current-image-id="imageId"
        :current-tool="Tools.WindowLevel"
      />

      <!-- SVG Overlay for Findings -->
      <svg class="findings-overlay" :view-box="`0 0 ${imageWidth} ${imageHeight}`">
        <!-- Green boxes: Correct findings -->
        <g v-for="(finding, idx) in correctFindings" :key="'correct-' + idx">
          <rect
            v-if="finding.roi"
            :x="finding.roi.x"
            :y="finding.roi.y"
            :width="finding.roi.width"
            :height="finding.roi.height"
            class="correct-box"
          />
          <text
            v-if="finding.roi"
            :x="finding.roi.x"
            :y="finding.roi.y - 8"
            class="finding-label correct-label"
          >
            ✓ {{ finding.name }}
          </text>
        </g>

        <!-- Yellow boxes: Missed findings -->
        <g v-for="(finding, idx) in missedFindings" :key="'missed-' + idx">
          <rect
            v-if="finding.roi"
            :x="finding.roi.x"
            :y="finding.roi.y"
            :width="finding.roi.width"
            :height="finding.roi.height"
            class="missed-box"
          />
          <text
            v-if="finding.roi"
            :x="finding.roi.x"
            :y="finding.roi.y - 8"
            class="finding-label missed-label"
          >
            ✗ {{ finding.name }}
          </text>
        </g>
      </svg>
    </div>

    <!-- Right: Results Panel -->
    <div class="results-panel">
      <div class="panel-content">
        <h2 class="panel-title">Assessment Results</h2>

        <!-- Score Card -->
        <div class="score-card" :class="scoreClass">
          <div class="score-circle">
            <div class="score-value">{{ assessment.score }}%</div>
            <div class="score-label">Score</div>
          </div>
          <div class="score-details">
            <div class="detail-item">
              <v-icon size="small">mdi-clock-outline</v-icon>
              {{ formatTime(assessment.timeSpent) }}
            </div>
            <div class="detail-item">
              <v-icon size="small">mdi-star</v-icon>
              {{ assessment.confidence }}/5 confidence
            </div>
          </div>
        </div>

        <!-- Correct Findings -->
        <div v-if="correctList.length > 0" class="result-section correct-section">
          <h3 class="result-heading">
            <v-icon color="success">mdi-check-circle</v-icon>
            Correctly Identified
          </h3>
          <ul class="result-list">
            <li v-for="finding in correctList" :key="finding">
              {{ finding }}
            </li>
          </ul>
        </div>

        <!-- Missed Findings -->
        <div v-if="missedList.length > 0" class="result-section missed-section">
          <h3 class="result-heading">
            <v-icon color="warning">mdi-alert-circle</v-icon>
            Missed
          </h3>
          <ul class="result-list">
            <li v-for="finding in missedList" :key="finding">
              {{ finding }}
              <v-btn
                size="small"
                variant="text"
                color="warning"
                @click="$emit('show-deep-dive', getFindingByName(finding))"
              >
                Show me
                <v-icon right size="small">mdi-arrow-right</v-icon>
              </v-btn>
            </li>
          </ul>
        </div>

        <!-- False Positives -->
        <div v-if="assessment.falsePositives.length > 0" class="result-section incorrect-section">
          <h3 class="result-heading">
            <v-icon color="error">mdi-close-circle</v-icon>
            Incorrect
          </h3>
          <ul class="result-list">
            <li v-for="fp in assessment.falsePositives" :key="fp">
              {{ fp }} (false positive)
            </li>
          </ul>
        </div>

        <!-- Teaching Point -->
        <div v-if="teachingPoint" class="teaching-section">
          <h3 class="result-heading">
            <v-icon color="info">mdi-lightbulb</v-icon>
            Teaching Point
          </h3>
          <p class="teaching-text">{{ teachingPoint }}</p>
        </div>

        <!-- Actions -->
        <div class="action-buttons">
          <v-btn
            block
            size="x-large"
            color="primary"
            @click="$emit('next-case')"
            class="next-button"
          >
            Next Case
            <v-icon right>mdi-arrow-right</v-icon>
          </v-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import SliceViewer from '@/src/components/SliceViewer.vue';
import { Tools } from '@/src/store/tools/types';
import { useImageStore } from '@/src/store/datasets-images';
import type { RadiologyCaseMetadata, CaseFinding } from '@/src/types/caseLibrary';
import type { AssessmentResult } from '@/src/store/learning';

const props = defineProps<{
  caseData: RadiologyCaseMetadata;
  assessment: AssessmentResult;
}>();

const emit = defineEmits<{
  (e: 'show-deep-dive', finding: CaseFinding): void;
  (e: 'next-case'): void;
}>();

const imageStore = useImageStore();
const imageId = ref<string | null>(null);
const imageWidth = ref(1024);
const imageHeight = ref(1024);

// Computed
const correctList = computed(() => props.assessment.correct);
const missedList = computed(() => props.assessment.missed);

const correctFindings = computed(() => {
  return props.caseData.findings.filter(f =>
    correctList.value.includes(f.name.toLowerCase())
  );
});

const missedFindings = computed(() => {
  return props.caseData.findings.filter(f =>
    missedList.value.includes(f.name.toLowerCase())
  );
});

const scoreClass = computed(() => {
  const score = props.assessment.score;
  if (score >= 90) return 'score-excellent';
  if (score >= 75) return 'score-good';
  if (score >= 60) return 'score-fair';
  return 'score-poor';
});

const teachingPoint = computed(() => {
  // Generate teaching point based on what was missed
  if (missedList.value.length === 0) {
    return 'Excellent work! You correctly identified all findings in this case.';
  }

  const missed = missedList.value[0];
  const teachingPoints: Record<string, string> = {
    'effusion': 'Pleural effusions often present with blunting of the costophrenic angles. Always check both sides systematically.',
    'cardiomegaly': 'The cardiothoracic ratio >0.5 on PA view suggests cardiomegaly. Consider heart failure and valvular disease.',
    'pneumothorax': 'Look for the pleural line and absence of lung markings peripherally. Small pneumothoraces are easily missed.',
    'atelectasis': 'Atelectasis causes volume loss and increased opacity. Look for shifted fissures and compensatory changes.',
  };

  return teachingPoints[missed] || `Review the features of ${missed} to improve recognition in future cases.`;
});

// Load image
onMounted(async () => {
  try {
    const imagePath = props.caseData.files.imagePath;
    const response = await fetch(`/${imagePath}`);

    if (!response.ok) {
      throw new Error(`Failed to load image: ${response.statusText}`);
    }

    const blob = await response.blob();
    const filename = imagePath.split('/').pop() || 'case-image.png';
    const file = new File([blob], filename, { type: blob.type || 'image/png' });

    imageId.value = await imageStore.addImage(file);
  } catch (error) {
    console.error('Failed to load case image:', error);
  }
});

// Helpers
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function getFindingByName(name: string): CaseFinding | undefined {
  return props.caseData.findings.find(f => f.name.toLowerCase() === name.toLowerCase());
}
</script>

<style scoped>
.feedback-screen {
  display: grid;
  grid-template-columns: 1fr 450px;
  height: 100%;
  background: #000;
}

.image-section {
  position: relative;
  background: #000;
}

.findings-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}

.correct-box {
  fill: none;
  stroke: #4CAF50;
  stroke-width: 3;
  opacity: 0.8;
  animation: fadeIn 0.5s ease-out;
}

.missed-box {
  fill: none;
  stroke: #FFC107;
  stroke-width: 3;
  stroke-dasharray: 10, 5;
  opacity: 0.8;
  animation: fadeIn 0.5s ease-out 0.3s;
  animation-fill-mode: both;
}

.finding-label {
  font-size: 16px;
  font-weight: bold;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
}

.correct-label {
  fill: #4CAF50;
}

.missed-label {
  fill: #FFC107;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.8;
  }
}

.results-panel {
  background: #1e1e1e;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  overflow-y: auto;
}

.panel-content {
  padding: 30px;
}

.panel-title {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 30px;
  color: #fff;
}

.score-card {
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 30px;
  text-align: center;
  animation: scaleIn 0.5s ease-out;
}

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

.score-excellent {
  background: linear-gradient(135deg, #4CAF50 0%, #45B7D1 100%);
}

.score-good {
  background: linear-gradient(135deg, #2196F3 0%, #45B7D1 100%);
}

.score-fair {
  background: linear-gradient(135deg, #FFC107 0%, #FF9800 100%);
}

.score-poor {
  background: linear-gradient(135deg, #F44336 0%, #E91E63 100%);
}

.score-circle {
  margin-bottom: 16px;
}

.score-value {
  font-size: 64px;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.score-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.score-details {
  display: flex;
  justify-content: center;
  gap: 24px;
  color: rgba(255, 255, 255, 0.9);
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.result-section {
  margin-bottom: 24px;
  padding: 20px;
  border-radius: 8px;
  animation: slideInRight 0.5s ease-out;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.correct-section {
  background: rgba(76, 175, 80, 0.1);
  border-left: 4px solid #4CAF50;
}

.missed-section {
  background: rgba(255, 193, 7, 0.1);
  border-left: 4px solid #FFC107;
}

.incorrect-section {
  background: rgba(244, 67, 54, 0.1);
  border-left: 4px solid #F44336;
}

.teaching-section {
  background: rgba(33, 150, 243, 0.1);
  border-left: 4px solid #2196F3;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.result-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #fff;
}

.result-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.result-list li {
  padding: 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: rgba(255, 255, 255, 0.9);
}

.teaching-text {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  margin: 0;
}

.action-buttons {
  margin-top: 30px;
}

.next-button {
  font-size: 16px;
  font-weight: 600;
  padding: 28px 0 !important;
}
</style>
