<template>
  <div class="findings-checklist">
    <div class="checklist-header">
      <h3 class="checklist-title">FINDINGS CHECKLIST</h3>
      <p class="checklist-subtitle">Select all findings that apply</p>
    </div>

    <div class="checklist-body">
      <!-- Normal Study -->
      <div class="checklist-section">
        <label class="checklist-item primary-item">
          <input
            type="checkbox"
            v-model="selectedFindings.normal"
            @change="handleNormalChange"
            class="checklist-checkbox"
          />
          <span class="checklist-label">Normal study</span>
        </label>
      </div>

      <!-- Categories Grid -->
      <div class="categories-grid" :class="{ disabled: selectedFindings.normal }">
        <!-- Cardiac Column -->
        <div class="category-column">
          <h4 class="category-title">CARDIAC</h4>
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.cardiac.cardiomegaly"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">Cardiomegaly</span>
          </label>
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.cardiac.pericardialEffusion"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">Pericardial effusion</span>
          </label>
        </div>

        <!-- Pulmonary Column -->
        <div class="category-column">
          <h4 class="category-title">PULMONARY</h4>
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.pulmonary.pulmonaryEdema"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">Pulmonary edema</span>
          </label>
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.pulmonary.consolidation"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">Consolidation</span>
          </label>
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.pulmonary.atelectasis"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">Atelectasis</span>
          </label>
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.pulmonary.massNodule"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">Mass/nodule</span>
          </label>
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.pulmonary.emphysema"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">Emphysema</span>
          </label>
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.pulmonary.fibrosis"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">Fibrosis</span>
          </label>
        </div>
      </div>

      <div class="categories-grid" :class="{ disabled: selectedFindings.normal }">
        <!-- Pleural Column -->
        <div class="category-column">
          <h4 class="category-title">PLEURAL</h4>
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.pleural.effusionRight"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">Pleural effusion (R)</span>
          </label>
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.pleural.effusionLeft"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">Pleural effusion (L)</span>
          </label>
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.pleural.pneumothoraxRight"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">Pneumothorax (R)</span>
          </label>
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.pleural.pneumothoraxLeft"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">Pneumothorax (L)</span>
          </label>
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.pleural.thickening"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">Pleural thickening</span>
          </label>
        </div>

        <!-- Lines/Tubes Column -->
        <div class="category-column">
          <h4 class="category-title">LINES/TUBES</h4>
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.linesTubes.ett"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">ETT</span>
          </label>
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.linesTubes.ngTube"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">NG tube</span>
          </label>
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.linesTubes.centralLine"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">Central line</span>
          </label>
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.linesTubes.chestTube"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">Chest tube</span>
          </label>
        </div>
      </div>

      <!-- Mediastinal Section -->
      <div class="checklist-section" :class="{ disabled: selectedFindings.normal }">
        <h4 class="category-title">MEDIASTINAL</h4>
        <div class="horizontal-items">
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.mediastinal.widened"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">Widened mediastinum</span>
          </label>
          <label class="checklist-item">
            <input
              type="checkbox"
              v-model="selectedFindings.mediastinal.hilarEnlargement"
              :disabled="selectedFindings.normal"
              class="checklist-checkbox"
            />
            <span class="checklist-label">Hilar enlargement</span>
          </label>
        </div>
      </div>
    </div>

    <div class="checklist-footer">
      <button
        @click="handleSubmit"
        class="submit-button"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? 'EVALUATING...' : 'SUBMIT FINDINGS' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

const emit = defineEmits<{
  submit: [findings: any];
}>();

const isSubmitting = ref(false);

const selectedFindings = reactive({
  normal: false,
  cardiac: {
    cardiomegaly: false,
    pericardialEffusion: false
  },
  pulmonary: {
    pulmonaryEdema: false,
    consolidation: false,
    atelectasis: false,
    massNodule: false,
    emphysema: false,
    fibrosis: false
  },
  pleural: {
    effusionRight: false,
    effusionLeft: false,
    pneumothoraxRight: false,
    pneumothoraxLeft: false,
    thickening: false
  },
  mediastinal: {
    widened: false,
    hilarEnlargement: false
  },
  linesTubes: {
    ett: false,
    ngTube: false,
    centralLine: false,
    chestTube: false
  }
});

const handleNormalChange = () => {
  if (selectedFindings.normal) {
    // Clear all other findings when Normal is selected
    Object.keys(selectedFindings).forEach(key => {
      if (key !== 'normal') {
        const category = selectedFindings[key as keyof typeof selectedFindings];
        if (typeof category === 'object') {
          Object.keys(category).forEach(finding => {
            (category as any)[finding] = false;
          });
        }
      }
    });
  }
};

const handleSubmit = () => {
  isSubmitting.value = true;

  // Convert to array of finding strings for easier processing
  const findings: string[] = [];

  if (selectedFindings.normal) {
    findings.push('normal');
  } else {
    // Cardiac findings
    if (selectedFindings.cardiac.cardiomegaly) findings.push('cardiomegaly');
    if (selectedFindings.cardiac.pericardialEffusion) findings.push('pericardial_effusion');

    // Pulmonary findings
    if (selectedFindings.pulmonary.pulmonaryEdema) findings.push('pulmonary_edema');
    if (selectedFindings.pulmonary.consolidation) findings.push('consolidation');
    if (selectedFindings.pulmonary.atelectasis) findings.push('atelectasis');
    if (selectedFindings.pulmonary.massNodule) findings.push('mass_nodule');
    if (selectedFindings.pulmonary.emphysema) findings.push('emphysema');
    if (selectedFindings.pulmonary.fibrosis) findings.push('fibrosis');

    // Pleural findings
    if (selectedFindings.pleural.effusionRight) findings.push('pleural_effusion_right');
    if (selectedFindings.pleural.effusionLeft) findings.push('pleural_effusion_left');
    if (selectedFindings.pleural.pneumothoraxRight) findings.push('pneumothorax_right');
    if (selectedFindings.pleural.pneumothoraxLeft) findings.push('pneumothorax_left');
    if (selectedFindings.pleural.thickening) findings.push('pleural_thickening');

    // Mediastinal findings
    if (selectedFindings.mediastinal.widened) findings.push('widened_mediastinum');
    if (selectedFindings.mediastinal.hilarEnlargement) findings.push('hilar_enlargement');

    // Lines/Tubes
    if (selectedFindings.linesTubes.ett) findings.push('ett');
    if (selectedFindings.linesTubes.ngTube) findings.push('ng_tube');
    if (selectedFindings.linesTubes.centralLine) findings.push('central_line');
    if (selectedFindings.linesTubes.chestTube) findings.push('chest_tube');
  }

  emit('submit', findings);

  // Reset after a delay
  setTimeout(() => {
    isSubmitting.value = false;
  }, 1000);
};
</script>

<style scoped>
.findings-checklist {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 20px;
  margin: 12px 0;
}

.checklist-header {
  margin-bottom: 20px;
  text-align: center;
}

.checklist-title {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 1.5px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 4px 0;
}

.checklist-subtitle {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.checklist-body {
  margin-bottom: 20px;
}

.checklist-section {
  margin-bottom: 20px;
}

.checklist-section.disabled {
  opacity: 0.3;
  pointer-events: none;
}

.primary-item {
  display: flex;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
  margin-bottom: 16px;
}

.categories-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 20px;
}

.categories-grid.disabled {
  opacity: 0.3;
  pointer-events: none;
}

.category-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.2px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 0;
  transition: all 0.2s ease;
}

.checklist-item:hover {
  background: rgba(255, 255, 255, 0.01);
  padding-left: 4px;
}

.checklist-checkbox {
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: rgba(255, 255, 255, 0.7);
}

.checklist-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  user-select: none;
}

.horizontal-items {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.checklist-footer {
  display: flex;
  justify-content: center;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.submit-button {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  padding: 10px 24px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 1.2px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

.submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>