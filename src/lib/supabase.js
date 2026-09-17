import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;

const DEVELOPER_GITHUB_ID = '279316239';
const DEVELOPER_GITHUB_USERNAME = 'waiswadaniel24';

export function getSupabaseUser(user) {
  if (!user) return null;
  const githubIdentity = (user.identities || []).find((identity) => identity.provider === 'github');
  const identityData = githubIdentity?.identity_data || {};
  const metadata = user.user_metadata || {};
  const githubUsername = identityData.user_name || identityData.preferred_username || metadata.user_name || metadata.preferred_username;
  const githubId = String(identityData.provider_id || identityData.sub || metadata.provider_id || '');
  const isGitHubUser = githubIdentity?.provider === 'github' || metadata.provider === 'github' || metadata.providers?.includes?.('github');
  const appRole = user.app_metadata?.role;
  const isDeveloper = isGitHubUser && (githubId === DEVELOPER_GITHUB_ID || githubUsername === DEVELOPER_GITHUB_USERNAME || appRole === 'developer');

  return {
    id: user.id,
    username: user.user_metadata?.username || user.email || 'User',
    email: user.email || '',
    role: user.app_metadata?.role || 'Staff',
    permissions: Array.isArray(user.app_metadata?.permissions) ? user.app_metadata.permissions : [],
    isDeveloper,
  };
}

export async function getOrCreateSchool() {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured') };
  const existing = await supabase.from('erp_schools').select('id, school_name, school_level').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (existing.error || existing.data) return existing;
  return supabase.from('erp_schools').insert({ school_name: 'SSEWASSWA School', school_level: 'Primary' }).select('id, school_name, school_level').single();
}

export async function listStudents(schoolId, filters = {}) {
  if (!supabase || !schoolId) return { data: [], error: null };
  let query = supabase.from('erp_students').select('id, first_name, last_name, other_name, admission_number, gender, class_id, student_type, guardian_phone, status, paycode, erp_classes(name)').eq('school_id', schoolId).neq('status', 'Deleted').order('first_name').limit(200);
  if (filters.classId) query = query.eq('class_id', filters.classId);
  if (filters.search) query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,admission_number.ilike.%${filters.search}%`);
  const result = await query;
  if (result.data) result.data = result.data.map((student) => ({ ...student, class_name: student.erp_classes?.name || '' }));
  return result;
}

export async function listClasses(schoolId) {
  if (!supabase || !schoolId) return { data: [], error: null };
  return supabase.from('erp_classes').select('id, name').eq('school_id', schoolId).order('name');
}

export async function saveStudent(schoolId, data, id) {
  if (!supabase || !schoolId) return { data: null, error: new Error('No Supabase school selected') };
  if (id) return supabase.from('erp_students').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).eq('school_id', schoolId).select().single();
  return supabase.from('erp_students').insert({ ...data, school_id: schoolId }).select().single();
}

export async function softDeleteStudent(schoolId, id) {
  if (!supabase) return { error: new Error('Supabase is not configured') };
  return supabase.from('erp_students').update({ status: 'Deleted', updated_at: new Date().toISOString() }).eq('id', id).eq('school_id', schoolId);
}

export async function generateStudentPaycodes(schoolId) {
  if (!supabase || !schoolId) return { data: { count: 0 }, error: null };
  const rows = await supabase.from('erp_students').select('id').eq('school_id', schoolId).is('paycode', null);
  if (rows.error) return rows;
  let count = 0;
  for (const row of rows.data || []) {
    const result = await supabase.from('erp_students').update({ paycode: `P${row.id.replaceAll('-', '').slice(0, 10).toUpperCase()}` }).eq('id', row.id).eq('school_id', schoolId);
    if (!result.error) count += 1;
  }
  return { data: { count }, error: null };
}

export function isElectronAvailable() {
  return typeof window !== 'undefined' && Boolean(window.electronAPI);
}

export function canUseSupabase() {
  return Boolean(supabase && isSupabaseConfigured);
}

export function normalizeError(error, fallback = 'Something went wrong') {
  return error?.message || fallback;
}

export { supabaseUrl };

export default supabase;
