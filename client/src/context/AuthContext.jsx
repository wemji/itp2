import { createContext, useContext, useEffect, useState } from 'react';
import { api, clearApiSecurityState } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [mfaVerified, setMfaVerified] = useState(null);
  const [authNotice, setAuthNotice] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadMfaStatus(currentProfile) {
    if (!['admin', 'staff'].includes(currentProfile?.role)) {
      setMfaVerified(true);
      return true;
    }
    const status = await api('/auth/mfa/status');
    const verified = status.currentLevel === 'aal2';
    setMfaVerified(verified);
    return verified;
  }

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
      .then(async ({ profile: currentProfile }) => {
        if (!mounted) return;
        setSession({ authenticated: true });
        setProfile(currentProfile);
        await loadMfaStatus(currentProfile);
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
    const verified = await loadMfaStatus(data.profile);
    return { ...data, requiresMfa: !verified };
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
      await loadMfaStatus(current.profile);
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

  return (
    <AuthContext.Provider value={{ session, profile, mfaVerified, authNotice, loading, login, register, logout, refreshMfa: () => loadMfaStatus(profile) }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
