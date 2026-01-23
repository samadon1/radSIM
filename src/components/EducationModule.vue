<template>
  <div class="education-module fill-height">
    <!-- Chat interface - full height, clean design -->
    <div class="chat-container">
      <SocraticChat />
    </div>

    <!-- Token Configuration Dialog -->
    <v-dialog v-model="showTokenDialog" max-width="500">
      <v-card class="token-dialog">
        <v-card-title class="dialog-title">
          <v-icon class="mr-2">mdi-key</v-icon>
          Hugging Face Token
        </v-card-title>
        <v-card-text class="dialog-content">
          <p class="dialog-description">
            Enter your Hugging Face token to access MedRAX2 AI backend.
          </p>
          <v-text-field
            v-model="tokenInput"
            label="HF Token"
            placeholder="hf_..."
            type="password"
            variant="outlined"
            density="comfortable"
            class="mt-4"
          />
          <p class="token-hint">
            Get your token from: <a href="https://huggingface.co/settings/tokens" target="_blank">huggingface.co/settings/tokens</a>
          </p>
          <p v-if="hasToken" class="token-status">
            ✓ Token is saved
          </p>
          <p v-else class="token-status">
            ✗ No token saved
          </p>
        </v-card-text>
        <v-card-actions class="dialog-actions">
          <v-btn
            variant="text"
            @click="showTokenDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            v-if="hasToken"
            variant="text"
            color="error"
            @click="handleClearToken"
          >
            Clear Token
          </v-btn>
          <v-btn
            variant="flat"
            color="primary"
            @click="handleSaveToken"
            :disabled="!tokenInput.trim()"
          >
            Save & Connect
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import SocraticChat from './education/SocraticChat.vue';
import { useEducationStore } from '@/src/store/education';

const educationStore = useEducationStore();
const connected = computed(() => educationStore.connected);
const hasToken = computed(() => educationStore.hasToken());

// Token dialog
const showTokenDialog = ref(false);
const tokenInput = ref('');

// Open dialog with token if exists
const openTokenDialog = () => {
  const existingToken = localStorage.getItem('hf_token');
  if (existingToken) {
    tokenInput.value = existingToken;
  }
  showTokenDialog.value = true;
};

// Save token and reconnect
const handleSaveToken = async () => {
  if (tokenInput.value.trim()) {
    const token = tokenInput.value.trim();
    console.log('Saving token:', token.substring(0, 10) + '...');
    educationStore.setHfToken(token);

    // Verify it was saved
    const savedToken = localStorage.getItem('hf_token');
    console.log('Token saved to localStorage:', savedToken ? 'YES' : 'NO');
    console.log('HasToken:', educationStore.hasToken());

    showTokenDialog.value = false;
    // Reconnect with new token
    await educationStore.connect();
  }
};

// Clear token
const handleClearToken = async () => {
  educationStore.clearHfToken();
  tokenInput.value = '';
  showTokenDialog.value = false;
  // Reconnect to update status
  await educationStore.connect();
};
</script>

<style scoped>
.education-module {
  display: flex;
  flex-direction: column;
  background: #0a0a0a;
}

/* Chat Container */
.chat-container {
  flex: 1;
  overflow: hidden;
  padding: 0;
  background: #0a0a0a;
}

/* Token Dialog */
.token-dialog {
  background: #1a1a1a;
  color: rgba(255, 255, 255, 0.9);
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px 24px;
}

.dialog-content {
  padding: 24px;
}

.dialog-description {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
}

.token-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 12px;
}

.token-hint a {
  color: #2196F3;
  text-decoration: none;
}

.token-hint a:hover {
  text-decoration: underline;
}

.token-status {
  font-size: 13px;
  font-weight: 500;
  margin-top: 8px;
  padding: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
}

.dialog-actions {
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
