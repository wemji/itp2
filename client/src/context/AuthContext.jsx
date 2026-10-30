import { createContext, useContext, useEffect, useState } from 'react';
import { api, clearApiSecurityState } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [mfaVerified, setMfaVerified] = useState(null);
  const [authNotice, setAuthNotice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    window.localStorage.removeItem('onequeue_token');
    const expire = (showNotice = false) => {
      clearApiSecurityState();
      setSession(null);
      setProfile(null);
      setMfaVerified(null);
      setAuthNotice(showNotice ? 'Your session expired. Please sign in again.' : '');
    };
    const handleExpiration = () => expire(true);

    window.addEventListener('onequeue:session-expired', handleExpiration);
    api('/auth/me', { suppressSessionExpiry: true })
      .then(({ profile: currentProfile, mfaVerified: verified }) => {
        if (!mounted) return;
        setSession({ authenticated: true });
        setProfile(currentProfile);
        setMfaVerified(verified);
      })
      .catch(() => expire(false))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
      window.removeEventListener('onequeue:session-expired', handleExpiration);
    };
  }, []);

  async function login(email, password) {
    setAuthNotice('');
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    });
    setSession({ authenticated: true });
    setProfile(data.profile);
    setMfaVerified(data.mfaVerified);
    return { ...data, requiresMfa: !data.mfaVerified };
  }

  async function register(name, email, password) {
    setAuthNotice('');
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
    });
    if (data.authenticated) {
      const current = await api('/auth/me');
      setSession({ authenticated: true });
      setProfile(current.profile);
      setMfaVerified(current.mfaVerified);
    }
    return data;
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      clearApiSecurityState();
      setSession(null);
      setProfile(null);
      setMfaVerified(null);
      setAuthNotice('');
      const { supabase } = await import('../lib/supabase');
      await supabase.auth.signOut().catch(() => {});
    }
  }

  async function refreshMfa() {
    const current = await api('/auth/me');
    setProfile(current.profile);
    setMfaVerified(current.mfaVerified);
    return current.mfaVerified;
  }

  return (
    <AuthContext.Provider value={{ session, profile, mfaVerified, authNotice, loading, login, register, logout, refreshMfa }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
