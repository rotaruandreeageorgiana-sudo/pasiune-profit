// api/create-checkout.js
// Vercel Serverless Function — creează sesiunea Stripe Checkout

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Mapare slug produs → Stripe Price ID + numele fișierului PDF
const PRODUCTS = {
  'claritate': {
    priceId: process.env.STRIPE_PRICE_CLARITATE,   // ex: price_1ABC...
    file: 'manual-claritate.pdf',
    name: 'Manual Claritate — Volumul 1',
  },
  'constructie': {
    priceId: process.env.STRIPE_PRICE_CONSTRUCTIE, // ex: price_1DEF...
    file: 'manual-constructie.pdf',
    name: 'Manual Construcție — Volumul 2',
  },
  'conversie': {
    priceId: process.env.STRIPE_PRICE_CONVERSIE,   // ex: price_1GHI...
    file: 'manual-conversie.pdf',
    name: 'Manual Conversie — Volumul 3',
  },
  'trilogie': {
    priceId: process.env.STRIPE_PRICE_TRILOGIE,    // ex: price_1JKL...
    file: 'trilogia-3c.pdf',
    name: 'Trilogia 3C — Pachet Complet',
  },
};

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { product } = req.body;

    if (!product || !PRODUCTS[product]) {
      return res.status(400).json({ error: 'Produs invalid.' });
    }

    const prod = PRODUCTS[product];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: prod.priceId,
          quantity: 1,
        },
      ],
      // După plată reușită → redirect cu session_id
      success_url: `${baseUrl}/download.html?session={CHECKOUT_SESSION_ID}&product=${product}`,
      cancel_url:  `${baseUrl}/?canceled=1`,
      metadata: {
        product,
        file: prod.file,
      },
      payment_intent_data: {
        metadata: {
          product,
          file: prod.file,
        },
      },
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: err.message });
  }
};
