import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, History as HistoryIcon, Search, Ticket, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { departmentLabel, isStaff, roleInfo } from '../lib/roles';
import { formatDate, formatTime, minutes } from '../lib/format';
import { Alert, Avatar, EmptyState, PageHeader, StatCard, StatusBadge, TableLoading, useApi } from '../components/ui';

const STATUSES = [['', 'All'], ['COMPLETED', 'Completed'], ['CANCELLED', 'Cancelled'], ['NO-SHOW', 'No-show']];

export default function History() {
  const { profile } = useAuth();
  const staff = isStaff(profile?.role);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });

  const path = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (range.from) params.set('from', new Date(`${range.from}T00:00:00`).toISOString());
    if (range.to) params.set('to', new Date(`${range.to}T23:59:59`).toISOString());
    const qs = params.toString();
    return `/history${qs ? `?${qs}` : ''}`;
  }, [status, range]);
  const { data, error, loading } = useApi(path, { initial: [] });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data || []).filter((r) => !term || [r.queue_number, r.users?.name, r.users?.email, r.services?.name].some((v) => v?.toLowerCase().includes(term)));
  }, [data, search]);

  const completed = rows.filter((r) => r.status === 'COMPLETED');
  const avg = (key) => (completed.length ? Math.round(completed.reduce((sum, r) => sum + (r[key] || 0), 0) / completed.length) : 0);
  const cols = staff ? 7 : 6;

  return (
    <>
      <PageHeader
        eyebrow={staff ? roleInfo(profile.role).workspace : 'Your account'}
        title={staff ? 'Queue history' : 'Visit history'}
        description={staff ? 'Every closed ticket for your desk, with wait and service times.' : 'A record of your past queues and how long each one took.'}
      />
      <Alert message={error} />

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <StatCard label="Records" value={rows.length} icon={Ticket} />
        <StatCard label="Completed" value={completed.length} icon={CheckCircle2} tone="success" />
        <StatCard label="Avg. wait" value={minutes(avg('waiting_time'))} icon={Clock3} tone="warning" />
        <StatCard label="Cancelled / no-show" value={rows.length - completed.length} icon={XCircle} tone="danger" />
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search-input grow">
            <Search size={16} />
            <input className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={staff ? 'Search ticket, customer or service' : 'Search ticket or service'} aria-label="Search history" />
          </div>
          <label className="field">From<input type="date" value={range.from} max={range.to || undefined} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
          <label className="field">To<input type="date" value={range.to} min={range.from || undefined} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
          <div className="tabs" role="tablist" aria-label="Status">
            {STATUSES.map(([value, label]) => (
              <button key={label} role="tab" aria-selected={status === value} className={status === value ? 'tab active' : 'tab'} onClick={() => setStatus(value)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                {staff && <th>Customer</th>}
                <th>Service</th>
                <th>Date</th>
                <th className="num">Wait</th>
                <th className="num">Service time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <TableLoading colSpan={cols} /> : rows.length ? rows.map((r) => (
                <tr key={r.id}>
                  <td><span className="ticket-code">{r.queue_number}</span></td>
                  {staff && (
                    <td><div className="cell-user"><Avatar name={r.users?.name} soft /><div>{r.users?.name || '—'}<span className="sub">{r.users?.email}</span></div></div></td>
                  )}
                  <td>{r.services?.name || '—'}<span className="sub">{departmentLabel(r.services?.department)}</span></td>
                  <td>{formatDate(r.created_at)}<span className="sub">{formatTime(r.created_at)}</span></td>
                  <td className="num">{minutes(r.waiting_time)}</td>
                  <td className="num">{r.status === 'COMPLETED' ? minutes(r.service_time) : '—'}</td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              )) : (
                <tr><td colSpan={cols}><EmptyState icon={HistoryIcon} title="No history found">{search || status || range.from || range.to ? 'Try clearing your filters.' : 'Closed tickets will appear here.'}</EmptyState></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
