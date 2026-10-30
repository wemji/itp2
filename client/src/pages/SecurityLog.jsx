import { useEffect, useState } from 'react';
import { Activity, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import Toast from '../components/Toast';

function actionLabel(action) {
  return String(action || '').replace('.', ' · ').replaceAll('_', ' ');
}

export default function SecurityLog() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/audit-logs?limit=100')
      .then(setItems)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-heading">
        <div><div className="eyebrow">SECURITY &amp; ACCOUNTABILITY</div><h1>Security log</h1><p className="muted">Review recent administrative and operational changes.</p></div>
      </div>
      <Toast message={error} />
      {loading ? (
        <div className="empty-card loading-card"><span className="spinner" /></div>
      ) : items.length ? (
        <div className="audit-list">
          {items.map((item) => (
            <article className="audit-card" key={item.id}>
              <span className="audit-icon"><Activity size={18} /></span>
              <div className="audit-copy">
                <strong>{actionLabel(item.action)}</strong>
                <p>{item.users?.name || 'System'} · {item.target_type}</p>
                <small>{new Date(item.created_at).toLocaleString()}</small>
              </div>
              <span className="audit-status"><ShieldCheck size={14} /> Recorded</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-card"><div className="empty-icon"><ShieldCheck /></div><h2>No security events yet</h2><p>Administrative changes will appear here.</p></div>
      )}
    </>
  );
}
