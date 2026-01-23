/**
 * Composable for interacting with MedRAX2 AI backend using direct HTTP API
 * This approach uses the raw Gradio API endpoints instead of the Gradio Client SDK
 */

import { ref } from 'vue';

// Configuration
const SPACE_URL = 'https://samwell-medrax2.hf.space';
const API_BASE = `${SPACE_URL}/gradio_api`;

// State
const isLoading = ref(false);
const error = ref<string | null>(null);
const connected = ref(false);

// Types
export interface MedRAXMessage {
  text: string;
  files?: File[];
}

export type MedRAXMode = 'Assistant Mode' | 'Tutor Mode';

export interface MedRAXResponse {
  message: string;
  chatHistory?: any[];
  visualization?: string | null;
}

interface FileData {
  path: string;
  url: string | null;
  size: number | null;
  orig_name: string;
  mime_type: string;
  is_stream: boolean;
  meta: {
    _type: string;
  };
}

/**
 * Upload files to Gradio
 */
const uploadFiles = async (files: File[]): Promise<FileData[]> => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('files', file);
  });

  console.log('[useMedRAX] Uploading', files.length, 'file(s) to Gradio...');

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`File upload failed: ${response.statusText}`);
  }

  const uploadedPaths: string[] = await response.json();
  console.log('[useMedRAX] Files uploaded, paths:', uploadedPaths);

  // Convert paths to FileData objects
  const fileDataList: FileData[] = uploadedPaths.map((path, index) => {
    const file = files[index];
    return {
      path: path,
      url: null,
      size: file.size,
      orig_name: file.name,
      mime_type: file.type || 'image/png',
      is_stream: false,
      meta: {
        _type: 'gradio.FileData',
      },
    };
  });

  return fileDataList;
};

/**
 * Call the Gradio API endpoint
 */
const callAPI = async (
  message: { text: string; files?: FileData[] },
  chatHistory: any[],
  mode: MedRAXMode
): Promise<string> => {
  const requestData = {
    data: [
      {
        text: message.text,
        files: message.files || [],
      },
      chatHistory,
      mode,
      null, // state parameter
    ],
  };

  console.log('[useMedRAX] Calling API with data:', JSON.stringify(requestData, null, 2));

  const response = await fetch(`${API_BASE}/call/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData),
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  const result = await response.json();
  console.log('[useMedRAX] API call response:', result);

  if (!result.event_id) {
    throw new Error('No event_id received from API');
  }

  return result.event_id;
};

/**
 * Poll for results using Server-Sent Events
 */
const pollResults = async (eventId: string): Promise<MedRAXResponse> => {
  console.log('[useMedRAX] Polling for results, event_id:', eventId);

  const response = await fetch(`${API_BASE}/call/respond/${eventId}`);

  if (!response.ok) {
    throw new Error(`Failed to get results: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  // Read the SSE stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);

        // Skip "null" data
        if (data === 'null') continue;

        try {
          const parsed = JSON.parse(data);
          console.log('[useMedRAX] Received data:', parsed);

          // Check if this is the complete event
          if (Array.isArray(parsed)) {
            const [messageOutput, chatHistoryOutput, visualizationOutput] = parsed;

            // Extract AI message from chat history
            let aiMessage = '';
            if (chatHistoryOutput && chatHistoryOutput.length > 0) {
              const lastMessage = chatHistoryOutput[chatHistoryOutput.length - 1];

              if (lastMessage.role === 'assistant' && lastMessage.content) {
                const textContent = lastMessage.content.find((c: any) => c.type === 'text');
                if (textContent) {
                  aiMessage = textContent.text;
                }
              }
            }

            // If we got a message, we're done
            if (aiMessage) {
              return {
                message: aiMessage,
                chatHistory: chatHistoryOutput,
                visualization: visualizationOutput?.url || visualizationOutput?.path || null,
              };
            }
          }
        } catch (e) {
          // Not JSON, could be an event marker
          console.log('[useMedRAX] Non-JSON data:', data);
        }
      } else if (line.startsWith('event: ')) {
        const event = line.slice(7);
        console.log('[useMedRAX] Event:', event);

        if (event === 'error') {
          throw new Error('API returned error event');
        } else if (event === 'complete') {
          // Wait for the data in the next line
          continue;
        }
      }
    }
  }

  throw new Error('No response received from API');
};

/**
 * Send message to MedRAX2
 */
const sendMessage = async (
  message: MedRAXMessage,
  chatHistory: any[] = [],
  mode: MedRAXMode = 'Tutor Mode'
): Promise<MedRAXResponse> => {
  isLoading.value = true;
  error.value = null;

  try {
    console.log('[useMedRAX] Sending message:', message.text);
    console.log('[useMedRAX] Files count:', message.files?.length || 0);
    console.log('[useMedRAX] Chat history length:', chatHistory.length);
    console.log('[useMedRAX] Mode:', mode);

    // Step 1: Upload files if present
    let fileDataList: FileData[] = [];
    if (message.files && message.files.length > 0) {
      fileDataList = await uploadFiles(message.files);
    }

    // Step 2: Call the API
    const eventId = await callAPI(
      {
        text: message.text,
        files: fileDataList,
      },
      chatHistory,
      mode
    );

    // Step 3: Poll for results
    const result = await pollResults(eventId);

    connected.value = true;
    return result;
  } catch (err) {
    console.error('MedRAX2 error:', err);
    console.error('MedRAX2 error details:', JSON.stringify(err, null, 2));

    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    error.value = errorMessage;
    connected.value = false;
    throw err;
  } finally {
    isLoading.value = false;
  }
};

/**
 * Export composable
 */
export function useMedRAX() {
  return {
    sendMessage,
    isLoading,
    error,
    connected,
  };
}
