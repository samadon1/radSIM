<script setup lang="ts">
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { AnnotationToolType, Tools } from '@/src/store/tools/types';
import { useToolStore } from '@/src/store/tools';
import MeasurementsToolList from './MeasurementsToolList.vue';
import SegmentGroupControls from './SegmentGroupControls.vue';
import ToolControls from './ToolControls.vue';
import MeasurementRulerDetails from './MeasurementRulerDetails.vue';

const Tabs = {
  Measurements: 'measurements',
  SegmentGroups: 'segmentGroups',
};

const MeasurementTools = [
  {
    type: AnnotationToolType.Ruler,
    icon: 'mdi-ruler',
    details: MeasurementRulerDetails,
  },
  {
    type: AnnotationToolType.Rectangle,
    icon: 'mdi-vector-square',
  },
  {
    type: AnnotationToolType.Polygon,
    icon: 'mdi-pentagon-outline',
  },
];

const MeasurementToolTypes = new Set<string>(
  MeasurementTools.map(({ type }) => type)
);

const tab = ref(Tabs.SegmentGroups);
const { currentTool } = storeToRefs(useToolStore());

function autoFocusTab() {
  if (currentTool.value === Tools.Paint) {
    tab.value = Tabs.SegmentGroups;
  } else if (MeasurementToolTypes.has(currentTool.value)) {
    tab.value = Tabs.Measurements;
  }
}

watch(
  currentTool,
  () => {
    autoFocusTab();
  },
  { immediate: true }
);
</script>

<template>
  <div class="annotations-container fill-height">
    <div class="annotations-header">
      <tool-controls />
    </div>
    <div class="annotations-content">
      <v-tabs v-model="tab" align-tabs="center" density="compact" class="enterprise-subtabs">
        <v-tab value="segmentGroups" class="enterprise-subtab">SEGMENTS</v-tab>
        <v-tab value="measurements" class="enterprise-subtab">MEASUREMENTS</v-tab>
      </v-tabs>
      <v-window v-model="tab" class="window-content">
        <v-window-item value="segmentGroups">
          <segment-group-controls />
        </v-window-item>
        <v-window-item value="measurements">
          <measurements-tool-list :tools="MeasurementTools" />
        </v-window-item>
      </v-window>
    </div>
  </div>
</template>

<style scoped>
.annotations-container {
  display: flex;
  flex-direction: column;
  background: #0a0a0a;
}

.annotations-header {
  flex: 0 0 auto;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: #0a0a0a;
}

.annotations-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background: #0a0a0a;
}

/* Enterprise Sub-tabs */
.enterprise-subtabs {
  background: #0a0a0a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin: 0;
}

:deep(.enterprise-subtab) {
  min-height: 36px;
  font-size: 10px;
  font-weight: 300;
  letter-spacing: 1.2px;
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.2s ease;
}

:deep(.enterprise-subtab:hover) {
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.01);
}

:deep(.enterprise-subtab.v-tab--selected) {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 400;
}

:deep(.v-tabs__slider) {
  height: 1px;
  background: rgba(255, 255, 255, 0.6);
}

.window-content {
  padding: 12px;
  background: #0a0a0a;
}
</style>

<style scoped src="./styles/annotations.css"></style>
