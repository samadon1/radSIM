# Testing the Cubey-Style Progressive Conversation System

## Overview
This document outlines how to test the new agentic conversation flow that intelligently routes student messages without rigid phase boundaries.

## System Architecture

### Intelligent Message Routing
The system classifies each message and routes it to the appropriate handler:

1. **Observation** - Student making a diagnosis attempt
   - Handler: `gemini.evaluateObservation()`
   - Response: Structured feedback with correct/missed/incorrect findings
   - Tracks attempts in `conversationState.attempts`

2. **Help Request** - Student asking for hints
   - Handler: `gemini.provideHint()`
   - Progressive levels: 1 (gentle) → 2 (specific) → 3 (full answer)
   - Increments `conversationState.hintLevel`

3. **Question** - Student asking conceptual questions
   - Handler: `gemini.answerQuestion()`
   - Uses groundtruth data to answer
   - Personalized educational responses

4. **Visualization** - Student requesting advanced features
   - Handler: `medRAX.sendMessage()`
   - For: phase grounding, segmentation, report generation
   - Only used for complex visualizations

## Test Plan

### Setup (5 minutes)
1. Navigate to http://localhost:5174/
2. Click "Get Started" or "Launch Application"
3. Open the Case Library panel (left sidebar)
4. Select a case (e.g., "Pneumothorax Case" or any chest X-ray)
5. Open the Education Module (right sidebar with chat icon)

---

## Test Scenario 1: Observation → Feedback Loop
**Goal**: Verify student observations are evaluated correctly

### Steps:
1. **Make an incorrect observation**
   - Type: "I see cardiomegaly"
   - Expected: System evaluates against groundtruth
   - Should show:
     - ✗ Incorrect Observations: cardiomegaly
     - ⚠ Missed Findings: [actual findings]
     - Personalized explanation using "you" language
     - Teaching points
     - Low score (0-30%)

2. **Make a partially correct observation**
   - Type: "I see pneumothorax in the right lung"
   - Expected: System recognizes partial correctness
   - Should show:
     - ✓ Correct Observations: pneumothorax
     - ⚠ Missed Findings: [any other findings]
     - Encouraging feedback ("You correctly identified...")
     - Score: 50-80%

3. **Make a fully correct observation**
   - Type the complete diagnosis
   - Expected: High score (80-100%)
   - Should show:
     - ✓ All findings marked correct
     - Positive reinforcement
     - `conversationState.hasShownAnswer = true`

### Verification Points:
- [ ] Feedback uses second person ("you", "your")
- [ ] Findings are categorized correctly
- [ ] Score calculation is accurate
- [ ] Assessment card has minimal enterprise design (not colorful/toyish)
- [ ] Teaching points are relevant and educational

---

## Test Scenario 2: Progressive Hint System
**Goal**: Verify Cubey-style progressive hints work correctly

### Steps:
1. **Request first hint**
   - Type: "I need help" or "Give me a hint"
   - Expected: Gentle, non-revealing hint
   - Should mention: Anatomical areas to focus on
   - Should NOT reveal: Diagnosis
   - `conversationState.hintLevel` = 1

2. **Request second hint**
   - Type: "I'm still stuck, help please"
   - Expected: More specific hint
   - Should mention: What to look for (e.g., "Look for linear lucencies")
   - Should NOT reveal: Full diagnosis yet
   - `conversationState.hintLevel` = 2

3. **Request third hint (full answer)**
   - Type: "I don't know the answer" or "Just tell me"
   - Expected: Complete answer with teaching
   - Should include:
     - Full diagnosis
     - Detailed explanation of findings
     - Management/teaching points
   - `conversationState.hintLevel` = 3
   - `conversationState.hasShownAnswer = true`

4. **Request hint after max level**
   - Type: "Can I have another hint?"
   - Expected: Should stay at level 3, provide similar comprehensive info

### Verification Points:
- [ ] Hint level increments correctly (0 → 1 → 2 → 3)
- [ ] Hints become progressively more revealing
- [ ] Level 1-2 don't spoil the diagnosis
- [ ] Level 3 provides complete educational answer
- [ ] Warm, encouraging tone throughout
- [ ] References previous attempts in hints

---

## Test Scenario 3: Question Answering
**Goal**: Verify conceptual questions are answered from groundtruth

### Steps:
1. **Ask about location**
   - Type: "Where is the pneumothorax located?"
   - Expected: Answer based on groundtruth location
   - Should reference: Specific anatomical location from case metadata

2. **Ask "why" question**
   - Type: "Why does pneumothorax appear dark on X-ray?"
   - Expected: Educational explanation
   - Should include: Physics/pathophysiology concepts

3. **Ask "what" question**
   - Type: "What are the key signs to look for?"
   - Expected: List of imaging signs from groundtruth
   - Should be: Clear, educational, and case-specific

4. **Ask follow-up**
   - Type: "Is this severe?"
   - Expected: Answer based on groundtruth severity
   - Should reference: Case-specific severity level

### Verification Points:
- [ ] Answers are accurate to the case
- [ ] Uses groundtruth data appropriately
- [ ] Educational and conversational tone
- [ ] 2-4 sentences, concise but informative
- [ ] Uses phrases like "In this case...", "Looking at this image..."

---

## Test Scenario 4: Visualization Requests (MedRAX)
**Goal**: Verify advanced features route to MedRAX correctly

### Steps:
1. **Request phase grounding**
   - Type: "Show me where the pneumothorax is"
   - Expected: Routes to MedRAX (not Gemini)
   - Should generate: Visual segmentation/highlighting
   - Check: Visualization appears in main viewer overlay

2. **Request segmentation**
   - Type: "Segment the affected area"
   - Expected: Routes to MedRAX
   - Should generate: Segmentation mask

3. **Request report generation**
   - Type: "Generate a radiology report"
   - Expected: Routes to MedRAX
   - Should generate: Structured radiology report

4. **Request visualization with question**
   - Type: "Visualize the findings and explain them"
   - Expected: Routes to MedRAX (because of "visualize" keyword)
   - Should provide: Both visualization and explanation

### Verification Points:
- [ ] Visualization keywords detected correctly
- [ ] Routes to MedRAX API (check browser console for API calls)
- [ ] No Deep Dive Options button/card appears
- [ ] Visualizations render properly
- [ ] MedRAX responses are shown in chat

---

## Test Scenario 5: Mixed Conversation Flow
**Goal**: Verify natural conversation with mixed message types

### Steps:
1. Make an observation → Get feedback
2. Ask a question → Get answer
3. Request a hint → Get gentle hint
4. Make another observation → Get updated feedback
5. Request visualization → Get MedRAX response
6. Ask follow-up question → Get Gemini answer

### Verification Points:
- [ ] Seamless transitions between message types
- [ ] No rigid "phase" boundaries
- [ ] Conversation state tracked correctly
- [ ] Previous attempts referenced in hints
- [ ] System maintains context throughout

---

## Test Scenario 6: Conversation State Management
**Goal**: Verify state tracking and persistence

### Steps:
1. **Make multiple attempts**
   - Try 3 different observations
   - Expected: All stored in `conversationState.attempts`
   - Verification: Check browser console or Vue DevTools

2. **Request hints after attempts**
   - Type: "I need help"
   - Expected: Hint should reference previous attempts
   - Should say: "I see you tried... but..."

3. **Clear chat**
   - Click "Clear Chat" button
   - Expected:
     - `conversationState.attempts` = []
     - `conversationState.hintLevel` = 0
     - `conversationState.hasShownAnswer` = false
   - New conversation starts fresh

4. **Switch cases**
   - Select a different case from case library
   - Expected: Chat resets automatically
   - Conversation state cleared

### Verification Points:
- [ ] Attempts array populates correctly
- [ ] Hint level increments and caps at 3
- [ ] hasShownAnswer flag set at score ≥80% or hint level 3
- [ ] State resets on chat clear
- [ ] State resets on case change

---

## Test Scenario 7: Edge Cases

### Empty/Invalid Input
- Type: Empty string
- Expected: No action, stays in input field

### Very Long Message
- Type: 500+ word observation
- Expected: Handles gracefully, no errors

### Rapid-Fire Messages
- Send multiple messages quickly
- Expected: Queues properly, no race conditions

### Network Errors
- Disconnect internet, send message
- Expected: Error message shown, graceful failure

### Case Without Findings (Normal Study)
- Select a "Normal" case
- Type: "This appears normal"
- Expected:
  - ✓ Correct Observations: normal
  - Score: 100%
  - Positive feedback

---

## Manual Verification Checklist

### Visual Design
- [ ] Assessment cards have minimal dark design
- [ ] No colorful backgrounds (should be `rgba(0,0,0,0.2)`)
- [ ] Sharp corners (4px border-radius, not 8px)
- [ ] Thin borders (1px, not 2px)
- [ ] Subtle color accents only
- [ ] Clean typography with lighter weights
- [ ] No "toyish" appearance

### Language & Tone
- [ ] All AI responses use "you"/"your" (second person)
- [ ] Never says "the student" or "the learner" in feedback
- [ ] Encouraging and warm tone
- [ ] Educational but not condescending
- [ ] Examples: "You correctly identified...", "You missed..."

### Functional Requirements
- [ ] No explicit "Deep Dive Options" card/button
- [ ] No rigid phase transitions (Phase 1 → Phase 2)
- [ ] Intelligent routing happens automatically
- [ ] Gemini used for: observations, hints, questions
- [ ] MedRAX used for: visualizations, reports, segmentation
- [ ] Conversation flows naturally

### Console Verification
Open browser DevTools Console and verify:
- [ ] `[Education Store] Message type: observation` logged correctly
- [ ] `[useGemini] Evaluating observation...` for observations
- [ ] `[useGemini] Providing hint level X` for hints
- [ ] `[useGemini] Answering follow-up question` for questions
- [ ] `[Education Store] Processing visualization request` for MedRAX
- [ ] No TypeScript errors
- [ ] No React/Vue warnings

---

## Expected Console Logs

### Observation Message:
```
[Education Store] Message type: observation
[useGemini] Evaluating observation against groundtruth
[useGemini] Case: case-001 Pneumothorax
[useGemini] Student observation: I see pneumothorax
[useGemini] Generated text: { "correct": [...], ... }
[useGemini] Parsed feedback: { score: 85, ... }
```

### Help Request:
```
[Education Store] Message type: help_request
[useGemini] Providing hint level 1
[useGemini] Hint: Pay close attention to the right hemithorax...
```

### Question:
```
[Education Store] Message type: question
[useGemini] Answering follow-up question
[useGemini] Question: Why does it appear dark?
[useGemini] Answer: In this case, the pneumothorax appears dark because...
```

### Visualization:
```
[Education Store] Message type: visualization
[Education Store] Processing visualization request with MedRAX
```

---

## Performance Benchmarks

### Response Times (Expected)
- Gemini observation evaluation: 2-5 seconds
- Gemini hint generation: 1-3 seconds
- Gemini question answering: 1-2 seconds
- MedRAX visualization: 5-10 seconds

### API Costs (Approximate per message)
- Gemini API call: ~$0.0001-0.001
- MedRAX API call: ~$0.01-0.05
- Strategy: Use Gemini for 80% of interactions, MedRAX for 20%

---

## Regression Testing

After any code changes, verify:
1. [ ] Message classification still works
2. [ ] Progressive hints still increment correctly
3. [ ] Conversation state persists across messages
4. [ ] Chat clears properly
5. [ ] Case switching resets state
6. [ ] All four message types route correctly
7. [ ] No broken UI elements
8. [ ] No console errors

---

## Known Limitations

1. **Hint Quality**: Depends on Gemini's prompt adherence
   - Sometimes level 2 might be too revealing
   - Sometimes level 1 might be too vague

2. **Classification Accuracy**: Keyword-based, not ML-based
   - Edge cases might misclassify
   - "Show me pneumothorax" → might classify as observation instead of visualization

3. **Image Upload**: Currently uses case library images
   - Annotation attachments work
   - Direct image upload not yet implemented

---

## Success Criteria

✅ **Test passes if**:
- All 7 test scenarios complete without errors
- Message routing works correctly for all types
- Progressive hints increment smoothly (1 → 2 → 3)
- Conversation state tracks properly
- UI has minimal enterprise design
- Language is personalized ("you" not "student")
- No rigid phase boundaries or UI cards

❌ **Test fails if**:
- TypeScript errors in console
- Messages misclassified
- Hints don't progress correctly
- State doesn't reset on case change
- UI still has "toyish" colorful design
- Language uses third person ("the student")
- Deep Dive Options card appears

---

## Next Steps After Testing

1. Gather user feedback on hint quality
2. Fine-tune message classification keywords
3. Implement conversation history for better context
4. Add analytics to track message type distribution
5. Consider ML-based classification for better accuracy
6. Implement direct image upload (beyond case library)

---

## Contact & Support

For issues or questions:
- Check browser console for detailed logs
- Review [education.ts](src/store/education.ts) for routing logic
- Review [useGemini.ts](src/composables/useGemini.ts) for prompt engineering
- Check [SocraticChat.vue](src/components/education/SocraticChat.vue) for UI

---

**Last Updated**: 2026-01-03
**Version**: 2.0 (Cubey-style Progressive Conversation)
**Status**: Ready for Testing ✅
