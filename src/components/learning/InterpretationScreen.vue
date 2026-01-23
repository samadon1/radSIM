<template>
  <div class="interpretation-screen">
    <!-- Left: Image with Annotation Tools -->
    <div class="image-section">
      <slice-viewer
        v-if="imageId"
        id="learning-interpretation-view"
        :current-image-id="imageId"
        :current-tool="currentTool"
      />

      <!-- Tool Palette (Floating) -->
      <div class="tool-palette">
        <v-btn-toggle
          v-model="currentTool"
          mandatory
          color="primary"
          class="tool-buttons"
        >
          <v-btn :value="Tools.WindowLevel" size="small">
            <v-icon>mdi-brightness-6</v-icon>
            <v-tooltip activator="parent" location="right">
              Window/Level (W)
            </v-tooltip>
          </v-btn>

          <v-btn :value="Tools.Pan" size="small">
            <v-icon>mdi-pan</v-icon>
            <v-tooltip activator="parent" location="right">
              Pan (P)
            </v-tooltip>
          </v-btn>

          <v-btn :value="Tools.Zoom" size="small">
            <v-icon>mdi-magnify</v-icon>
            <v-tooltip activator="parent" location="right">
              Zoom (Z)
            </v-tooltip>
          </v-btn>

          <v-btn :value="Tools.Rectangle" size="small">
            <v-icon>mdi-square-outline</v-icon>
            <v-tooltip activator="parent" location="right">
              Rectangle (R)
            </v-tooltip>
          </v-btn>

          <v-btn :value="Tools.Polygon" size="small">
            <v-icon>mdi-vector-polygon</v-icon>
            <v-tooltip activator="parent" location="right">
              Polygon (O)
            </v-tooltip>
          </v-btn>

          <v-btn :value="Tools.Ruler" size="small">
            <v-icon>mdi-ruler</v-icon>
            <v-tooltip activator="parent" location="right">
              Ruler (M)
            </v-tooltip>
          </v-btn>
        </v-btn-toggle>
      </div>

      <!-- Timer Overlay -->
      <div class="timer-overlay">
        <v-chip color="primary" size="small">
          <v-icon left size="small">mdi-clock-outline</v-icon>
          {{ formatTime(elapsedTime) }}
        </v-chip>
      </div>
    </div>

    <!-- Right: Findings Panel -->
    <div class="findings-panel">
      <div class="panel-content">
        <h2 class="panel-title">Your Findings</h2>

        <!-- Finding Checklist -->
        <div class="checklist-section">
          <h3 class="section-subtitle">Select all that apply:</h3>

          <div class="findings-checklist">
            <v-checkbox
              v-for="finding in availableFindings"
              :key="finding"
              v-model="selectedFindings"
              :value="finding.toLowerCase()"
              :label="finding"
              hide-details
              density="comfortable"
              color="primary"
            />
          </div>
        </div>

        <!-- Diagnosis/Impression -->
        <div class="diagnosis-section">
          <h3 class="section-subtitle">Impression:</h3>
          <v-textarea
            v-model="diagnosis"
            placeholder="Enter your diagnostic impression..."
            rows="3"
            variant="outlined"
            hide-details
          />
        </div>

        <!-- Confidence Rating -->
        <div class="confidence-section">
          <h3 class="section-subtitle">Confidence Level:</h3>
          <v-rating
            v-model="confidence"
            :length="5"
            color="amber"
            active-color="amber"
            size="large"
            hover
          />
          <div class="confidence-labels">
            <span>Not confident</span>
            <span>Very confident</span>
          </div>
        </div>

        <!-- Commitment Point -->
        <div class="submit-section">
          <v-alert
            v-if="!canSubmit"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            Please select at least one finding (or "Normal") to proceed
          </v-alert>

          <v-btn
            block
            size="x-large"
            color="primary"
            :disabled="!canSubmit"
            @click="submitFindings"
            class="submit-button"
          >
            <v-icon left>mdi-check-circle</v-icon>
            Submit My Findings
          </v-btn>

          <p class="commitment-text">
            <v-icon size="small" color="warning">mdi-alert</v-icon>
            You cannot change your answer after submitting
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import SliceViewer from '@/src/components/SliceViewer.vue';
import { Tools } from '@/src/store/tools/types';
import { useToolStore } from '@/src/store/tools';
import { useImageStore } from '@/src/store/datasets-images';
import type { RadiologyCaseMetadata } from '@/src/types/caseLibrary';
import type { UserResponse } from '@/src/store/learning';

const props = defineProps<{
  caseData: RadiologyCaseMetadata;
}>();

const emit = defineEmits<{
  (e: 'submit', response: UserResponse): void;
}>();

const toolStore = useToolStore();
const imageStore = useImageStore();

// State
const imageId = ref<string | null>(null);
const selectedFindings = ref<string[]>([]);
const diagnosis = ref('');
const confidence = ref(3);
const elapsedTime = ref(0);
let timerInterval: number | null = null;

// Tool selection
const currentTool = computed({
  get: () => toolStore.currentTool,
  set: (tool: Tools) => toolStore.setCurrentTool(tool)
});

// Available findings
const availableFindings = [
  'Atelectasis',
  'Cardiomegaly',
  'Consolidation',
  'Edema',
  'Effusion',
  'Emphysema',
  'Fibrosis',
  'Hernia',
  'Infiltration',
  'Mass',
  'Nodule',
  'Pleural Thickening',
  'Pneumonia',
  'Pneumothorax',
  'Normal'
];

// Validation
const canSubmit = computed(() => selectedFindings.value.length > 0);

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

    // Start timer
    timerInterval = window.setInterval(() => {
      elapsedTime.value++;
    }, 1000);
  } catch (error) {
    console.error('Failed to load case image:', error);
  }
});

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});

// Actions
function submitFindings() {
  if (!canSubmit.value) return;

  // Stop timer
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  // Collect user response
  const response: UserResponse = {
    findings: selectedFindings.value,
    diagnosis: diagnosis.value,
    confidence: confidence.value,
    annotations: [] // TODO: Get annotations from tool stores
  };

  emit('submit', response);
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Keyboard shortcuts
function handleKeyPress(event: KeyboardEvent) {
  if (event.key === 'Enter' && event.ctrlKey && canSubmit.value) {
    submitFindings();
  } else if (event.key === 'w' || event.key === 'W') {
    currentTool.value = Tools.WindowLevel;
  } else if (event.key === 'p' || event.key === 'P') {
    currentTool.value = Tools.Pan;
  } else if (event.key === 'z' || event.key === 'Z') {
    currentTool.value = Tools.Zoom;
  } else if (event.key === 'r' || event.key === 'R') {
    currentTool.value = Tools.Rectangle;
  } else if (event.key === 'o' || event.key === 'O') {
    currentTool.value = Tools.Polygon;
  } else if (event.key === 'm' || event.key === 'M') {
    currentTool.value = Tools.Ruler;
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyPress);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress);
});
</script>

<style scoped>
.interpretation-screen {
  display: grid;
  grid-template-columns: 1fr 450px;
  height: 100%;
  background: #000;
}

.image-section {
  position: relative;
  background: #000;
}

.tool-palette {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
}

.tool-buttons {
  flex-direction: column;
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.timer-overlay {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
}

.findings-panel {
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

.section-subtitle {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: rgba(255, 255, 255, 0.9);
}

.checklist-section {
  margin-bottom: 30px;
}

.findings-checklist {
  max-height: 300px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.03);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.diagnosis-section {
  margin-bottom: 30px;
}

.confidence-section {
  margin-bottom: 30px;
}

.confidence-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 8px;
}

.submit-section {
  margin-top: 40px;
}

.submit-button {
  font-size: 16px;
  font-weight: 600;
  padding: 28px 0 !important;
}

.commitment-text {
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
</style>
