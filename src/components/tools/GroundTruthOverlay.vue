<script setup lang="ts">
import { computed, ref, inject } from 'vue';
import { useLearningStore } from '@/src/store/learning';
import { useCurrentImage } from '@/src/composables/useCurrentImage';
import { VtkViewContext } from '@/src/components/vtk/context';
import { vtkFieldRef } from '@/src/core/vtk/vtkFieldRef';
import { onVTKEvent } from '@/src/composables/onVTKEvent';
import { useResizeObserver } from '@vueuse/core';
import { worldToSVG } from '@/src/utils/vtk-helpers';
import type { Vector3 } from '@kitware/vtk.js/types';

// viewId prop for potential future use
defineProps<{ viewId?: string }>();

const learningStore = useLearningStore();
const { currentImageData } = useCurrentImage();

const view = inject(VtkViewContext);
if (!view) throw new Error('No VtkView');

// Force reactivity on camera/resize changes
const updateTrigger = ref(0);

const camera = vtkFieldRef(view.renderer, 'activeCamera');
onVTKEvent(camera, 'onModified', () => {
  updateTrigger.value++;
});

const container = vtkFieldRef(view.renderWindowView, 'container');
useResizeObserver(container, () => {
  updateTrigger.value++;
});

// Convert pixel coordinates from original image to SVG overlay coordinates
const overlayBoxes = computed(() => {
  // Force reactivity
  const _ = updateTrigger.value;

  const annotations = learningStore.groundTruthAnnotations;
  if (!annotations || annotations.length === 0) return [];

  const imageData = currentImageData.value;
  if (!imageData) return [];

  const viewRenderer = view.renderer;

  return annotations
    .filter(a => a.roi)
    .map(annotation => {
      const roi = annotation.roi!;

      // ROI coordinates are in pixel space of the original image
      // Convert the four corners to world coordinates, then to SVG
      // The image is 2D, so z = 0

      // Get image dimensions to understand the coordinate system
      const dims = imageData.getDimensions();
      const spacing = imageData.getSpacing();

      // The ROI x,y are in pixels from original image (top-left origin)
      // VTK images have origin at bottom-left in index space
      // So we need to flip the y coordinate

      // Convert pixel coordinates to index coordinates
      // Original image pixels -> VTK index space (flip y)
      const x1 = roi.x;
      const y1 = dims[1] - roi.y - roi.height; // Flip y and adjust for height
      const x2 = roi.x + roi.width;
      const y2 = dims[1] - roi.y; // Flip y

      // Convert index to world coordinates
      const worldPoint1 = imageData.indexToWorld([x1, y1, 0]) as Vector3;
      const worldPoint2 = imageData.indexToWorld([x2, y2, 0]) as Vector3;

      // Convert world to SVG coordinates
      const svgPoint1 = worldToSVG(worldPoint1, viewRenderer);
      const svgPoint2 = worldToSVG(worldPoint2, viewRenderer);

      if (!svgPoint1 || !svgPoint2) return null;

      // Calculate SVG rectangle (note: SVG y increases downward)
      const svgX = Math.min(svgPoint1[0], svgPoint2[0]);
      const svgY = Math.min(svgPoint1[1], svgPoint2[1]);
      const svgWidth = Math.abs(svgPoint2[0] - svgPoint1[0]);
      const svgHeight = Math.abs(svgPoint2[1] - svgPoint1[1]);

      return {
        name: annotation.name,
        location: annotation.location,
        x: svgX,
        y: svgY,
        width: svgWidth,
        height: svgHeight
      };
    })
    .filter(Boolean);
});

const hasOverlays = computed(() => overlayBoxes.value.length > 0);
</script>

<template>
  <svg v-if="hasOverlays" class="ground-truth-overlay overlay-no-events">
    <g v-for="(box, index) in overlayBoxes" :key="index">
      <!-- Simple green bounding box -->
      <rect
        :x="box.x"
        :y="box.y"
        :width="box.width"
        :height="box.height"
        fill="none"
        stroke="#4CAF50"
        stroke-width="2"
        stroke-opacity="0.8"
      />
      <!-- Small corner markers -->
      <circle :cx="box.x" :cy="box.y" r="3" fill="#4CAF50" fill-opacity="0.9" />
      <circle :cx="box.x + box.width" :cy="box.y" r="3" fill="#4CAF50" fill-opacity="0.9" />
      <circle :cx="box.x" :cy="box.y + box.height" r="3" fill="#4CAF50" fill-opacity="0.9" />
      <circle :cx="box.x + box.width" :cy="box.y + box.height" r="3" fill="#4CAF50" fill-opacity="0.9" />
    </g>
  </svg>
</template>

<style scoped>
.ground-truth-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
}
</style>
