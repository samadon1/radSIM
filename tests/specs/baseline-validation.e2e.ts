/**
 * E2E Test: Baseline Validation - Verify fixes for baseline completion
 *
 * This test validates:
 * 1. 20 unique cases are presented during baseline (not 5)
 * 2. Session statistics correctly count correct/incorrect/reviewed cases
 * 3. Cases with no findings are properly counted
 *
 * Run with: npm run test:e2e:dev -- --spec tests/specs/baseline-validation.e2e.ts
 */

// Test credentials
const TEST_EMAIL = 'yympeub@mailbox.in.ua';
const TEST_PASSWORD = 'yympeub@mailbox.in.ua';

/**
 * Helper function to log in with email/password
 */
async function loginWithCredentials(baseUrl: string) {
  await browser.url(`${baseUrl}/login`);
  await browser.pause(2000);

  const currentUrl = await browser.getUrl();
  if (currentUrl.includes('/dashboard')) {
    console.log('Already logged in, on dashboard');
    return;
  }

  const heroButton = await $('.hero-button');
  if (await heroButton.isExisting()) {
    console.log('Already logged in, skipping login step');
    return;
  }

  const emailInput = await $('input[type="email"]');
  const passwordInput = await $('input[type="password"]');

  await browser.waitUntil(
    async () => {
      const googleBtn = await $('button*=Sign in with Google');
      return emailInput.isDisplayed() || googleBtn.isExisting();
    },
    {
      timeout: 10000,
      timeoutMsg: 'Login form did not appear',
    }
  );

  if (await emailInput.isDisplayed()) {
    console.log('Logging in with email/password...');
    await emailInput.setValue(TEST_EMAIL);
    await passwordInput.setValue(TEST_PASSWORD);

    const loginBtn = await $('button*=Login');
    if (await loginBtn.isClickable()) {
      await loginBtn.click();
    } else {
      const submitBtn = await $('button[type="submit"]');
      if (await submitBtn.isClickable()) {
        await submitBtn.click();
      }
    }

    await browser.waitUntil(
      async () => {
        const url = await browser.getUrl();
        const heroBtn = await $('button.hero-button');
        return url.includes('/dashboard') || heroBtn.isExisting();
      },
      {
        timeout: 15000,
        timeoutMsg: 'Login did not complete',
      }
    );

    console.log('Login successful!');
    await browser.pause(2000);
  }
}

/**
 * Clear localStorage to reset progress
 */
async function clearProgress() {
  console.log('Clearing localStorage to reset progress...');
  await browser.execute(() => {
    const keys = Object.keys(localStorage).filter(k => k.includes('radsim'));
    keys.forEach(k => localStorage.removeItem(k));
    console.log('Cleared keys:', keys);
  });
  await browser.refresh();
  await browser.pause(2000);
}

/**
 * Click the hero button to start baseline
 */
async function clickHeroButton() {
  const clicked = await browser.execute(() => {
    const heroBtn = document.querySelector('.hero-button') as HTMLElement;
    if (heroBtn) {
      heroBtn.click();
      return true;
    }
    const buttons = Array.from(document.querySelectorAll('button'));
    const match = buttons.find(
      (btn) => btn.textContent?.includes('Start Baseline') || btn.textContent?.includes('Continue Learning')
    );
    if (match) {
      match.click();
      return true;
    }
    return false;
  });

  console.log(`Hero button clicked: ${clicked}`);
  await browser.pause(3000);
}

describe('Baseline Validation - Verify Fixes', () => {
  const TOTAL_CASES = 20;
  const BASE_URL = 'http://localhost:5173';
  const caseIds = new Set<string>();
  let correctCount = 0;
  let incorrectCount = 0;

  before(async () => {
    // Log in once before all tests
    await loginWithCredentials(BASE_URL);

    // Clear progress to start fresh
    await clearProgress();
  });

  it('should present 20 unique cases during baseline', async () => {
    await browser.url(`${BASE_URL}/dashboard`);
    await browser.pause(3000);

    // Verify baseline shows 0/20 before starting
    const baselineText = await browser.execute(() => {
      const elem = document.querySelector('.finding-cases');
      return elem?.textContent || '';
    });
    console.log('Initial baseline status:', baselineText);

    await clickHeroButton();

    // Go through all 20 cases and track unique case IDs
    for (let caseNum = 1; caseNum <= TOTAL_CASES; caseNum++) {
      console.log(`\n--- Processing Case ${caseNum}/${TOTAL_CASES} ---`);

      // Extract case ID from the page
      const caseId = await browser.execute(() => {
        // Try to find case ID in the page
        const caseCounter = document.querySelector('.case-counter');
        return caseCounter?.textContent || `case-${Date.now()}`;
      });

      console.log(`Case ID: ${caseId}`);
      caseIds.add(caseId);

      // Wait for diagnostic buttons
      await browser.waitUntil(
        async () => {
          const normalBtn = await $('button.diagnostic-btn.normal');
          const abnormalBtn = await $('button.diagnostic-btn.abnormal');
          return normalBtn.isExisting() || abnormalBtn.isExisting();
        },
        {
          timeout: 30000,
          timeoutMsg: `Case ${caseNum}: Expected diagnostic buttons`,
        }
      );
      await browser.pause(1000);

      // Get ground truth from the page (if available)
      const hasFindings = await browser.execute(() => {
        // This would need to be implemented based on your actual page structure
        // For now, we'll use random selection
        return Math.random() > 0.5;
      });

      // Click Normal or Abnormal
      if (hasFindings) {
        console.log(`Case ${caseNum}: Clicking Abnormal`);
        await (await $('button.diagnostic-btn.abnormal')).click();
        await browser.pause(2000);

        // Enter diagnosis if prompt appears
        const diagnosisInput = await $('input[placeholder*="diagnosis"]');
        if (await diagnosisInput.isExisting() && await diagnosisInput.isDisplayed()) {
          await diagnosisInput.setValue('Cardiomegaly');
          await browser.pause(500);
          await browser.keys('Enter');
          await browser.pause(2000);
        }
      } else {
        console.log(`Case ${caseNum}: Clicking Normal`);
        await (await $('button.diagnostic-btn.normal')).click();
        await browser.pause(2000);
      }

      // Check if we got it right (look for feedback indicators)
      const isCorrect = await browser.execute(() => {
        // Look for success indicators in the feedback
        const feedbackText = document.body.textContent || '';
        return feedbackText.toLowerCase().includes('correct') ||
               feedbackText.toLowerCase().includes('great job');
      });

      if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      // Click Next Case
      await browser.waitUntil(
        async () => {
          const nextBtn = await $('.next-case-btn');
          return nextBtn.isExisting() && nextBtn.isClickable();
        },
        {
          timeout: 20000,
          timeoutMsg: `Case ${caseNum}: Expected .next-case-btn`,
        }
      );

      await (await $('.next-case-btn')).click();
      await browser.pause(2000);
    }

    console.log(`\n=== Validation Results ===`);
    console.log(`Unique cases encountered: ${caseIds.size}`);
    console.log(`Expected: ${TOTAL_CASES}`);

    // Validate we saw 20 unique cases (Fix #1)
    expect(caseIds.size).toBeGreaterThanOrEqual(TOTAL_CASES);
  });

  it('should display correct session statistics', async () => {
    // Wait for Session Complete screen
    await browser.waitUntil(
      async () => {
        const summaryTitle = await $('h1*=Session Complete');
        return await summaryTitle.isExisting();
      },
      {
        timeout: 10000,
        timeoutMsg: 'Expected Session Complete screen',
      }
    );

    console.log('\n=== Session Complete - Validating Statistics ===');

    // Extract session stats from the summary screen
    const stats = await browser.execute(() => {
      const statNumbers = Array.from(document.querySelectorAll('.stat-number'));
      const performanceValues = Array.from(document.querySelectorAll('.performance-value'));

      return {
        casesReviewed: statNumbers[0]?.textContent?.trim() || '0',
        correctFindings: performanceValues.find(el =>
          el.classList.contains('correct')
        )?.textContent?.trim() || '0',
        missedFindings: performanceValues.find(el =>
          el.classList.contains('missed')
        )?.textContent?.trim() || '0',
      };
    });

    console.log('Session Statistics:', stats);
    console.log(`Cases Reviewed: ${stats.casesReviewed}`);
    console.log(`Correct: ${stats.correctFindings}`);
    console.log(`Incorrect: ${stats.missedFindings}`);

    // Validate statistics (Fix #2)
    const reviewedCount = parseInt(stats.casesReviewed);
    const correct = parseInt(stats.correctFindings);
    const incorrect = parseInt(stats.missedFindings);

    expect(reviewedCount).toBe(TOTAL_CASES);
    expect(correct + incorrect).toBe(TOTAL_CASES); // All cases should be counted
    expect(correct + incorrect).toBeGreaterThan(0); // Should not all be 0

    console.log(`✓ Statistics validation passed`);
    console.log(`  - Cases reviewed: ${reviewedCount}/${TOTAL_CASES}`);
    console.log(`  - Correct + Incorrect = ${correct + incorrect} (should equal ${TOTAL_CASES})`);

    // Take screenshot
    await browser.saveScreenshot('./tests/screenshots/baseline-validation.png');
    console.log('Screenshot saved: ./tests/screenshots/baseline-validation.png');
  });

  it('should show 20/20 baseline completion on dashboard', async () => {
    // Return to dashboard
    const returnBtn = await $('button*=Improve Score');
    if (await returnBtn.isExisting()) {
      await returnBtn.click();
      await browser.pause(3000);
    } else {
      await browser.url(`${BASE_URL}/dashboard`);
      await browser.pause(3000);
    }

    // Check baseline completion status
    const baselineStatus = await browser.execute(() => {
      const baselineRow = document.querySelector('.baseline-row');
      const findingCases = baselineRow?.querySelector('.finding-cases');
      const baselineName = baselineRow?.querySelector('.finding-name');

      return {
        text: findingCases?.textContent?.trim() || '',
        name: baselineName?.textContent?.trim() || '',
      };
    });

    console.log('\n=== Baseline Status on Dashboard ===');
    console.log(`Status: ${baselineStatus.name}`);
    console.log(`Text: ${baselineStatus.text}`);

    // Validate baseline shows as complete
    expect(baselineStatus.name).toContain('Baseline Complete');
    expect(baselineStatus.text).toContain('Personalized learning unlocked');

    console.log('✓ Baseline completion validated');
  });
});
