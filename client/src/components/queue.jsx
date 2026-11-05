import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApi } from './ui';

/** Live details for one queue ticket: polls every 15s and refreshes instantly on realtime changes. */
export function useLiveQueue(id) {
  const result = useApi(id ? `/queues/${id}` : null, { interval: 15000 });
  const { reload } = result;
  useEffect(() => {
    if (!id) return undefined;
    const channel = supabase.channel(`live-queue-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queues', filter: `id=eq.${id}` }, reload)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, reload]);
  return result;
}

const STEP_ORDER = ['WAITING', 'CALLED', 'SERVING', 'COMPLETED'];
const STEP_LABELS = ['In line', 'Called', 'Being served', 'Done'];

export function QueueSteps({ status }) {
  const index = STEP_ORDER.indexOf(status);
  return (
    <div className="steps" aria-label="Queue progress">
      {STEP_LABELS.map((label, i) => {
        const done = index >= 0 && (i < index || status === 'COMPLETED');
        const current = i === index && status !== 'COMPLETED';
        return (
          <div key={label} className={`step${done ? ' done' : ''}${current ? ' current' : ''}`} aria-current={current ? 'step' : undefined}>
            <span className="step-dot">{done ? <Check size={15} strokeWidth={3} /> : i + 1}</span>
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export const statusMessage = (queue) => ({
  WAITING: queue.people_ahead ? `${queue.people_ahead} ${queue.people_ahead === 1 ? 'person is' : 'people are'} ahead of you. We’ll notify you when you’re next.` : 'You’re next in line. Please stay nearby.',
  CALLED: `It’s your turn! Please proceed to ${queue.counters?.counter_name || 'the service counter'} now.`,
  SERVING: `You’re being served at ${queue.counters?.counter_name || 'the counter'}.`,
  COMPLETED: 'Your visit is complete. Thank you for using ONEQUEUE.',
  CANCELLED: 'This queue was cancelled.',
  'NO-SHOW': 'This ticket was skipped because you weren’t at the counter when called.',
}[queue.status] || '');
