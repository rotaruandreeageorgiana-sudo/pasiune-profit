// api/chat.js
// POST /api/chat
// Proxy securizat pentru OpenAI — cheia nu ajunge niciodată în browser
// Verifică token-ul utilizatorului înainte de a face apelul

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── 1. Verifică token-ul utilizatorului ─────────────────────────────────────
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Neautorizat. Te rog conectează-te.' });
  }

  // Verifică token cu Supabase
  try {
    const verifyRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': process.env.SUPABASE_ANON_KEY
      }
    });

    if (!verifyRes.ok) {
      return res.status(401).json({ error: 'Sesiune expirată. Te rog reconectează-te.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Eroare la verificarea sesiunii.' });
  }

  // ── 2. Extrage datele din request ───────────────────────────────────────────
  const { messages, systemPrompt } = req.body || {};

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Date invalide.' });
  }

  // ── 3. Apelează OpenAI pe server (cheia e secretă) ──────────────────────────
  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model:      'gpt-4o',
        max_tokens: 1500,
        messages:   [
          { role: 'system', content: systemPrompt || '' },
          ...messages
        ]
      })
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.json().catch(() => ({}));
      console.error('[chat] OpenAI error:', err);
      return res.status(502).json({
        error: 'Eroare de la OpenAI: ' + (err.error?.message || openaiRes.status)
      });
    }

    const data = await openaiRes.json();
    const reply = data.choices?.[0]?.message?.content || '';

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('[chat] Fetch error:', err);
    return res.status(500).json({ error: 'Eroare de conexiune cu OpenAI.' });
  }
}
