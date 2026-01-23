/**
 * RADSIM Socratic Tutor Store
 * Manages WebSocket connection to MedRAX2 AI tutor for educational guidance
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useEducationStore } from './education';
import type { TutorMessage } from '@/src/types/education';

// Student action types for tracking
export interface StudentAction {
  type: 'tool_activated' | 'measurement' | 'annotation' | 'navigation' | 'view_change';
  tool?: string;
  details?: {
    coordinates?: number[];
    value?: any;
    slice?: number;
    viewType?: string;
  };
  timestamp: number;
}

// Tutor response types
export interface TutorResponse {
  type: 'question' | 'hint' | 'feedback' | 'instruction' | 'validation';
  content: string;
  visualCue?: {
    type: 'highlight' | 'arrow' | 'pulse' | 'box';
    coordinates?: number[][];
    duration?: number;
    color?: string;
  };
  options?: string[]; // For multiple choice questions
  expectedAnswer?: string;
  emotion?: 'encouraging' | 'neutral' | 'corrective';
}

export const useSocraticTutorStore = defineStore('socraticTutor', () => {
  // ===== STATE =====

  // Connection management
  const socket = ref<Socket | null>(null);
  const connected = ref(false);
  const connecting = ref(false);
  const connectionError = ref<string | null>(null);

  // Conversation state
  const conversation = ref<TutorMessage[]>([]);
  const currentQuestion = ref<string | null>(null);
  const waitingForResponse = ref(false);
  const typingIndicator = ref(false);

  // Visual feedback state
  const activeVisualCue = ref<TutorResponse['visualCue'] | null>(null);
  const highlightedRegions = ref<number[][]>([]);

  // Session tracking
  const sessionId = ref<string | null>(null);
  const actionHistory = ref<StudentAction[]>([]);

  // Configuration
  const tutorUrl = ref(import.meta.env.VITE_MEDRAX2_URL || 'ws://localhost:7860');
  const reconnectAttempts = ref(0);
  const maxReconnectAttempts = 5;

  // ===== GETTERS =====

  // Check if tutor is available based on mode
  const isTutorAvailable = computed(() => {
    const educationStore = useEducationStore();
    return educationStore.modeConfig.tutorActive && connected.value;
  });

  // Get last tutor message
  const lastTutorMessage = computed(() => {
    const tutorMessages = conversation.value.filter(m => m.role === 'tutor');
    return tutorMessages.length > 0 ? tutorMessages[tutorMessages.length - 1] : null;
  });

  // Check if waiting for student answer
  const isWaitingForAnswer = computed(() => {
    return currentQuestion.value !== null && !waitingForResponse.value;
  });

  // ===== ACTIONS =====

  /**
   * Connect to MedRAX2 WebSocket server
   */
  async function connect(): Promise<boolean> {
    if (connected.value || connecting.value) return connected.value;

    connecting.value = true;
    connectionError.value = null;

    try {
      // Create socket connection
      socket.value = io(tutorUrl.value, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
      });

      // Set up event listeners
      setupSocketListeners();

      // Wait for connection
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          connecting.value = false;
          connectionError.value = 'Connection timeout';
          resolve(false);
        }, 10000); // 10 second timeout

        socket.value?.on('connect', () => {
          clearTimeout(timeout);
          connected.value = true;
          connecting.value = false;
          reconnectAttempts.value = 0;
          console.log('Connected to MedRAX2 Socratic Tutor');

          // Initialize session
          initializeSession();
          resolve(true);
        });

        socket.value?.on('connect_error', (error) => {
          clearTimeout(timeout);
          connecting.value = false;
          connectionError.value = error.message;
          console.error('Connection error:', error);
          resolve(false);
        });
      });
    } catch (error) {
      connecting.value = false;
      connectionError.value = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to connect to tutor:', error);
      return false;
    }
  }

  /**
   * Set up socket event listeners
   */
  function setupSocketListeners() {
    if (!socket.value) return;

    // Handle tutor questions
    socket.value.on('tutor_question', (data: TutorResponse) => {
      handleTutorQuestion(data);
    });

    // Handle tutor feedback
    socket.value.on('tutor_feedback', (data: TutorResponse) => {
      handleTutorFeedback(data);
    });

    // Handle tutor hints
    socket.value.on('tutor_hint', (data: TutorResponse) => {
      handleTutorHint(data);
    });

    // Handle visual cues
    socket.value.on('visual_cue', (data: TutorResponse['visualCue']) => {
      if (data) showVisualCue(data);
    });

    // Handle typing indicator
    socket.value.on('typing', (isTyping: boolean) => {
      typingIndicator.value = isTyping;
    });

    // Handle disconnection
    socket.value.on('disconnect', () => {
      connected.value = false;
      console.log('Disconnected from MedRAX2');

      // Attempt reconnection if in educational mode
      const educationStore = useEducationStore();
      if (educationStore.modeConfig.tutorActive && reconnectAttempts.value < maxReconnectAttempts) {
        reconnectAttempts.value++;
        setTimeout(() => connect(), 2000 * reconnectAttempts.value);
      }
    });
  }

  /**
   * Initialize a new tutoring session
   */
  function initializeSession() {
    sessionId.value = `session-${Date.now()}`;

    const educationStore = useEducationStore();

    socket.value?.emit('initialize_session', {
      sessionId: sessionId.value,
      mode: educationStore.currentMode,
      skillLevel: educationStore.userSkillLevel,
      caseId: educationStore.currentCaseId,
      timestamp: Date.now(),
    });
  }

  /**
   * Send student action to tutor
   */
  function sendStudentAction(action: StudentAction) {
    if (!isTutorAvailable.value) return;

    // Add to history
    actionHistory.value.push(action);

    // Get current context
    const educationStore = useEducationStore();
    const context = {
      caseId: educationStore.currentCaseId,
      mode: educationStore.currentMode,
      currentTool: action.tool,
      elapsedTime: educationStore.totalSessionTime,
      hintsUsed: educationStore.usedHints.length,
    };

    // Send to tutor
    socket.value?.emit('student_action', {
      sessionId: sessionId.value,
      action,
      context,
      timestamp: Date.now(),
    });
  }

  /**
   * Submit answer to tutor question
   */
  function submitAnswer(answer: string) {
    if (!currentQuestion.value) return;

    waitingForResponse.value = true;

    // Add to conversation
    const studentMessage: TutorMessage = {
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
      role: 'student',
      content: answer,
    };
    conversation.value.push(studentMessage);

    // Send to tutor
    socket.value?.emit('student_response', {
      sessionId: sessionId.value,
      questionId: currentQuestion.value,
      answer,
      timestamp: Date.now(),
    });
  }

  /**
   * Request a hint from the tutor
   */
  function requestTutorHint(context?: string) {
    if (!isTutorAvailable.value) return;

    const educationStore = useEducationStore();

    socket.value?.emit('request_hint', {
      sessionId: sessionId.value,
      context: context || 'general',
      difficulty: educationStore.usedHints.length + 1, // Progressive hints
      timestamp: Date.now(),
    });
  }

  /**
   * Handle tutor question
   */
  function handleTutorQuestion(response: TutorResponse) {
    currentQuestion.value = `q-${Date.now()}`;
    waitingForResponse.value = false;

    // Add to conversation
    const tutorMessage: TutorMessage = {
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
      role: 'tutor',
      content: response.content,
      metadata: {
        questionType: 'diagnostic',
        expectedAnswer: response.expectedAnswer,
      },
    };
    conversation.value.push(tutorMessage);

    // Show visual cue if provided
    if (response.visualCue) {
      showVisualCue(response.visualCue);
    }
  }

  /**
   * Handle tutor feedback
   */
  function handleTutorFeedback(response: TutorResponse) {
    currentQuestion.value = null;
    waitingForResponse.value = false;

    // Add to conversation
    const tutorMessage: TutorMessage = {
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
      role: 'tutor',
      content: response.content,
    };
    conversation.value.push(tutorMessage);

    // Update visual feedback
    if (response.visualCue) {
      showVisualCue(response.visualCue);
    }
  }

  /**
   * Handle tutor hint
   */
  function handleTutorHint(response: TutorResponse) {
    // Add to conversation
    const tutorMessage: TutorMessage = {
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
      role: 'tutor',
      content: response.content,
      metadata: {
        questionType: 'leading',
      },
    };
    conversation.value.push(tutorMessage);

    // Show visual cue
    if (response.visualCue) {
      showVisualCue(response.visualCue);
    }
  }

  /**
   * Show visual cue on the interface
   */
  function showVisualCue(cue: TutorResponse['visualCue']) {
    activeVisualCue.value = cue;

    if (cue?.coordinates) {
      highlightedRegions.value = cue.coordinates;
    }

    // Auto-hide after duration
    if (cue?.duration) {
      setTimeout(() => {
        activeVisualCue.value = null;
        highlightedRegions.value = [];
      }, cue.duration);
    }
  }

  /**
   * Clear visual cues
   */
  function clearVisualCues() {
    activeVisualCue.value = null;
    highlightedRegions.value = [];
  }

  /**
   * Clear conversation history
   */
  function clearConversation() {
    conversation.value = [];
    currentQuestion.value = null;
    waitingForResponse.value = false;
  }

  /**
   * Disconnect from tutor
   */
  function disconnect() {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
    }
    connected.value = false;
    connecting.value = false;
    clearConversation();
    clearVisualCues();
  }

  /**
   * Reset the store
   */
  function reset() {
    disconnect();
    conversation.value = [];
    actionHistory.value = [];
    sessionId.value = null;
    reconnectAttempts.value = 0;
    connectionError.value = null;
  }

  return {
    // State
    socket,
    connected,
    connecting,
    connectionError,
    conversation,
    currentQuestion,
    waitingForResponse,
    typingIndicator,
    activeVisualCue,
    highlightedRegions,
    sessionId,
    actionHistory,
    tutorUrl,

    // Getters
    isTutorAvailable,
    lastTutorMessage,
    isWaitingForAnswer,

    // Actions
    connect,
    sendStudentAction,
    submitAnswer,
    requestTutorHint,
    showVisualCue,
    clearVisualCues,
    clearConversation,
    disconnect,
    reset,
  };
});