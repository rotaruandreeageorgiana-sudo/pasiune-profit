// api/auth/activate.js
// POST /api/auth/activate
// Called by activate.html after user sets their password
//
// Flow:
//   1. Verify email exists in premium_users with status='active'
//   2. Create Supabase Auth user (or update password if already exists)
//   3. Return a session token (Supabase JWT)

import { supabaseAdmin, getPremiumUser } from '../../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body ?? {};

  // ── Input validation ────────────────────────────────────────────────────────
  if (!email || !password) {
    return res.status(400).json({ error: 'Email și parola sunt obligatorii.' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Parola trebuie să aibă cel puțin 8 caractere.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // ── Check premium status ────────────────────────────────────────────────────
  let premiumUser;
  try {
    premiumUser = await getPremiumUser(normalizedEmail);
  } catch (err) {
    console.error('[activate] DB error:', err);
    return res.status(500).json({ error: 'Eroare server. Încearcă din nou.' });
  }

  if (!premiumUser) {
    return res.status(403).json({
      error: 'Această adresă de email nu are o plată activă. Verifică emailul folosit la checkout sau contactează suportul.'
    });
  }

  if (premiumUser.status !== 'active') {
    return res.status(403).json({
      error: `Contul tău nu este activ (status: ${premiumUser.status}). Contactează suportul pentru asistență.`
    });
  }

  // ── Create or update Supabase Auth user ─────────────────────────────────────
  try {
    // Check if user already exists in auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === normalizedEmail);

    let userId;

    if (existingUser) {
      // Update password for existing user
      const { data: updated, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password, email_confirm: true }
      );
      if (updateErr) throw updateErr;
      userId = existingUser.id;
    } else {
      // Create new auth user
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,  // skip email verification — Stripe already confirmed
        user_metadata: { premium: true }
      });
      if (createErr) throw createErr;
      userId = created.user.id;
    }

    // Mark activation in premium_users table
    await supabaseAdmin
      .from('premium_users')
      .update({ auth_user_id: userId, activated_at: new Date().toISOString() })
      .eq('email', normalizedEmail);

    // Generate a session token by signing in
    const { data: session, error: signInErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail
    });

    // Return success — the client will call /api/auth/login to get the real token
    return res.status(200).json({
      success: true,
      message: 'Cont activat cu succes.',
      // We don't return the token here — client signs in next
    });

  } catch (err) {
    console.error('[activate] Auth error:', err);
    // Friendly error messages for common cases
    if (err.message?.includes('already registered')) {
      return res.status(400).json({ error: 'Acest email este deja înregistrat. Mergi la pagina de login.' });
    }
    return res.status(500).json({ error: 'Eroare la crearea contului. Încearcă din nou.' });
  }
}
