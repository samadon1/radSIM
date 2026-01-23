<template>
  <div class="presentation-screen">
    <!-- Fullscreen Image Viewer -->
    <div class="image-container">
      <slice-viewer
        v-if="imageId"
        id="learning-presentation-view"
        :current-image-id="imageId"
        :current-tool="Tools.WindowLevel"
      />

      <!-- Clinical Context Overlay -->
      <div class="clinical-context-overlay">
        <v-card class="clinical-card" elevation="8">
          <v-card-title class="text-h6">
            <v-icon left color="primary">mdi-clipboard-text</v-icon>
            Clinical Context
          </v-card-title>
          <v-card-text>
            <div class="context-item">
              <span class="context-label">Patient:</span>
              <span class="context-value">
                {{ caseData.demographics?.age || '?' }} year old
                {{ caseData.demographics?.sex === 'M' ? 'male' : caseData.demographics?.sex === 'F' ? 'female' : 'patient' }}
              </span>
            </div>

            <div class="context-item">
              <span class="context-label">Chief Complaint:</span>
              <span class="context-value">
                {{ caseData.clinicalHistory || 'Not provided' }}
              </span>
            </div>

            <div class="context-item">
              <span class="context-label">View:</span>
              <span class="context-value">
                {{ caseData.viewPosition || 'PA' }}
              </span>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <!-- Action Button -->
    <div class="action-footer">
      <v-btn
        size="x-large"
        color="primary"
        @click="beginInterpretation"
        class="begin-button"
      >
        Begin Interpretation
        <v-icon right>mdi-arrow-right</v-icon>
      </v-btn>

      <p class="help-text">
        Review the image and clinical context. When ready, click to begin your interpretation.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import SliceViewer from '@/src/components/SliceViewer.vue';
import { Tools } from '@/src/store/tools/types';
import { useImageStore } from '@/src/store/datasets-images';
import type { RadiologyCaseMetadata } from '@/src/types/caseLibrary';

const props = defineProps<{
  caseData: RadiologyCaseMetadata;
}>();

const emit = defineEmits(['begin-interpretation']);

const imageStore = useImageStore();
const imageId = ref<string | null>(null);

// Load the case image
onMounted(async () => {
  try {
    // Load image from case files
    const imagePath = props.caseData.files.imagePath;

    // Fetch the image
    const response = await fetch(`/${imagePath}`);
    if (!response.ok) {
      throw new Error(`Failed to load image: ${response.statusText}`);
    }

    const blob = await response.blob();
    const filename = imagePath.split('/').pop() || 'case-image.png';
    const file = new File([blob], filename, { type: blob.type || 'image/png' });

    // Add to image store (reusing existing infrastructure)
    const loadedImageId = await imageStore.addImage(file);
    imageId.value = loadedImageId;
  } catch (error) {
    console.error('Failed to load case image:', error);
  }
});

function beginInterpretation() {
  emit('begin-interpretation');
}
</script>

<style scoped>
.presentation-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #000;
}

.image-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.clinical-context-overlay {
  position: absolute;
  bottom: 30px;
  left: 30px;
  max-width: 450px;
  z-index: 10;
  animation: slideInUp 0.5s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.clinical-card {
  background: rgba(30, 30, 30, 0.95) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.context-item {
  display: flex;
  margin-bottom: 12px;
  gap: 12px;
}

.context-label {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  min-width: 130px;
}

.context-value {
  color: rgba(255, 255, 255, 0.95);
}

.action-footer {
  padding: 30px;
  text-align: center;
  background: rgba(30, 30, 30, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.begin-button {
  min-width: 300px;
  padding: 24px 48px !important;
  font-size: 18px;
  font-weight: 600;
}

.help-text {
  margin-top: 16px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}
</style>
