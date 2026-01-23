<script setup lang="ts">
import { inject, toRefs } from 'vue';
import ViewOverlayGrid from '@/src/components/ViewOverlayGrid.vue';
import { useSliceConfig } from '@/src/composables/useSliceConfig';
import { Maybe } from '@/src/types';
import { VtkViewContext } from '@/src/components/vtk/context';
import { useWindowingConfig } from '@/src/composables/useWindowingConfig';
import { useOrientationLabels } from '@/src/composables/useOrientationLabels';
import DicomQuickInfoButton from '@/src/components/DicomQuickInfoButton.vue';
import { useAnnotationTracker } from '@/src/composables/useAnnotationTracker';
import { useCaptureImage } from '@/src/composables/useCaptureImage';
import { generateAnnotationDescription } from '@/src/utils/annotationDescriber';
import { useEducationStore } from '@/src/store/education';
import { useRulerStore } from '@/src/store/tools/rulers';

interface Props {
  viewId: string;
  imageId: Maybe<string>;
}

const props = defineProps<Props>();
const { viewId, imageId } = toRefs(props);

const view = inject(VtkViewContext);
if (!view) throw new Error('No VtkView');

// Register the view globally for debugging
if (typeof window !== 'undefined') {
  (window as any).__vtkSliceView = view;
  console.log('[SliceViewerOverlay] Registered VTK view globally');
}

const { top: topLabel, left: leftLabel } = useOrientationLabels(view);

const {
  config: sliceConfig,
  slice,
  range: sliceRange,
} = useSliceConfig(viewId, imageId);
const {
  config: wlConfig,
  width: windowWidth,
  level: windowLevel,
} = useWindowingConfig(viewId, imageId);

// Add to chat functionality
const { hasNewAnnotations } = useAnnotationTracker();

async function addAnnotationsToChat() {
  const annotationTracker = useAnnotationTracker();
  const { captureCurrentView } = useCaptureImage();
  const educationStore = useEducationStore();
  const rulerStore = useRulerStore();

  console.log('[AddToChat] Starting annotation capture...');
  console.log('[AddToChat] VTK view context available:', !!view);

  // Get current annotations
  const annotations = annotationTracker.getCurrentAnnotations();

  // Capture the current view using the injected VTK context
  const screenshot = await captureCurrentView(view);
  if (!screenshot) {
    console.warn('[AddToChat] Failed to capture screenshot');
    return;
  }

  console.log('[AddToChat] Screenshot captured');

  // Get ruler measurements with computed lengths
  const rulersWithLengths = annotations.measurements.rulers.map((ruler: any) => ({
    ...ruler,
    length: rulerStore.lengthByID[ruler.id] || 0
  }));

  // Generate natural language description
  const description = generateAnnotationDescription(
    annotations.segments,
    {
      ...annotations.measurements,
      rulers: rulersWithLengths
    }
  );

  console.log('[AddToChat] Generated description:', description);

  // Add to education store for chat integration
  educationStore.setAnnotationAttachment(screenshot, description);

  // Mark annotations as sent
  annotationTracker.markAnnotationsAsSent();

  // Switch to RADSIM AI tab (index 0)
  const moduleTabs = document.querySelector('#module-switcher-tabs') as any;
  if (moduleTabs) {
    // Click on the first tab (RADSIM AI)
    const radsimTab = document.querySelector('[data-testid="module-tab-RADSIM AI"]') as HTMLElement;
    if (radsimTab) {
      console.log('[AddToChat] Switching to RADSIM AI tab');
      radsimTab.click();
    }
  }

  // Wait a bit for the tab to switch then focus on chat input
  setTimeout(() => {
    const chatInput = document.querySelector('.message-input') as HTMLInputElement;
    if (chatInput) {
      console.log('[AddToChat] Focusing chat input');
      chatInput.focus();
    }
  }, 100);
}
</script>

<template>
  <view-overlay-grid class="overlay-no-events view-annotations">
    <template v-slot:top-center>
      <div class="annotation-cell">
        <span>{{ topLabel }}</span>
      </div>
    </template>
    <template v-slot:middle-left>
      <div class="annotation-cell">
        <span>{{ leftLabel }}</span>
      </div>
    </template>
    <template v-slot:bottom-left>
      <div class="annotation-cell">
        <div class="status-info">
          <div v-if="sliceConfig">
            Slice: {{ slice + 1 }}/{{ sliceRange[1] + 1 }}
          </div>
          <div v-if="wlConfig">
            W/L: {{ windowWidth.toFixed(2) }} / {{ windowLevel.toFixed(2) }}
          </div>
        </div>
      </div>
    </template>
    <template v-slot:bottom-center>
      <div v-if="hasNewAnnotations" class="add-to-chat-container">
        <button
          @click.stop.prevent="addAnnotationsToChat"
          @mousedown.stop.prevent
          @pointerdown.stop.prevent
          class="add-to-chat-btn"
        >
          <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span class="btn-text">ADD TO CHAT</span>
        </button>
      </div>
    </template>
    <template v-slot:top-right>
      <div class="annotation-cell">
        <dicom-quick-info-button :image-id="imageId"></dicom-quick-info-button>
      </div>
    </template>
  </view-overlay-grid>
</template>

<style scoped src="@/src/components/styles/vtk-view.css"></style>

<style scoped>
.status-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.add-to-chat-container {
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: auto;
  padding: 8px;
}

.add-to-chat-btn {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 400;
  cursor: pointer;
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  letter-spacing: 1px;
  backdrop-filter: blur(10px);
}

.add-to-chat-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

.add-to-chat-btn:active {
  background: rgba(255, 255, 255, 0.03);
}

.btn-icon {
  flex-shrink: 0;
  opacity: 0.8;
}

.btn-text {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 1.2px;
}

.add-to-chat-btn-inline:active {
  transform: translateY(0);
}
</style>
