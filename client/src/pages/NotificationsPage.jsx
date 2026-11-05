import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, BellRing, CheckCheck } from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { isStaff } from '../lib/roles';
import { formatDateTime, timeAgo } from '../lib/format';
import { Alert, EmptyState, Loading, PageHeader, useApi } from '../components/ui';

export default function NotificationsPage() {
  const { profile } = useAuth();
  const staff = isStaff(profile?.role);
  const { data, setData, error, setError, loading, reload } = useApi('/notifications', { interval: 15000, initial: [] });
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const items = data || [];
  const unread = items.filter((n) => !n.is_read);
  const shown = filter === 'unread' ? unread : items;

  useEffect(() => {
    if (!profile?.id) return undefined;
    const channel = supabase.channel(`notifications-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, reload)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, reload]);

  async function markRead(ids) {
    setError('');
    try {
      await Promise.all(ids.map((id) => api(`/notifications/${id}/read`, { method: 'PUT' })));
      setData((current) => current.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function markAll() { setBusy(true); await markRead(unread.map((n) => n.id)); setBusy(false); }

  return (
    <>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description={staff ? 'New tickets and queue activity for your desk.' : 'Updates about your queues, delivered as they happen.'}
        actions={unread.length > 0 && <button className="btn btn-secondary" disabled={busy} onClick={markAll}><CheckCheck size={16} /> Mark all as read</button>}
      />
      <Alert message={error} />
      <div className="card">
        <div className="card-header">
          <div className="tabs" role="tablist" aria-label="Filter notifications">
            <button role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'tab active' : 'tab'} onClick={() => setFilter('all')}>All <span className="subtle">{items.length}</span></button>
            <button role="tab" aria-selected={filter === 'unread'} className={filter === 'unread' ? 'tab active' : 'tab'} onClick={() => setFilter('unread')}>Unread <span className="subtle">{unread.length}</span></button>
          </div>
        </div>
        {loading ? <Loading /> : shown.length ? shown.map((n) => (
          <article className={n.is_read ? 'note' : 'note unread'} key={n.id}>
            <span className="note-icon">{n.is_read ? <Bell size={17} /> : <BellRing size={17} />}</span>
            <div className="note-body">
              <strong>{n.title}</strong>
              <p>{n.message}</p>
              <small title={formatDateTime(n.created_at)}>{timeAgo(n.created_at)}</small>
              {n.queue_id && <Link className="link" to={staff ? '/admin/queues' : `/queue/${n.queue_id}`}>{staff ? 'Open queue console' : 'View ticket'} <ArrowRight size={13} /></Link>}
            </div>
            {!n.is_read && <button className="btn btn-ghost btn-sm" onClick={() => markRead([n.id])}>Mark read</button>}
          </article>
        )) : (
          <EmptyState icon={Bell} title={filter === 'unread' ? 'No unread notifications' : 'You’re all caught up'}>
            {staff ? 'New queue activity for your desk will appear here.' : 'We’ll notify you here when your queue is about to be called.'}
          </EmptyState>
        )}
      </div>
    </>
  );
}
