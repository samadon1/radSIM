<template>
  <div class="learning-module fill-height">
    <!-- Exit Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showExitModal" class="exit-modal-overlay" @click.self="showExitModal = false">
          <div class="exit-modal">
            <div class="exit-modal-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <h3 class="exit-modal-title">End Learning Session?</h3>
            <p class="exit-modal-text">
              You're in the middle of a practice session. Your current progress on this case will be lost.
            </p>
            <div class="exit-modal-stats" v-if="learningStore.sessionCases.length > 0">
              <div class="stat-item">
                <span class="stat-value">{{ learningStore.currentCaseIndex + 1 }}</span>
                <span class="stat-label">of {{ learningStore.sessionCases.length }} cases</span>
              </div>
            </div>
            <div class="exit-modal-actions">
              <button class="exit-modal-btn cancel" @click="showExitModal = false">
                Continue Session
              </button>
              <button class="exit-modal-btn confirm" @click="confirmExit">
                End Session
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Session Summary Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showSessionSummary" class="session-summary-overlay">
          <SessionSummary
            :stats="sessionStats"
            @return-dashboard="handleReturnDashboard"
            @review-mistakes="handleReviewMistakes"
          />
        </div>
      </Transition>
    </Teleport>

    <div class="learning-container">
      <!-- No Active Session - Show Prompt -->
      <div v-if="!learningStore.isSessionActive" class="empty-state">
        <v-icon size="64" color="grey-darken-1">mdi-school-outline</v-icon>
        <h3>No Active Practice Session</h3>
        <p>Start a practice session from the Cases tab to begin learning</p>
        <v-btn
          color="primary"
          variant="outlined"
          @click="goToCases"
        >
          <v-icon class="mr-2">mdi-folder-open</v-icon>
          Browse Cases
        </v-btn>
      </div>

      <!-- Active Practice Session -->
      <div v-else class="learning-content">
        <!-- Clinical History Section -->
        <div class="clinical-history-section">
          <div class="section-header">
            <h3 class="section-title">Clinical History</h3>
            <v-btn
              icon
              variant="text"
              size="x-small"
              @click="restartCase"
            >
              <v-icon size="18">mdi-restart</v-icon>
            </v-btn>
          </div>

          <div v-if="currentCase" class="clinical-text">
            Age {{ currentCase.demographics?.age }} {{ currentCase.demographics?.sex === 'M' ? 'Male' : 'Female' }}.
            {{ currentCase.clinicalHistory || 'No clinical history provided.' }}
          </div>
        </div>

        <!-- Chat Conversation Area -->
        <div class="chat-section">
          <div class="chat-messages" ref="chatMessagesRef">
            <!-- Chat messages -->
            <div
              v-for="(message, index) in chatMessages"
              :key="index"
              class="message-wrapper"
            >
              <div
                class="chat-message"
                :class="message.type"
              >
                <!-- Show thumbnail if message has attachment -->
                <div v-if="message.attachment" class="message-attachment">
                  <img :src="message.attachment.thumbnail" alt="Annotated image" class="message-thumbnail" />
                </div>
                <div class="message-content" v-html="message.content"></div>
              </div>
            </div>

            <!-- Thinking indicator -->
            <div v-if="isThinking" class="thinking-indicator">
              RADSIM AI thinking...
            </div>

            <!-- Diagnostic Flow: Normal/Abnormal Buttons -->
            <div v-if="diagnosticStep === 'normal_abnormal'" class="diagnostic-buttons">
              <button
                class="diagnostic-btn normal"
                @click="handleNormalAbnormal('normal')"
                :disabled="isThinking"
              >
                Normal
              </button>
              <button
                class="diagnostic-btn abnormal"
                @click="handleNormalAbnormal('abnormal')"
                :disabled="isThinking"
              >
                Abnormal
              </button>
            </div>

            <!-- Diagnostic Flow: See Explanation Button (for incorrect classification) -->
            <div v-if="diagnosticStep === 'feedback' && classificationCorrect === false && !showChatSuggestions" class="explanation-prompt">
              <button
                class="explanation-btn"
                @click="handleShowExplanation"
                :disabled="isThinking"
              >
                See Explanation
              </button>
            </div>

            <!-- Learning Actions (after diagnosis feedback) -->
            <div v-if="showChatSuggestions" class="learning-actions">
              <div class="actions-header">Continue Learning</div>
              <div class="action-buttons">
                <button
                  class="action-btn"
                  @click="handleMarkOnImage"
                  :disabled="isThinking || groundTruthShown"
                >
                  Show Ground Truth
                </button>
                <button
                  class="action-btn"
                  @click="handleExpertExplanation"
                  :disabled="isThinking"
                >
                  Expert Analysis
                </button>
                <button
                  class="action-btn"
                  @click="handleGenerateReport"
                  :disabled="isThinking"
                >
                  View Report
                </button>
              </div>
            </div>

            <!-- Diagnostic Flow: Next Case Button -->
            <div v-if="diagnosticStep === 'complete' || (showChatSuggestions && diagnosticStep === 'feedback')" class="next-case-prompt">
              <button
                class="next-case-btn"
                @click="handleNextCase"
              >
                Next Case
              </button>
            </div>
          </div>

          <!-- Message Input Section -->
          <div class="message-input-wrapper">
            <!-- Annotation Preview (when attached from view) -->
            <div v-if="annotationAttachment" class="annotation-preview-inline">
              <img :src="annotationAttachment.thumbnail" alt="Annotated image" class="preview-thumbnail" />
              <div class="preview-info">
                <span class="preview-text">{{ annotationAttachment.description }}</span>
              </div>
              <v-btn
                icon
                size="x-small"
                variant="text"
                @click="learningStore.clearAnnotationAttachment()"
                class="preview-remove-btn"
              >
                <v-icon size="small">mdi-close</v-icon>
              </v-btn>
            </div>

            <!-- Message Input -->
            <div class="message-input-section">
              <input
                v-model="userMessage"
                type="text"
                :placeholder="diagnosticStep === 'diagnosis' ? 'Enter your diagnosis...' : 'Ask a question about the case...'"
                class="message-input"
                :disabled="isEvaluating || diagnosticStep === 'normal_abnormal'"
                @keypress.enter="sendMessage"
              />
              <v-btn
                icon
                variant="text"
                :disabled="(!userMessage.trim() && !annotationAttachment) || isEvaluating"
                @click="sendMessage"
                class="send-btn"
              >
                <v-icon>mdi-send</v-icon>
              </v-btn>
            </div>
          </div>

          <!-- Case ID at bottom -->
          <div class="case-id-footer">
            <span>Unique ID: {{ currentCase?.id }}</span>
            <v-btn
              icon
              variant="text"
              size="small"
              class="scroll-btn"
              @click="scrollToTop"
            >
              <v-icon>mdi-arrow-up</v-icon>
            </v-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useLearningStore } from '@/src/store/learning';
import { useCaseLibraryStore } from '@/src/store/case-library';
import { useAuthStore } from '@/src/store/auth';
import { useDatasetStore } from '@/src/store/datasets';
import { loadUrls } from '@/src/actions/loadUserFiles';
import { useGemini } from '@/src/composables/useGemini';
import SessionSummary from '@/src/components/learning/SessionSummary.vue';

const router = useRouter();
const learningStore = useLearningStore();
const caseLibraryStore = useCaseLibraryStore();
const authStore = useAuthStore();
const datasetStore = useDatasetStore();
const { evaluateObservation, answerQuestion, isLoading: isGeminiLoading } = useGemini();

// Exit confirmation modal - sync with store state so it can be triggered from anywhere
const showExitModal = computed({
  get: () => learningStore.showExitConfirmation,
  set: (value) => {
    if (value) {
      learningStore.requestExitConfirmation();
    } else {
      learningStore.cancelExitConfirmation();
    }
  }
});

function confirmExit() {
  learningStore.cancelExitConfirmation();
  learningStore.endSession();
  caseLibraryStore.clearCurrentCase();
  // Redirect to dashboard after ending session
  router.push('/dashboard');
}

// Get user's first name for personalization
const getUserFirstName = (): string => {
  const displayName = authStore.userProfile?.displayName;
  if (displayName) {
    return displayName.split(' ')[0];
  }
  return 'there';
};

// Inject the function to switch tabs
const switchToTab = inject<(tabIndex: number) => void>('switchToTab');

// Chat state
interface ChatMessage {
  type: 'cubey' | 'user' | 'report' | 'feedback';
  content: string;
  attachment?: {
    thumbnail: string;
    description: string;
  };
}

const chatMessages = ref<ChatMessage[]>([]);
const userMessage = ref('');
const isThinking = ref(false);
const isEvaluating = ref(false);
const chatMessagesRef = ref<HTMLElement | null>(null);

// Learning flow state
const hasSubmittedObservation = ref(false);
const isAwaitingObservation = ref(false);

// Diagnostic flow state
type DiagnosticStep = 'initial' | 'normal_abnormal' | 'diagnosis' | 'feedback' | 'complete';
const diagnosticStep = ref<DiagnosticStep>('initial');
const diagnosticScore = ref(0);
const userClassification = ref<'normal' | 'abnormal' | null>(null);
const classificationCorrect = ref<boolean | null>(null);
const diagnosisCorrect = ref<boolean | null>(null);
const showChatSuggestions = ref(false);
const groundTruthShown = ref(false);

// Session summary state
const showSessionSummary = ref(false);
const sessionStats = computed(() => learningStore.sessionStats);

// Get annotation attachment from learning store
const annotationAttachment = computed(() => learningStore.annotationAttachment);

// Current case from learning store
const currentCase = computed(() => learningStore.currentCase);

// Watch for case changes to initialize chat - only on INITIAL mount
// handleNextCase will manually call initializeChat after loading new image
const hasInitializedFirstCase = ref(false);
watch(currentCase, (newCase) => {
  if (newCase && !hasInitializedFirstCase.value) {
    hasInitializedFirstCase.value = true;
    initializeChat();
  }
}, { immediate: true });

// Actions
function goToCases() {
  // Exit the learning session to return to dashboard
  learningStore.endSession();
  caseLibraryStore.clearCurrentCase();
}

function initializeChat() {
  chatMessages.value = [];

  // Reset state
  hasSubmittedObservation.value = false;
  isAwaitingObservation.value = false;
  learningStore.clearAnnotationAttachment();
  learningStore.clearGroundTruthAnnotations();

  // Start timing this case
  learningStore.startCase();

  // Reset diagnostic flow state
  diagnosticStep.value = 'normal_abnormal';
  diagnosticScore.value = 0;
  userClassification.value = null;
  classificationCorrect.value = null;
  diagnosisCorrect.value = null;
  showChatSuggestions.value = false;
  groundTruthShown.value = false;

  // Start with personalized greeting and normal/abnormal question
  const firstName = getUserFirstName();
  setTimeout(() => {
    chatMessages.value.push({
      type: 'cubey',
      content: `Hi ${firstName}, let's analyze this case together. Take a moment to review the image.\n\nIs this image <strong>normal</strong> or <strong>abnormal</strong>?`
    });
    nextTick(() => scrollToBottom());
  }, 500);
}

async function sendMessage() {
  // Require either text message or annotation attachment
  if (!userMessage.value.trim() && !annotationAttachment.value) return;
  if (!currentCase.value) return;

  // Build user message content
  let userContent = userMessage.value.trim();

  // Add annotation description if present
  if (annotationAttachment.value) {
    if (userContent) {
      userContent += `<br><br><em>${annotationAttachment.value.description}</em>`;
    } else {
      userContent = annotationAttachment.value.description;
    }
  }

  const userMsg: ChatMessage = {
    type: 'user',
    content: userContent
  };

  // Add thumbnail if annotations were attached
  // Create a new persistent blob URL from the image file so it persists after clearing the store
  let persistentThumbnail: string | undefined;
  if (annotationAttachment.value) {
    persistentThumbnail = URL.createObjectURL(annotationAttachment.value.image);
    userMsg.attachment = {
      thumbnail: persistentThumbnail,
      description: annotationAttachment.value.description
    };
  }

  chatMessages.value.push(userMsg);

  const messageText = userMessage.value;
  const imageFile = annotationAttachment.value?.image;

  // Clear inputs
  userMessage.value = '';
  learningStore.clearAnnotationAttachment();

  nextTick(() => scrollToBottom());

  // Determine if this is diagnosis submission (diagnostic flow) or follow-up
  if (diagnosticStep.value === 'diagnosis' && isAwaitingObservation.value) {
    // Evaluate diagnosis submission
    isEvaluating.value = true;
    isThinking.value = true;
    hasSubmittedObservation.value = true;
    isAwaitingObservation.value = false;

    try {
      const firstName = getUserFirstName();

      // Get ground truth
      const groundTruthDiagnosis = currentCase.value.diagnosis?.toLowerCase() || '';
      const groundTruthFindings = currentCase.value.findings?.map((f: any) => f.name.toLowerCase()) || [];

      // Check diagnosis (fuzzy match)
      const userDiagnosisLower = messageText.toLowerCase();
      const isDiagnosisCorrect = groundTruthDiagnosis.includes(userDiagnosisLower) ||
        userDiagnosisLower.includes(groundTruthDiagnosis) ||
        groundTruthFindings.some((f: string) => userDiagnosisLower.includes(f) || f.includes(userDiagnosisLower));

      diagnosisCorrect.value = isDiagnosisCorrect;
      isThinking.value = false;

      // Calculate score: 30% for classification + 50% for diagnosis
      const newScore = isDiagnosisCorrect ? 80 : 30; // 30 (classification) + 50 (diagnosis) or just 30
      diagnosticScore.value = newScore;
      diagnosticStep.value = 'feedback';

      // Generate feedback message
      if (isDiagnosisCorrect) {
        chatMessages.value.push({
          type: 'cubey',
          content: `Excellent work, ${firstName}! Your diagnosis of <strong>${messageText}</strong> is correct.\n\n<strong>Score: ${newScore}%</strong>`
        });
        // Show suggestions even for correct answers (they can learn more)
        showChatSuggestions.value = true;
        diagnosticStep.value = 'complete';
      } else {
        chatMessages.value.push({
          type: 'cubey',
          content: `Not quite, ${firstName}. The correct diagnosis is <strong>${currentCase.value.diagnosis}</strong>.\n\n<strong>Score: ${newScore}%</strong>\n\nWould you like to learn more about this case?`
        });
        // Show chat suggestions for incorrect/partial answers
        showChatSuggestions.value = true;
      }

      // Update learning store
      learningStore.submitResponse({
        findings: [],
        diagnosis: messageText,
        confidence: 3,
        annotations: []
      });

      nextTick(() => scrollToBottom());
    } catch (error) {
      isThinking.value = false;
      isEvaluating.value = false;
      console.error('Error evaluating diagnosis:', error);

      chatMessages.value.push({
        type: 'cubey',
        content: "I'm having trouble evaluating your diagnosis right now. Please try again."
      });

      nextTick(() => scrollToBottom());
    } finally {
      isEvaluating.value = false;
    }
  } else if (isAwaitingObservation.value && !hasSubmittedObservation.value) {
    // Phase 3: AI Evaluation of initial observation (legacy flow)
    isEvaluating.value = true;
    isThinking.value = true;
    hasSubmittedObservation.value = true;
    isAwaitingObservation.value = false;

    try {
      // Call Gemini to evaluate observation (with optional annotated image)
      const feedback = await evaluateObservation(messageText, currentCase.value, imageFile);

      isThinking.value = false;

      // Display feedback (Phase 3)
      let feedbackHTML = `<strong>Great effort! Here's your evaluation:</strong><br><br>`;
      feedbackHTML += `<strong>Score: ${feedback.score} ${getScoreLabel(feedback.score)}</strong><br><br>`;

      feedbackHTML += `<strong>Evaluation:</strong><br>${feedback.explanation}<br><br>`;

      if (feedback.correct.length > 0) {
        feedbackHTML += `<strong>✓ Correctly Identified:</strong><br>${feedback.correct.join(', ')}<br><br>`;
      }

      if (feedback.missed.length > 0) {
        feedbackHTML += `<strong>✗ Missed Findings:</strong><br>${feedback.missed.join(', ')}<br><br>`;
      }

      if (feedback.incorrect.length > 0) {
        feedbackHTML += `<strong>⚠ Incorrect:</strong><br>${feedback.incorrect.join(', ')}<br><br>`;
      }

      // Phase 4: Deep Dive - Teaching Points
      if (feedback.teachingPoints.length > 0) {
        feedbackHTML += `<strong>📚 Teaching Points:</strong><br>`;
        feedback.teachingPoints.forEach((point, idx) => {
          feedbackHTML += `${idx + 1}. ${point}<br>`;
        });
        feedbackHTML += `<br>`;
      }

      feedbackHTML += `Feel free to ask me any questions about this case!`;

      chatMessages.value.push({
        type: 'feedback',
        content: feedbackHTML
      });

      // Update learning store with the response
      learningStore.submitResponse({
        findings: [], // No structured findings in conversation mode
        diagnosis: '',
        confidence: 3, // Default confidence
        annotations: []
      });

      nextTick(() => scrollToBottom());
    } catch (error) {
      isThinking.value = false;
      isEvaluating.value = false;
      console.error('Error evaluating observation:', error);

      chatMessages.value.push({
        type: 'cubey',
        content: "I'm having trouble evaluating your observations right now. Please try again or ask me a question about the case."
      });

      nextTick(() => scrollToBottom());
    } finally {
      isEvaluating.value = false;
    }
  } else {
    // Follow-up question or general conversation
    isThinking.value = true;

    try {
      // Use Gemini to answer the question (with optional image)
      const response = await answerQuestion(messageText, currentCase.value, imageFile);

      isThinking.value = false;

      chatMessages.value.push({
        type: 'cubey',
        content: response
      });

      nextTick(() => scrollToBottom());
    } catch (error) {
      isThinking.value = false;
      console.error('Error getting AI response:', error);

      chatMessages.value.push({
        type: 'cubey',
        content: "I'm having trouble responding right now. Please try rephrasing your question."
      });

      nextTick(() => scrollToBottom());
    }
  }
}

function getScoreLabel(score: number): string {
  if (score >= 90) return '(Excellent)';
  if (score >= 75) return '(Good)';
  if (score >= 60) return '(Fair)';
  return '(Needs Improvement)';
}

// Diagnostic Flow Handlers
function handleNormalAbnormal(classification: 'normal' | 'abnormal') {
  if (!currentCase.value) return;

  const firstName = getUserFirstName();
  userClassification.value = classification;

  // Add user's response as a message
  chatMessages.value.push({
    type: 'user',
    content: classification === 'normal' ? 'Normal' : 'Abnormal'
  });

  // Check if correct
  const isActuallyAbnormal = currentCase.value.findings && currentCase.value.findings.length > 0;
  const correctClassification = isActuallyAbnormal ? 'abnormal' : 'normal';
  const isCorrect = classification === correctClassification;
  classificationCorrect.value = isCorrect;

  if (isCorrect) {
    if (classification === 'normal') {
      // Correct: identified as normal and it is normal
      diagnosticScore.value = 100;
      diagnosticStep.value = 'complete';

      chatMessages.value.push({
        type: 'cubey',
        content: `Correct, ${firstName}! This is a normal study. Great job recognizing that there are no significant abnormalities.\n\n<strong>Score: 100%</strong>`
      });
    } else {
      // Correct: identified as abnormal and it is abnormal
      diagnosticScore.value = 30;
      diagnosticStep.value = 'diagnosis';

      chatMessages.value.push({
        type: 'cubey',
        content: `Good eye, ${firstName}! You're correct that this image shows abnormality.\n\nNow, <strong>what's your diagnosis?</strong> You can also mark the finding on the image if you'd like.`
      });

      // Enable free-form input for diagnosis
      isAwaitingObservation.value = true;
    }
  } else {
    // Incorrect classification
    diagnosticScore.value = 0;
    diagnosticStep.value = 'feedback';

    if (classification === 'normal' && isActuallyAbnormal) {
      chatMessages.value.push({
        type: 'cubey',
        content: `Actually ${firstName}, this image shows abnormal findings. Don't worry - this is a learning opportunity!`
      });
    } else {
      chatMessages.value.push({
        type: 'cubey',
        content: `Actually ${firstName}, this is a normal study. The features you may have noticed are within normal limits.`
      });
    }
  }

  nextTick(() => scrollToBottom());
}

function handleShowExplanation() {
  if (!currentCase.value) return;

  let explanationHTML = '<strong>Explanation</strong><br><br>';

  // Diagnosis
  explanationHTML += `<strong>Diagnosis:</strong> ${currentCase.value.diagnosis}<br><br>`;

  // Findings
  if (currentCase.value.findings && currentCase.value.findings.length > 0) {
    explanationHTML += '<strong>Findings:</strong><br>';
    currentCase.value.findings.forEach((finding: any) => {
      explanationHTML += `• <strong>${finding.name}</strong>`;
      if (finding.location) {
        explanationHTML += ` - ${finding.location}`;
      }
      if (finding.description) {
        explanationHTML += `: ${finding.description}`;
      }
      explanationHTML += '<br>';
    });
    explanationHTML += '<br>';
  }

  // Description
  if (currentCase.value.description) {
    explanationHTML += `<strong>Case Description:</strong><br>${currentCase.value.description}<br><br>`;
  }

  // Teaching points
  if (currentCase.value.teachingPoints && currentCase.value.teachingPoints.length > 0) {
    explanationHTML += '<strong>Teaching Points:</strong><br>';
    currentCase.value.teachingPoints.forEach((point: any) => {
      explanationHTML += `• ${point.text || point}<br>`;
    });
  }

  chatMessages.value.push({
    type: 'cubey',
    content: explanationHTML
  });

  diagnosticStep.value = 'complete';
  nextTick(() => scrollToBottom());
}

// Ground Truth Handler - just show overlay on image, no chat bubble
function handleMarkOnImage() {
  if (!currentCase.value || groundTruthShown.value) return;

  groundTruthShown.value = true;

  // Get all findings
  const findings = currentCase.value.findings || [];

  if (findings.length === 0) {
    chatMessages.value.push({
      type: 'cubey',
      content: 'No ROI annotations available for this case.'
    });
    nextTick(() => scrollToBottom());
    return;
  }

  // Show annotations on viewer if ROI data available
  const findingsWithROI = findings.filter((f: any) => f.roi);
  if (findingsWithROI.length > 0) {
    learningStore.showGroundTruthAnnotations(findingsWithROI);

    // Simple confirmation message
    chatMessages.value.push({
      type: 'cubey',
      content: 'Ground truth markers shown on image.'
    });
  } else {
    chatMessages.value.push({
      type: 'cubey',
      content: 'No ROI annotations available for this case.'
    });
  }

  nextTick(() => scrollToBottom());
}

async function handleExpertExplanation() {
  if (!currentCase.value) return;

  isThinking.value = true;

  // Add user's selection as a message
  chatMessages.value.push({
    type: 'user',
    content: 'Expert Explanation'
  });

  try {
    // Use Gemini to generate expert explanation
    const prompt = `As a senior radiologist, provide a detailed expert explanation for this case.

Case: ${currentCase.value.title || currentCase.value.diagnosis}
Clinical History: ${currentCase.value.clinicalHistory || 'Not provided'}
Diagnosis: ${currentCase.value.diagnosis}
Findings: ${currentCase.value.findings?.map((f: any) => `${f.name}${f.location ? ' in ' + f.location : ''}`).join(', ')}

Please explain:
1. Key imaging findings and their significance
2. Pathophysiology behind the findings
3. Differential diagnoses to consider
4. Clinical implications and management considerations`;

    const response = await answerQuestion(prompt, currentCase.value);

    isThinking.value = false;

    chatMessages.value.push({
      type: 'cubey',
      content: `<strong>Expert Analysis:</strong><br><br>${response}`
    });
  } catch (error) {
    isThinking.value = false;
    console.error('Error generating expert explanation:', error);

    // Fallback to case-based explanation
    let explanationHTML = '<strong>Expert Analysis:</strong><br><br>';

    explanationHTML += `<strong>Diagnosis:</strong> ${currentCase.value.diagnosis}<br><br>`;

    if (currentCase.value.findings && currentCase.value.findings.length > 0) {
      explanationHTML += '<strong>Key Findings:</strong><br>';
      currentCase.value.findings.forEach((finding: any) => {
        explanationHTML += `• <strong>${finding.name}</strong>`;
        if (finding.location) explanationHTML += ` in ${finding.location}`;
        if (finding.description) explanationHTML += `: ${finding.description}`;
        explanationHTML += '<br>';
      });
      explanationHTML += '<br>';
    }

    if (currentCase.value.teachingPoints && currentCase.value.teachingPoints.length > 0) {
      explanationHTML += '<strong>Teaching Points:</strong><br>';
      currentCase.value.teachingPoints.forEach((point: any) => {
        explanationHTML += `• ${point.text || point}<br>`;
      });
    }

    if (currentCase.value.description) {
      explanationHTML += `<br><strong>Additional Context:</strong><br>${currentCase.value.description}`;
    }

    chatMessages.value.push({
      type: 'cubey',
      content: explanationHTML
    });
  }

  nextTick(() => scrollToBottom());
}

function handleGenerateReport() {
  if (!currentCase.value) return;

  // Add user's selection as a message
  chatMessages.value.push({
    type: 'user',
    content: 'Generate Report'
  });

  // Generate structured radiology report
  const caseData = currentCase.value;

  let reportHTML = '<strong>RADIOLOGY REPORT</strong><br><br>';

  // Patient Info
  reportHTML += '<strong>PATIENT INFORMATION</strong><br>';
  if (caseData.demographics) {
    reportHTML += `Age: ${caseData.demographics.age || 'Unknown'}<br>`;
    reportHTML += `Sex: ${caseData.demographics.sex === 'M' ? 'Male' : caseData.demographics.sex === 'F' ? 'Female' : 'Unknown'}<br>`;
  }
  reportHTML += '<br>';

  // Clinical History
  reportHTML += '<strong>CLINICAL HISTORY</strong><br>';
  reportHTML += `${caseData.clinicalHistory || 'Not provided'}<br><br>`;

  // Technique
  reportHTML += '<strong>TECHNIQUE</strong><br>';
  reportHTML += `${caseData.modality || 'Standard'} imaging of the ${caseData.anatomicalRegion || 'region of interest'}.`;
  if (caseData.viewPosition) {
    reportHTML += ` ${caseData.viewPosition} view obtained.`;
  }
  reportHTML += '<br><br>';

  // Findings
  reportHTML += '<strong>FINDINGS</strong><br>';
  if (caseData.findings && caseData.findings.length > 0) {
    caseData.findings.forEach((finding: any) => {
      reportHTML += `• ${finding.name}`;
      if (finding.severity) reportHTML += ` (${finding.severity})`;
      if (finding.location) reportHTML += ` in the ${finding.location}`;
      if (finding.description) reportHTML += `. ${finding.description}`;
      reportHTML += '.<br>';
    });
  } else {
    reportHTML += 'No significant abnormality identified.<br>';
  }
  reportHTML += '<br>';

  // Impression
  reportHTML += '<strong>IMPRESSION</strong><br>';
  reportHTML += `${caseData.diagnosis || 'No significant abnormality'}<br><br>`;

  // Recommendations (if applicable)
  if (caseData.differential && caseData.differential.length > 0) {
    reportHTML += '<strong>DIFFERENTIAL CONSIDERATIONS</strong><br>';
    caseData.differential.forEach((dx: string) => {
      reportHTML += `• ${dx}<br>`;
    });
  }

  chatMessages.value.push({
    type: 'report',
    content: reportHTML
  });

  nextTick(() => scrollToBottom());
}

function scrollToBottom() {
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight;
  }
}

function scrollToTop() {
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = 0;
  }
}

function exitSession() {
  learningStore.endSession();
  caseLibraryStore.clearCurrentCase();
  chatMessages.value = [];
}

function handleReturnDashboard() {
  showSessionSummary.value = false;
  learningStore.endSession();
  caseLibraryStore.clearCurrentCase();
  chatMessages.value = [];
  router.push('/dashboard');
}

function handleReviewMistakes() {
  // For now, just close summary and go to dashboard
  // In the future, this could show a detailed breakdown of mistakes
  showSessionSummary.value = false;
  learningStore.endSession();
  caseLibraryStore.clearCurrentCase();
  chatMessages.value = [];
  router.push('/dashboard');
}

async function handleNextCase() {
  // Move to next case in the session
  learningStore.nextCase();

  // Wait for Vue reactivity to update
  await nextTick();

  // Load the new case image
  const newCase = learningStore.currentCase;
  console.log('[handleNextCase] New case:', newCase?.id);

  if (newCase) {
    caseLibraryStore.selectCaseByMetadata(newCase);

    // Clear the current primary selection so the new image becomes primary
    datasetStore.setPrimarySelection(null);

    // Load the actual image files into the viewer
    const imagePaths = Array.isArray(newCase.files.imagePath)
      ? newCase.files.imagePath
      : [newCase.files.imagePath];

    console.log('[handleNextCase] Loading image paths:', imagePaths);

    try {
      await loadUrls({ urls: imagePaths });
      console.log('[handleNextCase] Image loaded successfully');
    } catch (error) {
      console.error('[handleNextCase] Failed to load image:', error);
    }

    // Initialize chat for the new case
    initializeChat();
  } else {
    // Session complete - no more cases
    console.log('[handleNextCase] Session complete, showing summary');
    showSessionSummary.value = true;
  }
}

function restartCase() {
  // Restart the current case (reload image and reset chat)
  if (currentCase.value) {
    const imagePaths = Array.isArray(currentCase.value.files.imagePath)
      ? currentCase.value.files.imagePath
      : [currentCase.value.files.imagePath];
    loadUrls({ urls: imagePaths });
    // Manually call initializeChat since the case reference doesn't change
    initializeChat();
  }
}

function getRadiologistReport(): string {
  if (!currentCase.value) return '';

  // Check if we have findings
  if (!currentCase.value.findings || currentCase.value.findings.length === 0) {
    // Return empty string if no findings - Cubey will handle the conversation
    return '';
  }

  // Generate report from findings
  const findingsText = currentCase.value.findings.map(f => {
    let desc = f.name.toLowerCase();
    if (f.location) desc += ` in ${f.location}`;
    if (f.severity) desc += ` (${f.severity})`;
    return desc;
  }).join(', ');

  // Get diagnosis
  const diagnosis = currentCase.value.diagnosis || '';

  // Create report text - start with findings
  let report = `There is ${findingsText}. `;

  // Add no finding cases
  const noFindingsList = ['No collapse', 'consolidation', 'effusion', 'or bone lesions'];
  report += noFindingsList.join(', ') + '. ';

  // Add clinical correlation
  if (diagnosis) {
    report += diagnosis + '. ';
  }

  // Add management if available
  if (currentCase.value.clinicalHistory?.includes('AE') || currentCase.value.clinicalHistory?.includes('emergency')) {
    report += 'Management: Inform AE of these findings and respiratory referral.';
  }

  return report;
}
</script>

<style scoped>
/* Main Container */
.learning-module {
  display: flex;
  flex-direction: column;
  background: #0a0a0a;
  overflow: hidden;
}

.learning-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-state h3 {
  margin-top: 20px;
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.empty-state p {
  margin-bottom: 24px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  max-width: 300px;
}

/* Learning Content */
.learning-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
}

/* Clinical History Section */
.clinical-history-section {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 18px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.clinical-text {
  font-size: 15px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
}

/* Chat Section */
.chat-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-wrapper {
  display: flex;
  flex-direction: column;
}

.chat-message {
  padding: 18px 22px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.55;
  max-width: 100%;
  word-wrap: break-word;
}

.chat-message.cubey {
  background: rgba(55, 75, 125, 0.35);
  border: 1px solid rgba(70, 90, 140, 0.25);
  color: rgba(255, 255, 255, 0.92);
  align-self: stretch;
}

.chat-message.user {
  background: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: rgba(255, 255, 255, 0.9);
  align-self: flex-end;
  max-width: 85%;
}

.chat-message.report {
  background: rgba(60, 80, 130, 0.38);
  border: 1px solid rgba(75, 95, 145, 0.28);
  color: rgba(255, 255, 255, 0.93);
  align-self: stretch;
}

.chat-message.feedback {
  background: rgba(65, 85, 135, 0.4);
  border: 1px solid rgba(80, 100, 150, 0.3);
  color: rgba(255, 255, 255, 0.93);
  align-self: stretch;
}

.message-content {
  margin: 0;
}

/* Finding Checklist */
.thinking-indicator {
  font-size: 13px;
  font-style: italic;
  color: rgba(255, 255, 255, 0.5);
  padding: 8px 16px;
  align-self: flex-start;
}

/* Message Input Wrapper */
.message-input-wrapper {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

/* Annotation Preview Inline */
.annotation-preview-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
}

.preview-thumbnail {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.preview-info {
  flex: 1;
  min-width: 0;
}

.preview-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-remove-btn {
  flex-shrink: 0;
}

/* Message Input Section */
.message-input-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
}

.message-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 12px 16px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  outline: none;
  transition: all 0.2s;
}

.message-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.message-input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(66, 99, 235, 0.5);
}

.message-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn {
  flex-shrink: 0;
}

/* Case ID Footer */
.case-id-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.scroll-btn {
  background: rgba(255, 255, 255, 0.1);
  opacity: 0.6;
}

.scroll-btn:hover {
  opacity: 1;
}

/* Scrollbar Styling */
.chat-messages::-webkit-scrollbar {
  width: 8px;
}

.chat-messages::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* Message Attachment */
.message-attachment {
  margin-bottom: 8px;
}

.message-thumbnail {
  max-width: 150px;
  max-height: 150px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.user .message-thumbnail {
  border-color: rgba(66, 99, 235, 0.3);
}

/* Diagnostic Flow Styles */
.diagnostic-buttons {
  display: flex;
  gap: 12px;
  padding: 16px;
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

/* Explanation Prompt */
.explanation-prompt {
  padding: 16px;
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
  padding: 16px;
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

/* Learning Actions */
.learning-actions {
  padding: 16px;
  animation: fadeInUp 0.3s ease;
}

.actions-header {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.95);
}

.action-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

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

/* Exit Confirmation Modal */
.exit-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

/* Session Summary Overlay */
.session-summary-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  overflow-y: auto;
}

.exit-modal {
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 32px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.exit-modal-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 20px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.exit-modal-icon svg {
  width: 28px;
  height: 28px;
  color: #ef4444;
}

.exit-modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 12px;
  letter-spacing: -0.02em;
}

.exit-modal-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 20px;
  line-height: 1.5;
}

.exit-modal-stats {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 24px;
}

.stat-item {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
}

.stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

.exit-modal-actions {
  display: flex;
  gap: 12px;
}

.exit-modal-btn {
  flex: 1;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.exit-modal-btn.cancel {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.exit-modal-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.25);
}

.exit-modal-btn.confirm {
  background: #ef4444;
  border: 1px solid #ef4444;
  color: #ffffff;
}

.exit-modal-btn.confirm:hover {
  background: #dc2626;
  border-color: #dc2626;
}

/* Modal Transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-active .exit-modal,
.modal-fade-leave-active .exit-modal {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .exit-modal,
.modal-fade-leave-to .exit-modal {
  transform: scale(0.95);
  opacity: 0;
}
</style>
