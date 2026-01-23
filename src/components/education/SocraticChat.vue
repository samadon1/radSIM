<template>
  <div class="enterprise-chat-container">
    <!-- Messages Area -->
    <div ref="messagesContainer" class="messages-area">
      <!-- Chat Messages -->
      <div
        v-for="message in messages"
        :key="message.id"
        class="message-wrapper"
        :class="message.role"
      >
        <div class="message-content-wrapper">
          <div class="message-avatar">
            <span class="avatar-text">{{ message.role === 'assistant' ? 'AI' : 'U' }}</span>
          </div>
          <div class="message-body">
            <div class="message-meta">
              <span class="sender-name">{{ message.role === 'assistant' ? 'AI' : 'You' }}</span>
              <span class="message-time">{{ formatTime(message.timestamp) }}</span>
            </div>
            <div class="message-text">{{ message.content }}</div>

            <!-- Show Findings Checklist for first message if it has the checklist flag -->
            <FindingsChecklist
              v-if="message.showChecklist"
              @submit="handleChecklistSubmit"
            />

            <!-- Show evaluation results if present -->
            <div v-if="message.evaluationResults" class="evaluation-results">
              <div class="results-header">
                <h4 class="results-title">EVALUATION RESULTS</h4>
                <div class="score">{{ message.evaluationResults.score }}% Correct</div>
              </div>

              <div v-if="message.evaluationResults.correct && message.evaluationResults.correct.length > 0" class="results-section">
                <h5 class="section-title correct-title">✓ Correct Findings</h5>
                <ul class="findings-list">
                  <li v-for="finding in message.evaluationResults.correct" :key="finding" class="correct">
                    {{ formatFinding(finding) }}
                  </li>
                </ul>
              </div>

              <div v-if="message.evaluationResults.missed && message.evaluationResults.missed.length > 0" class="results-section">
                <h5 class="section-title missed-title">✗ Missed Findings</h5>
                <ul class="findings-list">
                  <li v-for="finding in message.evaluationResults.missed" :key="finding" class="missed">
                    {{ formatFinding(finding) }}
                  </li>
                </ul>
              </div>

              <div v-if="message.evaluationResults.incorrect && message.evaluationResults.incorrect.length > 0" class="results-section">
                <h5 class="section-title incorrect-title">⚠ Incorrect Findings</h5>
                <ul class="findings-list">
                  <li v-for="finding in message.evaluationResults.incorrect" :key="finding" class="incorrect">
                    {{ formatFinding(finding) }}
                  </li>
                </ul>
              </div>

              <div class="feedback-section">
                <p class="feedback-text">{{ message.evaluationResults.feedback }}</p>
              </div>
            </div>

            <!-- Attachment thumbnail for user messages -->
            <div v-if="message.attachment" class="message-attachment">
              <img :src="message.attachment.thumbnail" class="message-attachment-thumb" alt="Attachment" />
              <span class="message-attachment-label">Annotated Image</span>
            </div>
            <!-- Visualization image from MedRAX2 - Hidden, shown in main viewer overlay instead -->
            <!--
            <div v-if="message.visualization" class="visualization-container">
              <img
                :src="message.visualization"
                alt="AI Visualization"
                class="visualization-image"
              />
              <div class="visualization-label">AI Analysis Visualization</div>
            </div>
            -->
          </div>
        </div>
      </div>

      <!-- Typing Indicator -->
      <div v-if="isTyping" class="message-wrapper assistant">
        <div class="message-content-wrapper">
          <div class="message-avatar">
            <span class="avatar-text">AI</span>
          </div>
          <div class="message-body">
            <div class="typing-animation">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area (enterprise design) -->
    <div class="input-area">
      <!-- Annotation Attachment Preview -->
      <div v-if="annotationAttachment" class="attachment-preview">
        <div class="attachment-card">
          <img :src="annotationAttachment.thumbnail" alt="Annotated image" class="attachment-thumbnail" />
          <div class="attachment-content">
            <div class="attachment-label">Annotated Image</div>
            <textarea
              v-model="attachmentDescription"
              class="attachment-description"
              placeholder="Add description..."
              rows="2"
            />
          </div>
          <button
            class="attachment-close"
            @click="clearAttachment"
          >
            <v-icon size="16">mdi-close</v-icon>
          </button>
        </div>
      </div>


      <div class="input-wrapper">
        <input
          v-model="inputMessage"
          :disabled="waitingForResponse"
          type="text"
          class="message-input"
          :placeholder="annotationAttachment ? 'Add a comment (optional)...' : 'Ask about the current image or radiology concepts...'"
          @keyup.enter="sendMessage"
        />
        <div class="input-actions">
          <button
            class="action-btn"
            :class="{ disabled: (!inputMessage.trim() && !annotationAttachment) || waitingForResponse }"
            :disabled="(!inputMessage.trim() && !annotationAttachment) || waitingForResponse"
            @click="sendMessage"
          >
            <v-icon size="18">mdi-send</v-icon>
          </button>
          <button
            class="action-btn secondary"
            :disabled="waitingForResponse"
            @click="clearChat"
          >
            <v-icon size="18">mdi-refresh</v-icon>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useEducationStore } from '@/src/store/education';
import FindingsChecklist from './FindingsChecklist.vue';

const educationStore = useEducationStore();

// Refs
const messagesContainer = ref<HTMLElement | null>(null);
const inputMessage = ref('');
const userHasSentMessage = ref(false);
const attachmentDescription = ref('');

// Store bindings
const messages = computed(() => educationStore.messages);
const isTyping = computed(() => educationStore.isTyping);
const waitingForResponse = computed(() => educationStore.waitingForResponse);
const connectionError = computed(() => educationStore.connectionError);
const annotationAttachment = computed(() => educationStore.annotationAttachment);

// Watch for attachment changes and set initial description
watch(annotationAttachment, (newAttachment) => {
  if (newAttachment) {
    attachmentDescription.value = newAttachment.description;
  } else {
    attachmentDescription.value = '';
  }
});

// Show suggestions until user sends first message
const showSuggestions = computed(() => !userHasSentMessage.value);

// Suggestion pills
const suggestions = [
  { text: 'Segment both lungs', type: 'segment', icon: 'mdi-vector-polygon' },
  { text: 'Ground the heart', type: 'ground', icon: 'mdi-map-marker-outline' },
  { text: 'Is this X-ray normal?', type: 'analyze', icon: 'mdi-magnify' },
  { text: 'What view is this?', type: 'analyze', icon: 'mdi-help-circle-outline' },
  { text: 'Show me the costophrenic angles', type: 'ground', icon: 'mdi-map-marker-outline' },
  { text: 'Segment the heart', type: 'segment', icon: 'mdi-vector-polygon' },
];

// Methods
function useSuggestion(text: string) {
  inputMessage.value = text;
  sendMessage();
}
async function sendMessage() {
  // Allow sending with attachment even without text
  if ((!inputMessage.value.trim() && !annotationAttachment.value) || waitingForResponse.value) {
    return;
  }

  // Combine attachment description with user message
  let finalMessage = inputMessage.value.trim();
  if (annotationAttachment.value) {
    // Update attachment description if user edited it
    if (attachmentDescription.value !== annotationAttachment.value.description) {
      educationStore.annotationAttachment!.description = attachmentDescription.value;
    }

    // If there's user text, combine it with the description
    if (finalMessage) {
      finalMessage = `${attachmentDescription.value}. ${finalMessage}`;
    } else {
      finalMessage = attachmentDescription.value;
    }
  }

  inputMessage.value = '';
  attachmentDescription.value = '';

  // Hide suggestions after first user message
  userHasSentMessage.value = true;

  await educationStore.sendMessage(finalMessage);
  await nextTick();
  scrollToBottom();
}

function clearAttachment() {
  educationStore.clearAnnotationAttachment();
  attachmentDescription.value = '';
}

function clearChat() {
  educationStore.clearChat();
  userHasSentMessage.value = false; // Reset to show suggestions again
  scrollToBottom();
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

function formatTime(timestamp: Date): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format finding names for display
function formatFinding(finding: string): string {
  // Convert underscore notation to readable format
  return finding
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace('Ett', 'ETT')
    .replace('Ng', 'NG');
}

// Handle checklist submission
async function handleChecklistSubmit(findings: string[]) {
  console.log('Checklist submitted with findings:', findings);

  // Send findings to education store for evaluation
  await educationStore.evaluateFindings(findings);

  // Scroll to show the evaluation results
  await nextTick();
  scrollToBottom();
}

// Watchers
watch(messages, async () => {
  await nextTick();
  scrollToBottom();
});

// Lifecycle
onMounted(async () => {
  await educationStore.connect();
  scrollToBottom();
});
</script>

<style scoped>
.enterprise-chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0a0a0a;
}

/* Messages Area */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scroll-behavior: smooth;
}

/* Message Wrapper */
.message-wrapper {
  margin-bottom: 20px;
  animation: fadeInUp 0.3s ease;
}

.message-content-wrapper {
  display: flex;
  gap: 12px;
  max-width: 85%;
}

.message-wrapper.user .message-content-wrapper {
  margin-left: auto;
  flex-direction: row-reverse;
}

/* Avatar */
.message-avatar {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.avatar-text {
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.5);
}

.message-wrapper.assistant .message-avatar {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.05);
}

.message-wrapper.user .message-avatar {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.05);
}

/* Message Body */
.message-body {
  flex: 1;
  min-width: 0;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.sender-name {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.message-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.message-text {
  padding: 10px 0;
  font-size: 13px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.85);
  background: transparent;
  border: none;
  border-left: 2px solid transparent;
  padding-left: 12px;
}

.message-wrapper.assistant .message-text {
  background: transparent;
  border-left-color: rgba(255, 255, 255, 0.1);
}

.message-wrapper.user .message-text {
  background: transparent;
  border-left-color: rgba(255, 255, 255, 0.05);
  text-align: right;
  border-left: none;
  border-right: 2px solid rgba(255, 255, 255, 0.05);
  padding-right: 12px;
  padding-left: 0;
}

/* Visualization Container */
.visualization-container {
  margin-top: 12px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.visualization-image {
  width: 100%;
  display: block;
  max-width: 500px;
}

.visualization-label {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(0, 0, 0, 0.2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Typing Animation */
.typing-animation {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
}

.typing-animation span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(33, 150, 243, 0.6);
  animation: typing 1.4s infinite;
}

.typing-animation span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-animation span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-8px);
    opacity: 1;
  }
}

/* Input Area */
.input-area {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.02);
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 4px 4px 4px 16px;
  transition: all 0.2s ease;
}

.input-wrapper:focus-within {
  border-color: rgba(33, 150, 243, 0.5);
  background: rgba(33, 150, 243, 0.05);
}

.message-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  padding: 10px 0;
  font-family: inherit;
}

.message-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.message-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: none;
  background: rgba(33, 150, 243, 0.15);
  color: rgba(33, 150, 243, 0.9);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover:not(.disabled) {
  background: rgba(33, 150, 243, 0.25);
  transform: translateY(-1px);
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
}

.action-btn.secondary:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.action-btn.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Scrollbar */
.messages-area::-webkit-scrollbar {
  width: 6px;
}

.messages-area::-webkit-scrollbar-track {
  background: transparent;
}

.messages-area::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.messages-area::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Suggestion Pills */
.suggestion-pills {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  animation: fadeInDown 0.4s ease;
}

.pills-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.pills-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.suggestion-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.suggestion-pill:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.pill-icon {
  opacity: 0.7;
}

/* Pill type colors */
.pill-segment {
  background: rgba(156, 39, 176, 0.1);
  border-color: rgba(156, 39, 176, 0.3);
}

.pill-segment:hover {
  background: rgba(156, 39, 176, 0.2);
  border-color: rgba(156, 39, 176, 0.4);
}

.pill-ground {
  background: rgba(33, 150, 243, 0.1);
  border-color: rgba(33, 150, 243, 0.3);
}

.pill-ground:hover {
  background: rgba(33, 150, 243, 0.2);
  border-color: rgba(33, 150, 243, 0.4);
}

.pill-analyze {
  background: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.3);
}

.pill-analyze:hover {
  background: rgba(76, 175, 80, 0.2);
  border-color: rgba(76, 175, 80, 0.4);
}

/* Attachment Preview */
.attachment-preview {
  margin-bottom: 12px;
  animation: fadeInUp 0.3s ease;
}

.attachment-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: rgba(33, 150, 243, 0.05);
  border: 1px solid rgba(33, 150, 243, 0.2);
  border-radius: 8px;
  position: relative;
}

.attachment-thumbnail {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.attachment-content {
  flex: 1;
  min-width: 0;
}

.attachment-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.attachment-description {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 8px 10px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  line-height: 1.5;
  resize: none;
  outline: none;
  font-family: inherit;
  transition: all 0.2s ease;
}

.attachment-description:focus {
  border-color: rgba(33, 150, 243, 0.4);
  background: rgba(33, 150, 243, 0.08);
}

.attachment-description::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.attachment-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.attachment-close:hover {
  background: rgba(255, 0, 0, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

/* Show attachment in message */
.message-attachment {
  margin-top: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-attachment-thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.message-attachment-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Evaluation Results */
.evaluation-results {
  margin-top: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.results-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.2px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.score {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.results-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin: 0 0 8px 0;
}

.correct-title {
  color: rgba(76, 175, 80, 0.9);
}

.missed-title {
  color: rgba(244, 67, 54, 0.9);
}

.incorrect-title {
  color: rgba(255, 152, 0, 0.9);
}

.findings-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.findings-list li {
  padding: 6px 12px;
  margin-bottom: 4px;
  font-size: 12px;
  border-radius: 4px;
}

.findings-list li.correct {
  background: rgba(76, 175, 80, 0.1);
  color: rgba(76, 175, 80, 0.9);
  border-left: 2px solid rgba(76, 175, 80, 0.5);
}

.findings-list li.missed {
  background: rgba(244, 67, 54, 0.1);
  color: rgba(244, 67, 54, 0.9);
  border-left: 2px solid rgba(244, 67, 54, 0.5);
}

.findings-list li.incorrect {
  background: rgba(255, 152, 0, 0.1);
  color: rgba(255, 152, 0, 0.9);
  border-left: 2px solid rgba(255, 152, 0, 0.5);
}

.feedback-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.feedback-text {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
