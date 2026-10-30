import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '../lib/api';
import LoadingButton from '../components/LoadingButton';
import Toast from '../components/Toast';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = () => api('/notifications').then(setItems).catch((loadError) => setError(loadError.message));
  useEffect(() => { load(); }, []);

  async function markRead(id) {
    setBusy(id);
    setError('');
    try {
      await api(`/notifications/${id}/read`, { method: 'PUT' });
      setItems((current) => current.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
    } catch (markError) {
      setError(markError.message);
    } finally {
      setBusy('');
    }
  }

  async function markAllRead() {
    const unread = items.filter((item) => !item.is_read);
    setBusy('all');
    setError('');
    try {
      await Promise.all(unread.map((item) => api(`/notifications/${item.id}/read`, { method: 'PUT' })));
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    } catch (markError) {
      setError(markError.message);
      await load();
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">UPDATES</div>
          <h1>Notifications</h1>
          <p className="muted">Important updates about your queues.</p>
        </div>
        {items.some((item) => !item.is_read) && (
          <LoadingButton
            type="button"
            className="button secondary"
            loading={busy === 'all'}
            loadingLabel="Marking all as read…"
            disabled={Boolean(busy)}
            onClick={markAllRead}
          >
            <CheckCheck size={16} /> Mark visible as read
          </LoadingButton>
        )}
      </div>
      <Toast message={error} />
      <div className="notification-list">
        {items.length ? items.map((notification) => (
          <article className={notification.is_read ? 'notification read' : 'notification'} key={notification.id}>
            <div className="notification-icon"><Bell size={18} /></div>
            <div className="notification-copy">
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
              <small>{new Date(notification.created_at).toLocaleString()}</small>
            </div>
            {!notification.is_read && (
              <LoadingButton
                type="button"
                className="text-button"
                loading={busy === notification.id}
                loadingLabel="Marking…"
                disabled={Boolean(busy)}
                onClick={() => markRead(notification.id)}
              >
                Mark read
              </LoadingButton>
            )}
          </article>
        )) : (
          <div className="empty-card">
            <div className="empty-icon"><Bell /></div>
            <h2>You’re all caught up</h2>
            <p className="muted">New queue updates will appear here.</p>
          </div>
        )}
      </div>
    </>
  );
}
