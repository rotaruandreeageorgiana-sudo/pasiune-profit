import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: false
  }
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function upsertPremiumUser({
  email,
  stripe_customer_id = null,
  stripe_subscription_id = null,
  status = 'inactive'
}) {
  if (!email) throw new Error('Missing email');

  const res = await fetch(`${SUPABASE_URL}/rest/v1/premium_users`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      email,
      stripe_customer_id,
      stripe_subscription_id,
      status
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error: ${text}`);
  }
}

async function getCustomerEmail(customerId) {
  if (!customerId) return null;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer && !customer.deleted) return customer.email || null;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  let event;

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];

    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const email =
          session.customer_details?.email ||
          session.customer_email ||
          await getCustomerEmail(session.customer);

        await upsertPremiumUser({
          email,
          stripe_customer_id: session.customer || null,
          stripe_subscription_id: session.subscription || null,
          status: 'active'
        });
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const email =
          invoice.customer_email ||
          await getCustomerEmail(invoice.customer);

        await upsertPremiumUser({
          email,
          stripe_customer_id: invoice.customer || null,
          stripe_subscription_id: invoice.subscription || null,
          status: 'active'
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const email =
          invoice.customer_email ||
          await getCustomerEmail(invoice.customer);

        await upsertPremiumUser({
          email,
          stripe_customer_id: invoice.customer || null,
          stripe_subscription_id: invoice.subscription || null,
          status: 'inactive'
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const email = await getCustomerEmail(subscription.customer);

        await upsertPremiumUser({
          email,
          stripe_customer_id: subscription.customer || null,
          stripe_subscription_id: subscription.id || null,
          status: 'inactive'
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const email = await getCustomerEmail(subscription.customer);

        const activeStatuses = ['active', 'trialing'];
        const nextStatus = activeStatuses.includes(subscription.status)
          ? 'active'
          : 'inactive';

        await upsertPremiumUser({
          email,
          stripe_customer_id: subscription.customer || null,
          stripe_subscription_id: subscription.id || null,
          status: nextStatus
        });
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    return res.status(500).json({
      error: 'Webhook processing failed',
      details: err.message
    });
  }
}
