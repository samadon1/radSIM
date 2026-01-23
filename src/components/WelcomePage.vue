<script setup lang="ts">
import { ref, computed } from 'vue';
import CloseableDialog from '@/src/components/CloseableDialog.vue';
import DataSecurityBox from '@/src/components/DataSecurityBox.vue';
import CaseGallery from '@/src/components/CaseGallery.vue';
import useRemoteSaveStateStore from '@/src/store/remote-save-state';
import { useCaseLibraryStore } from '@/src/store/case-library';
import type { RadiologyCaseMetadata } from '@/src/types/caseLibrary';
import { loadUrls } from '@/src/actions/loadUserFiles';

withDefaults(
  defineProps<{
    loading?: boolean;
  }>(),
  {
    loading: false,
  }
);

const isRemoteSaveDisabled = computed(
  () => useRemoteSaveStateStore().saveUrl === ''
);
const dataSecurityDialog = ref(false);
const showCaseGallery = ref(true);

const caseLibraryStore = useCaseLibraryStore();

const handleCaseSelected = async (caseItem: RadiologyCaseMetadata) => {
  caseLibraryStore.selectCaseByMetadata(caseItem);
  console.log('Loading case:', caseItem.title);

  // Load the case image
  const imagePath = Array.isArray(caseItem.files.imagePath)
    ? caseItem.files.imagePath[0]
    : caseItem.files.imagePath;

  try {
    await loadUrls({ urls: imagePath });
    console.log('Case loaded successfully:', caseItem.title);
  } catch (error) {
    console.error('Failed to load case:', error);
  }
};

const handleGenerate = () => {
  console.log('Generate clicked');
  // TODO: Implement generate functionality
};
</script>

<template>
  <div class="welcome-page-container">
    <!-- Case Gallery View -->
    <div v-if="showCaseGallery && !loading" class="gallery-view">
      <CaseGallery @case-selected="handleCaseSelected">
        <template #action-buttons>
          <div class="generate-button-container">
            <v-btn
              variant="outlined"
              color="secondary"
              prepend-icon="mdi-auto-fix"
              size="small"
              @click="handleGenerate"
            >
              Generate
            </v-btn>
          </div>
        </template>
      </CaseGallery>
    </div>

    <!-- Traditional Upload View -->
    <v-container v-else class="page-container bg-grey-darken-3" v-bind="$attrs">
      <v-col>
        <v-row justify="center">
          <v-card
            flat
            dark
            rounded="0"
            color="transparent"
            class="text-center headline"
          >
            <template v-if="!loading">
              <div>
                <v-icon size="64">mdi-folder-open</v-icon>
              </div>
              <div>Click to open local files.</div>
              <div class="mt-8">
                <v-icon size="64">mdi-arrow-down-bold</v-icon>
              </div>
              <div>Drag &amp; drop your DICOM files.</div>

              <div class="vertical-offset-margin">
                <div v-if="isRemoteSaveDisabled" class="vertical-offset-margin">
                  <v-icon size="64">mdi-cloud-off-outline</v-icon>
                </div>
                <div v-if="isRemoteSaveDisabled">
                  Secure: Image data never leaves your machine.
                </div>
                <v-btn
                  class="mt-2"
                  variant="tonal"
                  color="secondary"
                  @click.stop="dataSecurityDialog = true"
                >
                  Learn More
                </v-btn>
              </div>

              <!-- Toggle back to case gallery -->
              <div class="vertical-offset-margin">
                <v-btn
                  variant="text"
                  color="primary"
                  prepend-icon="mdi-folder-open-outline"
                  @click="showCaseGallery = true"
                >
                  Browse Case Library
                </v-btn>
              </div>
            </template>
            <template v-else>
              <div class="text-h6 my-4">Loading data...</div>
              <v-progress-linear indeterminate />
            </template>
          </v-card>
        </v-row>
      </v-col>
    </v-container>
  </div>

  <closeable-dialog v-model="dataSecurityDialog">
    <data-security-box />
  </closeable-dialog>
</template>

<style scoped>
.welcome-page-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.gallery-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.page-container {
  flex: 1 1 auto;
  display: flex;
  flex-flow: row;
  align-items: center;
  max-width: 100%;
}

.vertical-offset-margin {
  margin-top: 128px;
}
</style>
