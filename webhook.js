// api/stripe/webhook.js
// Vercel serverless function — handles Stripe webhook events
// Deployed at: POST /api/stripe/webhook
//
// Set in Stripe Dashboard → Webhooks → Endpoint URL:
//   https://your-domain.vercel.app/api/stripe/webhook
// Events to listen for:
//   checkout.session.completed
//   customer.subscription.deleted
//   invoice.payment_failed

import Stripe from 'stripe';
import { upsertPremiumUser } from '../../lib/supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET; // whsec_…

// Vercel: disable body parsing so we can verify raw signature
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  console.log(`[webhook] Received: ${event.type}`);

  try {
    switch (event.type) {

      // ── Payment completed via Stripe Checkout ──────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object;
        const email = session.customer_details?.email || session.customer_email;

        if (!email) {
          console.warn('[webhook] checkout.session.completed — no email found');
          break;
        }

        await upsertPremiumUser({
          email,
          stripeCustomerId:  session.customer,
          subscriptionId:    session.subscription,
          status:            'active'
        });

        console.log(`[webhook] ✅ Premium activated for: ${email}`);
        break;
      }

      // ── Subscription cancelled ──────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const customer = await stripe.customers.retrieve(sub.customer);
        const email = customer.email;

        if (email) {
          await upsertPremiumUser({
            email,
            stripeCustomerId: sub.customer,
            subscriptionId:   sub.id,
            status:           'cancelled'
          });
          console.log(`[webhook] ❌ Premium cancelled for: ${email}`);
        }
        break;
      }

      // ── Payment failed ──────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customer = await stripe.customers.retrieve(invoice.customer);
        const email = customer.email;

        if (email) {
          await upsertPremiumUser({
            email,
            stripeCustomerId: invoice.customer,
            subscriptionId:   invoice.subscription,
            status:           'payment_failed'
          });
          console.log(`[webhook] ⚠️ Payment failed for: ${email}`);
        }
        break;
      }

      default:
        // Ignore other events
        break;
    }
  } catch (err) {
    console.error('[webhook] Handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  return res.status(200).json({ received: true });
}
