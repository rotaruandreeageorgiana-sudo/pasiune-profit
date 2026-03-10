// api/auth/verify.js
// GET /api/auth/verify
// Called by protected pages to validate a session token
// Returns { premium: true/false, email } or 401

import { createClient } from '@supabase/supabase-js';
import { getPremiumUser } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Verify JWT with Supabase
  const supabaseAnon = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Token invalid sau expirat.' });
  }

  // Check premium status in DB
  const premiumUser = await getPremiumUser(user.email);

  if (!premiumUser || premiumUser.status !== 'active') {
    return res.status(403).json({ error: 'Cont fără acces Premium activ.' });
  }

  return res.status(200).json({
    premium: true,
    email: user.email,
    userId: user.id
  });
}
