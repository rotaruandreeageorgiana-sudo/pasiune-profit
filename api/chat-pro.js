import Stripe from 'stripe';

// INA Pro chat endpoint for Vercel
// Required env vars:
// - OPENAI_API_KEY
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(res, status, body) {
  return res.status(status).json(body);
}

function extractAssistantText(data) {
  return (
    data?.output_text ||
    data?.output
      ?.flatMap((item) => item?.content || [])
      ?.find((c) => c?.type === 'output_text')?.text ||
    data?.output?.[0]?.content?.[0]?.text ||
    null
  );
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.trim() }))
    .filter((m) => m.content.length > 0);
}

async function getSupabaseUserByToken(token) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) return null;
  return res.json();
}

async function checkIsActivePro(email) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ina_pro_users?email=eq.${encodeURIComponent(email)}&select=is_active,subscription_status`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  if (!res.ok) return { isActive: false, status: null };

  const rows = await res.json();
  const row = rows?.[0];
  return {
    isActive: row?.is_active === true,
    status: row?.subscription_status || null
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return json(res, 500, { error: 'Lipsește OPENAI_API_KEY în environment variables.' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: 'Lipsesc variabilele Supabase pentru verificarea contului Pro.' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return json(res, 401, { error: 'Lipsește tokenul de autentificare.' });
    }

    const user = await getSupabaseUserByToken(token);

    if (!user?.email) {
      return json(res, 401, { error: 'Sesiune invalidă. Te rugăm să te reconectezi.' });
    }

    const pro = await checkIsActivePro(user.email);

    if (!pro.isActive) {
      return json(res, 403, {
        error: 'Contul tău nu are un abonament INA Pro activ.',
        subscription_status: pro.status
      });
    }

    const body = req.body || {};
    const systemPrompt = typeof body.systemPrompt === 'string' && body.systemPrompt.trim()
      ? body.systemPrompt.trim()
      : 'Ești INA Pro, mentor AI avansat pentru business. Răspunzi în română, cu diacritice, clar, practic și structurat.';

    const messages = sanitizeMessages(body.messages);
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!messages.length && !message) {
      return json(res, 400, { error: 'Mesaj lipsă.' });
    }

    const inputMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    if (!messages.length && message) {
      inputMessages.push({ role: 'user', content: message });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const openaiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: inputMessages
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await openaiRes.json();

    if (!openaiRes.ok) {
      console.error('OpenAI chat-pro error:', JSON.stringify(data, null, 2));
      return json(res, openaiRes.status, {
        error: 'OpenAI error',
        details: data
      });
    }

    const text = extractAssistantText(data) || 'Nu am putut genera un răspuns acum.';

    return json(res, 200, {
      reply: text,
      content: [{ text }]
    });
  } catch (err) {
    console.error('chat-pro server error:', err);

    if (err?.name === 'AbortError') {
      return json(res, 408, {
        error: 'Request timeout',
        details: 'Serverul a răspuns prea greu.'
      });
    }

    return json(res, 500, {
      error: 'Server error',
      details: err?.message || 'Eroare necunoscută.'
    });
  }
}
