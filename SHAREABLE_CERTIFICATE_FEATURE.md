# Shareable Certificate Feature

## Overview

New gamification feature that allows users to generate and share professional-looking achievement certificates after completing learning sessions, inspired by Duolingo's certificate system.

## Features

### 1. ✨ AI-Powered Insights (Gemini Integration)

**What it does:**
- Analyzes user performance (accuracy, average score, patterns)
- Generates personalized, encouraging feedback
- Explains what their scores mean
- Provides actionable recommendations

**How it works:**
- Uses Google Gemini API when available (falls back to rule-based if no API key)
- 2-3 sentence insights that are conversational and direct
- Tailored to user's learning stage and performance patterns

**Example Insights:**
- High performer (80%+): "Outstanding diagnostic skills! You're consistently identifying findings correctly..."
- Learning pattern: "You're showing strong pattern recognition on familiar cases, but struggling with unfamiliar findings..."
- Beginner: "Great start on your learning journey! Focus on the fundamentals..."

### 2. 📊 Professional Certificate Card

**Design Elements:**
- **Header**: RADSIM branding + "BASELINE COMPLETE" badge
- **User Section**: Avatar, name, completion date, unique certificate ID
- **Main Stats**:
  - Circular progress ring showing accuracy percentage
  - Grid with key metrics (cases, correct answers, avg time)
- **AI Insight**: Personalized feedback box with 💡 icon
- **Achievements**: Dynamic badges based on performance
  - ✓ Baseline Complete (20+ cases)
  - ⭐ High Performer (80%+ accuracy)
  - 🎯 Strongest Finding (best category)
- **Footer**: "Certified by RADSIM" + shareable link

**Visual Style:**
- Dark theme matching app aesthetic
- Gradient accents (blue for primary, green for achievement)
- Professional certificate look
- Optimized for social media sharing (600px width)

### 3. 📥 Download & Share Functionality

**Download:**
- Generates high-quality PNG image (2x scale for retina)
- Uses `html2canvas` library
- Downloads as `radsim-certificate-{ID}.png`
- Button shows "Generating..." during creation

**Social Sharing:**
- **Twitter/X**: Pre-filled tweet with stats and hashtags
- **LinkedIn**: Direct share link
- **Facebook**: Share dialog integration
- Custom share text highlighting achievements

**Share Text Example:**
```
I just completed my RADSIM baseline assessment! 📊

✓ 20 cases reviewed
✓ 45% accuracy

Improving my radiology skills one case at a time! 🏥
```

## Implementation Files

### New Components

**1. `src/components/learning/ShareableCertificate.vue`**
- Main certificate card component
- Download and share functionality
- AI insight integration
- Social media share buttons

### Modified Components

**1. `src/components/learning/SessionSummary.vue`**
- Added "Share Achievement" button (appears after 10+ cases)
- Certificate modal integration
- Button styling and layout updates

**2. `src/composables/useGemini.ts`**
- Added `generatePerformanceInsight()` function
- Reuses existing Gemini API configuration
- Rule-based fallback for users without API key

### Configuration

**`.env.example`** - Updated to clarify Gemini API key usage:
```bash
# Gemini API Key for AI-powered features (optional)
# Used for: expert analysis, performance insights, shareable certificates
VITE_GEMINI_API_KEY=your_api_key_here
```

**Note**: The Gemini API key is already configured in your `.env` file and is used across multiple features including expert analysis and performance insights.

## Usage

### For Users

1. **Complete a session** (10+ cases recommended)
2. On Session Complete screen, click **"Share Achievement"**
3. Certificate modal appears with:
   - Personalized stats
   - AI-generated insight
   - Your photo and name
4. **Download** the certificate image
5. **Share** on social media with one click

### Viewing Completed Baseline Achievement

After completing the baseline (20 cases), you can view your achievement certificate anytime:
1. Go to the dashboard
2. Click on **"Baseline Complete"** in the Practice by Finding section
3. The session summary screen opens showing your baseline achievement
4. Click **"Share Achievement"** to download or share your certificate

### For Developers

**Gemini API Integration:**
- Uses existing `useGemini()` composable from `src/composables/useGemini.ts`
- API key is already configured in `.env` (used for expert analysis feature)
- No additional setup needed if you're already using expert analysis

**Without API key:**
- Feature still works with rule-based insights
- Fallback provides good quality feedback
- No errors or degradation

## Technical Details

### Certificate Generation

```typescript
// Uses html2canvas to convert DOM to image
const canvas = await html2canvas(certificateCard.value, {
  backgroundColor: '#000000',
  scale: 2, // High quality for sharing
  logging: false,
});

const link = document.createElement('a');
link.download = `radsim-certificate-${certificateId}.png`;
link.href = canvas.toDataURL('image/png');
link.click();
```

### Gemini Integration

```typescript
// Uses existing Gemini composable
import { useGemini } from '@/src/composables/useGemini';

const gemini = useGemini();
const insight = await gemini.generatePerformanceInsight(stats);

// Prompt engineering for educational context
const prompt = `As a radiology education expert, provide a brief, encouraging insight...`;

// Reuses existing API configuration from useGemini composable
// Falls back to rule-based insights if no API key
```

### Social Sharing

```typescript
// Twitter/X
const text = `I just completed my RADSIM baseline assessment! 📊\n\n✓ ${stats.casesReviewed} cases...`;
const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
window.open(url, '_blank', 'width=550,height=420');

// LinkedIn
window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`, '_blank');

// Facebook
window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, '_blank');
```

## Dependencies

- **html2canvas**: Already in package.json ✓
- **Google Gemini API**: Optional, free tier available
- No new npm packages required

## Future Enhancements

### Potential Additions

1. **Certificate Hosting**
   - Public URLs for certificates
   - Verification system
   - Gallery of achievements

2. **Advanced AI Features**
   - Personalized study plan generation
   - Weakness identification
   - Progress tracking over time
   - Comparative analytics

3. **More Achievement Badges**
   - Streak milestones
   - Speed achievements
   - Perfect scores
   - Improvement awards

4. **Social Features**
   - Leaderboards
   - Community challenges
   - Collaborative learning

5. **Certificate Customization**
   - Theme options
   - Language selection
   - Custom branding (for institutions)

## Analytics Opportunities

Track engagement metrics:
- Certificate generation rate
- Download vs share ratio
- Social platform preferences
- Feature adoption by user segment
- Impact on user retention

## Accessibility

- High contrast design
- Screen reader friendly (when viewing in app)
- Keyboard navigation for modal
- Alternative text for images
- Mobile responsive

## Testing Checklist

- [ ] Certificate generates correctly with user data
- [ ] Download works on all browsers
- [ ] Social share links open correctly
- [ ] AI insights are relevant and encouraging
- [ ] Fallback works without API key
- [ ] Mobile responsive design
- [ ] Works with different stat ranges
- [ ] Modal closes properly
- [ ] Image quality is high enough for sharing
- [ ] Achievement badges show correctly

## Example Use Cases

### New User (Low Scores)
- **Accuracy**: 35%
- **Insight**: "Great start on your learning journey! Focus on the fundamentals..."
- **Badges**: ✓ Baseline Complete
- **Encouragement**: Positive, growth-oriented message

### Intermediate User (Moderate Scores)
- **Accuracy**: 65%
- **Insight**: "Solid progress! You're building a strong foundation..."
- **Badges**: ✓ Baseline Complete, 🎯 Strongest: Pneumonia
- **Encouragement**: Acknowledges progress, suggests next steps

### Advanced User (High Scores)
- **Accuracy**: 85%
- **Insight**: "Outstanding diagnostic skills! You're consistently..."
- **Badges**: ✓ Baseline Complete, ⭐ High Performer, 🎯 Strongest: Atelectasis
- **Encouragement**: Celebrates achievement, encourages consistency

## Cost Considerations

### Gemini API
- **Free Tier**: 60 requests per minute
- **Cost**: Free for reasonable usage
- **Fallback**: Rule-based system if quota exceeded

### Hosting (Future)
- Certificate images: ~200KB each
- Could use Firebase Storage
- Minimal cost at scale

## Conclusion

This feature adds significant gamification value with minimal implementation cost. It:
- Encourages users to complete sessions
- Provides sharable social proof
- Delivers personalized insights
- Enhances brand visibility through shares
- Works gracefully with or without AI API

**Ready to ship!** 🚀
