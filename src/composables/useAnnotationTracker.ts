/**
 * Composable for tracking user annotations (segments and measurements)
 * and preparing them for chat integration
 */

import { ref, computed, watch } from 'vue';
import { useSegmentGroupStore } from '@/src/store/segmentGroups';
import { usePaintToolStore } from '@/src/store/tools/paint';
import { useRulerStore } from '@/src/store/tools/rulers';
import { useRectangleStore } from '@/src/store/tools/rectangles';
import { usePolygonStore } from '@/src/store/tools/polygons';
import { useCurrentImage } from '@/src/composables/useCurrentImage';
import { SegmentMask } from '@/src/types/segment';

// Track annotation changes
const annotationTimestamp = ref<number>(Date.now());
const lastChatTimestamp = ref<number>(0);

export function useAnnotationTracker() {
  const segmentStore = useSegmentGroupStore();
  const paintStore = usePaintToolStore();
  const rulerStore = useRulerStore();
  const rectangleStore = useRectangleStore();
  const polygonStore = usePolygonStore();
  const { currentImageID } = useCurrentImage();

  // Get active segments for current image
  const activeSegments = computed(() => {
    if (!paintStore.activeSegmentGroupID) return [];
    const segments = segmentStore.segmentByGroupID[paintStore.activeSegmentGroupID];
    return segments?.filter(seg => seg.visible) || [];
  });

  // Get measurements for current image
  const activeMeasurements = computed(() => {
    if (!currentImageID.value) return { rulers: [], rectangles: [], polygons: [] };

    // Log store structure for debugging
    console.log('[AnnotationTracker] Store properties:', {
      rulerKeys: Object.keys(rulerStore),
      rectangleKeys: Object.keys(rectangleStore),
      polygonKeys: Object.keys(polygonStore),
      hasFinishedTools: {
        ruler: 'finishedTools' in rulerStore,
        rectangle: 'finishedTools' in rectangleStore,
        polygon: 'finishedTools' in polygonStore,
      }
    });

    // Try multiple ways to get the tools in case the structure is different
    const rulers = (rulerStore.finishedTools || rulerStore.tools || rulerStore.rulers || []).filter(
      (tool: any) => tool && tool.imageID === currentImageID.value && !tool.hidden
    );

    const rectangles = (rectangleStore.finishedTools || rectangleStore.tools || rectangleStore.rectangles || []).filter(
      (tool: any) => tool && tool.imageID === currentImageID.value && !tool.hidden
    );

    const polygons = (polygonStore.finishedTools || polygonStore.tools || polygonStore.polygons || []).filter(
      (tool: any) => tool && tool.imageID === currentImageID.value && !tool.hidden
    );

    return { rulers, rectangles, polygons };
  });

  // Check if there are new annotations since last chat
  const hasNewAnnotations = computed(() => {
    const hasSegments = activeSegments.value.length > 0;
    const hasMeasurements =
      activeMeasurements.value.rulers.length > 0 ||
      activeMeasurements.value.rectangles.length > 0 ||
      activeMeasurements.value.polygons.length > 0;

    const hasAnnotations = hasSegments || hasMeasurements;

    // Debug logging
    console.log('[AnnotationTracker] Debug:', {
      hasSegments,
      rulers: activeMeasurements.value.rulers.length,
      rectangles: activeMeasurements.value.rectangles.length,
      polygons: activeMeasurements.value.polygons.length,
      hasAnnotations,
      annotationTimestamp: annotationTimestamp.value,
      lastChatTimestamp: lastChatTimestamp.value,
      isNew: annotationTimestamp.value > lastChatTimestamp.value,
      result: hasAnnotations && annotationTimestamp.value > lastChatTimestamp.value
    });

    // Temporarily always show button if there are annotations (for debugging)
    return hasAnnotations; // && annotationTimestamp.value > lastChatTimestamp.value;
  });

  // Watch for changes in segments
  watch(
    () => segmentStore.segmentByGroupID[paintStore.activeSegmentGroupID || ''],
    () => {
      annotationTimestamp.value = Date.now();
    },
    { deep: true }
  );

  // Watch for changes in measurements
  watch(
    [
      () => (rulerStore.finishedTools || rulerStore.tools || rulerStore.rulers || []).length,
      () => (rectangleStore.finishedTools || rectangleStore.tools || rectangleStore.rectangles || []).length,
      () => (polygonStore.finishedTools || polygonStore.tools || polygonStore.polygons || []).length,
    ],
    () => {
      annotationTimestamp.value = Date.now();
      console.log('[AnnotationTracker] Measurements changed, new timestamp:', annotationTimestamp.value);
    }
  );

  // Mark annotations as sent to chat
  function markAnnotationsAsSent() {
    lastChatTimestamp.value = Date.now();
  }

  // Reset tracking
  function resetTracking() {
    annotationTimestamp.value = Date.now();
    lastChatTimestamp.value = 0;
  }

  // Get current annotation data
  function getCurrentAnnotations() {
    return {
      segments: activeSegments.value,
      measurements: activeMeasurements.value,
      imageId: currentImageID.value,
      timestamp: annotationTimestamp.value,
    };
  }

  return {
    hasNewAnnotations,
    activeSegments,
    activeMeasurements,
    getCurrentAnnotations,
    markAnnotationsAsSent,
    resetTracking,
  };
}