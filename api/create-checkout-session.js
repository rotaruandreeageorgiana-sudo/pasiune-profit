import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: 'Email lipsă' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1
        }
      ],
      success_url: 'https://pasiune-profit.ro/ina-pro?checkout=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://pasiune-profit.ro/ina-pro?checkout=cancel',
      metadata: {
        email
      }
    });

    return res.status(200).json({
      url: session.url
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Checkout session error',
      details: err.message
    });
  }
}
