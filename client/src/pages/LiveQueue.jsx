import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BellRing,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  MapPin,
  Radio,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import { LIVE_POLL_INTERVAL_MS } from '../lib/polling';
import { supabase } from '../lib/supabase';
import Toast from '../components/Toast';

const statusLabels = {
  WAITING: 'WAITING',
  CALLED: 'YOUR TURN',
  SERVING: 'IN SERVICE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  'NO-SHOW': 'NO-SHOW',
};

function QueueNotice({ queue }) {
  if (queue.status === 'CALLED') {
    return <><BellRing /><div><strong>It’s your turn</strong><p>Proceed to {queue.counters?.counter_name || queue.services?.name} now.</p></div></>;
  }
  if (queue.status === 'SERVING') {
    return <><CheckCircle2 /><div><strong>You’re being served</strong><p>Your queue is active at {queue.counters?.counter_name || 'the service counter'}.</p></div></>;
  }
  if (queue.status === 'COMPLETED') {
    return <><CheckCircle2 /><div><strong>Visit complete</strong><p>Thank you. Your service has been completed.</p></div></>;
  }
  if (['CANCELLED', 'NO-SHOW'].includes(queue.status)) {
    return <><XCircle /><div><strong>Queue ended</strong><p>This queue is no longer active. You can join another service from your dashboard.</p></div></>;
  }
  return <><BellRing /><div><strong>We’ll keep you posted</strong><p>Your live position refreshes every 2.5 seconds.</p></div></>;
}

export default function LiveQueue() {
  const { id } = useParams();
  const [queue, setQueue] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = () => api(`/queues/${id}`)
      .then((data) => {
        if (mounted) {
          setQueue(data);
          setError('');
        }
      })
      .catch((loadError) => mounted && setError(loadError.message));

    load();
    const timer = setInterval(load, LIVE_POLL_INTERVAL_MS);
    const channel = supabase
      .channel(`live-queue-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queues', filter: `id=eq.${id}` }, load)
      .subscribe();

    return () => {
      mounted = false;
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (error && !queue) {
    return <><Link to="/dashboard" className="back-link"><ChevronLeft size={17} />Back to dashboard</Link><Toast message={error} /></>;
  }
  if (!queue) return <div className="center-screen"><span className="spinner" /></div>;

  const terminal = ['COMPLETED', 'CANCELLED', 'NO-SHOW'].includes(queue.status);
  const waitLabel = terminal
    ? '—'
    : queue.status === 'CALLED'
      ? 'Now'
      : queue.status === 'SERVING'
        ? 'In service'
        : queue.people_ahead === 0
          ? 'Next'
          : `~${queue.estimated_wait_time} min`;
  const progress = Number.isFinite(queue.progress_percent) ? queue.progress_percent : 0;
  const serviceDetails = [queue.services?.location, queue.counters?.counter_name || queue.services?.operating_hours]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="live-queue-page">
      <Link to="/dashboard" className="back-link"><ChevronLeft size={17} />Back to dashboard</Link>
      <Toast message={error} />

      <section className={`live-queue-panel is-${queue.status.toLowerCase()}`} aria-label="Live queue status">
        {!terminal && (
          <div className="live-wait-float">
            <Clock3 aria-hidden="true" />
            <div><strong>{waitLabel}</strong><span>estimated wait</span></div>
          </div>
        )}

        <header className="live-browser-bar">
          <div className="live-browser-title">
            <span className="live-window-dots" aria-hidden="true"><i /><i /><i /></span>
            <Radio size={17} />
            <strong>Live queue</strong>
          </div>
          <span className="live-secure"><ShieldCheck size={17} />Secure</span>
        </header>

        <div className="live-queue-body" aria-live="polite">
          <div className="live-ticket-row">
            <div>
              <span className="live-number-label">YOUR QUEUE NUMBER</span>
              <h1 className="live-number">{queue.queue_number}</h1>
            </div>
            <span className={`status ${queue.status.toLowerCase()}`}><i />{statusLabels[queue.status] || queue.status}</span>
          </div>

          <div className="live-service-card">
            <span className="live-service-icon"><MapPin /></span>
            <div><strong>{queue.services?.name || 'Service desk'}</strong><span>{serviceDetails || 'Location details will appear here'}</span></div>
          </div>

          <div className="live-progress-block">
            <div className="live-progress-copy"><span>Queue progress</span><strong>{progress}%</strong></div>
            <div
              className="live-progress-track"
              role="progressbar"
              aria-label="Queue progress"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={progress}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="live-stats">
            <div><span>NOW SERVING</span><strong>{queue.now_serving || '—'}</strong></div>
            <div><span>PEOPLE AHEAD</span><strong>{terminal ? '—' : queue.people_ahead ?? 0}</strong></div>
            <div><span>EST. WAIT</span><strong>{waitLabel}</strong></div>
          </div>
        </div>

        <div className={`live-notice ${['CANCELLED', 'NO-SHOW'].includes(queue.status) ? 'notice-ended' : ''}`}>
          <QueueNotice queue={queue} />
        </div>
      </section>
    </div>
  );
}
