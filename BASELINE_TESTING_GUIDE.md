# Baseline Validation Testing Guide

This guide will help you manually test the fixes for:
1. **Issue #1**: Only 5/20 cases showing as completed
2. **Issue #2**: Session statistics showing incorrect counts

## Prerequisites

1. Dev server should be running:
   ```bash
   npm run dev
   ```

2. Open browser at: http://localhost:5173

## Step-by-Step Testing

### 1. Clear Previous Progress

Before testing, clear your localStorage to start fresh:

1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Run this command:
   ```javascript
   Object.keys(localStorage).filter(k => k.includes('radsim')).forEach(k => localStorage.removeItem(k));
   location.reload();
   ```

### 2. Login

1. Navigate to http://localhost:5173/login
2. Login with test credentials:
   - Email: `yympeub@mailbox.in.ua`
   - Password: `yympeub@mailbox.in.ua`
3. You should be redirected to the dashboard

### 3. Verify Initial State

On the dashboard, you should see:
- **Baseline Assessment** row showing: `0/20 cases · Complete to unlock findings`
- The progress bar should be at 0%
- All finding rows below should be locked/grayed out

### 4. Start Baseline

1. Click the **"Start Baseline"** button (large hero button at top)
2. You should enter the learning session

### 5. Complete 20 Cases

For each case (1-20):

1. **Wait** for the image to load
2. **Choose** either Normal or Abnormal (try to answer correctly based on what you see)
3. If you selected Abnormal and there are findings:
   - A diagnosis input may appear
   - Enter any finding (e.g., "Cardiomegaly")
   - Press Enter
4. **Click** the "Next Case" button in the chat panel
5. **Repeat** until all 20 cases are complete

**IMPORTANT - Track This:**
- Keep count of cases you got right vs wrong
- Note if you see any duplicate cases (same image appearing twice)

### 6. Verify Session Complete Screen

After case #20, you should see the **Session Complete** screen.

**Check these statistics carefully:**

| Statistic | What to Verify |
|-----------|---------------|
| **Cases Reviewed** | Should show exactly **20** |
| **Correct** | Should show the number of cases you answered correctly |
| **Incorrect** | Should show the number of cases you answered incorrectly |
| **Correct + Incorrect** | Should equal **20** (every case counted) |

**Common Issues (now fixed):**
- ❌ BEFORE FIX: Correct + Incorrect might not equal 20 (normal cases weren't counted)
- ✅ AFTER FIX: Should always equal 20

Take a screenshot of this screen!

### 7. Return to Dashboard

1. Click **"Improve Score"** button
2. You should return to the dashboard

**Verify Baseline Completion:**
- The Baseline Assessment row should now show: **"Baseline Complete"**
- Below it should say: **"Personalized learning unlocked"**
- There should be a green checkmark icon
- All finding rows below should now be unlocked/clickable

### 8. Verify Unique Cases (Dev Tools Check)

To verify that 20 unique cases were presented (not just 5 repeated):

1. Open DevTools Console
2. Run this command:
   ```javascript
   const learningData = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.includes('radsim_learning'))));
   const reviewedCases = Object.values(learningData.learningData).filter(d => d.timesReviewed > 0);
   console.log('Unique cases reviewed:', reviewedCases.length);
   console.log('Case IDs:', reviewedCases.map(d => d.caseId));
   ```

**Expected Result:**
- Should show at least **20 unique case IDs**

**Common Issues (now fixed):**
- ❌ BEFORE FIX: Might only show 5-10 unique cases (duplicates were shown)
- ✅ AFTER FIX: Should show 20+ unique cases

## Quick Validation Checklist

Use this checklist to confirm all fixes are working:

- [ ] Started with 0/20 baseline progress
- [ ] Completed all 20 cases without seeing obvious duplicates
- [ ] Session Complete screen shows "Cases Reviewed: 20"
- [ ] Correct + Incorrect counts equal 20
- [ ] Dashboard shows "Baseline Complete"
- [ ] DevTools shows 20+ unique case IDs in learningData
- [ ] All finding rows are now unlocked on dashboard

## Expected Console Output

When you run the localStorage check, you should see something like:

```
Unique cases reviewed: 20
Case IDs: [
  "case_123",
  "case_456",
  "case_789",
  ... (20 unique IDs)
]
```

## Troubleshooting

### If you see fewer than 20 unique cases:

1. Make sure you're testing with the latest build:
   ```bash
   npm run build
   ```

2. Clear localStorage and browser cache completely

3. Check that the fix was applied correctly in:
   `src/store/learning.ts` line 339-433

### If session stats don't add up to 20:

1. Check that the fix was applied in:
   `src/store/learning.ts` line 533-569

2. Look in DevTools console for any errors during case submission

## Test Results Template

After testing, document your results:

```
Date: _______________
Build: Latest

✅ Issue #1 - Unique Cases:
   - Unique cases shown: ___ / 20
   - Any duplicates observed: Yes / No

✅ Issue #2 - Session Statistics:
   - Cases Reviewed: ___
   - Correct: ___
   - Incorrect: ___
   - Total (Correct + Incorrect): ___
   - Equals 20: Yes / No

✅ Baseline Completion:
   - Dashboard shows "Baseline Complete": Yes / No
   - Findings unlocked: Yes / No

Screenshot: (attach session complete screen)
```

## Automated Testing

To run the automated E2E test:

```bash
# Make sure dev server is running first
npm run dev

# In another terminal, run the test
npm run test:e2e:dev -- --spec tests/specs/baseline-validation.e2e.ts
```

The automated test will:
1. Clear localStorage
2. Login
3. Complete 20 cases
4. Validate statistics
5. Check baseline completion
6. Save screenshots to `tests/screenshots/`
