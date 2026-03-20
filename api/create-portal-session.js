import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getCustomerIdByEmail(email) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ina_pro_users?email=eq.${encodeURIComponent(email)}&select=stripe_customer_id`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  const data = await res.json();
  return data?.[0]?.stripe_customer_id || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email lipsă' });
    }

    const customerId = await getCustomerIdByEmail(email);

    if (!customerId) {
      return res.status(404).json({
        error: 'Nu există customer Stripe pentru acest user'
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://pasiune-profit.ro/ina-pro'
    });

    return res.status(200).json({
      url: session.url
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Eroare portal',
      details: err.message
    });
  }
}
