# Quick Validation Script for Baseline Fixes

## Current Status

Based on the automated test, you currently have **14/20 cases** completed in your baseline.

## Option 1: Complete Remaining 6 Cases (Recommended)

Since you already have 14 cases done, let's complete the remaining 6 and verify the fixes work:

### Steps:

1. Open http://localhost:5173 in your browser
2. Login if needed
3. Click "Start Baseline" or "Continue Learning"
4. Complete the remaining **6 cases**
5. When you reach the Session Complete screen, **verify these stats**:

**Expected on Session Complete:**
- **Cases Reviewed**: Should show 6
- **Correct**: [some number]
- **Incorrect**: [some number]
- **Correct + Incorrect should equal 6** ← This is the key fix!

6. Click "Improve Score" to return to dashboard
7. Dashboard should now show **"Baseline Complete"** ← This verifies Fix #1

### Then Run This in Console:

After completing the baseline, open DevTools Console and run:

```javascript
// Check how many unique cases you've reviewed
const learningDataKey = Object.keys(localStorage).find(k => k.includes('radsim_learning'));
const learningData = JSON.parse(localStorage.getItem(learningDataKey));
const reviewedCases = Object.values(learningData.learningData).filter(d => d.timesReviewed > 0);

console.log('=== Baseline Validation Results ===');
console.log(`Unique cases reviewed: ${reviewedCases.length}`);
console.log('Case IDs:', reviewedCases.map(d => d.caseId));
console.log('');
console.log('✅ Fix #1 Status:', reviewedCases.length >= 20 ? 'PASSED - 20+ unique cases' : 'FAILED - fewer than 20 unique cases');
```

**Expected Result**: Should show 20+ unique case IDs (not just 5 repeated ones)

---

## Option 2: Start Fresh Baseline (Clean Test)

If you want to start completely fresh and test from 0/20:

### Clear All Progress:

Run this in DevTools Console:

```javascript
// Clear localStorage
Object.keys(localStorage).filter(k => k.includes('radsim')).forEach(k => {
  console.log('Removing:', k);
  localStorage.removeItem(k);
});

// Clear IndexedDB (if any)
indexedDB.databases().then(dbs => {
  dbs.forEach(db => {
    if (db.name.includes('firebase') || db.name.includes('radsim')) {
      console.log('Deleting DB:', db.name);
      indexedDB.deleteDatabase(db.name);
    }
  });
});

// Also need to clear Firebase data - logout and login again
console.log('Now logout and login again to clear Firebase cache');
```

Then:
1. Logout
2. Login again
3. You should see 0/20 baseline
4. Complete all 20 cases
5. Verify Session Complete screen shows Correct + Incorrect = 20
6. Verify dashboard shows "Baseline Complete"

---

## Quick Checklist

After either option above, verify these:

### ✅ Fix #1: 20 Unique Cases
- [ ] DevTools console shows 20+ unique case IDs
- [ ] No obvious duplicates during gameplay

### ✅ Fix #2: Session Stats
- [ ] Session Complete screen: Correct + Incorrect = Total Cases
- [ ] Every case is counted (no cases missing from counts)
- [ ] Normal cases (no findings) are counted correctly

### ✅ Baseline Complete
- [ ] Dashboard shows "Baseline Complete" after 20 unique cases
- [ ] All finding rows are unlocked
- [ ] Can start focused practice sessions

---

## Current Test User Progress

According to the automated test:
- **Test Account**: yympeub@mailbox.in.ua
- **Current Progress**: 14/20 cases completed
- **Remaining**: 6 more cases to complete baseline

The test also found:
- Pneumonia: 120 cases, 2 reviewed
- Cardiomegaly: 146 cases, 3 reviewed
- Effusion: 153 cases, 3 reviewed
- Atelectasis: 180 cases, 1 reviewed
- Pneumothorax: 98 cases, 2 reviewed
- Mass: 85 cases, 2 reviewed
- Nodule: 79 cases, 1 reviewed

Total reviews so far: 14 (matches the 14/20 progress)

---

## What to Report Back

After testing, please share:

1. **Screenshot** of Session Complete screen (showing the stats)
2. **Console output** from the validation script
3. **Screenshot** of Dashboard showing "Baseline Complete"
4. Any **issues or discrepancies** you notice

This will confirm both fixes are working correctly!
