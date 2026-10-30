import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
if (required.some((key) => !process.env[key])) console.warn('Supabase environment variables are not fully configured.');
const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const anonKey = process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key';
export function createAuthClient() {
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
export const supabaseAuth = createAuthClient();
export const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key', { auth: { autoRefreshToken: false, persistSession: false } });
