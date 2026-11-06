import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, CheckCircle2, Clock3, History as HistoryIcon, MapPin, Radio, Search, Ticket, Users } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ACTIVE_STATUSES, departmentLabel } from '../lib/roles';
import { firstName, formatDate, greeting, minutes } from '../lib/format';
import { Alert, EmptyState, Loading, PageHeader, StatCard, StatusBadge, useApi } from '../components/ui';
import { QueueSteps, statusMessage, useLiveQueue } from '../components/queue';

function ActiveTicket({ id, onChange }) {
  const { data: queue, error, reload } = useLiveQueue(id);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  if (!queue) return error ? <Alert message={error} /> : <div className="card"><Loading /></div>;

  async function cancel() {
    if (!window.confirm(`Cancel queue ${queue.queue_number}? You’ll lose your place in line.`)) return;
    setBusy(true); setActionError('');
    try { await api(`/queues/${queue.id}/cancel`, { method: 'PATCH' }); await reload(); onChange(); }
    catch (e) { setActionError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Alert message={actionError} />
      <section className="ticket">
        <div className="ticket-label" style={{ justifyContent: 'space-between' }}>
          <span><Radio size={13} style={{ verticalAlign: '-2px' }} /> Your active queue · {queue.services?.name}</span>
          <StatusBadge status={queue.status} />
        </div>
        <div className="ticket-number">{queue.queue_number}</div>
        <div className="ticket-service">{statusMessage(queue)}</div>
        <div className="ticket-stats">
          <div><span>Now serving</span><strong className="mono">{queue.now_serving || '—'}</strong></div>
          <div><span>Ahead of you</span><strong>{queue.status === 'WAITING' ? queue.people_ahead ?? 0 : 0}</strong></div>
          <div><span>Est. wait</span><strong>{queue.status === 'WAITING' ? minutes(queue.estimated_wait_time) : 'Now'}</strong></div>
        </div>
        <div className="ticket-actions">
          <Link className="btn btn-light" to={`/queue/${queue.id}`}>Track live <ArrowRight size={16} /></Link>
          {queue.status === 'WAITING' && <button className="btn btn-outline-light" disabled={busy} onClick={cancel}>{busy ? 'Cancelling…' : 'Cancel queue'}</button>}
        </div>
      </section>
      <div className="card card-body"><QueueSteps status={queue.status} /></div>
    </div>
  );
}

export function Dashboard() {
  const { profile } = useAuth();
  const queues = useApi('/queues', { interval: 15000, initial: [] });
  const history = useApi('/history', { initial: [] });
  const services = useApi('/services', { interval: 30000, initial: [] });
  const active = (queues.data || []).find((q) => ACTIVE_STATUSES.includes(q.status));
  const past = history.data || [];
  const completed = past.filter((h) => h.status === 'COMPLETED').length;
  const open = (services.data || []).filter((s) => s.status === 'OPEN');

  return (
    <>
      <PageHeader
        eyebrow="Customer dashboard"
        title={`${greeting()}, ${firstName(profile?.name)}`}
        description="Your queue, visits and service updates at a glance."
        actions={<Link className="btn" to="/services"><Search size={16} /> Find a service</Link>}
      />
      <Alert message={queues.error} />

      <div className="split">
        <div>
          {queues.loading ? <div className="card"><Loading /></div> : active ? (
            <ActiveTicket id={active.id} onChange={() => { queues.reload(); history.reload(); }} />
          ) : (
            <div className="card">
              <EmptyState icon={Ticket} title="You’re not in a queue" action={<Link className="btn" to="/services">Browse services <ArrowRight size={16} /></Link>}>
                Pick a service to see current wait times and join the line from wherever you are.
              </EmptyState>
            </div>
          )}

          <section className="section">
            <div className="section-head"><h2>Recent visits</h2><Link className="link" to="/history" style={{ fontSize: 14 }}>View all</Link></div>
            <div className="card">
              {history.loading ? <Loading /> : past.length ? (
                <div className="list">
                  {past.slice(0, 5).map((h) => (
                    <div className="list-item" key={h.id}>
                      <span className="tile"><Ticket size={17} /></span>
                      <div className="grow">
                        <strong className="ticket-code">{h.queue_number}</strong>
                        <p>{h.services?.name || 'Service'}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <StatusBadge status={h.status} />
                        <div className="subtle" style={{ fontSize: 12.5, marginTop: 4 }}>{formatDate(h.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyState icon={HistoryIcon} title="No visits yet">Completed and cancelled visits will show up here.</EmptyState>}
            </div>
          </section>
        </div>

        <aside className="grid" style={{ gap: 16 }}>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <StatCard label="Total visits" value={past.length} icon={Ticket} />
            <StatCard label="Completed" value={completed} icon={CheckCircle2} tone="success" />
          </div>
          <div className="card">
            <div className="card-header"><div><h2>Open services</h2><p>Live wait estimates</p></div></div>
            {services.loading ? <Loading /> : open.length ? (
              <div className="list">
                {open.slice(0, 5).map((s) => (
                  <Link to="/services" className="list-item" key={s.id}>
                    <span className={`tile ${s.department || ''}`}>{s.name?.[0]}</span>
                    <div className="grow"><strong>{s.name}</strong><p>{s.waiting_count || 0} waiting</p></div>
                    <span className="badge plain">~{s.estimated_wait || 0} min</span>
                  </Link>
                ))}
              </div>
            ) : <EmptyState title="No services open">Check back during operating hours.</EmptyState>}
          </div>
          <Link to="/notifications" className="card card-pad" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="tile"><Bell size={17} /></span>
            <div className="grow"><strong>Notifications</strong><p className="muted" style={{ fontSize: 13.5 }}>We’ll alert you when you’re next.</p></div>
            <ArrowRight size={16} className="subtle" />
          </Link>
        </aside>
      </div>
    </>
  );
}

export function Services() {
  const navigate = useNavigate();
  const services = useApi('/services', { interval: 30000, initial: [] });
  const queues = useApi('/queues', { initial: [] });
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('all');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const active = (queues.data || []).find((q) => ACTIVE_STATUSES.includes(q.status));

  const filtered = useMemo(() => (services.data || []).filter((s) => {
    const text = `${s.name} ${s.description || ''} ${s.location || ''}`.toLowerCase();
    return (department === 'all' || s.department === department) && text.includes(query.trim().toLowerCase());
  }).sort((a, b) => (a.status === b.status ? 0 : a.status === 'OPEN' ? -1 : 1)), [services.data, query, department]);

  async function join(service) {
    setBusy(service.id); setError('');
    try {
      const queue = await api('/queues', { method: 'POST', body: JSON.stringify({ service_id: service.id }) });
      navigate(`/queue/${queue.id}`);
    } catch (e) {
      setError(e.message);
      services.reload(); queues.reload();
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <PageHeader eyebrow="Service directory" title="Find a service" description="Compare live wait times and join an open queue in one tap." />
      <Alert message={services.error || error} />
      {active && (
        <div className="callout callout-info" style={{ marginBottom: 20 }}>
          <Ticket size={18} />
          <div style={{ flex: 1 }}><strong>You already have an active queue ({active.queue_number})</strong><p>You can be in one queue at a time. Finish or cancel it to join another service.</p></div>
          <Link className="btn btn-sm" to={`/queue/${active.id}`}>View ticket</Link>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="toolbar" style={{ borderBottom: 0 }}>
          <div className="search-input grow">
            <Search size={16} />
            <input className="input" type="search" placeholder="Search services, offices or locations" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search services" />
          </div>
          <div className="tabs" role="tablist" aria-label="Department">
            {[['all', 'All'], ['registrar', 'Registrar'], ['finance', 'Finance'], ['sao', 'SAO']].map(([value, label]) => (
              <button key={value} role="tab" aria-selected={department === value} className={department === value ? 'tab active' : 'tab'} onClick={() => setDepartment(value)}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {services.loading ? <Loading /> : filtered.length ? (
        <div className="grid grid-3">
          {filtered.map((s) => {
            const isOpen = s.status === 'OPEN';
            return (
              <article className="card service-card" key={s.id}>
                <div className="service-card-top">
                  <span className={`tile ${s.department || ''}`}>{s.name?.[0]}</span>
                  <StatusBadge status={s.status} />
                </div>
                <div>
                  <div className="subtle" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{departmentLabel(s.department)}</div>
                  <h3 style={{ fontSize: 16.5, marginTop: 2 }}>{s.name}</h3>
                </div>
                <p>{s.description || 'Visit the counter for details about this service.'}</p>
                <div className="service-facts">
                  <div><span>Waiting</span><strong>{s.waiting_count || 0}</strong></div>
                  <div><span>Est. wait</span><strong>{s.estimated_wait || 0}m</strong></div>
                  <div><span>Per person</span><strong>{s.average_service_time}m</strong></div>
                </div>
                <div className="service-where">
                  <span><MapPin size={14} />{s.location || 'Location to be announced'}</span>
                  <span><Clock3 size={14} />{s.operating_hours}</span>
                </div>
                <button className="btn btn-block" disabled={!isOpen || Boolean(active) || busy === s.id} onClick={() => join(s)}>
                  {busy === s.id ? 'Joining…' : !isOpen ? 'Currently closed' : active ? 'Already in a queue' : <>Join queue <ArrowRight size={16} /></>}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={Users} title={query || department !== 'all' ? 'No matching services' : 'No services yet'}>
            {query || department !== 'all' ? 'Try a different search or department.' : 'Services will appear here once an administrator adds them.'}
          </EmptyState>
        </div>
      )}
    </>
  );
}
