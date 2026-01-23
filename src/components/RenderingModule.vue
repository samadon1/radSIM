<script lang="ts">
import { computed, defineComponent, ref, unref } from 'vue';
import { useCurrentImage } from '../composables/useCurrentImage';
import VolumeProperties from './VolumeProperties.vue';
import VolumeRendering from './VolumeRendering.vue';
import VolumePresets from './VolumePresets.vue';
import LayerList from './LayerList.vue';

export default defineComponent({
  components: { VolumeRendering, VolumePresets, VolumeProperties, LayerList },
  setup() {
    const { currentImageData, currentImage } = useCurrentImage();
    const hasCurrentImage = computed(() => !!currentImageData.value);
    const isImageLoading = computed(() => !!unref(currentImage.value?.loading));

    const { currentLayers } = useCurrentImage();
    const hasLayers = computed(() => !!currentLayers.value.length);

    const panels = ref<string[]>(['properties', 'layers']);

    return {
      panels,
      hasCurrentImage,
      hasLayers,
      isImageLoading,
    };
  },
});
</script>

<template>
  <div class="rendering-container fill-height">
    <template v-if="hasCurrentImage">
      <v-skeleton-loader v-if="isImageLoading" type="image" class="skeleton-loader">
      </v-skeleton-loader>
      <volume-rendering v-else />
      <v-expansion-panels v-model="panels" multiple variant="accordion" class="enterprise-panels">
        <v-expansion-panel value="preset" class="enterprise-panel">
          <v-expansion-panel-title class="enterprise-panel-title">
            <span class="panel-title-text">COLOR PRESETS</span>
          </v-expansion-panel-title>
          <v-expansion-panel-text class="enterprise-panel-content">
            <volume-presets />
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel value="properties" class="enterprise-panel">
          <v-expansion-panel-title class="enterprise-panel-title">
            <span class="panel-title-text">CINEMATIC RENDERING</span>
          </v-expansion-panel-title>
          <v-expansion-panel-text class="enterprise-panel-content">
            <volume-properties />
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel v-if="hasLayers" value="layers" class="enterprise-panel">
          <v-expansion-panel-title class="enterprise-panel-title">
            <span class="panel-title-text">LAYERS</span>
          </v-expansion-panel-title>
          <v-expansion-panel-text class="enterprise-panel-content">
            <layer-list />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>
    <template v-else>
      <div class="no-image-text">NO IMAGE SELECTED</div>
    </template>
  </div>
</template>

<style scoped>
.rendering-container {
  padding: 12px;
  background: #0a0a0a;
}

/* Enterprise Panels */
.enterprise-panels {
  background: #0a0a0a;
}

:deep(.enterprise-panel) {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 8px;
}

:deep(.enterprise-panel-title) {
  min-height: 42px;
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.01);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.panel-title-text {
  font-size: 11px;
  font-weight: 300;
  letter-spacing: 1.5px;
  color: rgba(255, 255, 255, 0.6);
}

:deep(.enterprise-panel-content) {
  padding: 16px;
  background: #0a0a0a;
}

/* Expansion panel icon styling */
:deep(.v-expansion-panel-title__icon) {
  opacity: 0.4;
}

:deep(.v-expansion-panel-title:hover .v-expansion-panel-title__icon) {
  opacity: 0.6;
}

/* No image text */
.no-image-text {
  text-align: center;
  padding-top: 48px;
  font-size: 11px;
  font-weight: 300;
  letter-spacing: 1.5px;
  color: rgba(255, 255, 255, 0.3);
}

/* Skeleton loader */
.skeleton-loader {
  margin: 12px 0;
}
</style>
