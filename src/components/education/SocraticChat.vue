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
          <div class="message-body">
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

            <!-- Phase 1 Assessment Feedback (from Gemini) -->
            <div v-if="message.assessmentFeedback" class="assessment-feedback">
              <div class="assessment-header">
                <h4 class="assessment-title">ASSESSMENT RESULTS</h4>
                <div class="score-badge" :class="getScoreClass(message.assessmentFeedback.score)">
                  {{ message.assessmentFeedback.score }}%
                </div>
              </div>

              <!-- Correct Findings -->
              <div v-if="message.assessmentFeedback.correct.length > 0" class="feedback-section correct">
                <h5 class="section-title">✓ Correct Observations</h5>
                <ul class="findings-list">
                  <li v-for="finding in message.assessmentFeedback.correct" :key="finding">
                    {{ finding }}
                  </li>
                </ul>
              </div>

              <!-- Missed Findings -->
              <div v-if="message.assessmentFeedback.missed.length > 0" class="feedback-section missed">
                <h5 class="section-title">⚠ Missed Findings</h5>
                <ul class="findings-list">
                  <li v-for="finding in message.assessmentFeedback.missed" :key="finding">
                    {{ finding }}
                  </li>
                </ul>
              </div>

              <!-- Incorrect Findings -->
              <div v-if="message.assessmentFeedback.incorrect.length > 0" class="feedback-section incorrect">
                <h5 class="section-title">✗ Incorrect Observations</h5>
                <ul class="findings-list">
                  <li v-for="finding in message.assessmentFeedback.incorrect" :key="finding">
                    {{ finding }}
                  </li>
                </ul>
              </div>

              <!-- Teaching Points -->
              <div v-if="message.assessmentFeedback.teachingPoints.length > 0" class="teaching-points">
                <h5 class="section-title">💡 Teaching Points</h5>
                <ul class="teaching-list">
                  <li v-for="(point, index) in message.assessmentFeedback.teachingPoints" :key="index">
                    {{ point }}
                  </li>
                </ul>
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
          <div class="message-body">
            <div class="typing-animation">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Start Practice Button (shown when diagnostic flow hasn't started) -->
      <div v-if="diagnosticState.step === 'initial' && hasCase" class="start-practice-prompt">
        <button
          class="start-practice-btn"
          @click="handleStartPractice"
        >
          <v-icon size="20" class="btn-icon">mdi-play-circle-outline</v-icon>
          Start Practice
        </button>
        <p class="start-practice-hint">Begin a guided diagnostic assessment</p>
      </div>

      <!-- Diagnostic Flow: Normal/Abnormal Buttons -->
      <div v-if="diagnosticState.step === 'normal_abnormal'" class="diagnostic-buttons">
        <button
          class="diagnostic-btn normal"
          @click="handleNormalAbnormal('normal')"
          :disabled="waitingForResponse"
        >
          Normal
        </button>
        <button
          class="diagnostic-btn abnormal"
          @click="handleNormalAbnormal('abnormal')"
          :disabled="waitingForResponse"
        >
          Abnormal
        </button>
      </div>

      <!-- Diagnostic Flow: Diagnosis Input -->
      <div v-if="diagnosticState.step === 'diagnosis'" class="diagnosis-input-section">
        <div class="diagnosis-input-wrapper">
          <input
            v-model="diagnosisInput"
            type="text"
            class="diagnosis-input"
            placeholder="Enter your diagnosis..."
            @keyup.enter="handleDiagnosisSubmit"
            :disabled="waitingForResponse"
          />
          <button
            class="diagnosis-submit-btn"
            @click="handleDiagnosisSubmit"
            :disabled="!diagnosisInput.trim() || waitingForResponse"
          >
            Submit
          </button>
        </div>
        <p class="diagnosis-hint">You can also mark the finding on the image using the annotation tools</p>
      </div>

      <!-- Diagnostic Flow: See Explanation Button -->
      <div v-if="diagnosticState.step === 'feedback' && !diagnosticState.showingExplanation && !diagnosticState.classificationCorrect" class="explanation-prompt">
        <button
          class="explanation-btn"
          @click="handleShowExplanation"
          :disabled="waitingForResponse"
        >
          See Explanation
        </button>
      </div>

      <!-- Diagnostic Flow: Next Case Button -->
      <div v-if="diagnosticState.step === 'complete'" class="next-case-prompt">
        <button
          class="next-case-btn"
          @click="handleNextCase"
        >
          Next Case
        </button>
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
import { useCaseLibraryStore } from '@/src/store/case-library';
import FindingsChecklist from './FindingsChecklist.vue';

const educationStore = useEducationStore();
const caseLibraryStore = useCaseLibraryStore();

// Refs
const messagesContainer = ref<HTMLElement | null>(null);
const inputMessage = ref('');
const userHasSentMessage = ref(false);
const attachmentDescription = ref('');
const diagnosisInput = ref('');

// Store bindings
const messages = computed(() => educationStore.messages);
const isTyping = computed(() => educationStore.isTyping);
const waitingForResponse = computed(() => educationStore.waitingForResponse);
const connectionError = computed(() => educationStore.connectionError);
const annotationAttachment = computed(() => educationStore.annotationAttachment);
const diagnosticState = computed(() => educationStore.diagnosticState);
const hasCase = computed(() => !!caseLibraryStore.currentCase);

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

// Diagnostic Flow Handlers
function handleStartPractice() {
  educationStore.startDiagnosticFlow();
}

async function handleNormalAbnormal(classification: 'normal' | 'abnormal') {
  await educationStore.submitNormalAbnormal(classification);
  await nextTick();
  scrollToBottom();
}

async function handleDiagnosisSubmit() {
  if (!diagnosisInput.value.trim()) return;

  await educationStore.submitDiagnosis(diagnosisInput.value.trim());
  diagnosisInput.value = '';
  await nextTick();
  scrollToBottom();
}

async function handleShowExplanation() {
  educationStore.showExplanation();
  await nextTick();
  scrollToBottom();
}

function handleNextCase() {
  // Reset diagnostic state and load next case
  educationStore.resetDiagnosticFlow();

  // Get next case from case library
  const cases = caseLibraryStore.cases;
  const currentCase = caseLibraryStore.currentCase;

  if (cases && cases.length > 0 && currentCase) {
    const currentIndex = cases.findIndex(c => c.id === currentCase.id);
    const nextIndex = (currentIndex + 1) % cases.length;
    caseLibraryStore.selectCase(cases[nextIndex].id);
  }

  // Start diagnostic flow for the new case
  setTimeout(() => {
    educationStore.startDiagnosticFlow();
  }, 100);
}

// Get score badge class based on score percentage
function getScoreClass(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  return 'needs-improvement';
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
  max-width: 90%;
}

.message-wrapper.user .message-content-wrapper {
  margin-left: auto;
}

/* Message Body */
.message-body {
  flex: 1;
  min-width: 0;
}

.message-text {
  padding: 14px 18px;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  max-width: 100%;
  word-wrap: break-word;
}

.message-wrapper.assistant .message-text {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px 16px 16px 4px;
}

.message-wrapper.user .message-text {
  background: rgba(33, 150, 243, 0.15);
  border: 1px solid rgba(33, 150, 243, 0.25);
  border-radius: 16px 16px 4px 16px;
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

/* Assessment Feedback (Phase 1 - Gemini) */
.assessment-feedback {
  margin-top: 16px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  animation: fadeInUp 0.4s ease;
}

.assessment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.assessment-title {
  font-size: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin: 0;
}

.score-badge {
  padding: 4px 12px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  font-feature-settings: 'tnum';
}

.score-badge.excellent {
  background: transparent;
  color: rgba(76, 175, 80, 0.9);
  border: 1px solid rgba(76, 175, 80, 0.2);
}

.score-badge.good {
  background: transparent;
  color: rgba(33, 150, 243, 0.9);
  border: 1px solid rgba(33, 150, 243, 0.2);
}

.score-badge.fair {
  background: transparent;
  color: rgba(255, 152, 0, 0.9);
  border: 1px solid rgba(255, 152, 0, 0.2);
}

.score-badge.needs-improvement {
  background: transparent;
  color: rgba(244, 67, 54, 0.9);
  border: 1px solid rgba(244, 67, 54, 0.2);
}

.assessment-feedback .feedback-section {
  margin-top: 16px;
  padding: 0;
  border: none;
}

.assessment-feedback .section-title {
  font-size: 10px;
  font-weight: 500;
  margin: 0 0 10px 0;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.assessment-feedback .findings-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.assessment-feedback .findings-list li {
  padding: 10px 12px;
  border-radius: 2px;
  font-size: 13px;
  line-height: 1.5;
  font-weight: 400;
  background: transparent;
}

.assessment-feedback .feedback-section.correct .findings-list li {
  color: rgba(76, 175, 80, 0.85);
  border-left: 1px solid rgba(76, 175, 80, 0.25);
}

.assessment-feedback .feedback-section.missed .findings-list li {
  color: rgba(255, 152, 0, 0.85);
  border-left: 1px solid rgba(255, 152, 0, 0.25);
}

.assessment-feedback .feedback-section.incorrect .findings-list li {
  color: rgba(244, 67, 54, 0.85);
  border-left: 1px solid rgba(244, 67, 54, 0.25);
}

.teaching-points {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.teaching-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.teaching-list li {
  padding: 12px 14px;
  background: transparent;
  border-left: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 400;
}

/* Diagnostic Flow Styles */
.start-practice-prompt {
  padding: 20px;
  text-align: center;
  animation: fadeInUp 0.3s ease;
}

.start-practice-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.2), rgba(156, 39, 176, 0.2));
  border: 1px solid rgba(33, 150, 243, 0.3);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.95);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.start-practice-btn:hover {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.3), rgba(156, 39, 176, 0.3));
  border-color: rgba(33, 150, 243, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(33, 150, 243, 0.2);
}

.start-practice-btn .btn-icon {
  opacity: 0.9;
}

.start-practice-hint {
  margin: 12px 0 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
}

.diagnostic-buttons {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  animation: fadeInUp 0.3s ease;
}

.diagnostic-btn {
  flex: 1;
  padding: 14px 24px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.diagnostic-btn.normal {
  background: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.3);
  color: rgba(76, 175, 80, 0.9);
}

.diagnostic-btn.normal:hover:not(:disabled) {
  background: rgba(76, 175, 80, 0.2);
  border-color: rgba(76, 175, 80, 0.5);
  transform: translateY(-2px);
}

.diagnostic-btn.abnormal {
  background: rgba(244, 67, 54, 0.1);
  border-color: rgba(244, 67, 54, 0.3);
  color: rgba(244, 67, 54, 0.9);
}

.diagnostic-btn.abnormal:hover:not(:disabled) {
  background: rgba(244, 67, 54, 0.2);
  border-color: rgba(244, 67, 54, 0.5);
  transform: translateY(-2px);
}

.diagnostic-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Diagnosis Input Section */
.diagnosis-input-section {
  padding: 16px 20px;
  animation: fadeInUp 0.3s ease;
}

.diagnosis-input-wrapper {
  display: flex;
  gap: 8px;
}

.diagnosis-input {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
}

.diagnosis-input:focus {
  border-color: rgba(33, 150, 243, 0.5);
  background: rgba(33, 150, 243, 0.05);
}

.diagnosis-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.diagnosis-submit-btn {
  padding: 12px 24px;
  background: rgba(33, 150, 243, 0.2);
  border: 1px solid rgba(33, 150, 243, 0.4);
  border-radius: 8px;
  color: rgba(33, 150, 243, 0.9);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.diagnosis-submit-btn:hover:not(:disabled) {
  background: rgba(33, 150, 243, 0.3);
  transform: translateY(-1px);
}

.diagnosis-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.diagnosis-hint {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

/* Explanation Prompt */
.explanation-prompt {
  padding: 16px 20px;
  animation: fadeInUp 0.3s ease;
}

.explanation-btn {
  width: 100%;
  padding: 14px 24px;
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: 8px;
  color: rgba(255, 152, 0, 0.9);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.explanation-btn:hover:not(:disabled) {
  background: rgba(255, 152, 0, 0.2);
  border-color: rgba(255, 152, 0, 0.5);
  transform: translateY(-2px);
}

.explanation-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Next Case Prompt */
.next-case-prompt {
  padding: 16px 20px;
  animation: fadeInUp 0.3s ease;
}

.next-case-btn {
  width: 100%;
  padding: 14px 24px;
  background: rgba(33, 150, 243, 0.15);
  border: 1px solid rgba(33, 150, 243, 0.3);
  border-radius: 8px;
  color: rgba(33, 150, 243, 0.9);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.next-case-btn:hover {
  background: rgba(33, 150, 243, 0.25);
  border-color: rgba(33, 150, 243, 0.5);
  transform: translateY(-2px);
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
