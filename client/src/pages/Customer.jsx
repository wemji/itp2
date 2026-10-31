import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Clock3, MapPin, Ticket } from 'lucide-react';
import { api } from '../lib/api';
import { LIVE_POLL_INTERVAL_MS } from '../lib/polling';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import LoadingButton from '../components/LoadingButton';
import ErrorState from '../components/ErrorState';
import { CardGridSkeleton, CustomerDashboardSkeleton } from '../components/Skeletons';

function useLoad(path) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => api(path)
    .then((data) => { setRows(data); setError(''); })
    .catch((loadError) => setError(loadError.message))
    .finally(() => setLoading(false)), [path]);
  useEffect(() => { load(); }, [load]);
  const retry = useCallback(() => {
    setLoading(true);
    return load();
  }, [load]);
  return { rows, error, loading, load, retry };
}

export function Dashboard() {
  const { profile } = useAuth();
  const { rows: queues, error, loading, load, retry } = useLoad('/queues');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const active = queues.find((queue) => ['WAITING', 'CALLED', 'SERVING'].includes(queue.status));

  useEffect(() => {
    const timer = setInterval(load, LIVE_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  async function cancelQueue() {
    setCancelling(true);
    setCancelError('');
    try {
      await api(`/queues/${active.id}/cancel`, { method: 'PATCH' });
      await load();
      setConfirmCancel(false);
    } catch (actionError) {
      setCancelError(actionError.message);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div><div className="eyebrow">CUSTOMER DASHBOARD</div><h1>Welcome, {profile?.name?.split(' ')[0] || 'there'}.</h1><p className="muted">Your services and queue updates, all in one place.</p></div>
        <Link className="button" to="/services">Find a service <ArrowRight size={16} /></Link>
      </div>
      {(queues.length > 0 || cancelError) && <Toast message={cancelError || error} />}
      {loading ? (
        <CustomerDashboardSkeleton />
      ) : error && !queues.length ? (
        <ErrorState message={error} onRetry={retry} retrying={loading} />
      ) : active ? (
        <section className="queue-hero">
          <div className="eyebrow">YOUR ACTIVE QUEUE · {active.services?.name}</div>
          <div className="queue-code">{active.queue_number}</div>
          <p>{active.status === 'WAITING' ? 'You’re in line. Keep an eye on your place.' : active.status === 'CALLED' ? 'Your turn is being called. Please head to the service counter.' : 'You’re currently being served.'}</p>
          <div className="queue-metrics">
            <div><strong>{Math.max(0, Math.ceil((active.estimated_wait_time || 0) / (active.services?.average_service_time || 5)))}</strong><span>People ahead</span></div>
            <div><strong>{active.estimated_wait_time || 0} min</strong><span>Estimated wait</span></div>
            <div><strong>{active.status}</strong><span>Queue status</span></div>
          </div>
          <div className="hero-actions">
            <Link className="button" to={`/queue/${active.id}`}>Track queue <ArrowRight size={16} /></Link>
            {active.status !== 'SERVING' && <button className="button danger-outline" onClick={() => setConfirmCancel(true)}>Cancel queue</button>}
          </div>
        </section>
      ) : (
        <section className="empty-card"><div className="empty-icon"><Ticket /></div><h2>No active queue</h2><p>Choose a service to see current wait estimates and join remotely.</p><Link className="button" to="/services">Browse services <ArrowRight size={16} /></Link></section>
      )}
      <section className="section-block">
        <div className="section-title"><h2>Quick links</h2></div>
        <div className="steps">
          <Link className="step" to="/services"><Ticket /><h3>Find a service</h3><p>Browse open services and join a queue.</p></Link>
          <Link className="step" to="/history"><Clock3 /><h3>Queue history</h3><p>Review completed and cancelled visits.</p></Link>
          <Link className="step" to="/notifications"><Bell /><h3>Notifications</h3><p>See updates about your queue.</p></Link>
        </div>
      </section>
      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this queue?"
        description={`Queue ${active?.queue_number || ''} will be removed from the active line. You will need to join again if you change your mind.`}
        confirmLabel="Cancel queue"
        busyLabel="Cancelling queue…"
        danger
        busy={cancelling}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={cancelQueue}
      />
    </>
  );
}

export function Services() {
  const { rows: services, error, loading, load, retry } = useLoad('/services');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  async function join(service) {
    setBusy(service.id);
    setMessage('');
    try {
      const queue = await api('/queues', { method: 'POST', body: JSON.stringify({ service_id: service.id }) });
      window.location.assign(`/queue/${queue.id}`);
    } catch (joinError) {
      setMessage(joinError.message);
      await load();
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <div className="page-heading"><div><div className="eyebrow">SERVICE DIRECTORY</div><h1>Find a service</h1><p className="muted">Check current wait estimates and join an open queue.</p></div></div>
      {services.length > 0 && <Toast message={error} />}
      <Toast message={message} />
      {loading ? (
        <CardGridSkeleton />
      ) : error && !services.length ? (
        <ErrorState message={error} onRetry={retry} retrying={loading} />
      ) : services.length ? (
        <div className="service-grid">
          {services.map((service) => (
            <article className="service-card" key={service.id}>
              <div className="service-icon">{service.name?.[0]}</div>
              <span className={`status ${service.status === 'OPEN' ? 'serving' : 'cancelled'}`}>{service.status}</span>
              <h2>{service.name}</h2>
              <p>{service.description || 'Service information is available at the counter.'}</p>
              <small><MapPin size={14} />{service.location || 'Location not specified'} · {service.operating_hours}</small>
              <div className="service-meta"><span><Clock3 size={15} /> ~{service.estimated_wait || 0} min wait</span><span>{service.waiting_count || 0} waiting</span></div>
              <LoadingButton
                type="button"
                className="button full"
                loading={busy === service.id}
                loadingLabel="Joining queue…"
                disabled={service.status !== 'OPEN'}
                onClick={() => join(service)}
              >
                {service.status === 'OPEN' ? 'Join queue' : 'Currently closed'}
              </LoadingButton>
            </article>
          ))}
        </div>
      ) : <div className="empty-card"><h2>No services listed yet</h2><p>Please check back later.</p></div>}
    </>
  );
}
