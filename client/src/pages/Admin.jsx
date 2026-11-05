import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, BarChart3, Check, CheckCircle2, Clock3, Hourglass, Pencil, Play, Plus, RefreshCw,
  Settings2, SkipForward, Ticket, Timer, UserCog, Users, Volume2, X,
} from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { departmentLabel, roleInfo } from '../lib/roles';
import { firstName, formatTime, greeting, minutes } from '../lib/format';
import {
  Alert, Avatar, EmptyState, Loading, PageHeader, Spinner, StatCard, StatusBadge, TableLoading, useApi,
} from '../components/ui';

/* Live list of queues for the signed-in desk (department-scoped by the server). */
function useDeskQueues() {
  const result = useApi('/queues', { interval: 15000, initial: [] });
  const { reload } = result;
  useEffect(() => {
    const channel = supabase.channel(`desk-queues-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queues' }, reload)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [reload]);
  return result;
}

const waitedFor = (q) => Math.max(0, Math.round((Date.now() - new Date(q.joined_at).getTime()) / 60000));

/* ============ Overview ============ */
export function AdminDashboard() {
  const { profile } = useAuth();
  const role = profile?.role;
  const info = roleInfo(role);
  const stats = useApi('/dashboard', { interval: 30000 });
  const activity = useApi('/dashboard/activity', { initial: [] });
  const queues = useDeskQueues();
  const s = stats.data;
  const days = activity.data || [];
  const max = Math.max(1, ...days.map((d) => d.total));
  const upNext = (queues.data || []).filter((q) => q.status === 'WAITING').slice(0, 6);
  const atCounter = (queues.data || []).filter((q) => ['CALLED', 'SERVING'].includes(q.status));

  const outcome = s ? [
    ['Completed', s.completed, 'var(--success)'],
    ['Waiting / called', s.waiting, 'var(--warning)'],
    ['Serving', s.serving, 'var(--violet)'],
    ['Cancelled', s.cancelled, 'var(--neutral)'],
    ['No-show', s.no_show, 'var(--danger)'],
  ] : [];

  return (
    <>
      <PageHeader
        eyebrow={info.workspace}
        title={`${greeting()}, ${firstName(profile?.name)}`}
        description={role === 'admin' ? 'Here’s how every service desk is performing today.' : `Here’s today’s activity at the ${info.desk} desk.`}
        actions={<Link className="btn" to="/admin/queues"><Activity size={16} /> Open queue console</Link>}
      />
      <Alert message={stats.error || activity.error} />

      {!s ? <Loading /> : (
        <>
          <div className="grid grid-4">
            <StatCard label="Waiting now" value={s.waiting} hint="Waiting or called" icon={Hourglass} tone="warning" />
            <StatCard label="Being served" value={s.serving} hint="At a counter right now" icon={Users} tone="violet" />
            <StatCard label="Completed today" value={s.completed} hint={`of ${s.total} tickets today`} icon={CheckCircle2} tone="success" />
            <StatCard label="Avg. wait" value={minutes(s.average_waiting_time)} hint={`Avg. service ${minutes(s.average_service_time)}`} icon={Timer} tone="info" />
          </div>

          <div className="split section">
            <section className="card">
              <div className="card-header">
                <div><h2>Tickets over the last 7 days</h2><p>Customers who joined a queue each day</p></div>
                <BarChart3 size={18} className="subtle" />
              </div>
              <div className="card-body">
                {activity.loading ? <Loading /> : (
                  <div className="bars" role="img" aria-label={`Tickets per day: ${days.map((d) => `${d.label} ${d.total}`).join(', ')}`}>
                    {days.map((d, i) => (
                      <div className={i === days.length - 1 ? 'bar today' : 'bar'} key={d.date}>
                        <strong>{d.total}</strong>
                        <div className="bar-track"><i style={{ height: `${(d.total / max) * 100}%` }} /></div>
                        <small>{i === days.length - 1 ? 'Today' : d.label}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
            <section className="card">
              <div className="card-header"><div><h2>Today’s outcomes</h2><p>{s.total} tickets in total</p></div></div>
              <div className="card-body dist">
                {outcome.map(([label, value, color]) => (
                  <div className="dist-row" key={label}>
                    <div className="dist-row-head"><span>{label}</span><strong>{value}</strong></div>
                    <div className="meter"><i style={{ width: `${s.total ? (value / s.total) * 100 : 0}%`, background: color }} /></div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      <div className="grid grid-2 section">
        <section className="card">
          <div className="card-header">
            <div><h2>Up next</h2><p>{upNext.length ? 'Oldest tickets first' : 'No one is waiting'}</p></div>
            <Link className="link" style={{ fontSize: 14 }} to="/admin/queues">Console</Link>
          </div>
          {queues.loading ? <Loading /> : upNext.length ? (
            <div className="list">
              {upNext.map((q, i) => (
                <div className="list-item" key={q.id}>
                  <span className="tile" style={{ fontSize: 13 }}>{i + 1}</span>
                  <div className="grow"><span className="ticket-code">{q.queue_number}</span><p>{q.users?.name} · {q.services?.name}</p></div>
                  <span className="subtle" style={{ fontSize: 13 }}>{waitedFor(q)} min</span>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={Ticket} title="Queue is clear">New tickets will appear here as customers join.</EmptyState>}
        </section>
        <section className="card">
          <div className="card-header"><div><h2>At the counter</h2><p>Called and in-service tickets</p></div></div>
          {queues.loading ? <Loading /> : atCounter.length ? (
            <div className="list">
              {atCounter.map((q) => (
                <div className="list-item" key={q.id}>
                  <Avatar name={q.users?.name} soft />
                  <div className="grow"><span className="ticket-code">{q.queue_number}</span><p>{q.users?.name} · {q.counters?.counter_name || q.services?.name}</p></div>
                  <StatusBadge status={q.status} />
                </div>
              ))}
            </div>
          ) : <EmptyState icon={Users} title="No one at the counter">Call the next customer from the queue console.</EmptyState>}
        </section>
      </div>

      {role === 'admin' && (
        <div className="grid grid-3 section">
          {[
            ['/admin/staff', UserCog, 'Staff accounts', 'Add Registrar and Finance team members.'],
            ['/admin/services', Settings2, 'Services', 'Configure services, hours and locations.'],
            ['/admin/reports', BarChart3, 'Reports', 'Analyze performance and export CSV.'],
          ].map(([to, Icon, title, text]) => (
            <Link to={to} key={to} className="card card-pad" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <span className="tile"><Icon size={18} /></span>
              <div style={{ flex: 1 }}><strong>{title}</strong><p className="muted" style={{ fontSize: 13.5 }}>{text}</p></div>
              <ArrowRight size={16} className="subtle" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

/* ============ Queue console ============ */
export function QueueManagement() {
  const { profile } = useAuth();
  const info = roleInfo(profile?.role);
  const { data, error: loadError, loading, reload } = useDeskQueues();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [view, setView] = useState('waiting');
  const [service, setService] = useState('');

  const active = useMemo(() => (data || []).filter((q) => ['WAITING', 'CALLED', 'SERVING'].includes(q.status)), [data]);
  const services = useMemo(() => [...new Map(active.map((q) => [q.service_id, q.services?.name])).entries()], [active]);
  const scoped = service ? active.filter((q) => q.service_id === service) : active;
  const waiting = scoped.filter((q) => q.status === 'WAITING');
  const counter = scoped.filter((q) => ['CALLED', 'SERVING'].includes(q.status));
  const current = counter.find((q) => q.status === 'SERVING') || counter[0];
  const rows = view === 'waiting' ? waiting : view === 'counter' ? counter : scoped;

  async function run(id, path, label) {
    setBusy(id); setError(''); setNotice('');
    try {
      const result = await api(path, { method: 'POST' });
      if (label) setNotice(label(result));
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }
  const act = (q, name) => run(q.id, `/queues/${q.id}/${name}`);
  const callNext = () => run('next', '/queues/next', (q) => `Called ${q.queue_number}. The customer has been notified.`);

  return (
    <>
      <PageHeader
        eyebrow={info.workspace}
        title="Queue console"
        description="Call, serve and complete tickets. The list updates in real time."
        actions={<button className="btn btn-secondary" onClick={reload}><RefreshCw size={16} /> Refresh</button>}
      />
      <Alert message={error || loadError} />
      <Alert type="success" message={notice} />

      <div className="console">
        <aside className="grid sticky" style={{ gap: 16 }}>
          <section className="card">
            <div className="now-serving">
              <div className="label">{current ? (current.status === 'SERVING' ? 'Now serving' : 'Called — awaiting customer') : 'Counter is free'}</div>
              <div className={current ? 'now-number' : 'now-number idle'}>{current?.queue_number || '— — —'}</div>
              {current ? (
                <div className="now-meta">
                  <strong>{current.users?.name}</strong>
                  <span>{current.services?.name}{current.counters?.counter_name ? ` · ${current.counters.counter_name}` : ''}</span>
                  <span className="subtle" style={{ fontSize: 13 }}>{current.status === 'SERVING' ? `Started ${formatTime(current.serving_at)}` : `Called ${formatTime(current.called_at)}`}</span>
                </div>
              ) : <p className="muted" style={{ fontSize: 14 }}>Call the next customer when you’re ready.</p>}
              <div className="console-actions">
                {current?.status === 'CALLED' && <>
                  <button className="btn" disabled={busy === current.id} onClick={() => act(current, 'start')}><Play size={16} /> Start</button>
                  <button className="btn btn-secondary" disabled={busy === current.id} onClick={() => act(current, 'recall')}><Volume2 size={16} /> Recall</button>
                  <button className="btn btn-danger wide" disabled={busy === current.id} onClick={() => act(current, 'skip')}><SkipForward size={16} /> Mark as no-show</button>
                </>}
                {current?.status === 'SERVING' && (
                  <button className="btn wide" style={{ background: 'var(--success)' }} disabled={busy === current.id} onClick={() => act(current, 'complete')}><Check size={16} /> Complete service</button>
                )}
                <button className={current ? 'btn btn-secondary btn-lg wide' : 'btn btn-lg wide'} disabled={busy === 'next' || waiting.length === 0} onClick={callNext}>
                  {busy === 'next' ? <Spinner light={!current} /> : <><Volume2 size={18} /> Call next customer</>}
                </button>
              </div>
            </div>
            <div className="mini-stats">
              <div><strong>{waiting.length}</strong><span>Waiting</span></div>
              <div><strong>{counter.filter((q) => q.status === 'CALLED').length}</strong><span>Called</span></div>
              <div><strong>{counter.filter((q) => q.status === 'SERVING').length}</strong><span>Serving</span></div>
            </div>
          </section>
          <div className="callout callout-neutral">
            <Clock3 size={17} />
            <div><p>Customers are notified automatically when called, and the next person in line is told they’re up soon.</p></div>
          </div>
        </aside>

        <section className="card">
          <div className="toolbar">
            <div className="tabs" role="tablist" aria-label="Queue view">
              {[['waiting', `Waiting (${waiting.length})`], ['counter', `At counter (${counter.length})`], ['all', `All active (${scoped.length})`]].map(([value, label]) => (
                <button key={value} role="tab" aria-selected={view === value} className={view === value ? 'tab active' : 'tab'} onClick={() => setView(value)}>{label}</button>
              ))}
            </div>
            {services.length > 1 && (
              <select className="input" style={{ width: 'auto', marginLeft: 'auto' }} value={service} onChange={(e) => setService(e.target.value)} aria-label="Filter by service">
                <option value="">All services</option>
                {services.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Ticket</th><th>Customer</th><th>Service</th><th>Joined</th><th>Status</th><th className="num">Actions</th></tr></thead>
              <tbody>
                {loading ? <TableLoading colSpan={7} /> : rows.length ? rows.map((q, i) => (
                  <tr key={q.id}>
                    <td className="subtle">{i + 1}</td>
                    <td><span className="ticket-code">{q.queue_number}</span></td>
                    <td><div className="cell-user"><Avatar name={q.users?.name} soft /><div>{q.users?.name}<span className="sub">{q.users?.email}</span></div></div></td>
                    <td>{q.services?.name}<span className="sub">{departmentLabel(q.services?.department)}</span></td>
                    <td className="nowrap">{formatTime(q.joined_at)}<span className="sub">{waitedFor(q)} min ago</span></td>
                    <td><StatusBadge status={q.status} /></td>
                    <td>
                      <div className="row-actions">
                        {q.status === 'WAITING' && <button className="btn btn-sm" disabled={busy === q.id} onClick={() => act(q, 'call')}><Volume2 size={14} /> Call</button>}
                        {q.status === 'CALLED' && <>
                          <button className="btn btn-sm" disabled={busy === q.id} onClick={() => act(q, 'start')}><Play size={14} /> Start</button>
                          <button className="btn btn-sm btn-secondary" disabled={busy === q.id} onClick={() => act(q, 'recall')} aria-label={`Recall ${q.queue_number}`}><Volume2 size={14} /></button>
                        </>}
                        {q.status === 'SERVING' && <button className="btn btn-sm" style={{ background: 'var(--success)' }} disabled={busy === q.id} onClick={() => act(q, 'complete')}><Check size={14} /> Complete</button>}
                        {q.status !== 'SERVING' && <button className="btn btn-sm btn-ghost" disabled={busy === q.id} onClick={() => act(q, 'skip')} title="Mark as no-show" aria-label={`Skip ${q.queue_number}`}><SkipForward size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7}><EmptyState icon={Ticket} title={view === 'counter' ? 'No one at the counter' : 'No customers waiting'}>New tickets appear here automatically.</EmptyState></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

/* ============ Services ============ */
const EMPTY_SERVICE = { name: '', description: '', location: '', operating_hours: '8:00 AM - 5:00 PM', average_service_time: 5, department: 'registrar' };

export function ServiceManagement() {
  const { profile } = useAuth();
  const admin = profile?.role === 'admin';
  const { data, error: loadError, loading, reload } = useApi('/services', { initial: [] });
  const [form, setForm] = useState(EMPTY_SERVICE);
  const [editing, setEditing] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const services = data || [];
  const set = (key) => (e) => setForm({ ...form, [key]: key === 'average_service_time' ? Number(e.target.value) : e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy('form'); setError(''); setNotice('');
    try {
      await api(editing ? `/services/${editing}` : '/services', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(form) });
      setNotice(editing ? `Saved changes to ${form.name}.` : `Added ${form.name}.`);
      setForm(EMPTY_SERVICE); setEditing('');
      await reload();
    } catch (err) { setError(err.message); } finally { setBusy(''); }
  }
  function edit(s) {
    setEditing(s.id); setNotice('');
    setForm({ name: s.name, description: s.description || '', location: s.location || '', operating_hours: s.operating_hours, average_service_time: s.average_service_time, department: s.department || 'registrar' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function toggle(s) {
    setBusy(s.id); setError(''); setNotice('');
    try {
      await api(`/services/${s.id}`, { method: 'PUT', body: JSON.stringify({ status: s.status === 'OPEN' ? 'CLOSED' : 'OPEN' }) });
      setNotice(`${s.name} is now ${s.status === 'OPEN' ? 'closed' : 'open'} to new customers.`);
      await reload();
    } catch (err) { setError(err.message); } finally { setBusy(''); }
  }

  const list = (
    <section className="card">
      <div className="card-header"><div><h2>All services <span className="subtle" style={{ fontWeight: 500 }}>{services.length}</span></h2><p>{services.filter((s) => s.status === 'OPEN').length} open now</p></div></div>
      {loading ? <Loading /> : services.length ? (
        <div className="list">
          {services.map((s) => (
            <div className="list-item" key={s.id} style={editing === s.id ? { background: 'var(--accent-soft)' } : undefined}>
              <span className={`tile ${s.department || ''}`}>{s.name?.[0]}</span>
              <div className="grow">
                <strong>{s.name}</strong> <span className={`role-tag role-${s.department}`} style={{ marginLeft: 6 }}>{departmentLabel(s.department)}</span>
                <p>{s.description || 'No description'}</p>
                <div className="meta"><span>{s.location || 'No location'}</span><span>{s.operating_hours}</span><span>{s.average_service_time} min / customer</span><span>{s.waiting_count || 0} waiting</span></div>
              </div>
              <StatusBadge status={s.status} />
              <div className="row-actions" style={{ flexWrap: 'nowrap' }}>
                {admin && <button className="btn btn-sm btn-ghost" onClick={() => edit(s)} aria-label={`Edit ${s.name}`}><Pencil size={14} /></button>}
                <button className="btn btn-sm btn-secondary" disabled={busy === s.id} onClick={() => toggle(s)}>{s.status === 'OPEN' ? 'Close' : 'Open'}</button>
              </div>
            </div>
          ))}
        </div>
      ) : <EmptyState icon={Settings2} title="No services yet">{admin ? 'Add your first service using the form.' : 'An administrator hasn’t added services for your desk yet.'}</EmptyState>}
    </section>
  );

  return (
    <>
      <PageHeader
        eyebrow={roleInfo(profile?.role).workspace}
        title={admin ? 'Services' : 'Service availability'}
        description={admin ? 'Create services and manage their hours, location and department.' : 'Open or close your desk’s services to new customers.'}
      />
      <Alert message={error || loadError} />
      <Alert type="success" message={notice} />
      {admin ? (
        <div className="split-form">
          <form className="card sticky" onSubmit={submit}>
            <div className="card-header">
              <h2>{editing ? 'Edit service' : 'Add a service'}</h2>
              {editing && <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setEditing(''); setForm(EMPTY_SERVICE); }}><X size={14} /> Cancel</button>}
            </div>
            <div className="card-body form-grid">
              <label className="field">Department
                <select required value={form.department} onChange={set('department')}><option value="registrar">Registrar</option><option value="finance">Finance</option></select>
              </label>
              <label className="field">Service name<input required maxLength="100" value={form.name} onChange={set('name')} placeholder="e.g. Transcript request" /></label>
              <label className="field">Description<textarea rows="3" maxLength="500" value={form.description} onChange={set('description')} placeholder="What can customers get help with?" /></label>
              <label className="field">Location<input maxLength="160" value={form.location} onChange={set('location')} placeholder="Building, floor or window" /></label>
              <div className="form-row">
                <label className="field">Hours<input required value={form.operating_hours} onChange={set('operating_hours')} /></label>
                <label className="field">Minutes / customer<input required min="1" max="240" type="number" value={form.average_service_time} onChange={set('average_service_time')} /></label>
              </div>
              <button className="btn" disabled={busy === 'form'}>{busy === 'form' ? <Spinner light /> : editing ? 'Save changes' : <><Plus size={16} /> Add service</>}</button>
            </div>
          </form>
          {list}
        </div>
      ) : list}
    </>
  );
}
