<template>
  <div class="case-gallery-container">
    <!-- Header Section -->
    <div class="gallery-header">
      <div class="header-content">
        <div class="title-section">
          <span class="gallery-title">CASE LIBRARY</span>
        </div>
        <div class="filter-section">
          <v-select
            v-model="selectedSkillLevel"
            :items="skillLevels"
            label="LEVEL"
            variant="outlined"
            density="compact"
            class="enterprise-filter"
            hide-details
          />
          <v-select
            v-model="selectedModality"
            :items="modalities"
            label="MODALITY"
            variant="outlined"
            density="compact"
            class="enterprise-filter"
            hide-details
          />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <v-progress-circular indeterminate size="64" color="primary" />
      <p class="loading-text">Loading case library...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <v-icon size="64" color="error">mdi-alert-circle-outline</v-icon>
      <p class="error-text">{{ error }}</p>
      <v-btn variant="tonal" color="primary" @click="loadCases">Retry</v-btn>
    </div>

    <!-- Case Grid -->
    <div v-else class="cases-grid">
      <!-- Action Buttons Row -->
      <div class="action-buttons-row">
        <slot name="action-buttons"></slot>
      </div>

      <div
        v-for="(caseItem, index) in filteredCases"
        :key="caseItem.id"
        class="case-card"
        @click="selectCase(caseItem)"
        :title="caseItem.title"
      >
        <div class="case-thumbnail">
          <img
            v-if="caseItem.files.thumbnailPath"
            :src="caseItem.files.thumbnailPath"
            :alt="caseItem.title"
            class="thumbnail-image"
            @error="handleImageError"
          />
          <div v-else class="thumbnail-placeholder">
            <v-icon size="48" color="rgba(255,255,255,0.3)">mdi-image-outline</v-icon>
          </div>
        </div>

        <div class="case-info simplified">
          <h3 class="case-number-title">Case {{ index + 1 }}</h3>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && !error && filteredCases.length === 0" class="empty-state">
      <v-icon size="64" color="rgba(255,255,255,0.3)">mdi-folder-open-outline</v-icon>
      <p class="empty-text">No cases found matching your filters</p>
      <v-btn variant="text" color="primary" @click="clearFilters">Clear Filters</v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { RadiologyCaseMetadata, CaseLibrary, SkillLevel } from '@/src/types/caseLibrary';

const emit = defineEmits<{
  caseSelected: [caseItem: RadiologyCaseMetadata];
  generate: [];
}>();

// State
const cases = ref<RadiologyCaseMetadata[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

// Filters
const selectedSkillLevel = ref<SkillLevel | 'all'>('all');
const selectedModality = ref<string>('all');

const skillLevels = [
  { title: 'All Levels', value: 'all' },
  { title: 'Beginner', value: 'beginner' },
  { title: 'Intermediate', value: 'intermediate' },
  { title: 'Advanced', value: 'advanced' },
];

const modalities = ref([
  { title: 'All Modalities', value: 'all' },
  { title: 'Chest X-Ray', value: 'DX' },
  { title: 'CT', value: 'CT' },
  { title: 'MRI', value: 'MR' },
]);

// Computed
const filteredCases = computed(() => {
  return cases.value.filter((caseItem) => {
    const skillMatch =
      selectedSkillLevel.value === 'all' ||
      caseItem.skillLevel === selectedSkillLevel.value;

    const modalityMatch =
      selectedModality.value === 'all' ||
      caseItem.modality === selectedModality.value;

    return skillMatch && modalityMatch;
  });
});

// Methods
const loadCases = async () => {
  loading.value = true;
  error.value = null;

  try {
    const response = await fetch('/cases/chest-xray-library.json');
    if (!response.ok) {
      throw new Error('Failed to load case library');
    }

    const library: CaseLibrary = await response.json();
    cases.value = library.cases;
  } catch (err) {
    console.error('Error loading cases:', err);
    error.value = 'Failed to load case library. Please try again.';
  } finally {
    loading.value = false;
  }
};

const selectCase = (caseItem: RadiologyCaseMetadata) => {
  emit('caseSelected', caseItem);
};

const clearFilters = () => {
  selectedSkillLevel.value = 'all';
  selectedModality.value = 'all';
};

const handleGenerate = () => {
  emit('generate');
};

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  target.style.display = 'none';
  const placeholder = target.parentElement?.querySelector('.thumbnail-placeholder');
  if (placeholder) {
    (placeholder as HTMLElement).style.display = 'flex';
  }
};

// Lifecycle
onMounted(() => {
  loadCases();
});
</script>

<style scoped>
.case-gallery-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0a0a0a;
  overflow: hidden;
}

/* Header */
.gallery-header {
  padding: 12px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: transparent;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.title-section {
  display: flex;
  align-items: center;
}

.gallery-title {
  font-size: 11px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  letter-spacing: 1.5px;
}

.filter-section {
  display: flex;
  gap: 12px;
}

/* Enterprise Filter Styling */
.enterprise-filter {
  min-width: 140px;
  max-width: 160px;
}

:deep(.enterprise-filter .v-field) {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0 12px;
}

:deep(.enterprise-filter .v-field:hover) {
  border-color: rgba(255, 255, 255, 0.15);
}

:deep(.enterprise-filter .v-field--focused) {
  border-color: rgba(255, 255, 255, 0.3);
}

:deep(.enterprise-filter .v-field__input) {
  font-size: 11px;
  font-weight: 300;
  letter-spacing: 0.5px;
  padding: 8px 0;
  min-height: 36px;
  color: rgba(255, 255, 255, 0.7);
}

:deep(.enterprise-filter .v-label) {
  font-size: 10px;
  font-weight: 300;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.3);
}

:deep(.enterprise-filter .v-icon) {
  color: rgba(255, 255, 255, 0.2);
  scale: 0.8;
}

:deep(.enterprise-filter .v-field__outline) {
  display: none;
}

/* States */
.loading-state,
.error-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px;
}

.loading-text,
.error-text,
.empty-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.error-text {
  color: rgba(244, 67, 54, 0.8);
}

/* Case Grid */
.cases-grid {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  align-content: start;
}

/* Action Buttons Row */
.action-buttons-row {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 8px;
}

/* Custom Scrollbar */
.cases-grid::-webkit-scrollbar {
  width: 6px;
}

.cases-grid::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.01);
}

.cases-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
}

.cases-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.12);
}

/* Case Card */
.case-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  overflow: visible;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.case-card:hover {
  transform: translateY(-2px);
  border-color: rgba(33, 150, 243, 0.3);
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.case-thumbnail {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.95;
  transition: opacity 0.2s ease;
}

.case-card:hover .thumbnail-image {
  opacity: 1;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.01);
}

.skill-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  backdrop-filter: blur(8px);
}

.skill-badge.skill-beginner {
  background: rgba(76, 175, 80, 0.15);
  color: #81c784;
  border: 1px solid rgba(76, 175, 80, 0.25);
}

.skill-badge.skill-intermediate {
  background: rgba(255, 152, 0, 0.15);
  color: #ffb74d;
  border: 1px solid rgba(255, 152, 0, 0.25);
}

.skill-badge.skill-advanced {
  background: rgba(244, 67, 54, 0.15);
  color: #e57373;
  border: 1px solid rgba(244, 67, 54, 0.25);
}

/* Case Info */
.case-info {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.case-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.case-description {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.case-metadata {
  display: flex;
  gap: 14px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.metadata-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.metadata-item .v-icon {
  color: rgba(255, 255, 255, 0.3);
}

.case-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tag {
  padding: 2px 8px;
  background: rgba(33, 150, 243, 0.08);
  border: 1px solid rgba(33, 150, 243, 0.15);
  border-radius: 3px;
  font-size: 10px;
  color: rgba(33, 150, 243, 0.8);
  font-weight: 400;
  text-transform: lowercase;
}

/* Simplified Case Info - Only show case number */
.case-info.simplified {
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.case-number-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  text-align: center;
}
</style>
