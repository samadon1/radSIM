/* eslint-disable camelcase, @typescript-eslint/no-unused-vars */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

// Initialize Firebase Admin
admin.initializeApp();

// Environment variables
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';
const resendApiKey = process.env.RESEND_API_KEY || '';

// ============================================
// EMAIL VERIFICATION CODE FUNCTIONS
// ============================================

/**
 * Generate a 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send verification email using Resend
 */
async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  if (!resendApiKey) {
    console.log('No Resend API key configured. Code:', code);
    // In development, just log the code and return success
    return true;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'RADSIM <noreply@radsim.app>',
        to: [email],
        subject: 'Your RADSIM verification code',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; font-weight: 600; color: #1a1a1a; margin-bottom: 24px;">Verify your email</h1>
            <p style="font-size: 16px; color: #666; margin-bottom: 32px;">Enter this code to complete your RADSIM signup:</p>
            <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
              <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
            </div>
            <p style="font-size: 14px; color: #999;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send email:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}

/**
 * Send Verification Code
 * Called when user submits email/password during signup
 */
export const sendVerificationCode = functions.https.onCall(async (data, _context) => {
  const { email, password } = data;

  if (!email || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'Email and password are required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
  }

  // Validate password (min 6 characters for Firebase Auth)
  if (password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters');
  }

  // Check if email is already registered in Firebase Auth
  try {
    await admin.auth().getUserByEmail(email);
    // If we get here, user exists
    throw new functions.https.HttpsError('already-exists', 'An account with this email already exists');
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };
    if (firebaseError.code === 'auth/user-not-found') {
      // Good - email is not registered
    } else if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw our custom errors
    } else {
      console.error('Error checking user:', error);
      throw new functions.https.HttpsError('internal', 'Failed to verify email availability');
    }
  }

  // Generate verification code
  const code = generateVerificationCode();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Store pending verification in Firestore
  // Hash the password so it's not stored in plain text
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  await admin.firestore().collection('pendingVerifications').doc(email).set({
    code,
    passwordHash,
    expiresAt,
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Send the verification email
  const emailSent = await sendVerificationEmail(email, code);

  if (!emailSent && resendApiKey) {
    throw new functions.https.HttpsError('internal', 'Failed to send verification email');
  }

  console.log(`Verification code sent to ${email}`);

  return {
    success: true,
    message: 'Verification code sent',
    // Only include code in response if no email service (for testing)
    ...(resendApiKey ? {} : { code }),
  };
});

/**
 * Verify Code and Create Account
 * Called when user submits the 6-digit code
 */
export const verifyCodeAndCreateAccount = functions.https.onCall(async (data, _context) => {
  const { email, code, password } = data;

  if (!email || !code) {
    throw new functions.https.HttpsError('invalid-argument', 'Email and code are required');
  }

  // Get pending verification
  const verificationRef = admin.firestore().collection('pendingVerifications').doc(email);
  const verificationDoc = await verificationRef.get();

  if (!verificationDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'No pending verification found. Please request a new code.');
  }

  const verification = verificationDoc.data()!;

  // Check if expired
  if (Date.now() > verification.expiresAt) {
    await verificationRef.delete();
    throw new functions.https.HttpsError('deadline-exceeded', 'Verification code has expired. Please request a new code.');
  }

  // Check attempts (max 5)
  if (verification.attempts >= 5) {
    await verificationRef.delete();
    throw new functions.https.HttpsError('resource-exhausted', 'Too many attempts. Please request a new code.');
  }

  // Verify code
  if (verification.code !== code) {
    await verificationRef.update({
      attempts: admin.firestore.FieldValue.increment(1),
    });
    throw new functions.https.HttpsError('invalid-argument', 'Invalid verification code');
  }

  // Code is valid! Create the user account
  try {
    // Verify password hash matches (security check)
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (passwordHash !== verification.passwordHash) {
      throw new functions.https.HttpsError('invalid-argument', 'Password mismatch');
    }

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: true, // Mark as verified since they completed the code flow
    });

    // Create user document in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName: null,
      photoURL: null,
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Delete the pending verification
    await verificationRef.delete();

    // Create a custom token so the user can be signed in automatically
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    console.log(`Account created for ${email} (uid: ${userRecord.uid})`);

    return {
      success: true,
      message: 'Account created successfully',
      customToken,
      uid: userRecord.uid,
    };
  } catch (error: unknown) {
    console.error('Error creating account:', error);
    const errorWithCode = error as { code?: string };
    if (errorWithCode.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'An account with this email already exists');
    }
    throw new functions.https.HttpsError('internal', 'Failed to create account');
  }
});

/**
 * Resend Verification Code
 * Called when user requests a new code
 */
export const resendVerificationCode = functions.https.onCall(async (data, _context) => {
  const { email, password } = data;

  if (!email || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'Email and password are required');
  }

  // Check if there's an existing pending verification
  const verificationRef = admin.firestore().collection('pendingVerifications').doc(email);
  const verificationDoc = await verificationRef.get();

  if (verificationDoc.exists) {
    const verification = verificationDoc.data()!;
    // Rate limit: only allow resend after 60 seconds
    const createdAt = verification.createdAt?.toMillis() || 0;
    const timeSinceCreation = Date.now() - createdAt;
    if (timeSinceCreation < 60000) {
      const waitSeconds = Math.ceil((60000 - timeSinceCreation) / 1000);
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Please wait ${waitSeconds} seconds before requesting a new code`
      );
    }
  }

  // Generate new code and update/create verification
  const code = generateVerificationCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  await verificationRef.set({
    code,
    passwordHash,
    expiresAt,
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Send the verification email
  const emailSent = await sendVerificationEmail(email, code);

  if (!emailSent && resendApiKey) {
    throw new functions.https.HttpsError('internal', 'Failed to send verification email');
  }

  console.log(`New verification code sent to ${email}`);

  return {
    success: true,
    message: 'New verification code sent',
    ...(resendApiKey ? {} : { code }),
  };
});

// ============================================
// PAYSTACK SUBSCRIPTION FUNCTIONS
// ============================================

/**
 * Update user subscription data in Firestore
 */
async function updateUserSubscription(
  userId: string,
  data: {
    subscriptionTier?: string;
    subscriptionStatus?: string;
    paystackCustomerCode?: string;
    paystackSubscriptionCode?: string | null;
    subscriptionStartDate?: admin.firestore.FieldValue;
    subscriptionEndDate?: admin.firestore.FieldValue;
  }
) {
  const userRef = admin.firestore().collection('users').doc(userId);

  await userRef.update({
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Handle successful charge/payment
 */
async function handleChargeSuccess(data: {
  metadata?: { user_id?: string };
  customer?: { email?: string; customer_code?: string };
  subscription_code?: string;
}) {
  const userId = data.metadata?.user_id;
  const customerEmail = data.customer?.email;
  const customerCode = data.customer?.customer_code;

  console.log(`Charge successful for user: ${userId}, email: ${customerEmail}`);

  if (userId) {
    await updateUserSubscription(userId, {
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      paystackCustomerCode: customerCode,
      paystackSubscriptionCode: data.subscription_code || null,
      subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Updated subscription for user ${userId}`);
  } else if (customerEmail) {
    const usersRef = admin.firestore().collection('users');
    const snapshot = await usersRef.where('email', '==', customerEmail).get();

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      await updateUserSubscription(userDoc.id, {
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        paystackCustomerCode: customerCode,
        paystackSubscriptionCode: data.subscription_code || null,
        subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Updated subscription for user ${userDoc.id} (found by email)`);
    } else {
      console.warn(`No user found for email: ${customerEmail}`);
    }
  } else {
    console.warn('No user ID or email in charge data');
  }
}

/**
 * Handle subscription creation
 */
async function handleSubscriptionCreate(data: {
  customer?: { customer_code?: string; email?: string };
  subscription_code?: string;
}) {
  const customerCode = data.customer?.customer_code;
  const customerEmail = data.customer?.email;

  const usersRef = admin.firestore().collection('users');
  let snapshot = await usersRef.where('paystackCustomerCode', '==', customerCode).get();

  if (snapshot.empty && customerEmail) {
    snapshot = await usersRef.where('email', '==', customerEmail).get();
  }

  if (snapshot.empty) {
    console.warn(`No user found for Paystack customer: ${customerCode}`);
    return;
  }

  const userDoc = snapshot.docs[0];

  await updateUserSubscription(userDoc.id, {
    subscriptionTier: 'pro',
    subscriptionStatus: 'active',
    paystackSubscriptionCode: data.subscription_code,
    subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Subscription created for user ${userDoc.id}`);
}

/**
 * Handle subscription cancellation/disable
 */
async function handleSubscriptionDisable(data: {
  customer?: { customer_code?: string };
}) {
  const customerCode = data.customer?.customer_code;

  const usersRef = admin.firestore().collection('users');
  const snapshot = await usersRef.where('paystackCustomerCode', '==', customerCode).get();

  if (snapshot.empty) {
    console.warn(`No user found for Paystack customer: ${customerCode}`);
    return;
  }

  const userDoc = snapshot.docs[0];

  await updateUserSubscription(userDoc.id, {
    subscriptionStatus: 'canceled',
    subscriptionEndDate: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Subscription canceled for user ${userDoc.id}`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(data: {
  customer?: { customer_code?: string };
}) {
  const customerCode = data.customer?.customer_code;

  const usersRef = admin.firestore().collection('users');
  const snapshot = await usersRef.where('paystackCustomerCode', '==', customerCode).get();

  if (snapshot.empty) {
    console.warn(`No user found for Paystack customer: ${customerCode}`);
    return;
  }

  const userDoc = snapshot.docs[0];

  await updateUserSubscription(userDoc.id, {
    subscriptionStatus: 'past_due',
  });

  console.log(`Payment failed for user ${userDoc.id}`);
}

/**
 * Paystack Webhook Handler
 *
 * This function receives webhook events from Paystack and updates
 * the user's subscription status in Firestore.
 *
 * Events handled:
 * - charge.success: Payment successful
 * - subscription.create: Subscription created
 * - subscription.disable: Subscription canceled
 * - invoice.payment_failed: Payment failed
 *
 * Setup:
 * 1. Go to Paystack Dashboard → Settings → API Keys & Webhooks
 * 2. Set webhook URL to: https://<your-region>-<project-id>.cloudfunctions.net/paystackWebhook
 */
export const paystackWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const rawBody = (req as functions.https.Request & { rawBody?: Buffer }).rawBody;
  const bodyString = rawBody ? rawBody.toString('utf8') : JSON.stringify(req.body);

  console.log('Secret key length:', paystackSecretKey.length);
  console.log('Body string length:', bodyString.length);
  console.log('Received signature:', req.headers['x-paystack-signature']);

  const hash = crypto
    .createHmac('sha512', paystackSecretKey)
    .update(bodyString)
    .digest('hex');

  console.log('Computed hash:', hash);

  if (hash !== req.headers['x-paystack-signature']) {
    console.error('Invalid Paystack webhook signature');
    console.error('Expected:', req.headers['x-paystack-signature']);
    console.error('Got:', hash);
    res.status(400).send('Invalid signature');
    return;
  }

  const event = req.body;
  console.log(`Received Paystack event: ${event.event}`);

  try {
    switch (event.event) {
      case 'charge.success': {
        await handleChargeSuccess(event.data);
        break;
      }

      case 'subscription.create': {
        await handleSubscriptionCreate(event.data);
        break;
      }

      case 'subscription.not_renew':
      case 'subscription.disable': {
        await handleSubscriptionDisable(event.data);
        break;
      }

      case 'invoice.payment_failed': {
        await handlePaymentFailed(event.data);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Webhook processing failed');
  }
});
