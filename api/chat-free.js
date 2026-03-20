export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mesaj lipsă' });
    }

    const openaiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: `Ești INA, mentor AI pentru idei de business.
Răspunde clar, structurat, practic.

User: ${message}`
      })
    });

    const data = await openaiRes.json();

    // 🔴 IMPORTANT: vezi dacă OpenAI dă eroare
    if (!openaiRes.ok) {
      console.error('OpenAI error:', data);
      return res.status(500).json({
        error: 'OpenAI error',
        details: data
      });
    }

    const text =
      data.output?.[0]?.content?.[0]?.text ||
      'Nu am putut genera un răspuns.';

    return res.status(200).json({
      content: [{ text }]
    });

  } catch (err) {
    console.error('Server error:', err);

    return res.status(500).json({
      error: 'Server error',
      details: err.message
    });
  }
}
