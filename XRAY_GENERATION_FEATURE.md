# X-Ray Generation Feature

## Overview
Added a new **AI-powered chest X-ray generation** feature that allows users to generate synthetic medical images using text prompts via the MedRAX2 API (RoentGen-v2 model).

## User Flow

```
Case Library → Click "Generate" Button → Modal Opens
                                            ↓
                              Type description of desired X-ray
                                            ↓
                              Click "Generate" (30-60s wait)
                                            ↓
                              Preview generated image
                                            ↓
                              Click "Use Image"
                                            ↓
                              Image loads in viewer (same as case library images)
```

## Implementation Details

### 1. UI Components Modified

#### **WelcomePage.vue** ([src/components/WelcomePage.vue](src/components/WelcomePage.vue))

**Added State:**
```typescript
const showGenerateModal = ref(false);
const generationPrompt = ref('');
const isGenerating = ref(false);
const generatedImageUrl = ref<string | null>(null);
```

**Added Functions:**
- `handleGenerate()` - Opens the generation modal
- `handleGenerateSubmit()` - Sends prompt to MedRAX2 API
- `handleUseGeneratedImage()` - Loads generated image into viewer
- `handleCloseModal()` - Closes modal and resets state

**Added UI:**
- Generation modal with:
  - Text input for description
  - Example prompt chips (clickable)
  - Loading indicator during generation
  - Image preview after generation
  - "Use Image" button to load into viewer

### 2. API Integration

**MedRAX2 Connection:**
```typescript
const { useMedRAX } = await import('@/src/composables/useMedRAX');
const medRAX = useMedRAX();

const response = await medRAX.sendMessage(
  { text: `Generate a chest X-ray image: ${generationPrompt.value}` },
  [],
  'Assistant Mode'
);

if (response.visualization) {
  generatedImageUrl.value = response.visualization;
}
```

**Backend Tool:**
The MedRAX2 backend includes the `ChestXRayGeneratorTool` which uses:
- **Model**: stanfordmimi/RoentGen-v2
- **Generation Time**: 30-60 seconds
- **Output**: PNG image saved to `temp/generated_xray_*.png`

### 3. Generate Button

Already existed in CaseGallery.vue with slot:
```vue
<CaseGallery @case-selected="handleCaseSelected">
  <template #action-buttons>
    <v-btn
      variant="outlined"
      color="secondary"
      prepend-icon="mdi-auto-fix"
      size="small"
      @click="handleGenerate"
    >
      Generate
    </v-btn>
  </template>
</CaseGallery>
```

### 4. Modal Features

**Example Prompts:**
- "Right-sided pneumothorax with partial lung collapse"
- "Bilateral pulmonary edema with cardiomegaly"
- "Left lower lobe pneumonia with consolidation"
- "Normal frontal chest X-ray"

Users can click any example to populate the text field.

**Validation:**
- Generate button disabled when prompt is empty
- Cancel button disabled during generation
- Modal is persistent (can't close by clicking outside)

**Loading State:**
- Progress spinner
- "Generating X-ray image... This may take 30-60 seconds" message

**Preview:**
- Generated image displayed at full size (max 500px height)
- Rounded corners with subtle border
- Dark background consistent with app theme

## Design Choices

### Enterprise-Grade Styling
- Minimal dark theme matching RADSIM's design
- Subtle borders: `1px solid rgba(255, 255, 255, 0.06)`
- Background: `#1a1a1a`
- Accent color: Material Blue (`rgba(33, 150, 243, *)`)

### User Experience
1. **Discoverability**: Generate button in top-right of case library
2. **Guidance**: Example prompts help users understand format
3. **Feedback**: Clear loading indicators during 30-60s generation
4. **Preview**: Users can see generated image before loading
5. **Flexibility**: Can cancel and try again if result isn't satisfactory

### Error Handling
```typescript
try {
  const response = await medRAX.sendMessage(...);
  if (response.visualization) {
    generatedImageUrl.value = response.visualization;
  } else {
    throw new Error('No image generated');
  }
} catch (error) {
  console.error('Generation failed:', error);
  alert('Failed to generate image. Please try again.');
} finally {
  isGenerating.value = false;
}
```

## How It Works Technically

### 1. User Clicks "Generate"
- Modal opens with empty text field
- Example prompts displayed

### 2. User Enters Prompt
- Can type custom description
- Or click example chip to auto-fill

### 3. User Clicks "Generate"
- `isGenerating = true` (loading state)
- Prompt sent to MedRAX2: `"Generate a chest X-ray image: [prompt]"`
- MedRAX2 agent receives message
- Agent classifies as generation request
- Calls `ChestXRayGeneratorTool`

### 4. Backend Processing (MedRAX2)
```python
from medrax.tools.xray_generation import ChestXRayGeneratorTool

generation_tool = ChestXRayGeneratorTool(
    model_path="stanfordmimi/RoentGen-v2",
    temp_dir="temp",
    device="cuda"
)

# Tool generates image based on prompt
# Saves to temp/generated_xray_{timestamp}.png
```

### 5. Frontend Receives Response
```typescript
{
  message: "I've generated the requested chest X-ray...",
  visualization: "https://samwell-medrax2.hf.space/file=/tmp/gradio/generated_xray_1234567890.png"
}
```

### 6. Image Preview
- Modal switches from input view to preview view
- Generated image displayed
- "Use Image" button appears

### 7. Load into Viewer
- User clicks "Use Image"
- `loadUrls({ urls: generatedImageUrl.value })`
- Image loaded into RADSIM viewer
- Modal closes
- User can now analyze, annotate, and use educational features

## File Changes

### Modified Files:
1. **[src/components/WelcomePage.vue](src/components/WelcomePage.vue)**
   - Added generation modal (lines 200-279)
   - Added handler functions (lines 45-120)
   - Added modal styles (lines 317-434)

### Unchanged Files:
- **[src/components/CaseGallery.vue](src/components/CaseGallery.vue)** - Already had Generate button
- **[src/composables/useMedRAX.ts](src/composables/useMedRAX.ts)** - Already supports sendMessage()

## Testing Checklist

### Manual Testing:
- [ ] Click "Generate" button opens modal
- [ ] Type custom prompt enables Generate button
- [ ] Click example chip populates text field
- [ ] Click "Generate" shows loading spinner
- [ ] Wait 30-60 seconds for generation
- [ ] Generated image appears in preview
- [ ] Click "Use Image" loads into viewer
- [ ] Image appears in viewer (left panel)
- [ ] Can annotate on generated image
- [ ] Can chat about generated image
- [ ] Click "Cancel" closes modal
- [ ] Re-open modal shows empty state

### Error Testing:
- [ ] Empty prompt → Generate button disabled
- [ ] Network error → Shows error alert
- [ ] MedRAX offline → Shows error alert
- [ ] Click Cancel during generation → Modal closes

### Edge Cases:
- [ ] Very long prompt (500+ characters)
- [ ] Special characters in prompt
- [ ] Multiple generations in sequence
- [ ] Switch cases after generation
- [ ] Reload page doesn't persist modal state

## Example Prompts

### Good Prompts (Specific):
✅ "Frontal chest X-ray showing right-sided tension pneumothorax with mediastinal shift"
✅ "PA chest radiograph with bilateral diffuse ground-glass opacities consistent with pulmonary edema"
✅ "Left lower lobe consolidation with air bronchograms suggesting bacterial pneumonia"

### Poor Prompts (Too Vague):
❌ "Lung problem"
❌ "Sick chest"
❌ "Something wrong"

### Recommended Format:
"[View] chest X-ray showing [finding] in [location] with [characteristics]"

## Future Enhancements

### Potential Improvements:
1. **Prompt Templates**: Pre-built templates for common findings
2. **Parameter Controls**: Adjust severity, size, location
3. **Multi-View Generation**: Generate PA + Lateral views
4. **History**: Save recently generated images
5. **Batch Generation**: Generate multiple variations
6. **Fine-Tuning**: Adjust generation parameters (steps, guidance scale)
7. **Comparison**: Side-by-side with case library images
8. **Export**: Download generated images

### Technical Enhancements:
1. **Caching**: Cache generated images to avoid regeneration
2. **Queue System**: Handle multiple requests
3. **Progress Updates**: Real-time generation progress
4. **Retry Logic**: Auto-retry on failure
5. **Model Selection**: Choose between different generation models
6. **Quality Control**: Validate generated images before showing

## Dependencies

### Frontend:
- Vue 3 Composition API
- Vuetify 3 (v-dialog, v-textarea, v-chip, v-btn)
- useMedRAX composable
- loadUrls action

### Backend:
- MedRAX2 server (https://samwell-medrax2.hf.space)
- RoentGen-v2 model (stanfordmimi/RoentGen-v2)
- CUDA GPU (for generation)
- Python packages: diffusers, transformers, torch

## Performance Considerations

### Generation Time:
- **Average**: 30-45 seconds
- **Factors**: GPU availability, model load time, prompt complexity
- **Optimization**: Model stays loaded in memory after first generation

### Image Size:
- **Resolution**: 512x512 pixels (typical chest X-ray)
- **File Size**: ~100-500KB (PNG format)
- **Network**: Gradio serves via `/file/` endpoint

### UX Impact:
- **Loading State**: Clear feedback during 30-60s wait
- **Cancel Option**: User can cancel if taking too long
- **Error Recovery**: Graceful fallback with error messages

## Security Considerations

### API Security:
- MedRAX2 runs on HuggingFace Space (https)
- No API keys required (public endpoint)
- Rate limiting handled by HuggingFace

### Content Safety:
- Generated images are synthetic (no patient data)
- Tool designed for educational use only
- Not for clinical decision-making

### Data Privacy:
- Prompts sent to remote server
- Generated images stored temporarily
- No persistent storage of user data

## Documentation Links

### Related Docs:
- [TESTING_PROGRESSIVE_CONVERSATION.md](TESTING_PROGRESSIVE_CONVERSATION.md) - Testing the education system
- [CASE_LIBRARY_SETUP.md](CASE_LIBRARY_SETUP.md) - Case library structure
- [README.md](README.md) - Main project documentation

### External Resources:
- [RoentGen-v2 Model](https://huggingface.co/stanfordmimi/RoentGen-v2)
- [MedRAX2 Space](https://huggingface.co/spaces/samwell-medrax2)
- [Gradio API Docs](https://gradio.app/docs/)

---

**Status**: ✅ Implementation Complete
**Last Updated**: 2026-01-06
**Feature Version**: 1.0
