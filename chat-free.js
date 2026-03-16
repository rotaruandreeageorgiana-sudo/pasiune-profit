// api/chat-free.js
// POST /api/chat-free
// Proxy OpenAI pentru chatul gratuit de pe landing page (primele 10 mesaje)
// Nu necesită autentificare — limita de mesaje e gestionată în browser

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, systemPrompt } = req.body || {};

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Date invalide.' });
  }

  // Limitează la maxim 20 mesaje în context (securitate)
  const trimmedMessages = messages.slice(-20);

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model:      'gpt-4o',
        max_tokens: 1000,
        messages:   [
          { role: 'system', content: systemPrompt || '' },
          ...trimmedMessages
        ]
      })
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.json().catch(() => ({}));
      console.error('[chat-free] OpenAI error:', err);
      return res.status(502).json({
        error: 'Eroare tehnică. Încearcă din nou.'
      });
    }

    const data = await openaiRes.json();
    const reply = data.choices?.[0]?.message?.content || '';

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('[chat-free] Error:', err);
    return res.status(500).json({ error: 'Eroare de conexiune.' });
  }
}
