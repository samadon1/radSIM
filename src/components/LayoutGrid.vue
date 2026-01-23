<template>
  <div
    class="layout-container flex-equal"
    :class="flexFlow"
    data-testid="layout-grid"
  >
    <div v-for="(item, i) in items" :key="i" class="d-flex flex-equal">
      <layout-grid v-if="item.type === 'layout'" :layout="(item as Layout)" />
      <div v-else class="layout-item" @dblclick="maximize(item.id!)" style="position: relative;">
        <component
          :is="item.component"
          :key="item.id"
          :id="item.id"
          :type="item.viewType"
          v-bind="item.props"
          @focus="onFocusView(item.id!, item.viewType!)"
        />
        <!-- AI Visualization Overlay -->
        <visualization-overlay v-if="item.viewType === '2D'" />
        <!-- Add to Chat Button -->
        <div v-if="item.viewType === '2D' && isFirstView(item.id) && hasNewAnnotations" class="add-to-chat-container">
          <v-btn
            color="primary"
            size="small"
            icon
            elevation="2"
            @click="addAnnotationsToChat"
            class="add-to-chat-btn"
          >
            <v-icon>mdi-message-plus-outline</v-icon>
            <v-tooltip activator="parent" location="left">
              Add annotations to chat
            </v-tooltip>
          </v-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { ViewTypeToComponent } from '@/src/core/viewTypes';
import { Layout, LayoutDirection } from '../types/layout';
import { useViewStore } from '../store/views';
import { useToolStore } from '../store/tools';
import { ALLOW_MAXIMIZE_TOOLS } from '../config';
import VisualizationOverlay from '@/src/components/VisualizationOverlay.vue';
import { useAnnotationTracker } from '@/src/composables/useAnnotationTracker';
import { useCaptureImage } from '@/src/composables/useCaptureImage';
import { generateAnnotationDescription } from '@/src/utils/annotationDescriber';
import { useEducationStore } from '@/src/store/education';
import { useRulerStore } from '@/src/store/tools/rulers';

export default defineComponent({
  name: 'LayoutGrid',
  components: {
    VisualizationOverlay,
  },
  methods: {
    onFocusView(id: string, type: string) {
      if (type === '2D') {
        useViewStore().setActiveViewID(id);
      }
    },
    maximize(viewId: string) {
      const currentTool = useToolStore().currentTool;
      if (ALLOW_MAXIMIZE_TOOLS.includes(currentTool)) {
        useViewStore().toggleMaximizeView(viewId);
      }
    },
  },
  props: {
    layout: {
      type: Object as PropType<Layout>,
      required: true,
    },
  },
  setup(props) {
    const { layout } = toRefs(props);
    const viewStore = useViewStore();
    const { viewSpecs } = storeToRefs(viewStore);
    const { hasNewAnnotations } = useAnnotationTracker();

    const flexFlow = computed(() => {
      return layout.value.direction === LayoutDirection.H
        ? 'flex-column'
        : 'flex-row';
    });

    const items = computed(() => {
      const viewIDToSpecs = viewSpecs.value;
      return layout.value.items.map((item) => {
        if (typeof item === 'string') {
          const spec = viewIDToSpecs[item];
          return {
            type: 'view',
            id: item,
            viewType: spec.viewType,
            component: ViewTypeToComponent[spec.viewType],
            props: spec.props,
          };
        }
        return {
          type: 'layout',
          ...item,
        };
      });
    });

    // Check if this is the first 2D view
    const isFirstView = (id: string) => {
      const viewStore = useViewStore();
      const twoDViews = viewStore.viewIDs.filter(viewId => {
        const spec = viewStore.viewSpecs[viewId];
        return spec && spec.viewType === '2D';
      });
      const isFirst = twoDViews[0] === id;
      console.log('[LayoutGrid] isFirstView check:', { id, twoDViews, isFirst });
      return isFirst;
    };

    // Debug logging for button visibility
    watch(hasNewAnnotations, (newVal) => {
      console.log('[LayoutGrid] hasNewAnnotations changed:', newVal);
    });

    // Move addAnnotationsToChat here from methods
    const addAnnotationsToChat = async () => {
      const annotationTracker = useAnnotationTracker();
      const { captureCurrentView } = useCaptureImage();
      const educationStore = useEducationStore();
      const rulerStore = useRulerStore();

      // Get current annotations
      const annotations = annotationTracker.getCurrentAnnotations();

      // Try to get the active 2D view context
      // This would need to be passed or obtained from the view store
      // For now, use captureCurrentView without a view parameter
      const screenshot = await captureCurrentView();
      if (!screenshot) {
        console.warn('Failed to capture screenshot');
        return;
      }

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

      // Add to education store for chat integration
      educationStore.setAnnotationAttachment(screenshot, description);

      // Mark annotations as sent
      annotationTracker.markAnnotationsAsSent();

      // Focus on chat input
      const chatInput = document.querySelector('.chat-input-field input') as HTMLInputElement;
      if (chatInput) {
        chatInput.focus();
      }
    };

    return {
      items,
      flexFlow,
      hasNewAnnotations,
      isFirstView,
      addAnnotationsToChat,
    };
  },
});
</script>

<style scoped src="@/src/components/styles/utils.css"></style>

<style scoped>
.layout-container {
  display: flex;
  flex-direction: column;
}

.layout-item {
  display: flex;
  flex: 1;
  border: 1px solid #222;
}

.add-to-chat-container {
  position: absolute;
  bottom: 60px;
  right: 10px;
  z-index: 200; /* Higher than VisualizationOverlay (100) */
}

.add-to-chat-btn {
  background: rgba(33, 150, 243, 0.9) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.add-to-chat-btn:hover {
  background: rgba(33, 150, 243, 1) !important;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
}
</style>
