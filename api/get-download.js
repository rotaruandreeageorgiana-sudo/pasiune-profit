// api/get-download.js
// Verifică sesiunea Stripe și returnează URL-ul de descărcare (o singură dată)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Mapare produs → cale PDF în repo (fișierele sunt în /public/pdfs/)
const PDF_FILES = {
  'claritate':  '/pdfs/manual-claritate.pdf',
  'constructie':'/pdfs/manual-constructie.pdf',
  'conversie':  '/pdfs/manual-conversie.pdf',
  'trilogie':   '/pdfs/trilogia-3c.pdf',
};

// Token-uri folosite (în memorie — se resetează la fiecare deploy)
// Pentru producție recomand KV store (Vercel KV / Upstash Redis)
const usedTokens = new Set();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).end();

  const { session, product } = req.query;

  if (!session || !product) {
    return res.status(400).json({ error: 'Parametri lipsă.' });
  }

  // Token unic = sessionId + product (împiedică refolosirea)
  const token = `${session}__${product}`;

  if (usedTokens.has(token)) {
    return res.status(403).json({
      error: 'Link-ul a fost deja folosit. Contactează-ne la contact@pasiune-profit.ro dacă ai nevoie de ajutor.',
      used: true,
    });
  }

  try {
    // Verifică cu Stripe că plata chiar a avut loc
    const stripeSession = await stripe.checkout.sessions.retrieve(session);

    if (stripeSession.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Plata nu a fost confirmată.' });
    }

    // Verifică că produsul din sesiune coincide cu ce se cere
    const paidProduct = stripeSession.metadata?.product;
    // Trilogia permite descărcarea oricărui volum individual
    const allowed =
      paidProduct === product ||
      paidProduct === 'trilogie';

    if (!allowed) {
      return res.status(403).json({ error: 'Produsul nu corespunde plății.' });
    }

    const filePath = PDF_FILES[product];
    if (!filePath) {
      return res.status(404).json({ error: 'Fișier negăsit.' });
    }

    // Marchează token-ul ca folosit
    usedTokens.add(token);

    // Returnează URL-ul direct al PDF-ului (găzduit în /public/pdfs/)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;
    const downloadUrl = `${baseUrl}${filePath}`;

    return res.status(200).json({ downloadUrl, product, filePath });

  } catch (err) {
    console.error('Download error:', err);
    return res.status(500).json({ error: 'Eroare server: ' + err.message });
  }
};
