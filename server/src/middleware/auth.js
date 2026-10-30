import { supabase, supabaseAuth } from '../supabase.js';
import { getAuthTokens, setAuthCookies } from '../security.js';

export async function requireAuth(req, res, next) {
  let { accessToken, refreshToken } = getAuthTokens(req);
  if (!accessToken && !refreshToken) return res.status(401).json({ error: 'Authentication required.' });

  let { data: { user }, error } = accessToken
    ? await supabaseAuth.auth.getUser(accessToken)
    : { data: { user: null }, error: new Error('Missing access token') };

  if ((error || !user) && refreshToken) {
    const refreshed = await supabaseAuth.auth.refreshSession({ refresh_token: refreshToken });
    if (!refreshed.error && refreshed.data.session) {
      accessToken = refreshed.data.session.access_token;
      refreshToken = refreshed.data.session.refresh_token;
      setAuthCookies(req, res, refreshed.data.session);
      user = refreshed.data.user;
      error = null;
    }
  }

  if (error || !user) return res.status(401).json({ error: 'Session expired. Please log in again.' });
  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
  if (!profile || !profile.is_active) return res.status(403).json({ error: 'This account is inactive.' });
  req.authToken = accessToken;
  req.refreshToken = refreshToken;
  req.user = { ...user, profile };
  next();
}
export function requireStaff(req, res, next) {
  if (!['admin', 'staff'].includes(req.user?.profile?.role)) return res.status(403).json({ error: 'Staff access required.' });
  if (process.env.REQUIRE_STAFF_MFA !== 'false') {
    try {
      const claims = JSON.parse(Buffer.from(req.authToken.split('.')[1], 'base64url').toString('utf8'));
      if (claims.aal !== 'aal2') return res.status(403).json({ error: 'Multi-factor verification is required.', code: 'MFA_REQUIRED' });
    } catch {
      return res.status(401).json({ error: 'Session could not be verified.' });
    }
  }
  next();
}
export function requireAdmin(req, res, next) {
  if (req.user?.profile?.role !== 'admin') return res.status(403).json({ error: 'Administrator access required.' });
  if (process.env.REQUIRE_STAFF_MFA !== 'false') {
    try {
      const claims = JSON.parse(Buffer.from(req.authToken.split('.')[1], 'base64url').toString('utf8'));
      if (claims.aal !== 'aal2') return res.status(403).json({ error: 'Multi-factor verification is required.', code: 'MFA_REQUIRED' });
    } catch {
      return res.status(401).json({ error: 'Session could not be verified.' });
    }
  }
  next();
}
