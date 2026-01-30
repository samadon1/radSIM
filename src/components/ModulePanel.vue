<template>
  <div class="fill-height d-flex flex-column">
    <div id="module-switcher">
      <v-tabs
        id="module-switcher-tabs"
        v-model="selectedModuleIndex"
        density="comfortable"
        show-arrows
        slider-color="white"
        class="enterprise-tabs"
      >
        <v-tab
          v-for="item in modules"
          :key="item.name"
          :data-testid="`module-tab-${item.name}`"
          :disabled="item.disabled"
          class="enterprise-tab"
        >
          <div class="tab-content">
            <span class="module-text">{{ item.name }}</span>
          </div>
        </v-tab>
      </v-tabs>
    </div>
    <div id="module-container">
      <v-window v-model="selectedModuleIndex" touchless class="fill-height">
        <v-window-item
          v-for="mod in modules"
          :key="mod.name"
          class="fill-height"
        >
          <component
            :key="mod.name"
            v-show="modules[selectedModuleIndex] === mod"
            :is="mod.component"
          />
        </v-window-item>
      </v-window>
    </div>
    <ProbeView />
  </div>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Component, computed, defineComponent, ref, watch, provide } from 'vue';

import { ConnectionState, useServerStore } from '@/src/store/server-1';
import DataBrowser from './DataBrowser.vue';
import CaseBrowser from './CaseBrowser.vue';
import RenderingModule from './RenderingModule.vue';
import AnnotationsModule from './AnnotationsModule.vue';
// import ServerModule from './ServerModule.vue';
import LearningModule from './LearningModule.vue';
// Removed NVIDIA modules - not needed for RADSIM
// import NVSegmentCTModule from './NVSegmentCTModule.vue';
// import NVReasonCXRModule from './NVReasonCXRModule.vue';
// import NVGenerateCTModule from './NVGenerateCTModule.vue';
import ProbeView from './ProbeView.vue';
import { useToolStore } from '../store/tools';
import { Tools } from '../store/tools/types';

interface Module {
  name: string;
  icon: string;
  component: Component;
  disabled?: boolean;
}

const Modules: Module[] = [
  {
    name: 'Learning',
    icon: 'school',
    component: LearningModule,
  },
  {
    name: 'Annotations',
    icon: 'pencil',
    component: AnnotationsModule,
  },
  // {
  //  name: 'Remote',
  //  icon: 'server-network',
  //  component: ServerModule,
  // },
];

const autoSwitchToAnnotationsTools = [
  Tools.Rectangle,
  Tools.Ruler,
  Tools.Polygon,
  Tools.Paint,
];

export default defineComponent({
  name: 'ModulePanel',
  components: { ProbeView },
  setup() {
    const selectedModuleIndex = ref(0);

    const toolStore = useToolStore();
    watch(
      () => toolStore.currentTool,
      (newTool) => {
        console.log('[ModulePanel] Tool changed to:', newTool, 'Is annotation tool:', autoSwitchToAnnotationsTools.includes(newTool));
        if (autoSwitchToAnnotationsTools.includes(newTool)) {
          console.log('[ModulePanel] Switching to Annotations tab (index 1)');
          selectedModuleIndex.value = 1; // Annotations is at position 1 (Learning=0, Annotations=1)
        }
      }
    );

    const serverStore = useServerStore();
    const modules = computed(() => {
      if (!serverStore.url) {
        return Modules.filter((m) => m.name !== 'Remote');
      }

      if (serverStore.connState === ConnectionState.Connected) {
        return Modules;
      }

      return Modules.map((m) => {
        if (m.name === 'Remote') {
          return { ...m, disabled: true };
        }
        return m;
      });
    });

    // Provide function to switch tabs (for CaseBrowser to switch to Learning tab)
    const switchToTab = (tabIndex: number) => {
      selectedModuleIndex.value = tabIndex;
    };
    provide('switchToTab', switchToTab);

    return {
      selectedModuleIndex,
      modules,
    };
  },
});
</script>

<style scoped>
#module-switcher {
  display: relative;
  flex: 0 0 auto;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: transparent;
}

#module-container {
  position: relative;
  flex: 1;
  overflow: auto;
  background: #0a0a0a;
}

/* Enterprise Tab Styles */
:deep(.enterprise-tabs) {
  height: 48px;
  background: transparent;
}

:deep(.enterprise-tabs .v-tabs__container) {
  height: 48px;
}

:deep(.enterprise-tab) {
  min-height: 48px;
  padding: 0 32px;
  font-size: 12px;
  font-weight: 300;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
}

:deep(.enterprise-tab:hover) {
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.01);
}

:deep(.enterprise-tab.v-tab--selected) {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 400;
}

:deep(.enterprise-tab[disabled]) {
  opacity: 0.3;
}

:deep(.v-tabs__slider) {
  height: 1px;
  background: rgba(255, 255, 255, 0.7);
  opacity: 0.8;
}

.tab-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.module-text {
  font-size: 12px;
  line-height: 1;
}

/* Center tabs and hide navigation arrows when not needed */
#module-switcher-tabs :deep(.v-slide-group__content) {
  justify-content: center;
}

#module-switcher-tabs :deep(.v-slide-group__prev.v-slide-group__prev--disabled),
#module-switcher-tabs :deep(.v-slide-group__next.v-slide-group__next--disabled) {
  visibility: hidden;
}
</style>
