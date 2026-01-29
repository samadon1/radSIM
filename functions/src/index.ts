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
 */
export const paystackWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const rawBody = (req as functions.https.Request & { rawBody?: Buffer }).rawBody;
  const bodyString = rawBody ? rawBody.toString('utf8') : JSON.stringify(req.body);

  const hash = crypto
    .createHmac('sha512', paystackSecretKey)
    .update(bodyString)
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    console.error('Invalid Paystack webhook signature');
    res.status(400).send('Invalid signature');
    return;
  }

  const event = req.body;
  console.log(`Received Paystack event: ${event.event}`);

  try {
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;
      case 'subscription.create':
        await handleSubscriptionCreate(event.data);
        break;
      case 'subscription.not_renew':
      case 'subscription.disable':
        await handleSubscriptionDisable(event.data);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data);
        break;
      default:
        console.log(`Unhandled event type: ${event.event}`);
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Webhook processing failed');
  }
});
