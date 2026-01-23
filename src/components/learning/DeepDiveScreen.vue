<template>
  <div class="deepdive-screen">
    <div class="deepdive-container">
      <!-- Header -->
      <div class="deepdive-header">
        <h2 class="deepdive-title">
          <v-icon left color="warning">mdi-school</v-icon>
          Understanding: {{ finding?.name }}
        </h2>
      </div>

      <!-- Zoomed Image with Highlighted ROI -->
      <div class="image-container">
        <slice-viewer
          v-if="imageId"
          id="learning-deepdive-view"
          :current-image-id="imageId"
          :current-tool="Tools.WindowLevel"
        />

        <!-- ROI Highlight -->
        <svg v-if="finding?.roi" class="roi-overlay" :viewBox="`0 0 ${imageWidth} ${imageHeight}`">
          <rect
            :x="finding.roi.x"
            :y="finding.roi.y"
            :width="finding.roi.width"
            :height="finding.roi.height"
            class="highlight-box"
          />

          <!-- Pulsing circle indicator -->
          <circle
            :cx="finding.roi.x + finding.roi.width / 2"
            :cy="finding.roi.y + finding.roi.height / 2"
            r="20"
            class="pulse-indicator"
          />
        </svg>
      </div>

      <!-- Educational Content -->
      <div class="educational-content">
        <v-card class="teaching-card" elevation="4">
          <v-card-text>
            <!-- What to Look For -->
            <div class="teaching-section">
              <h3 class="teaching-heading">
                <v-icon left color="primary">mdi-eye</v-icon>
                What to Look For
              </h3>
              <ul class="teaching-list">
                <li v-for="(feature, idx) in imagingFeatures" :key="idx">
                  {{ feature }}
                </li>
              </ul>
            </div>

            <!-- Why It Matters -->
            <div class="teaching-section">
              <h3 class="teaching-heading">
                <v-icon left color="success">mdi-heart-pulse</v-icon>
                Clinical Significance
              </h3>
              <p>{{ clinicalSignificance }}</p>
            </div>

            <!-- Common Pitfalls -->
            <div class="teaching-section">
              <h3 class="teaching-heading">
                <v-icon left color="warning">mdi-alert</v-icon>
                Common Pitfalls
              </h3>
              <ul class="teaching-list">
                <li v-for="(pitfall, idx) in commonPitfalls" :key="idx">
                  {{ pitfall }}
                </li>
              </ul>
            </div>
          </v-card-text>

          <v-card-actions>
            <v-btn
              block
              size="large"
              color="primary"
              @click="$emit('continue')"
            >
              I understand, continue
              <v-icon right>mdi-check</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
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

const props = defineProps<{
  caseData: RadiologyCaseMetadata;
  finding: CaseFinding;
}>();

const emit = defineEmits(['continue']);

const imageStore = useImageStore();
const imageId = ref<string | null>(null);
const imageWidth = ref(1024);
const imageHeight = ref(1024);

// Educational content based on finding type
const findingEducation: Record<string, {
  features: string[];
  significance: string;
  pitfalls: string[];
}> = {
  'effusion': {
    features: [
      'Blunting of costophrenic angle',
      'Meniscus sign (concave upward border)',
      'Layering fluid on lateral decubitus view',
      'Shift of mediastinum away from effusion (if large)'
    ],
    significance: 'Pleural effusions indicate fluid accumulation in the pleural space, often due to heart failure, infection, malignancy, or inflammatory conditions.',
    pitfalls: [
      'Small effusions can be very subtle',
      'Always check both costophrenic angles systematically',
      'Distinguish from pleural thickening',
      'Subpulmonic effusion can mimic elevated diaphragm'
    ]
  },
  'cardiomegaly': {
    features: [
      'Cardiothoracic ratio >0.5 on PA view',
      'Enlarged cardiac silhouette',
      'Specific chamber enlargement patterns',
      'Associated pulmonary vascular changes'
    ],
    significance: 'Cardiomegaly suggests heart failure, valvular disease, or cardiomyopathy. It\'s important to identify early for management.',
    pitfalls: [
      'AP views magnify the heart',
      'Pericardial effusion can mimic cardiomegaly',
      'Patient positioning affects measurements',
      'Check for associated pulmonary edema'
    ]
  },
  'pneumothorax': {
    features: [
      'Pleural line (visceral pleural edge)',
      'Absence of lung markings peripheral to line',
      'Deep sulcus sign on supine films',
      'Hyperl ucency compared to contralateral side'
    ],
    significance: 'Pneumothorax requires urgent recognition as large or tension pneumothorax can be life-threatening.',
    pitfalls: [
      'Small apical pneumothoraces are easily missed',
      'Check on expiratory films if unsure',
      'Skin folds can mimic pneumothorax',
      'Always look at the apex carefully'
    ]
  },
  'atelectasis': {
    features: [
      'Increased opacity in affected region',
      'Volume loss with shift of fissures',
      'Compensatory hyperinflation',
      'Crowding of vessels and airways'
    ],
    significance: 'Atelectasis indicates lung collapse, often post-operative or from mucus plugging. Important to prevent complications.',
    pitfalls: [
      'Can be confused with consolidation',
      'Look for volume loss to distinguish',
      'Check for central obstructing lesion',
      'May be hidden behind heart or diaphragm'
    ]
  }
};

const findingKey = computed(() => props.finding.name.toLowerCase());

const imagingFeatures = computed(() => {
  return findingEducation[findingKey.value]?.features || [
    `Key imaging features of ${props.finding.name}`,
    'Specific pattern and distribution',
    'Associated findings to look for'
  ];
});

const clinicalSignificance = computed(() => {
  return findingEducation[findingKey.value]?.significance ||
    `${props.finding.name} is an important finding that requires recognition for appropriate patient management.`;
});

const commonPitfalls = computed(() => {
  return findingEducation[findingKey.value]?.pitfalls || [
    'Subtle cases can be easily missed',
    'Systematic review of all areas',
    'Consider differential diagnoses'
  ];
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

    // TODO: Zoom camera to ROI region
  } catch (error) {
    console.error('Failed to load case image:', error);
  }
});
</script>

<style scoped>
.deepdive-screen {
  height: 100%;
  background: #000;
  overflow-y: auto;
}

.deepdive-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px;
}

.deepdive-header {
  text-align: center;
  margin-bottom: 30px;
}

.deepdive-title {
  font-size: 32px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.image-container {
  position: relative;
  height: 500px;
  margin-bottom: 40px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.roi-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}

.highlight-box {
  fill: none;
  stroke: #FFC107;
  stroke-width: 4;
  opacity: 0.9;
  animation: pulse 2s ease-in-out infinite;
}

.pulse-indicator {
  fill: #FFC107;
  opacity: 0.3;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    stroke-width: 4;
    opacity: 0.9;
  }
  50% {
    stroke-width: 6;
    opacity: 0.6;
  }
}

.educational-content {
  max-width: 900px;
  margin: 0 auto;
}

.teaching-card {
  background: rgba(30, 30, 30, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.teaching-section {
  margin-bottom: 30px;
}

.teaching-section:last-child {
  margin-bottom: 0;
}

.teaching-heading {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.teaching-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.teaching-list li {
  padding: 10px 0 10px 30px;
  position: relative;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
}

.teaching-list li::before {
  content: '•';
  position: absolute;
  left: 10px;
  color: #2196F3;
  font-size: 20px;
}

.teaching-section p {
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.7;
  margin: 0;
}
</style>
