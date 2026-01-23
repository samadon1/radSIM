# RADSIM Testing Guide
## Testing the Educational Features Implementation

---

## 🎯 What We've Implemented

### Phase 1: Educational Foundation ✅
1. **Education TypeScript Types** (`src/types/education.ts`)
   - Skill levels, modes, cases, user profiles
   - Hint structures, tutor messages, sessions

2. **Education Pinia Store** (`src/store/education.ts`)
   - User skill level management
   - Learning mode configuration (Tutorial/Practice/Assessment)
   - Case library with filtering
   - Progress tracking
   - Hint system

3. **EducationModule Component** (`src/components/EducationModule.vue`)
   - Mode selector with visual indicators
   - User profile display
   - Case library browser
   - Session controls
   - Assessment timer

4. **Learn Tab Integration** (`src/components/ModulePanel.vue`)
   - Added as first tab in module panel
   - Proper icon and component registration

5. **Welcome Page Enhancement** (`src/components/WelcomePage.vue`)
   - Skill level selector (Beginner/Intermediate/Advanced)
   - Educational mode introduction
   - Contextual descriptions

6. **Configuration** (`src/config.ts`)
   - Skill level definitions
   - Educational mode settings
   - Default configurations

### Phase 2: Socratic Tutor Integration ✅
1. **Socratic Tutor Store** (`src/store/socratic-tutor.ts`)
   - WebSocket connection to MedRAX2
   - Student action tracking
   - Conversation management
   - Visual cue system

2. **SocraticChat Component** (`src/components/education/SocraticChat.vue`)
   - Real-time chat interface
   - Connection status indicator
   - Message history display
   - Input handling
   - Visual feedback overlays

---

## 🚀 How to Test

### Prerequisites
```bash
# Navigate to the project directory
cd /Users/mac/RADSIM/volview-gtc2025-demo

# Install dependencies (if not already installed)
npm install

# Build the project
npm run build

# Start the development server
npm run dev
```

### Testing Steps

#### 1. Initial Load
- Open http://localhost:5173 in your browser
- **Expected**: Welcome page loads with skill level selector visible
- **Verify**: Three skill level buttons (Beginner/Intermediate/Advanced)

#### 2. Skill Level Selection
- Click each skill level button
- **Expected**: Button highlights and description changes
- **Verify**:
  - Beginner: "Perfect for medical students..."
  - Intermediate: "For residents..."
  - Advanced: "For fellows/attendings..."

#### 3. Learn Tab
- Click "Click to open local files" or drag & drop a DICOM file
- After loading, click the **Learn** tab (first tab in left panel)
- **Expected**: Education module opens with three sections:
  - Learning Mode selector
  - Your Profile
  - Educational Cases

#### 4. Learning Modes
- Toggle between Tutorial/Practice/Assessment modes
- **Expected**: Mode features update:
  - Tutorial: All features enabled (hints, AI tutor, validation)
  - Practice: Hints on request, no real-time validation
  - Assessment: No hints, no tutor, time limit shown

#### 5. Case Selection
- Browse available cases in the case library
- Click on a case
- **Expected**: Case details shown with learning objectives
- Click "Start Tutorial/Practice/Assessment" button

#### 6. Session Management
- Start a session
- **Expected in Tutorial Mode**:
  - Automatic hint appears after 3 seconds
  - Hints counter shows usage
- **Expected in Assessment Mode**:
  - Timer countdown appears
  - No hint button available

#### 7. Socratic Tutor (if MedRAX2 is running)
- Ensure MedRAX2 server is running on port 7860
- **Expected**: "Connected" chip shows in chat interface
- Type a message and send
- **Expected**: Message appears in conversation

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### Issue: Learn tab doesn't appear
**Solution**: Check that `EducationModule.vue` is properly imported in `ModulePanel.vue`

#### Issue: TypeScript errors about education types
**Solution**: Ensure `src/types/education.ts` exists and is exported in `src/types/index.ts`

#### Issue: Skill level selector not working
**Solution**: Check that education store is properly imported in `WelcomePage.vue`

#### Issue: Socratic tutor not connecting
**Solution**:
1. Verify MedRAX2 is running: `python app.py`
2. Check WebSocket URL in `.env`: `VITE_MEDRAX2_URL=ws://localhost:7860`
3. Check browser console for connection errors

#### Issue: Build fails with import errors
**Solution**: Check all import paths use `@/src/` alias correctly

---

## 🧪 Manual Test Checklist

### Welcome Page
- [ ] Skill level selector visible
- [ ] All three skill levels clickable
- [ ] Descriptions update on selection
- [ ] Selection persists when navigating

### Learn Tab
- [ ] Tab appears as first option
- [ ] Icon shows correctly (school icon)
- [ ] Tab is clickable and opens module

### Education Module
- [ ] Mode selector shows 3 modes
- [ ] Features indicators update per mode
- [ ] Profile shows selected skill level
- [ ] Case library filters by skill level
- [ ] Cases show difficulty badges
- [ ] Session controls work

### Learning Modes
- [ ] Tutorial: Automatic hints after delay
- [ ] Practice: Hint button available
- [ ] Assessment: Timer shows, no hints

### Data Persistence
- [ ] Skill level persists across sessions
- [ ] Mode selection remembered
- [ ] Progress tracked correctly

---

## 📊 Expected Console Output

When running successfully, you should see:
```
VITE v4.5.2  ready in XXX ms
➜  Local:   http://localhost:5173/
```

No TypeScript errors should appear during build.

---

## 🎨 Visual Verification

### Components Should Display:
1. **Welcome Page**: Clean layout with skill selector below drag & drop area
2. **Learn Tab**: First position in module panel with school icon
3. **Education Module**: Three cards (Mode, Profile, Cases)
4. **Mode Indicators**: Chips showing enabled/disabled features
5. **Case Library**: List items with modality icons and difficulty badges

### Color Coding:
- Beginner: Green (success)
- Intermediate: Orange (warning)
- Advanced: Red (error)

---

## 🔄 Integration with MedRAX2

To test the full Socratic tutor integration:

1. **Start MedRAX2 Backend**:
```bash
cd [medrax2-directory]
python app.py
```

2. **Configure Connection**:
Create/update `.env` in VolView directory:
```
VITE_MEDRAX2_URL=ws://localhost:7860
```

3. **Test Connection**:
- Open Learn tab
- Check for "Connected" status in chat interface
- Send a test message

---

## 📝 Next Steps

### Remaining Implementation:
1. Visual feedback components (highlight overlays)
2. Integration with existing tool events
3. Ground truth validation system
4. Performance tracking dashboard
5. Certificate generation

### Enhancement Opportunities:
1. Add more educational cases
2. Implement progress saving
3. Add achievement badges
4. Create tutorial videos
5. Build assessment rubrics

---

## 🆘 Support

If you encounter issues:
1. Check browser console for errors
2. Verify all files were created correctly
3. Ensure dependencies are installed
4. Check TypeScript compilation: `npm run build`

---

*Document created: December 2024*
*RADSIM Version: 1.0.0*