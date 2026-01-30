import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

// Initialize Firebase Admin
admin.initializeApp();

// Paystack secret key from environment (.env file)
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';

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
