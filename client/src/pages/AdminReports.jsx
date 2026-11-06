import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock3, Download, ScrollText, Search, Ticket, Timer, Users } from 'lucide-react';
import { api } from '../lib/api';
import { departmentLabel } from '../lib/roles';
import { formatDate, formatDateTime, formatTime, minutes } from '../lib/format';
import { Alert, Avatar, EmptyState, Loading, PageHeader, Spinner, StatCard, TableLoading, useApi } from '../components/ui';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const PRESETS = [['Today', 0], ['7 days', 6], ['30 days', 29], ['90 days', 89]];
const pct = (part, total) => (total ? `${Math.round((part / total) * 100)}%` : '—');

/* ============ Reports ============ */
export function AdminReports() {
  const [range, setRange] = useState({ from: daysAgo(6), to: iso(new Date()) });
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const qs = `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try { setReport(await api(`/reports?${qs}`)); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }, [qs]);
  useEffect(() => { load(); }, [load]);

  async function download() {
    setExporting(true); setError('');
    try {
      const token = localStorage.getItem('onequeue_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/reports?${qs}&format=csv`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!response.ok) throw new Error('Unable to export this report.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url; link.download = `onequeue-report_${range.from}_to_${range.to}.csv`; link.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e.message); } finally { setExporting(false); }
  }

  const t = report?.totals;
  const daily = report?.daily || [];
  const max = Math.max(1, ...daily.map((d) => d.total));
  const activePreset = PRESETS.find(([, n]) => range.from === daysAgo(n) && range.to === iso(new Date()))?.[0];

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Reports & analytics"
        description="Queue volume, outcomes and staff performance for any date range."
        actions={<button className="btn btn-secondary" disabled={!report || exporting} onClick={download}>{exporting ? <Spinner /> : <Download size={16} />} Export CSV</button>}
      />
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="toolbar" style={{ borderBottom: 0 }}>
          <div className="tabs" role="tablist" aria-label="Date presets">
            {PRESETS.map(([label, n]) => (
              <button key={label} role="tab" aria-selected={activePreset === label} className={activePreset === label ? 'tab active' : 'tab'} onClick={() => setRange({ from: daysAgo(n), to: iso(new Date()) })}>{label}</button>
            ))}
          </div>
          <label className="field">From<input type="date" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value })} /></label>
          <label className="field">To<input type="date" value={range.to} min={range.from} onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })} /></label>
          {busy && <Spinner />}
        </div>
      </div>
      <Alert message={error} />

      {!report ? (busy ? <Loading /> : null) : (
        <>
          {report.truncated && <Alert type="info" message="This range hit the 10,000-ticket limit. Narrow the dates for complete totals." />}
          <div className="grid grid-4">
            <StatCard label="Total tickets" value={t.total} hint={`${report.total_customers} registered customers`} icon={Ticket} />
            <StatCard label="Completed" value={t.completed} hint={`${pct(t.completed, t.total)} completion rate`} icon={CheckCircle2} tone="success" />
            <StatCard label="Avg. wait" value={minutes(t.average_waiting_time)} hint="Joined → called" icon={Clock3} tone="warning" />
            <StatCard label="Avg. processing" value={minutes(t.average_processing_time)} hint="Started → completed" icon={Timer} tone="info" />
          </div>

          <div className="split section">
            <section className="card">
              <div className="card-header"><div><h2>Daily volume</h2><p>{formatDate(`${range.from}T00:00`)} – {formatDate(`${range.to}T00:00`)}</p></div><BarChart3 size={18} className="subtle" /></div>
              <div className="card-body">
                {daily.length ? (
                  <div className="bars" style={{ gap: daily.length > 20 ? 3 : 10 }}>
                    {daily.map((d) => (
                      <div className="bar" key={d.date} title={`${formatDate(`${d.date}T00:00`)}: ${d.total}`}>
                        {daily.length <= 14 ? <strong>{d.total}</strong> : <strong />}
                        <div className="bar-track"><i style={{ height: `${(d.total / max) * 100}%` }} /></div>
                        {daily.length <= 14 ? <small>{new Date(`${d.date}T00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })}</small> : <small />}
                      </div>
                    ))}
                  </div>
                ) : <EmptyState icon={BarChart3} title="No tickets in this period" />}
              </div>
            </section>
            <section className="card">
              <div className="card-header"><div><h2>Outcomes</h2><p>Share of all tickets</p></div></div>
              <div className="card-body dist">
                {[['Completed', t.completed, 'var(--success)'], ['Cancelled', t.cancelled, 'var(--neutral)'], ['No-show', t.no_show, 'var(--danger)'], ['Still waiting', t.waiting, 'var(--warning)']].map(([label, value, color]) => (
                  <div className="dist-row" key={label}>
                    <div className="dist-row-head"><span>{label}</span><strong>{value} <span className="subtle" style={{ fontWeight: 500 }}>· {pct(value, t.total)}</span></strong></div>
                    <div className="meter"><i style={{ width: t.total ? `${(value / t.total) * 100}%` : 0, background: color }} /></div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="card section">
            <div className="card-header"><div><h2>Department performance</h2><p>Registrar, Finance and SAO</p></div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Department</th><th className="num">Tickets</th><th className="num">Completed</th><th className="num">Cancelled</th><th className="num">No-show</th><th className="num">Waiting</th><th className="num">Avg. wait</th><th className="num">Avg. processing</th></tr></thead>
                <tbody>
                  {report.departments.length ? report.departments.map((r) => (
                    <tr key={r.department}>
                      <td><span className={`role-tag role-${r.department}`}>{departmentLabel(r.department)}</span></td>
                      <td className="num"><strong>{r.total}</strong></td>
                      <td className="num">{r.completed}</td>
                      <td className="num">{r.cancelled}</td>
                      <td className="num">{r.skipped}</td>
                      <td className="num">{r.waiting}</td>
                      <td className="num">{minutes(r.average_waiting_time)}</td>
                      <td className="num">{minutes(r.average_processing_time)}</td>
                    </tr>
                  )) : <tr><td colSpan={8}><EmptyState title="No department data" /></td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card section">
            <div className="card-header"><div><h2>Staff performance</h2><p>Ranked by completed tickets</p></div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Staff member</th><th className="num">Completed</th><th className="num">Avg. processing</th></tr></thead>
                <tbody>
                  {report.staff_performance.length ? report.staff_performance.map((r, i) => (
                    <tr key={r.staff_id}>
                      <td className="subtle">{i + 1}</td>
                      <td><div className="cell-user"><Avatar name={r.staff_name} soft />{r.staff_name}</div></td>
                      <td className="num"><strong>{r.completed}</strong></td>
                      <td className="num">{minutes(r.average_processing_time)}</td>
                    </tr>
                  )) : <tr><td colSpan={4}><EmptyState icon={Users} title="No completed tickets">Staff results appear once tickets are completed in this period.</EmptyState></td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}

/* ============ Activity log ============ */
const ACTION_LABELS = {
  'queue.created': 'Joined a queue', 'queue.called': 'Called a ticket', 'queue.recalled': 'Recalled a ticket', 'queue.cancelled': 'Cancelled a ticket',
  'service.created': 'Created a service', 'service.updated': 'Updated a service', 'staff.created': 'Created a staff account', 'staff.updated': 'Updated a staff account',
  'user.updated': 'Updated a user account',
};
const describe = (action) => ACTION_LABELS[action] || action?.replace(/[._]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const tone = (action = '') => (action.includes('cancel') || action.includes('skip') || action.includes('no_show') ? 'badge-no-show'
  : action.includes('complete') ? 'badge-completed' : action.includes('call') || action.includes('start') ? 'badge-called'
    : action.startsWith('staff') || action.startsWith('user') || action.startsWith('service') ? 'badge-serving' : 'badge-waiting');

export function AdminActivity() {
  const { data, error, loading } = useApi('/activity?limit=200', { interval: 30000, initial: [] });
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const all = data || [];
  const types = [...new Set(all.map((r) => r.target_type).filter(Boolean))];
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((r) => (!type || r.target_type === type)
      && (!term || [r.actor?.name, r.action, r.metadata?.queue_number, r.target_type].some((v) => String(v || '').toLowerCase().includes(term))));
  }, [all, search, type]);

  return (
    <>
      <PageHeader eyebrow="Insights" title="Activity log" description="An audit trail of queue, service and account changes. Showing the latest 200 events." />
      <Alert message={error} />
      <section className="card">
        <div className="toolbar">
          <div className="search-input grow">
            <Search size={16} />
            <input className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by person, action or ticket" aria-label="Search activity" />
          </div>
          <select className="input" style={{ width: 'auto' }} value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by record type">
            <option value="">All records</option>
            {types.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Reference</th></tr></thead>
            <tbody>
              {loading ? <TableLoading colSpan={5} /> : rows.length ? rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }} title={formatDateTime(r.created_at)}>{formatDate(r.created_at)}<span className="sub">{formatTime(r.created_at)}</span></td>
                  <td><div className="cell-user"><Avatar name={r.actor?.name || 'System'} soft />{r.actor?.name || 'System'}</div></td>
                  <td><span className={`badge ${tone(r.action)}`}>{describe(r.action)}</span></td>
                  <td style={{ textTransform: 'capitalize' }}>{r.target_type || '—'}</td>
                  <td>{r.metadata?.queue_number ? <span className="ticket-code">{r.metadata.queue_number}</span> : <span className="subtle mono" style={{ fontSize: 12 }}>{r.target_id ? `${String(r.target_id).slice(0, 8)}…` : '—'}</span>}</td>
                </tr>
              )) : <tr><td colSpan={5}><EmptyState icon={ScrollText} title="No activity found">{search || type ? 'Try clearing your filters.' : 'Actions will be recorded here as your team works.'}</EmptyState></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

