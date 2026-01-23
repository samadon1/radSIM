import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { useImageStore } from './datasets-images';
import { useDICOMStore } from './datasets-dicom';
import { useMedRAX } from '@/src/composables/useMedRAX';
import { useDatasetStore } from './datasets';
import { useCaseLibraryStore } from './case-library';

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
  }; // Evaluation results for checklist
}

export const useEducationStore = defineStore('education', () => {
  // Initialize MedRAX composable
  const medRAX = useMedRAX();

  // Connection state
  const connected = computed(() => medRAX.connected.value);
  const connecting = ref(false);
  const connectionError = computed(() => medRAX.error.value);

  // Chat state
  const messages = ref<ChatMessage[]>([]);
  const isTyping = ref(false);
  const waitingForResponse = ref(false);

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

    // Check for regular images
    const hasRegularImages = imageStore.idList.length > 0;

    // Check for DICOM volumes
    const hasDICOMImages = Object.keys(dicomStore.volumeInfo).length > 0;

    return hasRegularImages || hasDICOMImages;
  });

  // Add initial welcome message
  const initializeChat = () => {
    if (hasImage.value) {
      // Show checklist when image is loaded
      messages.value = [
        {
          id: '1',
          role: 'assistant',
          content: 'Welcome! Please review this chest X-ray and identify all findings. You can use the checklist below or annotate directly on the image and add comments.',
          timestamp: new Date(),
          showChecklist: true, // This flag tells the UI to show the checklist
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

  // Send a message
  const sendMessage = async (content: string) => {
    if (!content.trim() && !annotationAttachment.value) return;

    // Add user message with optional attachment
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
      // Determine which image to send
      let imageFile: File | null = null;

      if (annotationAttachment.value) {
        // Use the annotated screenshot if available
        imageFile = annotationAttachment.value.image;
        console.log('[Education Store] Using annotated screenshot');
      } else {
        // Fall back to current image
        console.log('[Education Store] Attempting to capture current image...');
        imageFile = await getCurrentImageFile();
      }

      console.log('[Education Store] Image file captured:', imageFile);
      if (imageFile) {
        console.log('[Education Store] File details:', {
          name: imageFile.name,
          size: imageFile.size,
          type: imageFile.type,
        });
      } else {
        console.log('[Education Store] No image file captured (null)');
      }
      const files = imageFile ? [imageFile] : [];
      console.log('[Education Store] Files array to send:', files);

      // Clear attachment after using it
      if (annotationAttachment.value) {
        annotationAttachment.value = null;
      }

      // Call MedRAX2 API
      const response = await medRAX.sendMessage(
        { text: content.trim(), files },
        chatHistory.value,
        tutorMode.value
      );

      // Update chat history
      chatHistory.value = response.chatHistory || [];

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        visualization: response.visualization || undefined,
      };
      messages.value.push(assistantMessage);
    } catch (error) {
      console.error('MedRAX2 API error:', error);

      // Fallback response
      let responseContent: string;
      if (!hasImage.value) {
        responseContent = 'No image is currently loaded. Please upload or select a medical image from the case library so I can help you analyze it.';
      } else {
        responseContent = 'I apologize, but I encountered an error connecting to the AI backend. Please try again or check your connection.';
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
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

    // Actions
    sendMessage,
    clearChat,
    connect,
    disconnect,
    initializeChat,
    setAnnotationAttachment,
    clearAnnotationAttachment,
    evaluateFindings,

    // Token management (empty for now, can be implemented later)
    setHfToken: () => {},
    hasToken: () => false,
    clearHfToken: () => {},
  };
});