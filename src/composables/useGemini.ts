/**
 * Composable for interacting with Google Gemini API
 * Used for Phase 1 of educational workflow: Initial assessment and feedback
 */

import { ref } from 'vue';
import type { RadiologyCaseMetadata } from '@/src/types/caseLibrary';

// Configuration
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// State
const isLoading = ref(false);
const error = ref<string | null>(null);

// Types
export interface AssessmentFeedback {
  correct: string[];
  missed: string[];
  incorrect: string[];
  explanation: string;
  teachingPoints: string[];
  score: number;
}

/**
 * Evaluate student's observation against case groundtruth using Gemini
 */
const evaluateObservation = async (
  observation: string,
  currentCase: RadiologyCaseMetadata,
  imageFile?: File
): Promise<AssessmentFeedback> => {
  isLoading.value = true;
  error.value = null;

  try {
    console.log('[useGemini] Evaluating observation against groundtruth');
    console.log('[useGemini] Case:', currentCase.id, currentCase.diagnosis);
    console.log('[useGemini] Student observation:', observation);

    // Extract groundtruth findings from case
    const groundtruthFindings = currentCase.findings.map(f => ({
      name: f.name,
      location: f.location,
      description: f.description,
    }));

    const isNormalCase = groundtruthFindings.length === 0;

    // Prepare the prompt
    const prompt = `You're an expert radiology educator. Evaluate this learner's observation against the groundtruth and provide encouraging feedback.

CASE: ${currentCase.modality} - ${currentCase.anatomicalRegion}
Diagnosis: ${currentCase.diagnosis}
Findings: ${isNormalCase ? 'Normal (no abnormalities)' : JSON.stringify(groundtruthFindings)}

LEARNER: "${observation}"

Compare their observation to groundtruth. Return JSON only:
{
  "correct": ["findings they got right"],
  "missed": ["groundtruth findings they didn't mention"],
  "incorrect": ["findings they mentioned that aren't in groundtruth"],
  "explanation": "2-3 sentences using 'you'. Start positive, explain correct/missed/incorrect",
  "teachingPoints": ["Key learning point 1", "Point 2", "Point 3"],
  "score": 85
}

Score = (correct / total) * 100. Normal study identified correctly = 100.`;

    // Prepare request body
    const requestBody: any = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent educational feedback
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    };

    // If image file is provided, include it
    if (imageFile) {
      console.log('[useGemini] Including image in request');
      const base64Image = await fileToBase64(imageFile);

      requestBody.contents[0].parts.unshift({
        inlineData: {
          mimeType: imageFile.type || 'image/png',
          data: base64Image,
        },
      });
    }

    // Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[useGemini] API error:', errorText);
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[useGemini] API response:', result);

    // Extract text from response
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      throw new Error('No text generated from Gemini');
    }

    console.log('[useGemini] Generated text:', generatedText);

    // Parse JSON response
    let feedback: AssessmentFeedback;
    try {
      // Remove markdown code blocks if present
      const cleanedText = generatedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      feedback = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('[useGemini] Failed to parse JSON:', generatedText);
      throw new Error('Failed to parse Gemini response as JSON');
    }

    // Validate feedback structure
    if (!feedback.correct || !feedback.missed || !feedback.incorrect || !feedback.explanation) {
      throw new Error('Invalid feedback structure from Gemini');
    }

    console.log('[useGemini] Parsed feedback:', feedback);
    return feedback;
  } catch (err) {
    console.error('[useGemini] Error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    error.value = errorMessage;
    throw err;
  } finally {
    isLoading.value = false;
  }
};

/**
 * Convert File to base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]; // Remove data:image/...;base64, prefix
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Answer follow-up questions about the case using Gemini
 * Used for simple Q&A that doesn't require MedRAX's advanced features
 */
const answerQuestion = async (
  question: string,
  currentCase: RadiologyCaseMetadata,
  imageFile?: File
): Promise<string> => {
  isLoading.value = true;
  error.value = null;

  try {
    console.log('[useGemini] Answering follow-up question');
    console.log('[useGemini] Question:', question);

    // Extract case information
    const groundtruthFindings = currentCase.findings.map(f => ({
      name: f.name,
      location: f.location,
      description: f.description,
    }));

    const isNormalCase = groundtruthFindings.length === 0;

    // Prepare the prompt
    const prompt = `You're an expert radiology educator. Answer this learner's question about the case.

CASE: ${currentCase.modality} - ${currentCase.anatomicalRegion}
Diagnosis: ${currentCase.diagnosis}
Findings: ${isNormalCase ? 'Normal (no abnormalities)' : JSON.stringify(groundtruthFindings)}

QUESTION: "${question}"

Answer conversationally using "you". Be supportive, reference case findings when relevant. Keep it concise (2-4 sentences).`;

    // Prepare request body
    const requestBody: any = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 512,
      },
    };

    // If image file is provided, include it
    if (imageFile) {
      console.log('[useGemini] Including image in question answering');
      const base64Image = await fileToBase64(imageFile);

      requestBody.contents[0].parts.unshift({
        inlineData: {
          mimeType: imageFile.type || 'image/png',
          data: base64Image,
        },
      });
    }

    // Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[useGemini] API error:', errorText);
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[useGemini] API response:', result);

    // Extract text from response
    const answerText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!answerText) {
      throw new Error('No answer generated from Gemini');
    }

    console.log('[useGemini] Answer:', answerText);
    return answerText;
  } catch (err) {
    console.error('[useGemini] Error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    error.value = errorMessage;
    throw err;
  } finally {
    isLoading.value = false;
  }
};

/**
 * Message type classification for intelligent routing
 */
export type MessageType =
  | 'observation'      // Student making an observation/diagnosis
  | 'help_request'     // Student asking for help/hints
  | 'question'         // Student asking conceptual questions
  | 'visualization';   // Student requesting visualization/advanced features

/**
 * Classify the type of message to determine routing
 */
const classifyMessage = (message: string): MessageType => {
  const lowerMessage = message.toLowerCase().trim();

  // Check for visualization/advanced features first (MedRAX)
  const visualizationKeywords = [
    'visualize', 'visualization', 'show me where', 'highlight', 'point out',
    'segment', 'segmentation', 'mask', 'outline',
    'generate report', 'write report', 'create report', 'dictate',
    'phase grounding', 'ground the', 'grounding',
  ];
  if (visualizationKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'visualization';
  }

  // Check for help requests
  const helpKeywords = [
    'help', 'hint', 'clue', 'stuck', 'don\'t know', 'dont know',
    'not sure', "can't find", 'cannot find', 'give up', 'show answer',
    'tell me', 'what is it', 'just tell', 'reveal',
  ];
  if (helpKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'help_request';
  }

  // Check for questions (starts with question words or has question mark)
  const questionWords = ['what', 'why', 'how', 'when', 'where', 'which', 'is this', 'are these', 'can you explain'];
  const isQuestion = lowerMessage.endsWith('?') || questionWords.some(word => lowerMessage.startsWith(word));

  if (isQuestion && !lowerMessage.includes('i think') && !lowerMessage.includes('looks like') && !lowerMessage.includes('appears')) {
    return 'question';
  }

  // Default: treat as observation/diagnosis attempt
  return 'observation';
};

/**
 * Provide progressive hints based on hint level (Cubey-style)
 */
const provideHint = async (
  hintLevel: number,
  currentCase: RadiologyCaseMetadata,
  previousAttempts: string[],
  imageFile?: File
): Promise<string> => {
  isLoading.value = true;
  error.value = null;

  try {
    console.log(`[useGemini] Providing hint level ${hintLevel}`);

    // Extract groundtruth findings
    const groundtruthFindings = currentCase.findings.map(f => ({
      name: f.name,
      location: f.location,
      description: f.description,
    }));

    const isNormalCase = groundtruthFindings.length === 0;

    // Prepare the prompt based on hint level
    let hintInstructions = '';
    if (hintLevel === 1) {
      hintInstructions = `Provide a GENTLE hint without revealing the answer. Guide them to look at specific anatomical areas (e.g., "Pay close attention to the mediastinum and soft tissues"). Do NOT tell them the diagnosis. 1-2 sentences max.`;
    } else if (hintLevel === 2) {
      hintInstructions = `Provide a MORE SPECIFIC hint. Mention what to look for (e.g., "Look for linear lucencies" or "Notice the gas pattern"). Still don't reveal the full diagnosis. 2-3 sentences max.`;
    } else {
      hintInstructions = `Provide the FULL ANSWER with explanation. Show the complete diagnosis, describe the key findings, and explain the imaging appearance. Include brief management/teaching points. Be thorough but concise.`;
    }

    const prompt = `You are an expert radiology educator providing progressive hints to a learner.

**CASE INFORMATION:**
- Modality: ${currentCase.modality}
- Anatomical Region: ${currentCase.anatomicalRegion}
- Clinical History: ${currentCase.clinicalHistory || 'Not provided'}
- Primary Diagnosis: ${currentCase.diagnosis}
- Findings: ${isNormalCase ? 'Normal study (no abnormal findings)' : JSON.stringify(groundtruthFindings, null, 2)}

**LEARNER'S PREVIOUS ATTEMPTS:**
${previousAttempts.length > 0 ? previousAttempts.map((attempt, i) => `${i + 1}. "${attempt}"`).join('\n') : 'No previous attempts'}

**YOUR TASK:**
${hintInstructions}

**GUIDELINES:**
1. Use second person ("you", "your") - speak directly to the learner
2. Be warm and encouraging - use phrases like "That's okay!", "Good thinking, but...", "Let's work through this together"
3. Reference what they've already tried to show you're listening
4. ${hintLevel < 3 ? 'Do NOT reveal the diagnosis yet - guide them to discover it' : 'Reveal the full diagnosis clearly and educate them'}
5. Keep it concise and focused

Provide your hint naturally - no JSON, just respond as an educator would.`;

    // Prepare request body
    const requestBody: any = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: hintLevel === 3 ? 768 : 256,
      },
    };

    // If image file is provided, include it
    if (imageFile) {
      console.log('[useGemini] Including image in hint');
      const base64Image = await fileToBase64(imageFile);

      requestBody.contents[0].parts.unshift({
        inlineData: {
          mimeType: imageFile.type || 'image/png',
          data: base64Image,
        },
      });
    }

    // Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[useGemini] API error:', errorText);
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[useGemini] API response:', result);

    // Extract text from response
    const hintText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!hintText) {
      throw new Error('No hint generated from Gemini');
    }

    console.log('[useGemini] Hint:', hintText);
    return hintText;
  } catch (err) {
    console.error('[useGemini] Error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    error.value = errorMessage;
    throw err;
  } finally {
    isLoading.value = false;
  }
};

/**
 * Determine if a question needs MedRAX (advanced features) or can be answered with Gemini
 */
const needsMedRAX = (question: string): boolean => {
  return classifyMessage(question) === 'visualization';
};

/**
 * Export composable
 */
export function useGemini() {
  return {
    evaluateObservation,
    answerQuestion,
    provideHint,
    classifyMessage,
    needsMedRAX,
    isLoading,
    error,
  };
}
