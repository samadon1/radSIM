<template>
  <v-menu
    v-model="showHint"
    :target="targetElement"
    :close-on-content-click="false"
    location="top"
    offset="10"
  >
    <v-card
      max-width="300"
      class="hint-bubble"
    >
      <v-card-title class="d-flex align-center pa-2">
        <v-icon
          class="mr-2"
          :color="hintColor"
          size="small"
        >
          mdi-lightbulb
        </v-icon>
        <span class="text-subtitle-2">Hint</span>
        <v-spacer />
        <v-btn
          icon
          size="x-small"
          variant="text"
          @click="dismissHint"
        >
          <v-icon size="small">mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-3">
        <p class="text-body-2 mb-0">{{ hintText }}</p>

        <div v-if="showProgress" class="mt-2">
          <v-progress-linear
            :value="hintLevel * 20"
            color="primary"
            height="4"
          />
          <span class="text-caption">
            Hint {{ hintLevel }} of 5
          </span>
        </div>
      </v-card-text>

      <v-card-actions v-if="showActions" class="pa-2">
        <v-spacer />
        <v-btn
          v-if="canRequestMore"
          size="small"
          variant="text"
          color="primary"
          @click="requestNextHint"
        >
          Need more help
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useEducationStore } from '@/src/store/education';
import type { EducationalHint } from '@/src/types/education';

// Props
const props = defineProps<{
  hint: EducationalHint | null;
  target?: HTMLElement | string;
  autoHide?: boolean;
  hideDelay?: number;
}>();

// Emits
const emit = defineEmits<{
  dismiss: [];
  requestNext: [];
}>();

// State
const showHint = ref(false);
const targetElement = ref<HTMLElement | string>('');
let hideTimeout: number | null = null;

// Store
const educationStore = useEducationStore();

// Computed
const hintText = computed(() => props.hint?.text || '');

const hintLevel = computed(() => props.hint?.level || 1);

const hintColor = computed(() => {
  if (!props.hint) return 'grey';
  switch (props.hint.level) {
    case 1:
    case 2:
      return 'info';
    case 3:
      return 'warning';
    case 4:
    case 5:
      return 'error';
    default:
      return 'primary';
  }
});

const showProgress = computed(() => {
  return educationStore.currentMode === 'practice';
});

const showActions = computed(() => {
  return educationStore.modeConfig.hintsEnabled && !educationStore.modeConfig.hintsAutomatic;
});

const canRequestMore = computed(() => {
  return educationStore.canRequestHint && hintLevel.value < 5;
});

// Methods
function dismissHint() {
  showHint.value = false;
  emit('dismiss');
  clearHideTimeout();
}

function requestNextHint() {
  emit('requestNext');
}

function clearHideTimeout() {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
}

// Watchers
watch(() => props.hint, (newHint) => {
  if (newHint) {
    showHint.value = true;
    targetElement.value = props.target || '';

    // Auto-hide if configured
    if (props.autoHide && props.hideDelay) {
      clearHideTimeout();
      hideTimeout = window.setTimeout(() => {
        dismissHint();
      }, props.hideDelay);
    }
  } else {
    showHint.value = false;
  }
});

watch(() => props.target, (newTarget) => {
  targetElement.value = newTarget || '';
});

// Cleanup
watch(showHint, (visible) => {
  if (!visible) {
    clearHideTimeout();
  }
});
</script>

<style scoped>
.hint-bubble {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.hint-bubble::before {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
}
</style>