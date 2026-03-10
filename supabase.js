// lib/supabase.js
// Shared Supabase admin client used by all API routes
// Uses service_role key — NEVER expose this to the browser

import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.SUPABASE_URL;
const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY; // server-only

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Return the premium_users row for this email, or null */
export async function getPremiumUser(email) {
  const { data, error } = await supabaseAdmin
    .from('premium_users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data ?? null;
}

/** Upsert a premium_users row (called by webhook) */
export async function upsertPremiumUser({ email, stripeCustomerId, subscriptionId, status }) {
  const { error } = await supabaseAdmin
    .from('premium_users')
    .upsert({
      email: email.toLowerCase().trim(),
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscriptionId,
      status,                          // 'active' | 'cancelled' | etc.
      updated_at: new Date().toISOString()
    }, { onConflict: 'email' });
  if (error) throw error;
}
