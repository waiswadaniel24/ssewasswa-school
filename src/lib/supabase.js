import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;

export function getSupabaseUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.user_metadata?.username || user.email || 'User',
    email: user.email || '',
    role: user.user_metadata?.role || 'Staff',
    permissions: user.user_metadata?.permissions || [],
    isDeveloper: false,
  };
}
