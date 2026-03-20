export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, messages, systemPrompt } = req.body || {};

    const lastUserMessage =
      message ||
      (Array.isArray(messages)
        ? [...messages].reverse().find(m => m.role === 'user')?.content
        : '');

    if (!lastUserMessage) {
      return res.status(400).json({ error: 'Mesaj lipsă' });
    }

    const prompt = systemPrompt
      ? `${systemPrompt}\n\nUtilizator: ${lastUserMessage}`
      : `Ești INA, mentor AI pentru idei de business. Răspunde clar, cald și practic, în română.\n\nUtilizator: ${lastUserMessage}`;

    const openaiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: prompt
      })
    });

    const data = await openaiRes.json();

    if (!openaiRes.ok) {
      console.error('OpenAI error:', JSON.stringify(data, null, 2));
      return res.status(openaiRes.status).json({
        error: 'OpenAI error',
        details: data
      });
    }

    const text =
      data.output_text ||
      data.output?.flatMap(x => x.content || []).find(x => x.type === 'output_text')?.text ||
      data.output?.[0]?.content?.[0]?.text ||
      'Nu am putut genera un răspuns acum.';

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
