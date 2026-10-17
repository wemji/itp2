import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Clock3, MapPin, Ticket } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

function useLoad(path) {
  const [rows, setRows] = useState([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const load = useCallback(() => api(path).then(data => { setRows(data); setError(''); }).catch(e => setError(e.message)).finally(() => setLoading(false)), [path]);
  useEffect(() => { load(); }, [load]);
  return { rows, setRows, error, setError, loading, load };
}

export function Dashboard() {
  const { profile } = useAuth(); const { rows: queues, error, loading, load } = useLoad('/queues');
  const active = queues.find(q => ['WAITING', 'CALLED', 'SERVING'].includes(q.status));
  useEffect(() => { const timer = setInterval(load, 15000); return () => clearInterval(timer); }, [load]);
  return <><div className="page-heading"><div><div className="eyebrow">CUSTOMER DASHBOARD</div><h1>Welcome, {profile?.name?.split(' ')[0] || 'there'}.</h1><p className="muted">Your services and queue updates, all in one place.</p></div><Link className="button" to="/services">Find a service <ArrowRight size={16}/></Link></div><Toast message={error}/>{loading ? <div className="empty-card loading-card"><span className="spinner"/></div> : active ? <section className="queue-hero"><div className="eyebrow">YOUR ACTIVE QUEUE · {active.services?.name}</div><div className="queue-code">{active.queue_number}</div><p>{active.status === 'WAITING' ? 'You’re in line. Keep an eye on your place.' : active.status === 'CALLED' ? 'Your turn is being called. Please head to the service counter.' : 'You’re currently being served.'}</p><div className="queue-metrics"><div><strong>{Math.max(0, Math.ceil((active.estimated_wait_time || 0) / (active.services?.average_service_time || 5)))}</strong><span>People ahead</span></div><div><strong>{active.estimated_wait_time || 0} min</strong><span>Estimated wait</span></div><div><strong>{active.status}</strong><span>Queue status</span></div></div><div className="hero-actions"><Link className="button" to={`/queue/${active.id}`}>Track queue <ArrowRight size={16}/></Link><button className="button danger-outline" onClick={async () => { try { await api(`/queues/${active.id}/cancel`, { method: 'PATCH' }); await load(); } catch { load(); } }}>Cancel queue</button></div></section> : <section className="empty-card"><div className="empty-icon"><Ticket/></div><h2>No active queue</h2><p>Choose a service to see current wait estimates and join remotely.</p><Link className="button" to="/services">Browse services <ArrowRight size={16}/></Link></section>}<section className="section-block"><div className="section-title"><h2>Quick links</h2></div><div className="steps"><Link className="step" to="/services"><Ticket/><h3>Find a service</h3><p>Browse open services and join a queue.</p></Link><Link className="step" to="/history"><Clock3/><h3>Queue history</h3><p>Review completed and cancelled visits.</p></Link><Link className="step" to="/notifications"><Bell/><h3>Notifications</h3><p>See updates about your queue.</p></Link></div></section></>;
}

export function Services() {
  const { rows: services, error, loading, load } = useLoad('/services'); const [busy, setBusy] = useState(''); const [message, setMessage] = useState('');
  async function join(service) { setBusy(service.id); setMessage(''); try { const queue = await api('/queues', { method: 'POST', body: JSON.stringify({ service_id: service.id }) }); window.location.assign(`/queue/${queue.id}`); } catch (e) { setMessage(e.message); await load(); } finally { setBusy(''); } }
  return <><div className="page-heading"><div><div className="eyebrow">SERVICE DIRECTORY</div><h1>Find a service</h1><p className="muted">Check current wait estimates and join an open queue.</p></div></div><Toast message={error || message}/>{loading ? <div className="empty-card loading-card"><span className="spinner"/></div> : services.length ? <div className="service-grid">{services.map(s => <article className="service-card" key={s.id}><div className="service-icon">{s.name?.[0]}</div><span className={`status ${s.status === 'OPEN' ? 'serving' : 'cancelled'}`}>{s.status}</span><h2>{s.name}</h2><p>{s.description || 'Service information is available at the counter.'}</p><small><MapPin size={14}/>{s.location || 'Location not specified'} · {s.operating_hours}</small><div className="service-meta"><span><Clock3 size={15}/> ~{s.estimated_wait || 0} min wait</span><span>{s.waiting_count || 0} waiting</span></div><button className="button full" disabled={s.status !== 'OPEN' || busy === s.id} onClick={() => join(s)}>{busy === s.id ? 'Joining…' : s.status === 'OPEN' ? 'Join queue' : 'Currently closed'}</button></article>)}</div> : <div className="empty-card"><h2>No services listed yet</h2><p>Please check back later.</p></div>}</>;
}

export function Notifications() {
  const { rows, error, loading, load } = useLoad('/notifications'); const [actionError, setActionError] = useState('');
  async function markRead(item) { try { await api(`/notifications/${item.id}/read`, { method: 'PUT' }); await load(); } catch (e) { setActionError(e.message); } }
  return <><div className="page-heading"><div><div className="eyebrow">UPDATES</div><h1>Notifications</h1><p className="muted">Queue updates and account activity.</p></div></div><Toast message={error || actionError}/>{loading ? <div className="empty-card loading-card"><span className="spinner"/></div> : <div className="notification-list">{rows.length ? rows.map(item => <article className={`notification-card ${item.is_read ? '' : 'unread'}`} key={item.id}><div className="empty-icon"><Bell/></div><div><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.created_at).toLocaleString()}</small>{item.queue_id && <Link to={`/queue/${item.queue_id}`}>View queue <ArrowRight size={14}/></Link>}</div>{!item.is_read && <button className="text-button" onClick={() => markRead(item)}>Mark read</button>}</article>) : <div className="empty-card"><div className="empty-icon"><Bell/></div><h2>You’re all caught up</h2><p>Queue updates will appear here.</p></div>}</div>}</>;
}
