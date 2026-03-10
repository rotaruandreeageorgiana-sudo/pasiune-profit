// api/auth/login.js
// POST /api/auth/login
// Authenticates user and returns Supabase JWT session token

import { createClient } from '@supabase/supabase-js';
import { getPremiumUser } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email și parola sunt obligatorii.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Use anon key client for sign-in (not service role)
  const supabaseAnon = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  // Sign in with Supabase Auth
  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email: normalizedEmail,
    password
  });

  if (error) {
    console.error('[login] Auth error:', error.message);
    // Don't reveal whether email exists — generic message
    return res.status(401).json({
      error: 'Email sau parolă incorectă. Verifică datele și încearcă din nou.'
    });
  }

  // Double-check premium status (security layer — in case webhook was delayed)
  const premiumUser = await getPremiumUser(normalizedEmail);
  if (!premiumUser || premiumUser.status !== 'active') {
    return res.status(403).json({
      error: 'Contul tău nu are acces Premium activ. Verifică abonamentul sau contactează suportul.'
    });
  }

  // Return access token + user info
  return res.status(200).json({
    token:        data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at:   data.session.expires_at,
    user: {
      email:  data.user.email,
      id:     data.user.id
    }
  });
}
