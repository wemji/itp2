import { useEffect, useState } from 'react';
import {
  Activity,
  Check,
  CircleCheck,
  Clock3,
  Play,
  RefreshCw,
  SkipForward,
  Ticket,
  Users,
  Volume2,
} from 'lucide-react';
import { api } from '../lib/api';
import { LIVE_POLL_INTERVAL_MS } from '../lib/polling';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';

export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/dashboard'), api('/dashboard/activity')])
      .then(([summary, chart]) => {
        setStats(summary);
        setActivity(chart);
      })
      .catch((loadError) => setError(loadError.message));
  }, []);

  if (!stats) {
    return <div className="center-screen">{error ? <Toast message={error} /> : <span className="spinner" />}</div>;
  }

  const cards = [
    ['Total queues', stats.total, 'today', Ticket],
    ['Waiting', stats.waiting, 'active now', Users],
    ['Serving', stats.serving, 'at the counter', Activity],
    ['Completed', stats.completed, 'today', CircleCheck],
    ['Avg. waiting', `${stats.average_waiting_time} min`, 'completed queues', Clock3],
    ['Avg. service', `${stats.average_service_time} min`, 'completed queues', Clock3],
  ];
  const max = Math.max(1, ...activity.map((day) => day.total));

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">OPERATIONS OVERVIEW</div>
          <h1>Good day, team.</h1>
          <p className="muted">Here’s how your service center is doing today.</p>
        </div>
      </div>
      <div className="stats-grid">
        {cards.map(([name, value, hint, Icon]) => (
          <div className="stat-card" key={name}>
            <div className="stat-icon"><Icon size={18} /></div>
            <span>{name}</span><strong>{value}</strong><small>{hint}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-lower">
        <section className="chart-card">
          <div className="section-title">
            <div><h2>Queue activity</h2><p className="muted">Joined queues over the last 7 days</p></div>
            <Activity size={18} />
          </div>
          <div className="bar-chart">
            {activity.map((day) => (
              <div className="bar-column" key={day.date}>
                <strong>{day.total}</strong>
                <div className="bar-track"><i style={{ height: `${Math.max(8, (day.total / max) * 100)}%` }} /></div>
                <small>{day.label}</small>
              </div>
            ))}
          </div>
        </section>
        <div className="admin-callout">
          <Volume2 />
          <div><strong>Keep the line moving</strong><p>Call the next customer from Live queues, then mark their visit complete.</p></div>
        </div>
      </div>
    </>
  );
}

export function QueueManagement() {
  const [queues, setQueues] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null);

  const load = () => api('/queues')
    .then(setQueues)
    .catch((loadError) => setError(loadError.message))
    .finally(() => setLoading(false));

  useEffect(() => {
    load();
    const timer = setInterval(load, LIVE_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  async function action(queue, name) {
    setBusy(queue.id);
    setError('');
    try {
      await api(`/queues/${queue.id}/${name}`, { method: 'POST' });
      await load();
      setPending(null);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy('');
    }
  }

  function requestAction(queue, name) {
    const labels = {
      call: ['Call this customer?', `Queue ${queue.queue_number} will be notified that their turn is ready.`, 'Call customer'],
      start: ['Start this service?', `Queue ${queue.queue_number} will be marked as currently being served.`, 'Start service'],
      complete: ['Complete this service?', `Queue ${queue.queue_number} will be archived as completed.`, 'Complete service'],
      skip: ['Mark as no-show?', `Queue ${queue.queue_number} will be removed from the active line and recorded as a no-show.`, 'Mark no-show'],
    };
    const [title, description, confirmLabel] = labels[name];
    setPending({ queue, name, title, description, confirmLabel, danger: name === 'skip' });
  }

  const active = queues.filter((queue) => ['WAITING', 'CALLED', 'SERVING'].includes(queue.status));

  return (
    <>
      <div className="page-heading">
        <div><div className="eyebrow">OPERATIONS</div><h1>Live queues</h1><p className="muted">Manage customers and move each queue through the service flow.</p></div>
        <button className="button secondary" onClick={load}><RefreshCw size={16} /> Refresh</button>
      </div>
      <Toast message={error} />
      <div className="queue-summary">
        <strong>{active.length}</strong><span>active customers</span><i />
        <span>{active.filter((queue) => queue.status === 'WAITING').length} waiting</span>
        <span>{active.filter((queue) => queue.status === 'SERVING').length} serving</span>
      </div>
      <div className="table-card">
        <table>
          <thead><tr><th>Queue</th><th>Customer</th><th>Service</th><th>Joined</th><th>Status</th><th>Next action</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="empty-table"><span className="spinner" /></td></tr>
            ) : active.length ? active.map((queue) => (
              <tr key={queue.id}>
                <td><strong className="queue-code">{queue.queue_number}</strong></td>
                <td>{queue.users?.name}</td>
                <td>{queue.services?.name}</td>
                <td>{new Date(queue.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td><span className={`status ${queue.status.toLowerCase()}`}>{queue.status}</span></td>
                <td>
                  <div className="actions">
                    {queue.status === 'WAITING' && <button disabled={busy === queue.id} onClick={() => requestAction(queue, 'call')}><Volume2 size={15} /><span>Call</span></button>}
                    {queue.status === 'CALLED' && <button disabled={busy === queue.id} onClick={() => requestAction(queue, 'start')}><Play size={15} /><span>Start</span></button>}
                    {queue.status === 'SERVING' && <button disabled={busy === queue.id} onClick={() => requestAction(queue, 'complete')}><Check size={15} /><span>Complete</span></button>}
                    <button disabled={busy === queue.id} onClick={() => requestAction(queue, 'skip')}><SkipForward size={15} /><span>Skip</span></button>
                  </div>
                </td>
              </tr>
            )) : <tr><td colSpan="6" className="empty-table">No active customers right now. New queue entries will appear here.</td></tr>}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.title}
        description={pending?.description}
        confirmLabel={pending?.confirmLabel}
        danger={pending?.danger}
        busy={Boolean(busy)}
        onCancel={() => setPending(null)}
        onConfirm={() => action(pending.queue, pending.name)}
      />
    </>
  );
}

const EMPTY_SERVICE_FORM = {
  name: '',
  description: '',
  location: '',
  opening_time: '08:00',
  closing_time: '17:00',
  average_service_time: '5',
};

function toTimeInputValue(hour, minute, period = '') {
  let normalizedHour = Number(hour);
  if (period) {
    normalizedHour %= 12;
    if (period.toUpperCase() === 'PM') normalizedHour += 12;
  }
  return `${String(normalizedHour).padStart(2, '0')}:${minute}`;
}

function parseOperatingHours(value) {
  const matches = [...String(value || '').matchAll(/(\d{1,2}):(\d{2})\s*(AM|PM)?/gi)];
  if (matches.length !== 2) return { opening_time: '08:00', closing_time: '17:00' };
  return {
    opening_time: toTimeInputValue(matches[0][1], matches[0][2], matches[0][3]),
    closing_time: toTimeInputValue(matches[1][1], matches[1][2], matches[1][3]),
  };
}

function formatClockTime(value) {
  const [hourText, minute = '00'] = value.split(':');
  const hour = Number(hourText);
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${minute} ${period}`;
}

function formatOperatingHours(openingTime, closingTime) {
  return `${formatClockTime(openingTime)} – ${formatClockTime(closingTime)}`;
}

export function ServiceManagement() {
  const [services, setServices] = useState([]);
  const [editing, setEditing] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY_SERVICE_FORM);
  const [pending, setPending] = useState(null);

  const load = () => api('/services').then(setServices).catch((loadError) => setError(loadError.message));
  useEffect(() => { load(); }, []);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (form.opening_time >= form.closing_time) {
      setError('Closing time must be later than opening time.');
      return;
    }
    setBusy(true);
    try {
      await api(editing ? `/services/${editing}` : '/services', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          location: form.location,
          operating_hours: formatOperatingHours(form.opening_time, form.closing_time),
          average_service_time: Number(form.average_service_time),
        }),
      });
      setForm(EMPTY_SERVICE_FORM);
      setEditing('');
      await load();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  function edit(service) {
    const hours = parseOperatingHours(service.operating_hours);
    setEditing(service.id);
    setForm({
      name: service.name,
      description: service.description,
      location: service.location,
      ...hours,
      average_service_time: String(service.average_service_time),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function toggle(service) {
    setBusy(true);
    setError('');
    try {
      await api(`/services/${service.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: service.status === 'OPEN' ? 'CLOSED' : 'OPEN' }),
      });
      await load();
      setPending(null);
    } catch (toggleError) {
      setError(toggleError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-heading"><div><div className="eyebrow">CONFIGURATION</div><h1>Services</h1><p className="muted">Set up the services customers can join and keep hours easy to find.</p></div></div>
      <Toast message={error} />
      <div className="two-col">
        <form className="form-card" onSubmit={submit}>
          <div className="form-card-heading">
            <h2>{editing ? 'Edit service' : 'Add a service'}</h2>
            {editing && <button type="button" className="text-button" onClick={() => { setEditing(''); setForm(EMPTY_SERVICE_FORM); }}>Cancel</button>}
          </div>
          <label>Service name<input required minLength="2" maxLength="100" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Registrar’s Office" /></label>
          <label>Description<textarea rows="3" maxLength="500" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What can customers get help with?" /></label>
          <label>Location<input maxLength="160" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Building or floor" /></label>
          <fieldset className="service-hours-fields">
            <legend>Operating hours</legend>
            <div>
              <label htmlFor="service-opening-time">Opens<input id="service-opening-time" required type="time" value={form.opening_time} onChange={(event) => setForm({ ...form, opening_time: event.target.value })} /></label>
              <label htmlFor="service-closing-time">Closes<input id="service-closing-time" required type="time" value={form.closing_time} onChange={(event) => setForm({ ...form, closing_time: event.target.value })} /></label>
            </div>
            <p>Use the service center’s local time.</p>
          </fieldset>
          <label htmlFor="average-service-time">
            Average service time <span className="field-hint">per customer</span>
            <span className="service-time-input">
              <input id="average-service-time" required min="1" max="240" step="1" inputMode="numeric" type="number" value={form.average_service_time} onChange={(event) => setForm({ ...form, average_service_time: event.target.value })} placeholder="5" />
              <span>minutes</span>
            </span>
          </label>
          <button className="button" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add service'}</button>
        </form>
        <div>
          <h2 className="list-heading">All services <span>{services.length}</span></h2>
          <div className="service-admin-list">
            {services.map((service) => (
              <article className="admin-service" key={service.id}>
                <div className="service-icon">{service.name[0]}</div>
                <div className="admin-service-copy"><strong>{service.name}</strong><p>{service.description || 'No description added'}</p><small>{service.location || 'Location not set'} · {service.operating_hours} · {service.average_service_time} min average</small></div>
                <span className={`status ${service.status === 'OPEN' ? 'serving' : 'cancelled'}`}>{service.status}</span>
                <button className="text-button" onClick={() => edit(service)}>Edit</button>
                <button className="text-button" onClick={() => setPending(service)}>{service.status === 'OPEN' ? 'Close' : 'Reopen'}</button>
              </article>
            ))}
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.status === 'OPEN' ? 'Close this service?' : 'Reopen this service?'}
        description={pending?.status === 'OPEN' ? `${pending?.name} will no longer accept new queue entries.` : `${pending?.name} will become available to customers again.`}
        confirmLabel={pending?.status === 'OPEN' ? 'Close service' : 'Reopen service'}
        danger={pending?.status === 'OPEN'}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => toggle(pending)}
      />
    </>
  );
}
