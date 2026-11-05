import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { api } from '../lib/api';
import { STATUS_LABELS } from '../lib/roles';
import { initial } from '../lib/format';

/** Loads JSON from the API, with optional polling. Keeps the last good data on refresh errors. */
export function useApi(path, { interval = 0, initial: initialData = null } = {}) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(path));
  const mounted = useRef(true);
  const reload = useCallback(async () => {
    if (!path) return;
    try {
      const result = await api(path);
      if (mounted.current) { setData(result); setError(''); }
    } catch (e) {
      if (mounted.current) setError(e.message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    mounted.current = true;
    reload();
    const timer = interval ? setInterval(reload, interval) : null;
    return () => { mounted.current = false; if (timer) clearInterval(timer); };
  }, [reload, interval]);
  return { data, setData, error, setError, loading, reload };
}

export function Spinner({ light = false }) {
  return <span className={light ? 'spinner light' : 'spinner'} role="status" aria-label="Loading" />;
}

export function Loading() {
  return <div className="loading-block"><Spinner /></div>;
}

const ALERT_ICONS = { error: AlertCircle, success: CheckCircle2, info: Info };
export function Alert({ message, type = 'error' }) {
  if (!message) return null;
  const Icon = ALERT_ICONS[type] || Info;
  return <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}><Icon size={17} /><span>{message}</span></div>;
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = '' }) {
  return (
    <div className="card stat">
      <div className="stat-top"><span>{label}</span>{Icon && <span className={`stat-icon ${tone}`}><Icon size={16} /></span>}</div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function StatusBadge({ status }) {
  if (!status) return null;
  const key = String(status).toLowerCase();
  return <span className={`badge badge-${key}`}>{STATUS_LABELS[status] || status}</span>;
}

export function RoleTag({ role }) {
  return <span className={`role-tag role-${role || 'customer'}`}>{role || 'customer'}</span>;
}

export function Avatar({ name, size = '', soft = false }) {
  return <span className={['avatar', size, soft ? 'soft' : ''].filter(Boolean).join(' ')} aria-hidden="true">{initial(name)}</span>;
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty">
      {Icon && <div className="empty-icon"><Icon size={22} /></div>}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function TableEmpty({ colSpan, children }) {
  return <tr><td colSpan={colSpan}><div className="empty" style={{ padding: 32 }}><p>{children}</p></div></td></tr>;
}

export function TableLoading({ colSpan }) {
  return <tr><td colSpan={colSpan}><Loading /></td></tr>;
}
