/**
 * E2E Test: Learning Session - Go through 20 cases
 *
 * This test automates going through a learning session with 20 cases.
 * It clicks Normal/Abnormal randomly or based on ground truth,
 * then clicks Next Case until session is complete.
 *
 * Run with: npm run test:e2e:dev -- --spec tests/specs/learning-session.e2e.ts
 */

// Test credentials
const TEST_EMAIL = 'yympeub@mailbox.in.ua';
const TEST_PASSWORD = 'yympeub@mailbox.in.ua';

/**
 * Helper function to log in with email/password
 */
async function loginWithCredentials(baseUrl: string) {
  // Navigate to the login page
  await browser.url(`${baseUrl}/login`);
  await browser.pause(2000);

  // Check if we're already logged in (redirected to dashboard)
  const currentUrl = await browser.getUrl();
  if (currentUrl.includes('/dashboard')) {
    console.log('Already logged in, on dashboard');
    return;
  }

  // Check if hero-button exists (dashboard specific button)
  const heroButton = await $('.hero-button');
  if (await heroButton.isExisting()) {
    console.log('Already logged in, skipping login step');
    return;
  }

  // Look for login form
  const emailInput = await $('input[type="email"]');
  const passwordInput = await $('input[type="password"]');

  // Wait for login form to be visible
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

  // If email input exists, use email/password login
  if (await emailInput.isDisplayed()) {
    console.log('Logging in with email/password...');
    await emailInput.setValue(TEST_EMAIL);
    await passwordInput.setValue(TEST_PASSWORD);

    // Click login button
    const loginBtn = await $('button*=Login');
    if (await loginBtn.isClickable()) {
      console.log('Clicking Login button...');
      await loginBtn.click();
    } else {
      // Try alternative selectors
      const submitBtn = await $('button[type="submit"]');
      if (await submitBtn.isClickable()) {
        console.log('Clicking submit button...');
        await submitBtn.click();
      }
    }

    // Wait for login to complete and redirect to dashboard
    await browser.waitUntil(
      async () => {
        const url = await browser.getUrl();
        const heroBtn = await $('button.hero-button');
        return url.includes('/dashboard') || heroBtn.isExisting();
      },
      {
        timeout: 15000,
        timeoutMsg: 'Login did not complete - not redirected to dashboard',
      }
    );

    console.log('Login successful!');
    await browser.pause(2000); // Allow dashboard to fully load
  }
}

/**
 * Helper function to click the hero button on the dashboard.
 * Tries multiple approaches since the button has nested elements.
 */
async function clickHeroButton() {
  // Debug: log all buttons on the page to see what's available
  const buttonInfo = await browser.execute(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.map((btn, i) => `  Button ${i}: text="${btn.textContent?.trim()}", class="${btn.className}"`);
  });
  console.log(`Found buttons on page:\n${buttonInfo.join('\n')}`);

  // Try to find and click the hero button using JavaScript directly
  const clicked = await browser.execute(() => {
    // Approach 1: Find by class
    const heroBtn = document.querySelector('.hero-button') as HTMLElement;
    if (heroBtn) {
      heroBtn.click();
      return 'clicked .hero-button';
    }
    // Approach 2: Find button containing "Start Baseline" or "Continue Learning"
    const buttons = Array.from(document.querySelectorAll('button'));
    const match = buttons.find(
      (btn) => btn.textContent?.includes('Start Baseline') || btn.textContent?.includes('Continue Learning')
    );
    if (match) {
      match.click();
      return `clicked button with text: ${match.textContent?.trim()}`;
    }
    return 'no button found';
  });

  console.log(`clickHeroButton result: ${clicked}`);
  await browser.pause(3000);

  // Verify we left the dashboard
  const url = await browser.getUrl();
  if (url.includes('/dashboard')) {
    console.log('WARNING: Still on dashboard after clicking hero button. Trying again...');
    // Try one more time with a direct navigation approach
    const retryClicked = await browser.execute(() => {
      const btn = document.querySelector('.hero-button') as HTMLElement;
      if (btn) {
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return 'dispatched click event on .hero-button';
      }
      return 'no .hero-button found on retry';
    });
    console.log(`Retry result: ${retryClicked}`);
    await browser.pause(3000);
  }
}

describe('Learning Session - 20 Cases', () => {
  const TOTAL_CASES = 20;
  const BASE_URL = 'http://localhost:5173'; // Vite dev server default

  beforeEach(async () => {
    // Log in before each test
    await loginWithCredentials(BASE_URL);
  });

  it('should complete a baseline session with 20 cases', async () => {
    // Step 1: Navigate to Dashboard (user should be logged in from beforeEach)
    await browser.url(`${BASE_URL}/dashboard`);
    await browser.pause(3000);

    // Step 2: Click the hero button (Start Baseline / Continue Learning)
    await clickHeroButton();

    // Step 3: Go through each case
    for (let caseNum = 1; caseNum <= TOTAL_CASES; caseNum++) {
      console.log(`\n--- Processing Case ${caseNum}/${TOTAL_CASES} ---`);

      // Wait for the diagnostic buttons to load
      await browser.waitUntil(
        async () => {
          const normalBtn = await $('button.diagnostic-btn.normal');
          const abnormalBtn = await $('button.diagnostic-btn.abnormal');
          return normalBtn.isExisting() || abnormalBtn.isExisting();
        },
        {
          timeout: 30000,
          timeoutMsg: `Case ${caseNum}: Expected Normal/Abnormal buttons to appear`,
        }
      );
      await browser.pause(1000);

      // Step 4: Click Normal or Abnormal randomly
      const clickNormal = Math.random() > 0.5;
      if (clickNormal) {
        console.log(`Case ${caseNum}: Clicking Normal`);
        await (await $('button.diagnostic-btn.normal')).click();
      } else {
        console.log(`Case ${caseNum}: Clicking Abnormal`);
        await (await $('button.diagnostic-btn.abnormal')).click();
      }
      await browser.pause(2000);

      // Step 5: Handle diagnosis input if it appears (after clicking Abnormal correctly)
      const diagnosisInput = await $('input[placeholder*="diagnosis"]');
      if (await diagnosisInput.isExisting() && await diagnosisInput.isDisplayed()) {
        console.log(`Case ${caseNum}: Entering diagnosis...`);
        await diagnosisInput.setValue('Cardiomegaly');
        await browser.pause(500);
        await browser.keys('Enter');
        await browser.pause(2000);
      }

      // Step 6: Wait for the "Next Case" button in the CHAT PANEL (not the app bar)
      // The chat panel button has class "next-case-btn"
      await browser.waitUntil(
        async () => {
          const nextBtn = await $('.next-case-btn');
          return nextBtn.isExisting() && nextBtn.isClickable();
        },
        {
          timeout: 20000,
          timeoutMsg: `Case ${caseNum}: Expected .next-case-btn to appear in chat panel`,
        }
      );

      console.log(`Case ${caseNum}: Clicking Next Case (chat panel)`);
      await (await $('.next-case-btn')).click();
      await browser.pause(2000);
    }

    // Step 7: Session should be complete - check for Session Summary
    await browser.waitUntil(
      async () => {
        const summaryTitle = await $('h1*=Session Complete');
        return await summaryTitle.isExisting();
      },
      {
        timeout: 10000,
        timeoutMsg: 'Expected Session Complete screen to appear',
      }
    );

    console.log('\n=== Session Complete! ===');

    // Verify stats are displayed
    const casesReviewed = await $('.stat-number');
    expect(await casesReviewed.isExisting()).toBe(true);

    // Take a screenshot of the results
    await browser.saveScreenshot('./tests/screenshots/session-complete.png');

    console.log('Test passed! Screenshot saved.');
  });

  it('should complete a session clicking all Abnormal', async () => {
    await browser.url(`${BASE_URL}/dashboard`);
    await browser.pause(3000);

    // Click the hero button (Start Baseline / Continue Learning)
    await clickHeroButton();

    for (let caseNum = 1; caseNum <= TOTAL_CASES; caseNum++) {
      console.log(`\n--- Case ${caseNum}/${TOTAL_CASES} (All Abnormal) ---`);

      await browser.waitUntil(
        async () => {
          const abnormalBtn = await $('button.diagnostic-btn.abnormal');
          return abnormalBtn.isClickable();
        },
        { timeout: 30000 }
      );
      await browser.pause(500);

      console.log(`Case ${caseNum}: Clicking Abnormal`);
      await (await $('button.diagnostic-btn.abnormal')).click();
      await browser.pause(2000);

      // Handle diagnosis input if it appears
      const diagnosisInput = await $('input[placeholder*="diagnosis"]');
      if (await diagnosisInput.isExisting() && await diagnosisInput.isDisplayed()) {
        console.log(`Case ${caseNum}: Entering diagnosis...`);
        await diagnosisInput.setValue('Cardiomegaly');
        await browser.pause(500);
        await browser.keys('Enter');
        await browser.pause(2000);
      }

      // Wait for Next Case button in the chat panel
      await browser.waitUntil(
        async () => {
          const nextBtn = await $('.next-case-btn');
          return nextBtn.isExisting() && nextBtn.isClickable();
        },
        { timeout: 20000 }
      );

      console.log(`Case ${caseNum}: Clicking Next Case (chat panel)`);
      await (await $('.next-case-btn')).click();
      await browser.pause(2000);
    }

    // Verify session complete
    await browser.waitUntil(
      async () => {
        const summaryTitle = await $('h1*=Session Complete');
        return await summaryTitle.isExisting();
      },
      { timeout: 10000 }
    );

    await browser.saveScreenshot('./tests/screenshots/session-complete-all-abnormal.png');
    console.log('\n=== All Abnormal Session Complete! ===');
  });
});

/**
 * Helper test to quickly go through cases with minimal waits
 * Use this for faster iteration during development
 */
describe('Learning Session - Quick Mode', () => {
  const TOTAL_CASES = 20;
  const BASE_URL = 'http://localhost:5173';

  it('should speed-run through 20 cases', async () => {
    // Log in first
    await loginWithCredentials(BASE_URL);

    await browser.url(`${BASE_URL}/dashboard`);
    await browser.pause(2000);

    // Click the hero button (Start Baseline / Continue Learning)
    await clickHeroButton();

    for (let i = 1; i <= TOTAL_CASES; i++) {
      // Wait for diagnostic buttons
      await browser.waitUntil(
        async () => {
          const abnormalBtn = await $('button.diagnostic-btn.abnormal');
          return abnormalBtn.isExisting();
        },
        { timeout: 30000, timeoutMsg: `Case ${i}: Waiting for diagnostic buttons` }
      );
      await browser.pause(500);

      // Click Abnormal
      console.log(`Case ${i}: Clicking Abnormal`);
      await (await $('button.diagnostic-btn.abnormal')).click();
      await browser.pause(1500);

      // Handle diagnosis input if present
      try {
        const diagnosisInput = await $('input[placeholder*="diagnosis"]');
        if (await diagnosisInput.isDisplayed()) {
          await diagnosisInput.setValue('Cardiomegaly');
          await browser.keys('Enter');
          await browser.pause(1500);
        }
      } catch (e) {
        // No diagnosis input, continue
      }

      // Wait for Next Case in chat panel
      await browser.waitUntil(
        async () => {
          const nextBtn = await $('.next-case-btn');
          return nextBtn.isExisting();
        },
        { timeout: 20000, timeoutMsg: `Case ${i}: Waiting for .next-case-btn` }
      );

      await (await $('.next-case-btn')).click();
      await browser.pause(1500);

      console.log(`Completed case ${i}/${TOTAL_CASES}`);
    }

    await browser.pause(2000);
    console.log('Quick run complete!');
  });
});
