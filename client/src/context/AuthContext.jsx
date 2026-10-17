import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
const AuthContext = createContext(null);
export function AuthProvider({ children }) { const [session, setSession] = useState(null); const [profile, setProfile] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { const token = localStorage.getItem('onequeue_token'); if (token) api('/auth/me').then(({ profile }) => setProfile(profile)).catch(() => localStorage.removeItem('onequeue_token')).finally(() => setLoading(false)); else setLoading(false); }, []);
  async function login(email, password) { const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); localStorage.setItem('onequeue_token', data.session.access_token); setSession(data.session); setProfile(data.profile); return data; }
  async function register(name, email, password) { const data = await api('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }); if (data.session) { localStorage.setItem('onequeue_token', data.session.access_token); setSession(data.session); const current = await api('/auth/me'); setProfile(current.profile); } return data; }
  async function logout() { localStorage.removeItem('onequeue_token'); setSession(null); setProfile(null); await supabase.auth.signOut().catch(() => {}); }
  return <AuthContext.Provider value={{ session, profile, loading, login, register, logout }}>{children}</AuthContext.Provider>; }
export const useAuth = () => useContext(AuthContext);
