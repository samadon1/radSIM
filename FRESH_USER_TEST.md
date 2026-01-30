# Fresh User Baseline Test

## Test User Credentials
- **Email**: `eaqqw@merepost.com`
- **Password**: `eaqqw@merepost.com`

## Quick Manual Test (15-20 minutes)

### Step 1: Login

1. Open http://localhost:5173/login
2. Enter credentials:
   - Email: `eaqqw@merepost.com`
   - Password: `eaqqw@merepost.com`
3. Click "Login"

### Step 2: Verify Fresh Start

On the dashboard, check the **Baseline Assessment** row.

**Expected for a brand new user:**
- Should show: `0/20 cases · Complete to unlock findings`
- Progress bar at 0%

**If it shows something else** (like 14/20), this user already has data in Firestore.

### Step 3: Complete Baseline

1. Click the **"Start Baseline"** button
2. Go through **all 20 cases**:
   - For each case, choose Normal or Abnormal
   - If you choose Abnormal and a diagnosis input appears, enter any finding
   - Click "Next Case" in the chat panel
3. Keep mental note: **Do any cases look like duplicates?**

### Step 4: Validate Session Complete Screen

After completing 20 cases, you'll see the **"Session Complete"** screen.

**✅ CRITICAL VALIDATION - Check These Numbers:**

| Stat | What to Check |
|------|---------------|
| **Cases Reviewed** | Should be **20** (or the number you completed) |
| **Correct** | Some number (e.g., 9) |
| **Incorrect** | Some number (e.g., 11) |
| **Correct + Incorrect** | **MUST EQUAL Cases Reviewed** ← FIX #2 |

**Example of CORRECT stats:**
- Cases Reviewed: 20
- Correct: 9
- Incorrect: 11
- ✅ 9 + 11 = 20 ✓

**Example of BROKEN stats (before fix):**
- Cases Reviewed: 20
- Correct: 7
- Incorrect: 8
- ❌ 7 + 8 = 15 ≠ 20 (5 cases missing!)

**📸 Take a screenshot of this screen!**

### Step 5: Validate Unique Cases (DevTools)

While still on the Session Complete screen:

1. Press F12 (or Cmd+Option+I on Mac) to open DevTools
2. Go to **Console** tab
3. Paste this code and press Enter:

```javascript
const learningDataKey = Object.keys(localStorage).find(k => k.includes('radsim_learning'));
const learningData = JSON.parse(localStorage.getItem(learningDataKey));
const reviewedCases = Object.values(learningData.learningData).filter(d => d.timesReviewed > 0);

console.log('=== VALIDATION RESULTS ===');
console.log(`Total unique cases reviewed: ${reviewedCases.length}`);
console.log('Case IDs:', reviewedCases.map(d => d.caseId).join(', '));
console.log('');
console.log('✅ FIX #1:', reviewedCases.length >= 20 ? 'PASSED - 20+ unique cases' : `FAILED - only ${reviewedCases.length} unique cases`);
```

**Expected Output:**
```
=== VALIDATION RESULTS ===
Total unique cases reviewed: 20
Case IDs: case_001, case_002, case_003, ... (20 different IDs)

✅ FIX #1: PASSED - 20+ unique cases
```

**❌ Before fix, you might have seen:**
```
Total unique cases reviewed: 5
(Only 5 unique cases, rest were duplicates)
```

### Step 6: Return to Dashboard

1. Click **"Improve Score"** button
2. You should return to the dashboard

**Verify:**
- Baseline Assessment row should now show: **"Baseline Complete"**
- Below it: **"Personalized learning unlocked"**
- Green checkmark icon ✓
- All finding rows below should be **unlocked** (not grayed out)

**📸 Take a screenshot of the dashboard!**

---

## Automated Test

To run the automated version of this test:

```bash
# Make sure dev server is running
npm run dev

# In another terminal
npm run test:e2e:dev -- --spec tests/specs/fresh-user-baseline.e2e.ts
```

The automated test will:
- Login as this user
- Check initial baseline status
- Complete 20 cases
- Validate session statistics
- Check for 20+ unique cases
- Verify baseline completion
- Save screenshots to `tests/screenshots/`

---

## What to Report

After testing, please share:

1. **Screenshot 1**: Session Complete screen (with stats)
2. **Screenshot 2**: Dashboard showing "Baseline Complete"
3. **Console output**: From the DevTools validation script
4. **Any issues**:
   - Did you see duplicate cases?
   - Did the stats add up correctly?
   - Did baseline complete after 20 cases?

---

## Expected Results Summary

✅ **All fixes working correctly:**

| Fix | What to Verify | Expected Result |
|-----|----------------|-----------------|
| **Fix #1: 20 Unique Cases** | DevTools console | Shows 20+ unique case IDs |
| **Fix #2: Session Stats** | Session Complete screen | Correct + Incorrect = Cases Reviewed |
| **Baseline Completion** | Dashboard | Shows "Baseline Complete" after 20 unique cases |

---

## If User Already Has Progress

If the user `eaqqw@merepost.com` already has data in Firestore (shows something other than 0/20), you can:

**Option A**: Test with what they have
- Just complete the remaining cases
- Verify the session stats still add up correctly
- Verify baseline completes when you hit 20 unique total cases

**Option B**: Create a new test user
- Use a different email (e.g., `test1@merepost.com`)
- Start completely fresh at 0/20

**Option C**: Clear this user's data
```javascript
// In console while logged in as eaqqw@merepost.com
const learningStore = useLearningStore();
learningStore.clearLearningData();
location.reload();
```

Then logout, login again, and it should show 0/20.
