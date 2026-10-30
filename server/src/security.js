import crypto from 'node:crypto';

const ACCESS_COOKIE = 'onequeue_access';
const REFRESH_COOKIE = 'onequeue_refresh';
const CSRF_COOKIE = 'onequeue_csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function parseCookies(req) {
  return String(req.headers.cookie || '')
    .split(';')
    .map((value) => value.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      const index = entry.indexOf('=');
      if (index === -1) return cookies;
      const key = decodeURIComponent(entry.slice(0, index));
      const value = decodeURIComponent(entry.slice(index + 1));
      cookies[key] = value;
      return cookies;
    }, {});
}

function cookieOptions(maxAge) {
  const sameSite = process.env.COOKIE_SAME_SITE || 'lax';
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
    sameSite,
    path: '/',
    maxAge,
  };
  if (process.env.COOKIE_DOMAIN) options.domain = process.env.COOKIE_DOMAIN;
  return options;
}

export function ensureCsrfToken(req, res) {
  const existing = parseCookies(req)[CSRF_COOKIE];
  const token = existing || crypto.randomBytes(32).toString('base64url');
  if (!existing) res.cookie(CSRF_COOKIE, token, cookieOptions(30 * 24 * 60 * 60 * 1000));
  return token;
}

export function setAuthCookies(req, res, session) {
  const accessMaxAge = Math.max(60, Number(session.expires_in || 3600)) * 1000;
  res.cookie(ACCESS_COOKIE, session.access_token, cookieOptions(accessMaxAge));
  res.cookie(REFRESH_COOKIE, session.refresh_token, cookieOptions(30 * 24 * 60 * 60 * 1000));
  return ensureCsrfToken(req, res);
}

export function clearAuthCookies(res) {
  const options = cookieOptions(0);
  delete options.maxAge;
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
  res.clearCookie(CSRF_COOKIE, options);
}

export function getAuthTokens(req) {
  const cookies = parseCookies(req);
  const bearer = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  return {
    accessToken: cookies[ACCESS_COOKIE] || bearer || '',
    refreshToken: cookies[REFRESH_COOKIE] || '',
  };
}

export function originAndCsrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  if (origin && origin !== allowedOrigin) {
    return res.status(403).json({ error: 'Request origin is not allowed.' });
  }

  const publicAuthPath = new Set([
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
  ]);
  if (publicAuthPath.has(req.path)) return next();

  const cookies = parseCookies(req);
  if (!cookies[ACCESS_COOKIE] && !cookies[REFRESH_COOKIE]) return next();
  const submitted = req.get('x-csrf-token');
  const expected = cookies[CSRF_COOKIE];
  if (!submitted || !expected || submitted.length !== expected.length) {
    return res.status(403).json({ error: 'Security token is missing or expired. Refresh and try again.' });
  }
  const valid = crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(expected));
  if (!valid) return res.status(403).json({ error: 'Security token is invalid.' });
  next();
}

export function createRateLimiter({ windowMs, max, key = (req) => req.ip }) {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = String(key(req) || req.ip);
    const current = buckets.get(bucketKey);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;
    bucket.count += 1;
    buckets.set(bucketKey, bucket);
    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.set('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) {
      res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many attempts. Please wait and try again.' });
    }
    next();
  };
}
