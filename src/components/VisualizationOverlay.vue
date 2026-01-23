<template>
  <div v-if="visualizationUrl && visible" class="visualization-overlay">
    <img
      :src="visualizationUrl"
      :style="{ opacity: opacity }"
      class="overlay-image"
      alt="AI Visualization Overlay"
    />
    <div class="overlay-controls">
      <v-tooltip location="top">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon
            size="small"
            class="control-btn"
            @click="toggleVisibility"
          >
            <v-icon>{{ visible ? 'mdi-eye' : 'mdi-eye-off' }}</v-icon>
          </v-btn>
        </template>
        <span>{{ visible ? 'Hide' : 'Show' }} AI Overlay</span>
      </v-tooltip>

      <v-tooltip location="top">
        <template #activator="{ props }">
          <v-slider
            v-bind="props"
            v-model="opacity"
            min="0"
            max="1"
            step="0.1"
            hide-details
            density="compact"
            class="opacity-slider"
          >
            <template #prepend>
              <v-icon size="small">mdi-opacity</v-icon>
            </template>
          </v-slider>
        </template>
        <span>Adjust Opacity</span>
      </v-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useEducationStore } from '@/src/store/education';

const educationStore = useEducationStore();
const { messages } = storeToRefs(educationStore);

// Local state
const visible = ref(true);
const opacity = ref(0.6);

// Get the latest visualization URL from messages
const visualizationUrl = computed(() => {
  // Find the most recent assistant message with a visualization
  for (let i = messages.value.length - 1; i >= 0; i--) {
    const message = messages.value[i];
    if (message.role === 'assistant' && message.visualization) {
      return message.visualization;
    }
  }
  return null;
});

// Auto-show when new visualization appears
watch(visualizationUrl, (newUrl) => {
  if (newUrl) {
    visible.value = true;
  }
});

const toggleVisibility = () => {
  visible.value = !visible.value;
};
</script>

<style scoped>
.visualization-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
}

.overlay-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: opacity 0.3s ease;
  image-rendering: auto;
  mix-blend-mode: multiply;
}

.overlay-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: all;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px;
  border-radius: 8px;
  backdrop-filter: blur(4px);
}

.control-btn {
  background: rgba(255, 255, 255, 0.1) !important;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}

.opacity-slider {
  width: 150px;
  padding: 0 8px;
}

:deep(.v-slider) {
  margin: 0;
}

:deep(.v-slider__track-container) {
  height: 4px;
}

:deep(.v-slider__thumb) {
  width: 12px;
  height: 12px;
}
</style>
