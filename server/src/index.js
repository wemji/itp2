import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { z } from 'zod';
import { createAuthClient, supabase, supabaseAuth } from './supabase.js';
import { getAuthAssuranceLevel, requireAuth, requireStaff, requireAdmin } from './middleware/auth.js';
import { dayStart } from './utils.js';
import { counterSchema, emailSchema, parse, registerSchema, serviceSchema, uuidSchema } from './validation.js';
import { sendExternalNotification } from './notifications.js';
import { queueTransitions } from './queueRules.js';
import { writeAudit } from './audit.js';
import { summarizePublicStats } from './publicStats.js';
import {
  clearAuthCookies,
  createRateLimiter,
  ensureCsrfToken,
  originAndCsrfProtection,
  setAuthCookies,
} from './security.js';

const app = express();
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.set('trust proxy', Number(process.env.TRUST_PROXY || 1));
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  frameguard: { action: 'deny' },
}));
app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(morgan('dev'));
app.use((_, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use(originAndCsrfProtection);

const loginLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  key: (req) => `${req.ip}:${String(req.body?.email || '').trim().toLowerCase()}`,
});
const registerLimit = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5 });
const recoveryLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  key: (req) => `${req.ip}:${String(req.body?.email || '').trim().toLowerCase()}`,
});
const privilegedWriteLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  key: (req) => req.user?.id || req.ip,
});
const mfaLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  key: (req) => req.user?.id || req.ip,
});

async function requirePasswordConfirmation(req, res, next) {
  const password = req.body?.reauth_password;
  if (typeof password !== 'string' || password.length < 1 || password.length > 128) {
    return res.status(400).json({ error: 'Enter your current password to confirm this action.' });
  }
  const auth = createAuthClient();
  const { error } = await auth.auth.signInWithPassword({ email: req.user.email, password });
  if (error) return res.status(403).json({ error: 'Password confirmation failed.' });
  delete req.body.reauth_password;
  next();
}

async function requestAuthClient(req) {
  const auth = createAuthClient();
  const { error } = await auth.auth.setSession({
    access_token: req.authToken,
    refresh_token: req.refreshToken,
  });
  if (error) throw error;
  return auth;
}
async function notifyUser(userId, queueId, title, message) { const { data: notification, error } = await supabase.from('notifications').insert({ user_id: userId, queue_id: queueId, title, message }).select().single(); if (!error) { const { data: user } = await supabase.from('users').select('email').eq('id', userId).maybeSingle(); const delivery = user?.email ? await sendExternalNotification({ to: user.email, subject: `ONEQUEUE: ${title}`, text: message }) : { delivered: false, reason: 'no_email' }; await supabase.from('notifications').update({ external_delivery_status: delivery.delivered ? 'delivered' : delivery.reason, external_sent_at: delivery.delivered ? new Date().toISOString() : null }).eq('id', notification.id); } return { notification, error }; }
app.get('/api/health', (_, res) => res.json({ ok: true, service: 'ONEQUEUE API' }));

app.get('/api/public/stats', async (_, res) => {
  const [servicesResult, queuesResult, historyResult] = await Promise.all([
    supabase.from('services').select('id, average_service_time').eq('status', 'OPEN'),
    supabase.from('queues').select('service_id').eq('status', 'WAITING'),
    supabase
      .from('queue_history')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'COMPLETED')
      .gte('created_at', dayStart()),
  ]);

  if (servicesResult.error || queuesResult.error || historyResult.error) {
    return res.status(500).json({ error: 'Unable to load public queue activity.' });
  }

  res.set('Cache-Control', 'public, s-maxage=8, stale-while-revalidate=20');
  res.json(summarizePublicStats({
    services: servicesResult.data,
    waitingQueues: queuesResult.data,
    completedToday: historyResult.count,
  }));
});

app.post('/api/auth/register', registerLimit, async (req, res) => {
  const parsed = parse(registerSchema, req.body); if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { name, email, password } = parsed.data;
  const { data, error } = await supabaseAuth.auth.signUp({ email, password, options: { data: { name } } });
  if (error) return res.status(400).json({ error: 'Unable to create an account with these details.' });
  const csrfToken = data.session ? setAuthCookies(req, res, data.session) : null;
  res.status(201).json({ user: data.user, authenticated: Boolean(data.session), csrfToken });
});
app.post('/api/auth/login', loginLimit, async (req, res) => {
  const parsed = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password.' });
  const { email, password } = parsed.data;
  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: 'Invalid email or password.' });
  const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).single();
  if (!profile?.is_active) return res.status(403).json({ error: 'Unable to sign in with these credentials.' });
  const csrfToken = setAuthCookies(req, res, data.session);
  const privileged = ['admin', 'staff'].includes(profile.role);
  res.json({
    user: data.user,
    profile,
    authenticated: true,
    csrfToken,
    mfaVerified: !privileged || getAuthAssuranceLevel(data.session.access_token) === 'aal2',
  });
});
app.post('/api/auth/logout', requireAuth, async (req, res) => {
  await supabase.auth.admin.signOut(req.authToken, 'global').catch(() => {});
  clearAuthCookies(res);
  res.json({ message: 'Logged out.' });
});
app.get('/api/auth/me', requireAuth, (req, res) => res.json({
  user: req.user,
  profile: req.user.profile,
  csrfToken: ensureCsrfToken(req, res),
  mfaVerified: !['admin', 'staff'].includes(req.user.profile.role)
    || getAuthAssuranceLevel(req.authToken) === 'aal2',
}));
app.get('/api/auth/mfa/status', requireAuth, async (req, res) => {
  if (!['admin', 'staff'].includes(req.user.profile.role)) return res.status(403).json({ error: 'Staff access required.' });
  try {
    const auth = await requestAuthClient(req);
    const [aal, factors] = await Promise.all([
      auth.auth.mfa.getAuthenticatorAssuranceLevel(),
      auth.auth.mfa.listFactors(),
    ]);
    if (aal.error || factors.error) throw aal.error || factors.error;
    res.json({
      currentLevel: aal.data.currentLevel,
      nextLevel: aal.data.nextLevel,
      factors: factors.data.totp.map(({ id, friendly_name, status, created_at }) => ({ id, friendly_name, status, created_at })),
    });
  } catch {
    res.status(400).json({ error: 'Unable to load multi-factor security status.' });
  }
});
app.post('/api/auth/mfa/enroll', requireAuth, mfaLimit, async (req, res) => {
  if (!['admin', 'staff'].includes(req.user.profile.role)) return res.status(403).json({ error: 'Staff access required.' });
  try {
    const auth = await requestAuthClient(req);
    const existing = await auth.auth.mfa.listFactors();
    if (existing.data?.totp?.some((factor) => factor.status === 'verified')) {
      return res.status(409).json({ error: 'An authenticator is already enrolled.' });
    }
    for (const factor of existing.data?.all || []) {
      if (factor.factor_type === 'totp' && factor.status !== 'verified') {
        await auth.auth.mfa.unenroll({ factorId: factor.id });
      }
    }
    const { data, error } = await auth.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'ONEQUEUE Authenticator' });
    if (error) throw error;
    res.json({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  } catch {
    res.status(400).json({ error: 'Unable to start authenticator enrollment.' });
  }
});
app.post('/api/auth/mfa/verify', requireAuth, mfaLimit, async (req, res) => {
  const parsed = z.object({ factorId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter the 6-digit code from your authenticator app.' });
  try {
    const auth = await requestAuthClient(req);
    const { data, error } = await auth.auth.mfa.challengeAndVerify({ factorId: parsed.data.factorId, code: parsed.data.code });
    if (error) throw error;
    const csrfToken = setAuthCookies(req, res, data);
    await writeAudit({ actorId: req.user.id, action: 'auth.mfa_verified', targetType: 'user', targetId: req.user.id });
    res.json({ verified: true, csrfToken });
  } catch {
    res.status(400).json({ error: 'The verification code is invalid or expired.' });
  }
});
app.post('/api/auth/forgot-password', recoveryLimit, async (req, res) => {
  const parsed = z.object({ email: z.string().trim().email().max(200) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email address.' });
  await supabaseAuth.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${clientOrigin}/reset-password` });
  res.json({ message: 'If the account exists, a password reset email has been sent.' });
});
app.get('/api/profile', requireAuth, (req, res) => res.json(req.user.profile));
app.put('/api/profile', requireAuth, async (req, res) => { const parsed = z.object({ name: z.string().trim().min(2).max(80) }).safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: 'Name must be between 2 and 80 characters.' }); const { data, error } = await supabase.from('users').update({ name: parsed.data.name }).eq('id', req.user.id).select('id, name, email, role, is_active, created_at').single(); if (error) return res.status(400).json({ error: 'Unable to update profile.' }); res.json(data); });

app.get('/api/services', async (_, res) => {
  const [servicesResult, queuesResult] = await Promise.all([
    supabase.from('services').select('*').order('name'),
    supabase.from('queues').select('service_id').eq('status', 'WAITING'),
  ]);
  if (servicesResult.error || queuesResult.error) {
    return res.status(500).json({ error: 'Unable to load services.' });
  }

  const waitingByService = queuesResult.data.reduce((counts, queue) => {
    counts.set(queue.service_id, (counts.get(queue.service_id) || 0) + 1);
    return counts;
  }, new Map());
  const services = servicesResult.data.map((service) => {
    const waitingCount = waitingByService.get(service.id) || 0;
    return {
      ...service,
      waiting_count: waitingCount,
      estimated_wait: waitingCount * service.average_service_time,
    };
  });
  return res.json(services);
});
app.get('/api/services/:id', async (req, res) => { const { data, error } = await supabase.from('services').select('*').eq('id', req.params.id).single(); if (error) return res.status(404).json({ error: 'Service not found.' }); res.json(data); });
app.post('/api/services', requireAuth, requireStaff, async (req, res) => {
  const parsed = parse(serviceSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { data, error } = await supabase.from('services').insert(parsed.data).select().single();
  if (error) return res.status(400).json({ error: 'Unable to create service.' });
  await writeAudit({ actorId: req.user.id, action: 'service.created', targetType: 'service', targetId: data.id, metadata: { name: data.name } });
  res.status(201).json(data);
});
app.put('/api/services/:id', requireAuth, requireStaff, async (req, res) => {
  const parsed = parse(serviceSchema.partial(), req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { data, error } = await supabase.from('services').update(parsed.data).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: 'Unable to update service.' });
  await writeAudit({ actorId: req.user.id, action: 'service.updated', targetType: 'service', targetId: data.id, metadata: { fields: Object.keys(parsed.data), status: data.status } });
  res.json(data);
});
app.delete('/api/services/:id', requireAuth, requireStaff, async (req, res) => { const { error } = await supabase.from('services').update({ status: 'CLOSED' }).eq('id', req.params.id); if (error) { console.error('Unable to deactivate service:', error); return res.status(400).json({ error: 'Unable to deactivate service. Please try again.' }); } res.json({ message: 'Service deactivated.' }); });

async function enrichQueue(query) { const { data, error } = await query; if (error) throw error; return data; }
app.get('/api/queues', requireAuth, async (req, res) => { try { let q = supabase.from('queues').select('*, services(name, average_service_time), users(name), counters(counter_name)').order('joined_at', { ascending: true }); if (req.user.profile.role === 'customer') q = q.eq('user_id', req.user.id); if (req.query.status) q = q.eq('status', req.query.status); res.json(await enrichQueue(q)); } catch (error) { console.error('Unable to load queues:', error); res.status(500).json({ error: 'Unable to load queues. Please try again.' }); } });
app.get('/api/queues/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('queues')
    .select('*, services(name, average_service_time, location, operating_hours), users(name), counters(counter_name)')
    .eq('id', req.params.id)
    .single();

  if (error || (req.user.profile.role === 'customer' && data?.user_id !== req.user.id)) {
    return res.status(404).json({ error: 'Queue not found.' });
  }

  const { data: serving } = await supabase
    .from('queues')
    .select('queue_number')
    .eq('service_id', data.service_id)
    .in('status', ['CALLED', 'SERVING'])
    .order('called_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const { count } = data.status === 'WAITING'
    ? await supabase
      .from('queues')
      .select('*', { count: 'exact', head: true })
      .eq('service_id', data.service_id)
      .in('status', ['WAITING', 'CALLED', 'SERVING'])
      .lt('joined_at', data.joined_at)
    : { count: 0 };

  const peopleAhead = count || 0;
  const sequence = Number.parseInt(String(data.queue_number).match(/\d+$/)?.[0] || '1', 10);
  const earlierTickets = Math.max(0, sequence - 1);
  const clearedTickets = Math.max(0, earlierTickets - peopleAhead);
  const progressPercent = ['CALLED', 'SERVING', 'COMPLETED'].includes(data.status)
    ? 100
    : ['CANCELLED', 'NO-SHOW'].includes(data.status)
      ? 0
      : earlierTickets === 0
        ? 92
        : Math.min(96, Math.max(6, Math.round((clearedTickets / earlierTickets) * 100)));

  return res.json({
    ...data,
    now_serving: serving?.queue_number || null,
    people_ahead: peopleAhead,
    estimated_wait_time: peopleAhead * (data.services?.average_service_time || 5),
    progress_percent: progressPercent,
  });
});
app.post('/api/queues', requireAuth, async (req, res) => { if (req.user.profile.role !== 'customer') return res.status(403).json({ error: 'Customer access required.' }); const parsed = z.object({ service_id: uuidSchema }).strict().safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: 'Select a valid service.' }); const { data: inserted, error } = await supabase.rpc('join_queue', { p_service_id: parsed.data.service_id, p_user_id: req.user.id }); if (error) return res.status(error.code === '23505' ? 409 : 400).json({ error: error.message.includes('already') ? 'You already have an active queue.' : 'Service is unavailable or could not be joined.' }); const { data, error: loadError } = await supabase.from('queues').select('*, services(name, average_service_time)').eq('id', inserted.id).single(); if (loadError) return res.status(500).json({ error: 'Queue was created but could not be loaded.' }); await notifyUser(req.user.id, data.id, 'Queue joined successfully', `Your queue number is ${data.queue_number}.`); res.status(201).json(data); });
async function archiveQueue(queue, status, completedAt) {
  const waiting = queue.called_at ? Math.max(0, Math.round((new Date(queue.called_at) - new Date(queue.joined_at)) / 60000)) : 0;
  const service = queue.serving_at && completedAt ? Math.max(0, Math.round((new Date(completedAt) - new Date(queue.serving_at)) / 60000)) : 0;
  const { error } = await supabase.from('queue_history').upsert({ queue_id: queue.id, user_id: queue.user_id, service_id: queue.service_id, queue_number: queue.queue_number, status, waiting_time: waiting, service_time: service }, { onConflict: 'queue_id' });
  if (error) console.error('Unable to archive queue:', error.message);
}
app.patch('/api/queues/:id/cancel', requireAuth, async (req, res) => { const { data, error } = await supabase.from('queues').update({ status: 'CANCELLED', completed_at: new Date().toISOString() }).eq('id', req.params.id).eq('user_id', req.user.id).in('status', ['WAITING', 'CALLED']).select().maybeSingle(); if (error || !data) return res.status(409).json({ error: 'Queue cannot be cancelled.' }); await archiveQueue(data, 'CANCELLED', data.completed_at); await notifyUser(req.user.id, data.id, 'Queue cancelled', 'Your queue request has been cancelled.'); res.json(data); });

async function action(req, res, status) {
  const transitions = queueTransitions;
  const { data: queue, error: loadError } = await supabase.from('queues').select('*').eq('id', req.params.id).single();
  if (loadError || !queue) return res.status(404).json({ error: 'Queue not found.' });
  if (!transitions[status]?.includes(queue.status)) return res.status(409).json({ error: `This queue cannot be ${status === 'NO-SHOW' ? 'skipped' : status.toLowerCase()} while it is ${queue.status.toLowerCase()}.` });
  const updates = { status }; if (status === 'CALLED') updates.called_at = new Date().toISOString(); if (status === 'SERVING') updates.serving_at = new Date().toISOString(); if (['COMPLETED', 'NO-SHOW'].includes(status)) updates.completed_at = new Date().toISOString();
  const { data, error } = await supabase.from('queues').update(updates).eq('id', queue.id).eq('status', queue.status).select().maybeSingle();
  if (error) { console.error('Unable to update queue status:', error); return res.status(400).json({ error: 'Unable to update this queue. Please try again.' }); } if (!data) return res.status(409).json({ error: 'This queue was updated by another team member. Refresh and try again.' });
  await notifyUser(queue.user_id, queue.id, `Queue ${status.toLowerCase()}`, `Your queue ${queue.queue_number} is now ${status.toLowerCase()}.`);
  if (['COMPLETED', 'NO-SHOW'].includes(status)) await archiveQueue({ ...queue, called_at: queue.called_at || (status === 'NO-SHOW' ? updates.completed_at : null) }, status, updates.completed_at);
  await writeAudit({ actorId: req.user.id, action: `queue.${status.toLowerCase()}`, targetType: 'queue', targetId: queue.id, metadata: { queue_number: queue.queue_number, previous_status: queue.status } });
  res.json(data);
}
for (const [path, status] of [['call', 'CALLED'], ['start', 'SERVING'], ['complete', 'COMPLETED'], ['skip', 'NO-SHOW']]) app.post(`/api/queues/:id/${path}`, requireAuth, requireStaff, (req, res) => action(req, res, status));
app.get('/api/notifications', requireAuth, async (req, res) => { const { data, error } = await supabase.from('notifications').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false }); if (error) { console.error('Unable to load notifications:', error); return res.status(500).json({ error: 'Unable to load notifications. Please try again.' }); } res.json(data); });
app.put('/api/notifications/:id/read', requireAuth, async (req, res) => { const { data, error } = await supabase.from('notifications').update({ is_read: true }).eq('id', req.params.id).eq('user_id', req.user.id).select().single(); if (error) { console.error('Unable to update notification:', error); return res.status(400).json({ error: 'Unable to mark this notification as read.' }); } res.json(data); });
app.get('/api/history', requireAuth, async (req, res) => { let query = supabase.from('queue_history').select('*, services(name), users(name)').order('created_at', { ascending: false }); if (req.user.profile.role === 'customer') query = query.eq('user_id', req.user.id); if (req.query.status && ['WAITING','CALLED','SERVING','COMPLETED','CANCELLED','NO-SHOW'].includes(req.query.status)) query = query.eq('status', req.query.status); if (req.query.service_id) query = query.eq('service_id', req.query.service_id); if (req.query.from) query = query.gte('created_at', req.query.from); if (req.query.to) query = query.lte('created_at', req.query.to); const { data, error } = await query; if (error) return res.status(500).json({ error: 'Unable to load queue history.' }); const search = String(req.query.search || '').toLowerCase(); res.json(search ? data.filter(row => row.queue_number.toLowerCase().includes(search) || row.users?.name?.toLowerCase().includes(search) || row.services?.name?.toLowerCase().includes(search)) : data); });
app.get('/api/counters', requireAuth, requireStaff, async (req, res) => { let query = supabase.from('counters').select('*, services(name), users(name)').order('counter_name'); if (req.query.service_id) query = query.eq('service_id', req.query.service_id); const { data, error } = await query; if (error) return res.status(500).json({ error: 'Unable to load counters.' }); res.json(data); });
app.post('/api/counters', requireAuth, requireStaff, async (req, res) => {
  const parsed = parse(counterSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { data, error } = await supabase.from('counters').insert(parsed.data).select('*, services(name), users(name)').single();
  if (error) return res.status(400).json({ error: 'Unable to create counter.' });
  await writeAudit({ actorId: req.user.id, action: 'counter.created', targetType: 'counter', targetId: data.id, metadata: { name: data.counter_name } });
  res.status(201).json(data);
});
app.put('/api/counters/:id', requireAuth, requireStaff, async (req, res) => {
  const parsed = parse(counterSchema.partial(), req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { data, error } = await supabase.from('counters').update(parsed.data).eq('id', req.params.id).select('*, services(name), users(name)').single();
  if (error) return res.status(400).json({ error: 'Unable to update counter.' });
  await writeAudit({ actorId: req.user.id, action: 'counter.updated', targetType: 'counter', targetId: data.id, metadata: { fields: Object.keys(parsed.data), status: data.status } });
  res.json(data);
});
app.delete('/api/counters/:id', requireAuth, requireStaff, async (req, res) => { const { error } = await supabase.from('counters').update({ status: 'OFFLINE' }).eq('id', req.params.id); if (error) return res.status(400).json({ error: 'Unable to deactivate counter.' }); res.json({ message: 'Counter deactivated.' }); });
app.get('/api/staff', requireAuth, requireAdmin, async (_, res) => { const { data, error } = await supabase.from('users').select('id, name, email, role, is_active, created_at').in('role', ['admin','staff']).order('name'); if (error) return res.status(500).json({ error: 'Unable to load staff.' }); res.json(data); });
app.put('/api/staff/:id', requireAuth, requireAdmin, privilegedWriteLimit, requirePasswordConfirmation, async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot change your own access.' });
  const allowed = {};
  if (['admin', 'staff'].includes(req.body.role)) allowed.role = req.body.role;
  if (typeof req.body.is_active === 'boolean') allowed.is_active = req.body.is_active;
  if (!Object.keys(allowed).length) return res.status(400).json({ error: 'A valid role or active status is required.' });
  const { data, error } = await supabase.from('users').update(allowed).eq('id', req.params.id).in('role', ['admin', 'staff']).select('id, name, email, role, is_active').single();
  if (error) return res.status(400).json({ error: 'Unable to update staff account.' });
  await writeAudit({ actorId: req.user.id, action: 'staff.access_updated', targetType: 'user', targetId: data.id, metadata: allowed });
  res.json(data);
});
app.post('/api/staff', requireAuth, requireAdmin, privilegedWriteLimit, requirePasswordConfirmation, async (req, res) => {
  const parsed = parse(registerSchema.extend({ role: z.enum(['admin', 'staff']).default('staff') }), req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { data: created, error } = await supabase.auth.admin.createUser({ email: parsed.data.email, password: parsed.data.password, email_confirm: true, user_metadata: { name: parsed.data.name } });
  if (error) return res.status(400).json({ error: 'Unable to create staff account.' });
  const { data, error: updateError } = await supabase.from('users').update({ role: parsed.data.role }).eq('id', created.user.id).select('id, name, email, role, is_active').single();
  if (updateError) return res.status(400).json({ error: 'Staff user was created but role assignment failed.' });
  await writeAudit({ actorId: req.user.id, action: 'staff.created', targetType: 'user', targetId: data.id, metadata: { role: data.role } });
  res.status(201).json(data);
});
app.get('/api/audit-logs', requireAuth, requireAdmin, async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const { data, error } = await supabase.from('audit_logs').select('*, users:actor_id(name, email)').order('created_at', { ascending: false }).limit(limit);
  if (error) return res.status(500).json({ error: 'Unable to load the security log. Apply the security migration first.' });
  res.json(data);
});
app.get('/api/dashboard', requireAuth, requireStaff, async (_, res) => { const { data: queues, error } = await supabase.from('queues').select('*').gte('joined_at', dayStart()); if (error) { console.error('Unable to load dashboard:', error); return res.status(500).json({ error: 'Unable to load the operations dashboard. Please try again.' }); } const completed = queues.filter(q => q.status === 'COMPLETED'); const waiting = queues.filter(q => ['WAITING', 'CALLED'].includes(q.status)); const average = (items, elapsed) => items.length ? Math.round(items.reduce((sum, q) => sum + Math.max(0, (new Date(elapsed(q)) - new Date(q.joined_at)) / 60000), 0) / items.length) : 0; res.json({ total: queues.length, waiting: waiting.length, serving: queues.filter(q => q.status === 'SERVING').length, completed: completed.length, cancelled: queues.filter(q => q.status === 'CANCELLED').length, no_show: queues.filter(q => q.status === 'NO-SHOW').length, average_waiting_time: average(completed.filter(q => q.called_at), q => q.called_at), average_service_time: completed.filter(q => q.serving_at && q.completed_at).length ? Math.round(completed.filter(q => q.serving_at && q.completed_at).reduce((sum, q) => sum + (new Date(q.completed_at) - new Date(q.serving_at)) / 60000, 0) / completed.filter(q => q.serving_at && q.completed_at).length) : 0 }); });
app.get('/api/dashboard/activity', requireAuth, requireStaff, async (_, res) => { const from = new Date(); from.setDate(from.getDate() - 6); from.setHours(0, 0, 0, 0); const { data, error } = await supabase.from('queues').select('joined_at').gte('joined_at', from.toISOString()); if (error) return res.status(500).json({ error: 'Unable to load activity.' }); const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(from); date.setDate(from.getDate() + index); const key = date.toISOString().slice(0, 10); return { date: key, label: date.toLocaleDateString('en-US', { weekday: 'short' }), total: data.filter(row => row.joined_at.slice(0, 10) === key).length }; }); res.json(days); });

app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body must contain valid JSON.' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error.' });
});
const port = process.env.PORT || 4000; app.listen(port, () => console.log(`ONEQUEUE API listening on ${port}`));
