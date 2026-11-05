import { supabase, supabaseAuth } from '../supabase.js';

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Session expired. Please log in again.' });
  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
  if (!profile || !profile.is_active) return res.status(403).json({ error: 'This account is inactive.' });
  req.user = { ...user, profile };
  next();
}
export function optionalAuth(req, res, next) {
  if (!req.headers.authorization) return next();
  return requireAuth(req, res, next);
}
export function requireStaff(req, res, next) {
  if (!['admin', 'staff', 'registrar', 'finance'].includes(req.user?.profile?.role)) return res.status(403).json({ error: 'Staff access required.' });
  next();
}
export function requireAdmin(req, res, next) {
  if (req.user?.profile?.role !== 'admin') return res.status(403).json({ error: 'Administrator access required.' });
  next();
}
