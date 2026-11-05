import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BellRing, CheckCircle2, Clock3, MapPin, Radio, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { ENDED_STATUSES } from '../lib/roles';
import { formatDateTime, formatTime, minutes } from '../lib/format';
import { Alert, Loading, StatusBadge } from '../components/ui';
import { QueueSteps, statusMessage, useLiveQueue } from '../components/queue';

export default function LiveQueue() {
  const { id } = useParams();
  const { data: queue, error, reload } = useLiveQueue(id);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  if (!queue) {
    return (
      <>
        <Link to="/dashboard" className="back-link"><ArrowLeft size={15} /> Dashboard</Link>
        {error ? <Alert message={error} /> : <Loading />}
      </>
    );
  }

  const ended = ENDED_STATUSES.includes(queue.status);
  const waiting = queue.status === 'WAITING';
  const ahead = waiting ? queue.people_ahead ?? 0 : 0;
  const progress = waiting ? Math.max(8, 100 - ahead * 12) : ended ? 100 : 92;

  async function cancel() {
    if (!window.confirm(`Cancel queue ${queue.queue_number}? You’ll lose your place in line.`)) return;
    setBusy(true); setActionError('');
    try { await api(`/queues/${queue.id}/cancel`, { method: 'PATCH' }); await reload(); }
    catch (e) { setActionError(e.message); }
    finally { setBusy(false); }
  }

  const callout = {
    CALLED: ['info', BellRing, 'It’s your turn', statusMessage(queue)],
    SERVING: ['success', CheckCircle2, 'You’re being served', statusMessage(queue)],
    COMPLETED: ['success', CheckCircle2, 'Visit complete', statusMessage(queue)],
    CANCELLED: ['neutral', XCircle, 'Queue cancelled', 'You can join another service any time.'],
    'NO-SHOW': ['warning', XCircle, 'Ticket skipped', statusMessage(queue)],
  }[queue.status];

  return (
    <>
      <Link to="/dashboard" className="back-link"><ArrowLeft size={15} /> Dashboard</Link>
      <div className="page-header">
        <div>
          <div className="eyebrow"><Radio size={13} /> Live tracking</div>
          <h1>{queue.services?.name || 'Your queue'}</h1>
          <p>{ended ? 'This ticket is closed.' : 'This page updates automatically — no need to refresh.'}</p>
        </div>
        <div className="actions">
          {waiting && <button className="btn btn-danger" disabled={busy} onClick={cancel}>{busy ? 'Cancelling…' : 'Cancel queue'}</button>}
          {ended && <Link className="btn" to="/services">Join another service</Link>}
        </div>
      </div>
      <Alert message={actionError || (queue && error ? 'Connection issue — showing the last known status.' : '')} />

      <div className="split">
        <div className="grid" style={{ gap: 16 }}>
          <section className={ended ? 'ticket ended' : 'ticket'}>
            <div className="ticket-label" style={{ justifyContent: 'space-between' }}>
              <span>Your queue number</span>
              <StatusBadge status={queue.status} />
            </div>
            <div className="ticket-number">{queue.queue_number}</div>
            <div className="ticket-service">{waiting ? statusMessage(queue) : `${queue.services?.name}`}</div>
            <div className="ticket-stats">
              <div><span>Now serving</span><strong className="mono">{queue.now_serving || '—'}</strong></div>
              <div><span>Ahead of you</span><strong>{ahead}</strong></div>
              <div><span>Est. wait</span><strong>{waiting ? minutes(queue.estimated_wait_time) : ended ? '—' : 'Now'}</strong></div>
            </div>
            {!ended && <div className="progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>}
          </section>
          {callout && (
            <div className={`callout callout-${callout[0]}`}>
              {(() => { const Icon = callout[1]; return <Icon size={20} />; })()}
              <div><strong>{callout[2]}</strong><p>{callout[3]}</p></div>
            </div>
          )}
          <div className="card card-body"><QueueSteps status={queue.status} /></div>
        </div>

        <aside className="card">
          <div className="card-header"><h2>Ticket details</h2></div>
          <div className="card-body">
            <div className="kv" style={{ marginTop: 0, borderTop: 0 }}>
              <div><span>Service</span><strong>{queue.services?.name}</strong></div>
              <div><span>Counter</span><strong>{queue.counters?.counter_name || 'To be assigned'}</strong></div>
              <div><span>Joined</span><strong>{formatDateTime(queue.joined_at)}</strong></div>
              {queue.called_at && <div><span>Called</span><strong>{formatTime(queue.called_at)}</strong></div>}
              {queue.serving_at && <div><span>Service started</span><strong>{formatTime(queue.serving_at)}</strong></div>}
              {queue.completed_at && <div><span>Completed</span><strong>{formatTime(queue.completed_at)}</strong></div>}
              <div><span>Avg. per customer</span><strong>{minutes(queue.services?.average_service_time)}</strong></div>
            </div>
            {!ended && (
              <div className="callout callout-neutral" style={{ marginTop: 16 }}>
                <MapPin size={17} />
                <div><p>Stay within reach — when you’re called you’ll have a few minutes to reach the counter before your ticket is skipped.</p></div>
              </div>
            )}
            {!ended && <p className="subtle" style={{ fontSize: 12.5, marginTop: 12 }}><Clock3 size={12} style={{ verticalAlign: '-1px' }} /> Updates in real time</p>}
          </div>
        </aside>
      </div>
    </>
  );
}
