import { createClient } from '@supabase/supabase-js';
const runtime = window.ONEQUEUE_CONFIG || {};
const url = runtime.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
const anonKey = runtime.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder-anon-key');
