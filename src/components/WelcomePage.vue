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

// Generation modal state
const showGenerateModal = ref(false);
const generationPrompt = ref('');
const isGenerating = ref(false);
const generatedImageUrl = ref<string | null>(null);

const handleGenerate = () => {
  console.log('Generate clicked');
  showGenerateModal.value = true;
  generationPrompt.value = '';
  generatedImageUrl.value = null;
};

const handleGenerateSubmit = async () => {
  if (!generationPrompt.value.trim()) return;

  isGenerating.value = true;

  try {
    // TODO: Call MedRAX2 generation API
    const { useMedRAX } = await import('@/src/composables/useMedRAX');
    const medRAX = useMedRAX();

    // Send generation request to MedRAX2
    const response = await medRAX.sendMessage(
      { text: `Generate a chest X-ray image: ${generationPrompt.value}` },
      [],
      'Assistant Mode'
    );

    console.log('Generation response:', response);

    // Extract visualization URL from response
    if (response.visualization) {
      generatedImageUrl.value = response.visualization;
    } else {
      throw new Error('No image generated');
    }
  } catch (error) {
    console.error('Generation failed:', error);
    alert('Failed to generate image. Please try again.');
  } finally {
    isGenerating.value = false;
  }
};

const handleUseGeneratedImage = async () => {
  if (!generatedImageUrl.value) return;

  try {
    // Load the generated image into the viewer
    await loadUrls({ urls: generatedImageUrl.value });

    // Close the modal
    showGenerateModal.value = false;

    console.log('Generated image loaded successfully');
  } catch (error) {
    console.error('Failed to load generated image:', error);
    alert('Failed to load image. Please try again.');
  }
};

const handleCloseModal = () => {
  showGenerateModal.value = false;
  generationPrompt.value = '';
  generatedImageUrl.value = null;
};

// Example prompts for users
const examplePrompts = [
  'Right-sided pneumothorax with partial lung collapse',
  'Bilateral pulmonary edema with cardiomegaly',
  'Left lower lobe pneumonia with consolidation',
  'Normal frontal chest X-ray',
];
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

  <!-- Generation Modal -->
  <v-dialog v-model="showGenerateModal" max-width="800" persistent>
    <v-card class="generation-modal">
      <v-card-title class="modal-header">
        <span class="modal-title">Generate Chest X-Ray</span>
        <v-btn icon variant="text" size="small" @click="handleCloseModal">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="modal-content">
        <!-- Input Section -->
        <div v-if="!generatedImageUrl" class="input-section">
          <p class="instruction-text">
            Describe the chest X-ray you want to generate. Be specific about findings, anatomical regions, and characteristics.
          </p>

          <v-textarea
            v-model="generationPrompt"
            label="Describe the X-ray"
            placeholder="Example: A frontal chest X-ray showing a large right-sided pneumothorax with complete lung collapse"
            variant="outlined"
            rows="4"
            :disabled="isGenerating"
            class="prompt-input"
          />

          <div class="example-prompts">
            <p class="examples-label">Example prompts:</p>
            <v-chip
              v-for="example in examplePrompts"
              :key="example"
              class="example-chip"
              size="small"
              @click="generationPrompt = example"
            >
              {{ example }}
            </v-chip>
          </div>
        </div>

        <!-- Generated Image Preview -->
        <div v-else class="preview-section">
          <img :src="generatedImageUrl" alt="Generated X-ray" class="generated-preview" />
        </div>

        <!-- Loading State -->
        <div v-if="isGenerating" class="loading-section">
          <v-progress-circular indeterminate size="64" color="primary" />
          <p class="loading-text">Generating X-ray image... This may take 30-60 seconds</p>
        </div>
      </v-card-text>

      <v-card-actions class="modal-actions">
        <v-btn variant="text" @click="handleCloseModal" :disabled="isGenerating">
          Cancel
        </v-btn>
        <v-spacer />
        <v-btn
          v-if="!generatedImageUrl"
          color="primary"
          variant="elevated"
          :loading="isGenerating"
          :disabled="!generationPrompt.trim() || isGenerating"
          @click="handleGenerateSubmit"
        >
          Generate
        </v-btn>
        <v-btn
          v-else
          color="primary"
          variant="elevated"
          prepend-icon="mdi-check"
          @click="handleUseGeneratedImage"
        >
          Use Image
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
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

/* Generation Modal Styles */
.generation-modal {
  background: #1a1a1a;
  color: rgba(255, 255, 255, 0.9);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.modal-title {
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.modal-content {
  padding: 24px;
  min-height: 200px;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.instruction-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  line-height: 1.6;
}

.prompt-input {
  margin-top: 8px;
}

:deep(.prompt-input .v-field) {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(.prompt-input .v-field:hover) {
  border-color: rgba(255, 255, 255, 0.2);
}

:deep(.prompt-input .v-field--focused) {
  border-color: rgba(33, 150, 243, 0.5);
}

.example-prompts {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.examples-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.example-chip {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.2);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 8px;
  margin-bottom: 8px;
}

.example-chip:hover {
  background: rgba(33, 150, 243, 0.2);
  border-color: rgba(33, 150, 243, 0.4);
}

.preview-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 0;
}

.generated-preview {
  max-width: 100%;
  max-height: 500px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.3);
}

.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 40px 0;
}

.loading-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.modal-actions {
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
</style>
