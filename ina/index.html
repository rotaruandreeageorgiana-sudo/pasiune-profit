// api/stripe-webhook.js
// Primește confirmarea plății de la Stripe și activează INA Pro în Supabase

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = await import('stripe').then(m => m.default(process.env.STRIPE_SECRET_KEY));
  const sig    = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const buf = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end',  () => resolve(data));
      req.on('error', reject);
    });
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Procesăm doar plățile reușite
  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const session = event.data.object;
    const email = session.customer_email || session.receipt_email ||
                  (session.customer_details && session.customer_details.email);

    if (email) {
      try {
        // Inserăm sau actualizăm userul ca Pro în Supabase
        const supabaseUrl  = process.env.SUPABASE_URL || 'https://jeqxkxzckuabgeufiogv.supabase.co';
        const supabaseKey  = process.env.SUPABASE_SERVICE_KEY; // service key pentru write

        const dbRes = await fetch(`${supabaseUrl}/rest/v1/ina_pro_users`, {
          method: 'POST',
          headers: {
            'apikey':        supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type':  'application/json',
            'Prefer':        'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            email:      email,
            is_active:  true,
            activated_at: new Date().toISOString(),
            stripe_session_id: session.id
          })
        });

        if (!dbRes.ok) {
          console.error('Supabase write error:', await dbRes.text());
        } else {
          console.log(`INA Pro activat pentru: ${email}`);
        }
      } catch (err) {
        console.error('DB error:', err);
      }
    }
  }

  return res.status(200).json({ received: true });
}
