import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { useImageStore } from './datasets-images';
import { useDICOMStore } from './datasets-dicom';
import { useMedRAX } from '@/src/composables/useMedRAX';
import { useGemini, type AssessmentFeedback, type MessageType } from '@/src/composables/useGemini';
import { useDatasetStore } from './datasets';
import { useCaseLibraryStore } from './case-library';
import { useAuthStore } from './auth';
import type { DiagnosticConversationState, DiagnosticStep } from '@/src/types/education';

// Conversation state for progressive learning
export interface ConversationState {
  attempts: string[];          // All observation attempts made
  hintLevel: number;           // Current hint level (0-3)
  hasShownAnswer: boolean;     // Whether full answer has been revealed
}

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  visualization?: string; // Optional visualization image from MedRAX2
  attachment?: {
    image: File;
    thumbnail: string;
    description: string;
  }; // Optional annotation attachment
  showChecklist?: boolean; // Show findings checklist
  evaluationResults?: {
    score: number;
    correct: string[];
    missed: string[];
    incorrect: string[];
    feedback: string;
  }; // Evaluation results for checklist (legacy)
  assessmentFeedback?: AssessmentFeedback; // Phase 1 assessment feedback from Gemini
  showDeepDiveOptions?: boolean; // Show deep dive options after assessment
}

export const useEducationStore = defineStore('education', () => {
  // Initialize composables
  const medRAX = useMedRAX();
  const gemini = useGemini();

  // Connection state
  const connected = computed(() => medRAX.connected.value);
  const connecting = ref(false);
  const connectionError = computed(() => medRAX.error.value);

  // Chat state
  const messages = ref<ChatMessage[]>([]);
  const isTyping = ref(false);
  const waitingForResponse = ref(false);

  // Conversation state for progressive learning (Cubey-style)
  const conversationState = ref<ConversationState>({
    attempts: [],
    hintLevel: 0,
    hasShownAnswer: false,
  });

  // Diagnostic conversation flow state
  const diagnosticState = ref<DiagnosticConversationState>({
    step: 'initial',
    score: 0,
    showingExplanation: false,
  });

  // Helper to get user's first name
  const getUserFirstName = (): string => {
    const authStore = useAuthStore();
    const displayName = authStore.userProfile?.displayName;
    if (displayName) {
      return displayName.split(' ')[0];
    }
    return 'there'; // Fallback
  };

  // Chat history for MedRAX (Gradio chat format)
  const chatHistory = ref<any[]>([]);

  // Mode selection: "Assistant Mode" or "Tutor Mode"
  const tutorMode = ref<'Assistant Mode' | 'Tutor Mode'>('Assistant Mode');

  // Annotation attachment state
  const annotationAttachment = ref<{
    image: File;
    thumbnail: string;
    description: string;
  } | null>(null);

  // Check if any image is loaded
  const hasImage = computed(() => {
    const imageStore = useImageStore();
    const dicomStore = useDICOMStore();
    const caseLibraryStore = useCaseLibraryStore();

    // Check for regular images
    const hasRegularImages = imageStore.idList.length > 0;

    // Check for DICOM volumes
    const hasDICOMImages = Object.keys(dicomStore.volumeInfo).length > 0;

    // Check for case library selection
    const hasCaseSelected = !!caseLibraryStore.currentCase;

    return hasRegularImages || hasDICOMImages || hasCaseSelected;
  });

  // Add initial welcome message
  const initializeChat = () => {
    // Reset diagnostic state when initializing
    diagnosticState.value = {
      step: 'initial',
      score: 0,
      showingExplanation: false,
    };

    if (hasImage.value) {
      // Show welcome message - the Start Practice button will appear via the UI
      const firstName = getUserFirstName();
      messages.value = [
        {
          id: '1',
          role: 'assistant',
          content: `Welcome ${firstName}! A case has been loaded. Click **Start Practice** below to begin a guided diagnostic assessment, or use the chat to ask questions about the image.`,
          timestamp: new Date(),
        }
      ];
    } else {
      messages.value = [
        {
          id: '1',
          role: 'assistant',
          content: 'Hello! I\'m your AI radiology assistant. Please upload or select a medical image from the case library to begin. I can help you understand findings and explain radiology concepts.',
          timestamp: new Date(),
        }
      ];
    }
  };

  // Get current image as File for MedRAX
  const getCurrentImageFile = async (): Promise<File | null> => {
    const caseLibraryStore = useCaseLibraryStore();
    const currentCase = caseLibraryStore.currentCase;

    console.log('[getCurrentImageFile] currentCase:', currentCase);
    if (!currentCase) {
      console.warn('[getCurrentImageFile] No current case found!');
      return null;
    }

    try {
      // Get the image path from the case
      const imagePath = Array.isArray(currentCase.files.imagePath)
        ? currentCase.files.imagePath[0]
        : currentCase.files.imagePath;

      console.log('[getCurrentImageFile] Image path:', imagePath);

      // Fetch the actual image file from the public directory
      const response = await fetch(`/${imagePath}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();
      const filename = imagePath.split('/').pop() || 'medical-image.png';

      // Create a File object from the blob
      const file = new File([blob], filename, { type: blob.type || 'image/png' });

      console.log('[getCurrentImageFile] Loaded actual image file:', {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      return file;
    } catch (error) {
      console.error('Failed to load image file:', error);
      return null;
    }
  };

  // Agentic message routing (Cubey-style progressive conversation)
  const sendMessage = async (content: string) => {
    if (!content.trim() && !annotationAttachment.value) return;

    const caseLibraryStore = useCaseLibraryStore();
    const currentCase = caseLibraryStore.currentCase;

    if (!currentCase) {
      console.warn('No case selected');
      return;
    }

    // Classify the message type
    const messageType = gemini.classifyMessage(content.trim());
    console.log(`[Education Store] Message type: ${messageType}`);

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim() || annotationAttachment.value?.description || '',
      timestamp: new Date(),
      attachment: annotationAttachment.value ? {
        ...annotationAttachment.value
      } : undefined,
    };
    messages.value.push(userMessage);

    // Set typing indicator
    waitingForResponse.value = true;
    isTyping.value = true;

    try {
      // Get image file
      let imageFile: File | null = null;
      if (annotationAttachment.value) {
        imageFile = annotationAttachment.value.image;
      } else {
        imageFile = await getCurrentImageFile();
      }

      // Clear attachment after using it
      if (annotationAttachment.value) {
        annotationAttachment.value = null;
      }

      let assistantMessage: ChatMessage;

      // Route based on message type
      switch (messageType) {
        case 'observation': {
          // Student making an observation - evaluate it
          console.log('[Education Store] Processing observation');

          // Track this attempt
          conversationState.value.attempts.push(content.trim());

          // Evaluate against groundtruth
          const feedback = await gemini.evaluateObservation(
            content.trim(),
            currentCase,
            imageFile || undefined
          );

          // If they got it mostly right (score >= 80), show full answer
          if (feedback.score >= 80) {
            conversationState.value.hasShownAnswer = true;
          }

          assistantMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: feedback.explanation,
            timestamp: new Date(),
            assessmentFeedback: feedback,
          };
          break;
        }

        case 'help_request': {
          // Student asking for help - provide progressive hints
          console.log('[Education Store] Processing help request');

          // Increment hint level (max 3)
          if (!conversationState.value.hasShownAnswer) {
            conversationState.value.hintLevel = Math.min(conversationState.value.hintLevel + 1, 3);
          }

          const hintText = await gemini.provideHint(
            conversationState.value.hintLevel,
            currentCase,
            conversationState.value.attempts,
            imageFile || undefined
          );

          // If we've given the full answer (hint level 3), mark it
          if (conversationState.value.hintLevel === 3) {
            conversationState.value.hasShownAnswer = true;
          }

          assistantMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: hintText,
            timestamp: new Date(),
          };
          break;
        }

        case 'question': {
          // Student asking a conceptual question - answer based on groundtruth
          console.log('[Education Store] Processing question');

          const answer = await gemini.answerQuestion(
            content.trim(),
            currentCase,
            imageFile || undefined
          );

          assistantMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: answer,
            timestamp: new Date(),
          };
          break;
        }

        case 'visualization': {
          // Student requesting visualization/advanced features - use MedRAX
          console.log('[Education Store] Processing visualization request with MedRAX');

          const files = imageFile ? [imageFile] : [];
          const response = await medRAX.sendMessage(
            { text: content.trim(), files },
            chatHistory.value,
            tutorMode.value
          );

          // Update chat history
          chatHistory.value = response.chatHistory || [];

          assistantMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.message,
            timestamp: new Date(),
            visualization: response.visualization || undefined,
          };
          break;
        }

        default:
          throw new Error(`Unknown message type: ${messageType}`);
      }

      messages.value.push(assistantMessage);
    } catch (error) {
      console.error('[Education Store] Error processing message:', error);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again or rephrase your message.',
        timestamp: new Date(),
      };
      messages.value.push(assistantMessage);
    } finally {
      isTyping.value = false;
      waitingForResponse.value = false;
    }
  };

  // Clear chat history
  const clearChat = () => {
    chatHistory.value = [];
    annotationAttachment.value = null;
    // Reset conversation state
    conversationState.value = {
      attempts: [],
      hintLevel: 0,
      hasShownAnswer: false,
    };
    initializeChat();
  };

  // Evaluate findings submitted from checklist
  const evaluateFindings = async (userFindings: string[]) => {
    console.log('[Education Store] Evaluating findings:', userFindings);

    // Add user message showing their selections
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: `My findings: ${userFindings.length === 1 && userFindings[0] === 'normal'
        ? 'Normal study'
        : userFindings.map(f => f.replace(/_/g, ' ')).join(', ')}`,
      timestamp: new Date(),
    };
    messages.value.push(userMessage);

    // Get groundtruth from current case
    const caseLibraryStore = useCaseLibraryStore();
    const currentCase = caseLibraryStore.currentCase;

    if (!currentCase) {
      console.warn('No current case found for evaluation');
      return;
    }

    // Extract groundtruth findings
    const groundtruth: string[] = [];
    if (!currentCase.findings || currentCase.findings.length === 0) {
      groundtruth.push('normal');
    } else {
      // Convert findings to our format
      currentCase.findings.forEach((finding: any) => {
        const name = finding.name?.toLowerCase().replace(/ /g, '_');
        if (name) groundtruth.push(name);
      });
    }

    console.log('Groundtruth findings:', groundtruth);
    console.log('User findings:', userFindings);

    // Simple evaluation logic (will be replaced with Gemini later)
    const correct = userFindings.filter(f => groundtruth.includes(f));
    const missed = groundtruth.filter(f => !userFindings.includes(f));
    const incorrect = userFindings.filter(f => !groundtruth.includes(f));

    const totalFindings = new Set([...groundtruth, ...userFindings]).size;
    const score = totalFindings > 0 ? Math.round((correct.length / totalFindings) * 100) : 0;

    // Generate feedback
    let feedback = '';
    if (score === 100) {
      feedback = 'Excellent work! You correctly identified all findings.';
    } else if (score >= 75) {
      feedback = 'Good job! You identified most of the findings correctly.';
    } else if (score >= 50) {
      feedback = 'You identified some findings correctly, but there\'s room for improvement.';
    } else {
      feedback = 'Keep practicing. Review the missed findings and try again with the next case.';
    }

    if (missed.length > 0) {
      feedback += ' Would you like me to explain the findings you missed?';
    }

    // Add evaluation response
    const evaluationMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant' as const,
      content: 'Here\'s your evaluation:',
      timestamp: new Date(),
      evaluationResults: {
        score,
        correct,
        missed,
        incorrect,
        feedback,
      },
    };
    messages.value.push(evaluationMessage);
  };

  // Set annotation attachment
  const setAnnotationAttachment = (image: File, description: string) => {
    // Create thumbnail URL for preview
    const thumbnailUrl = URL.createObjectURL(image);

    annotationAttachment.value = {
      image,
      thumbnail: thumbnailUrl,
      description,
    };
  };

  // Clear annotation attachment
  const clearAnnotationAttachment = () => {
    if (annotationAttachment.value?.thumbnail) {
      // Clean up the object URL
      URL.revokeObjectURL(annotationAttachment.value.thumbnail);
    }
    annotationAttachment.value = null;
  };

  // Connect to backend
  const connect = async () => {
    connecting.value = true;

    try {
      // Just set connected to true since we're using REST API
      console.log('Connected to MedRAX2 backend (REST API)');
    } catch (error) {
      console.error('Error connecting to MedRAX2:', error);
    } finally {
      connecting.value = false;
    }
  };

  // Disconnect from backend
  const disconnect = () => {
    // No persistent connection to close with REST API
    console.log('Disconnected from MedRAX2');
  };

  // Initialize on store creation
  initializeChat();

  // Test connection on store creation
  connect();

  // Watch for case changes and reinitialize chat
  const caseLibraryStore = useCaseLibraryStore();
  watch(
    () => caseLibraryStore.currentCase,
    (newCase, oldCase) => {
      if (newCase && newCase !== oldCase) {
        console.log('[Education Store] Case changed, reinitializing chat');
        clearChat();
      }
    }
  );

  // ============================================
  // DIAGNOSTIC CONVERSATION FLOW ACTIONS
  // ============================================

  // Start the diagnostic flow with personalized greeting
  const startDiagnosticFlow = () => {
    const firstName = getUserFirstName();
    const caseLibraryStore = useCaseLibraryStore();
    const currentCase = caseLibraryStore.currentCase;

    if (!currentCase) {
      console.warn('[Diagnostic Flow] No case selected');
      return;
    }

    // Reset diagnostic state
    diagnosticState.value = {
      step: 'normal_abnormal',
      score: 0,
      showingExplanation: false,
    };

    // Clear existing messages and add personalized greeting
    messages.value = [
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Hi ${firstName}, let's analyze this case together. Take a moment to review the image.\n\nIs this image **normal** or **abnormal**?`,
        timestamp: new Date(),
      }
    ];
  };

  // Handle user's normal/abnormal classification
  const submitNormalAbnormal = async (classification: 'normal' | 'abnormal') => {
    const caseLibraryStore = useCaseLibraryStore();
    const currentCase = caseLibraryStore.currentCase;
    const firstName = getUserFirstName();

    if (!currentCase) return;

    // Store user's classification
    diagnosticState.value.userClassification = classification;

    // Add user's response as a message
    messages.value.push({
      id: Date.now().toString(),
      role: 'user',
      content: classification === 'normal' ? 'Normal' : 'Abnormal',
      timestamp: new Date(),
    });

    // Determine if the case is actually normal or abnormal
    const isActuallyAbnormal = currentCase.findings && currentCase.findings.length > 0;
    const correctClassification = isActuallyAbnormal ? 'abnormal' : 'normal';
    const isCorrect = classification === correctClassification;

    diagnosticState.value.classificationCorrect = isCorrect;

    if (isCorrect) {
      if (classification === 'normal') {
        // Correct: identified as normal and it is normal
        diagnosticState.value.score = 100; // Full score for normal cases
        diagnosticState.value.step = 'feedback';

        messages.value.push({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Correct, ${firstName}! This is a normal study. Great job recognizing that there are no significant abnormalities.\n\n**Score: 100%**`,
          timestamp: new Date(),
        });

        diagnosticState.value.step = 'complete';
      } else {
        // Correct: identified as abnormal and it is abnormal
        diagnosticState.value.score = 30; // 30% for correct classification
        diagnosticState.value.step = 'diagnosis';

        messages.value.push({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Good eye, ${firstName}! You're correct that this image shows abnormality.\n\nNow, **what's your diagnosis?** You can also mark the finding on the image if you'd like.`,
          timestamp: new Date(),
        });
      }
    } else {
      // Incorrect classification
      diagnosticState.value.score = 0;
      diagnosticState.value.step = 'feedback';

      if (classification === 'normal' && isActuallyAbnormal) {
        // Said normal but it's abnormal
        messages.value.push({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Actually ${firstName}, this image shows abnormal findings. Don't worry - this is a learning opportunity!\n\nWould you like to see the explanation?`,
          timestamp: new Date(),
        });
      } else {
        // Said abnormal but it's normal
        messages.value.push({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Actually ${firstName}, this is a normal study. The features you may have noticed are within normal limits.\n\nWould you like to see the explanation?`,
          timestamp: new Date(),
        });
      }
    }
  };

  // Handle user's diagnosis submission
  const submitDiagnosis = async (diagnosis: string, findings?: string[], annotation?: { x: number; y: number; width: number; height: number }) => {
    const caseLibraryStore = useCaseLibraryStore();
    const currentCase = caseLibraryStore.currentCase;
    const firstName = getUserFirstName();

    if (!currentCase) return;

    // Store user's input
    diagnosticState.value.userDiagnosis = diagnosis;
    diagnosticState.value.userFindings = findings;
    if (annotation) {
      diagnosticState.value.userAnnotation = annotation;
    }

    // Add user's response as a message
    const userContent = findings && findings.length > 0
      ? `Diagnosis: ${diagnosis}\nFindings: ${findings.join(', ')}`
      : `Diagnosis: ${diagnosis}`;

    messages.value.push({
      id: Date.now().toString(),
      role: 'user',
      content: userContent,
      timestamp: new Date(),
    });

    isTyping.value = true;

    try {
      // Get the ground truth
      const groundTruthDiagnosis = currentCase.diagnosis?.toLowerCase() || '';
      const groundTruthFindings = currentCase.findings?.map(f => f.name.toLowerCase()) || [];

      // Check diagnosis (fuzzy match)
      const userDiagnosisLower = diagnosis.toLowerCase();
      const diagnosisCorrect = groundTruthDiagnosis.includes(userDiagnosisLower) ||
        userDiagnosisLower.includes(groundTruthDiagnosis) ||
        // Check if diagnosis matches any finding name
        groundTruthFindings.some(f => userDiagnosisLower.includes(f) || f.includes(userDiagnosisLower));

      diagnosticState.value.diagnosisCorrect = diagnosisCorrect;

      // Calculate findings score (partial credit)
      let findingsScore = 0;
      const userFindingsLower = (findings || []).map(f => f.toLowerCase());
      const correctFindings: string[] = [];
      const missedFindings: string[] = [];
      const incorrectFindings: string[] = [];

      if (groundTruthFindings.length > 0) {
        groundTruthFindings.forEach(gtFinding => {
          const found = userFindingsLower.some(uf =>
            gtFinding.includes(uf) || uf.includes(gtFinding)
          );
          if (found) {
            correctFindings.push(gtFinding);
          } else {
            missedFindings.push(gtFinding);
          }
        });

        userFindingsLower.forEach(uf => {
          const isCorrect = groundTruthFindings.some(gtf =>
            gtf.includes(uf) || uf.includes(gtf)
          );
          if (!isCorrect) {
            incorrectFindings.push(uf);
          }
        });

        // Partial credit: 20% weight for findings
        findingsScore = groundTruthFindings.length > 0
          ? Math.round((correctFindings.length / groundTruthFindings.length) * 20)
          : 0;
      }

      // Calculate total score
      // 30% for classification (already added)
      // 50% for diagnosis
      // 20% for findings (partial credit)
      const diagnosisScore = diagnosisCorrect ? 50 : 0;
      diagnosticState.value.score = 30 + diagnosisScore + findingsScore;

      // Store feedback details
      diagnosticState.value.feedback = {
        correct: correctFindings,
        missed: missedFindings,
        incorrect: incorrectFindings,
        explanation: currentCase.description || '',
      };

      diagnosticState.value.step = 'feedback';

      // Generate feedback message
      if (diagnosisCorrect) {
        let feedbackContent = `Excellent work, ${firstName}! Your diagnosis of **${diagnosis}** is correct.\n\n`;
        feedbackContent += `**Score: ${diagnosticState.value.score}%**\n\n`;

        if (correctFindings.length > 0) {
          feedbackContent += `✓ Correctly identified: ${correctFindings.join(', ')}\n`;
        }
        if (missedFindings.length > 0) {
          feedbackContent += `○ Also present: ${missedFindings.join(', ')}\n`;
        }

        messages.value.push({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: feedbackContent,
          timestamp: new Date(),
        });

        diagnosticState.value.step = 'complete';
      } else {
        messages.value.push({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Not quite, ${firstName}. The correct diagnosis is **${currentCase.diagnosis}**.\n\n**Score: ${diagnosticState.value.score}%**\n\nWould you like to see the detailed explanation?`,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error('[Diagnostic Flow] Error evaluating diagnosis:', error);
    } finally {
      isTyping.value = false;
    }
  };

  // Show the ground truth explanation
  const showExplanation = () => {
    const caseLibraryStore = useCaseLibraryStore();
    const currentCase = caseLibraryStore.currentCase;

    if (!currentCase) return;

    diagnosticState.value.showingExplanation = true;

    // Build explanation content
    let explanationContent = '## Explanation\n\n';

    // Diagnosis
    explanationContent += `**Diagnosis:** ${currentCase.diagnosis}\n\n`;

    // Findings
    if (currentCase.findings && currentCase.findings.length > 0) {
      explanationContent += '**Findings:**\n';
      currentCase.findings.forEach((finding: any) => {
        explanationContent += `• **${finding.name}**`;
        if (finding.location) {
          explanationContent += ` - ${finding.location}`;
        }
        if (finding.description) {
          explanationContent += `: ${finding.description}`;
        }
        explanationContent += '\n';
      });
      explanationContent += '\n';
    }

    // Description
    if (currentCase.description) {
      explanationContent += `**Case Description:**\n${currentCase.description}\n\n`;
    }

    // Teaching points
    if (currentCase.teachingPoints && currentCase.teachingPoints.length > 0) {
      explanationContent += '**Teaching Points:**\n';
      currentCase.teachingPoints.forEach((point: any) => {
        explanationContent += `• ${point.text || point}\n`;
      });
    }

    messages.value.push({
      id: Date.now().toString(),
      role: 'assistant',
      content: explanationContent,
      timestamp: new Date(),
    });

    diagnosticState.value.step = 'complete';
  };

  // Reset diagnostic flow
  const resetDiagnosticFlow = () => {
    diagnosticState.value = {
      step: 'initial',
      score: 0,
      showingExplanation: false,
    };
  };

  return {
    // State
    connected,
    connecting,
    connectionError,
    messages,
    isTyping,
    waitingForResponse,
    hasImage,
    tutorMode,
    chatHistory,
    annotationAttachment,
    conversationState,
    diagnosticState,

    // Actions
    sendMessage,
    clearChat,
    connect,
    disconnect,
    initializeChat,
    setAnnotationAttachment,
    clearAnnotationAttachment,
    evaluateFindings,

    // Diagnostic flow actions
    startDiagnosticFlow,
    submitNormalAbnormal,
    submitDiagnosis,
    showExplanation,
    resetDiagnosticFlow,

    // Token management (empty for now, can be implemented later)
    setHfToken: () => {},
    hasToken: () => false,
    clearHfToken: () => {},
  };
});