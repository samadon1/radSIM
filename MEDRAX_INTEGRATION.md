# MedRAX2 Backend Integration

## Overview
RADSIM is now integrated with the MedRAX2 AI backend hosted on Hugging Face Spaces. This integration enables real-time AI-powered radiology education and image analysis.

## Features Implemented

### 1. **MedRAX2 API Client** ([src/composables/useMedRAX.ts](src/composables/useMedRAX.ts))
- REST API client for MedRAX2 Hugging Face Space endpoint
- Supports both "Assistant Mode" (direct answers) and "Tutor Mode" (Socratic guidance)
- Multimodal input: text + medical images
- Connection testing and error handling

**Key Functions:**
- `sendMessage()`: Send chat messages with optional image attachments
- `testConnection()`: Verify backend availability

### 2. **Image Capture** ([src/composables/useCaptureImage.ts](src/composables/useCaptureImage.ts))
- Captures current VTK view as PNG image
- Automatically finds active canvas element
- Converts canvas to File object for API upload

**Key Functions:**
- `captureCurrentView()`: Capture screenshot of current medical image view
- `canvasToFile()`: Convert canvas to File blob
- `findVtkCanvas()`: Locate active VTK rendering canvas

### 3. **Enhanced Education Store** ([src/store/education.ts](src/store/education.ts))
- Integrated MedRAX2 API calls into chat workflow
- Automatic image capture and upload with each message
- Chat history tracking for context-aware conversations
- Visualization display from AI responses

**New Features:**
- `tutorMode`: Toggle between Assistant and Tutor modes
- `chatHistory`: Maintains conversation context for MedRAX2
- `getCurrentImageFile()`: Captures and sends current view with chat

### 4. **Visualization Display** ([src/components/education/SocraticChat.vue](src/components/education/SocraticChat.vue))
- Displays AI-generated visualizations (grounding, segmentation)
- Enterprise-grade styling matching RADSIM aesthetic
- Automatic scrolling to new visualizations

## How It Works

### User Workflow:
1. **Load Image**: User selects a chest X-ray from case library
2. **Ask Question**: User types question about the image
3. **Automatic Capture**: System captures current view as PNG
4. **Send to MedRAX2**: Image + question sent to backend
5. **AI Analysis**: MedRAX2 processes with Gemini 2.0 + specialized tools
6. **Display Results**: Chat shows text response + visualization (if available)

### Backend Tools Available:
- **XRay Phrase Grounding** (MAIRA-2): Highlight specific anatomical regions
- **Visual Question Answering** (CheXagent): Answer specific image questions
- **Classification** (TorchXRayVision): Detect pathologies
- **Report Generation**: Create structured radiology reports
- **Segmentation**: Segment and visualize anatomical structures

## Configuration

### MedRAX2 Endpoint
```typescript
const MEDRAX_ENDPOINT = 'https://samwell-medrax2.hf.space';
```

### Mode Selection
```typescript
// In education store
const tutorMode = ref<'Assistant Mode' | 'Tutor Mode'>('Tutor Mode');
```

**Assistant Mode**: Direct, concise answers
**Tutor Mode**: Socratic questioning to guide learning

## API Request Format

```typescript
// Request
{
  message: {
    text: "What abnormalities do you see?",
    files: [<File: medical-image.png>]
  },
  chatHistory: [
    ["Previous user message", "Previous AI response"],
    ...
  ],
  mode: "Tutor Mode"
}

// Response
{
  message: "I can see several areas of interest. What do you notice about the cardiac silhouette?",
  chatHistory: [...updated history...],
  visualization: "<base64 image or URL>"
}
```

## Connection Status

The education module header displays real-time connection status:
- **Green indicator**: Connected to MedRAX2
- **Gray indicator**: Offline/disconnected

Connection is tested automatically on:
- Store initialization
- Manual reconnect attempts

## Error Handling

If MedRAX2 is unavailable:
1. Connection error displayed in store
2. Fallback response shown to user
3. Chat continues to work locally
4. Automatic retry on next message

## Future Enhancements

### Planned Features:
- [ ] Overlay segmentation masks directly on VTK viewer
- [ ] Display grounding bounding boxes on images
- [ ] Support for multi-slice DICOM sequences
- [ ] Save AI analysis results with cases
- [ ] Export conversation + visualizations as PDF report
- [ ] Real-time streaming responses
- [ ] Tool selection UI (let user choose grounding/VQA/classification)

### Image Export Improvements:
- [ ] Capture specific slice from volume
- [ ] Include window/level settings in metadata
- [ ] Send DICOM metadata for context
- [ ] Support for RGB overlay visualization

## Testing

To test the integration:

1. **Start Development Server**: Already running
2. **Load a Case**: Select any chest X-ray from case library
3. **Ask a Question**:
   - "What do you see in this image?"
   - "Is there any sign of pneumonia?"
   - "Describe the cardiac silhouette"
4. **Check Console**: Verify connection logs and API calls
5. **View Response**: See AI text + visualization (if generated)

## Files Modified/Created

### Created:
- `src/composables/useMedRAX.ts` - MedRAX2 API client
- `src/composables/useCaptureImage.ts` - Image capture utilities
- `MEDRAX_INTEGRATION.md` - This documentation

### Modified:
- `src/store/education.ts` - Integrated MedRAX2 API
- `src/components/education/SocraticChat.vue` - Added visualization display
- `src/types/caseLibrary.ts` - Already existed (case library types)

## Technical Notes

### CORS Considerations:
MedRAX2 Hugging Face Space should have CORS enabled for browser access. If CORS issues occur, the backend may need to be deployed with proper headers.

### Image Format:
- Captured images are PNG format
- Canvas uses device pixel ratio for high DPI displays
- Images are automatically compressed by canvas.toBlob()

### Performance:
- Image capture is async but typically fast (<100ms)
- API calls may take 2-10 seconds depending on tool usage
- Visualization images returned as base64 or URLs