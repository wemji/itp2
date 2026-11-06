import { useMemo, useState } from 'react';
import { ClipboardList, Plus, Search, ShieldCheck, UserCheck, UserCog, Users, UserX } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { departmentLabel, roleInfo } from '../lib/roles';
import { formatDate } from '../lib/format';
import {
  Alert, Avatar, EmptyState, PageHeader, RoleTag, Spinner, StatCard, StatusBadge, TableLoading, useApi,
} from '../components/ui';

/* ============ Counters ============ */
const EMPTY_COUNTER = { service_id: '', counter_name: '', staff_id: '' };

export function CounterManagement() {
  const { profile } = useAuth();
  const admin = profile?.role === 'admin';
  const counters = useApi('/counters', { initial: [] });
  const services = useApi('/services', { initial: [] });
  const staff = useApi(admin ? '/staff' : null, { initial: [] });
  const [form, setForm] = useState(EMPTY_COUNTER);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const rows = counters.data || [];
  const activeStaff = (staff.data || []).filter((s) => s.is_active);

  async function submit(e) {
    e.preventDefault();
    setBusy('form'); setError(''); setNotice('');
    try {
      await api('/counters', { method: 'POST', body: JSON.stringify({ ...form, staff_id: form.staff_id || null }) });
      setNotice(`${form.counter_name} was created.`);
      setForm(EMPTY_COUNTER);
      await counters.reload();
    } catch (err) { setError(err.message); } finally { setBusy(''); }
  }
  async function update(row, body, message) {
    setBusy(row.id); setError(''); setNotice('');
    try { await api(`/counters/${row.id}`, { method: 'PUT', body: JSON.stringify(body) }); setNotice(message); await counters.reload(); }
    catch (err) { setError(err.message); } finally { setBusy(''); }
  }

  return (
    <>
      <PageHeader eyebrow={roleInfo(profile?.role).workspace} title="Service counters" description="Set up the windows or desks where customers are served, and mark them online or offline." />
      <Alert message={error || counters.error || services.error} />
      <Alert type="success" message={notice} />
      <div className="split-form">
        <form className="card sticky" onSubmit={submit}>
          <div className="card-header"><h2>Add a counter</h2></div>
          <div className="card-body form-grid">
            <label className="field">Service
              <select required value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}>
                <option value="">Select a service</option>
                {(services.data || []).map((s) => <option key={s.id} value={s.id}>{s.name} ({departmentLabel(s.department)})</option>)}
              </select>
            </label>
            <label className="field">Counter name<input required maxLength="80" value={form.counter_name} onChange={(e) => setForm({ ...form, counter_name: e.target.value })} placeholder="e.g. Window 1" /></label>
            {admin && (
              <label className="field">Assigned staff <span className="field-hint">Optional</span>
                <select value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {activeStaff.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}
                </select>
              </label>
            )}
            <button className="btn" disabled={busy === 'form'}>{busy === 'form' ? <Spinner light /> : <><Plus size={16} /> Create counter</>}</button>
          </div>
        </form>

        <section className="card">
          <div className="card-header"><div><h2>All counters <span className="subtle" style={{ fontWeight: 500 }}>{rows.length}</span></h2><p>{rows.filter((r) => r.status === 'ACTIVE').length} online</p></div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Counter</th><th>Service</th><th>Staff</th><th>Status</th><th className="num">Action</th></tr></thead>
              <tbody>
                {counters.loading ? <TableLoading colSpan={5} /> : rows.length ? rows.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.counter_name}</strong></td>
                    <td>{row.services?.name}<span className="sub">{departmentLabel(row.services?.department)}</span></td>
                    <td>
                      {admin ? (
                        <select className="input" style={{ minWidth: 150, minHeight: 34, padding: '5px 10px' }} value={row.staff_id || ''} disabled={busy === row.id} aria-label={`Staff for ${row.counter_name}`}
                          onChange={(e) => update(row, { staff_id: e.target.value || null }, `Updated staff for ${row.counter_name}.`)}>
                          <option value="">Unassigned</option>
                          {activeStaff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      ) : (row.users?.name || <span className="subtle">Unassigned</span>)}
                    </td>
                    <td><StatusBadge status={row.status} /></td>
                    <td><div className="row-actions">
                      <button className="btn btn-sm btn-secondary" disabled={busy === row.id} onClick={() => update(row, { status: row.status === 'ACTIVE' ? 'OFFLINE' : 'ACTIVE' }, `${row.counter_name} is now ${row.status === 'ACTIVE' ? 'offline' : 'online'}.`)}>
                        {row.status === 'ACTIVE' ? 'Set offline' : 'Set online'}
                      </button>
                    </div></td>
                  </tr>
                )) : <tr><td colSpan={5}><EmptyState icon={ClipboardList} title="No counters yet">Add a counter so staff can serve customers from it.</EmptyState></td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

/* ============ Staff ============ */
const EMPTY_STAFF = { name: '', email: '', password: '', role: 'registrar' };

export function StaffManagement() {
  const { profile } = useAuth();
  const { data, error: loadError, loading, reload } = useApi('/staff', { initial: [] });
  const [form, setForm] = useState(EMPTY_STAFF);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const rows = data || [];
  const count = (role) => rows.filter((r) => r.role === role && r.is_active).length;

  async function submit(e) {
    e.preventDefault();
    setBusy('form'); setError(''); setNotice('');
    try {
      await api('/staff', { method: 'POST', body: JSON.stringify(form) });
      setNotice(`Created an account for ${form.name}. Share the temporary password with them securely.`);
      setForm(EMPTY_STAFF);
      await reload();
    } catch (err) { setError(err.message); } finally { setBusy(''); }
  }
  async function update(row, body, message) {
    if (body.is_active === false && !window.confirm(`Deactivate ${row.name}? They will no longer be able to sign in.`)) return;
    setBusy(row.id); setError(''); setNotice('');
    try { await api(`/staff/${row.id}`, { method: 'PUT', body: JSON.stringify(body) }); setNotice(message); await reload(); }
    catch (err) { setError(err.message); } finally { setBusy(''); }
  }

  return (
    <>
      <PageHeader eyebrow="Administration" title="Staff accounts" description="Create accounts for Registrar, Finance and SAO teams, assign roles and control access." />
      <Alert message={error || loadError} />
      <Alert type="success" message={notice} />
      <div className="grid grid-5" style={{ marginBottom: 20 }}>
        <StatCard label="Active staff" value={rows.filter((r) => r.is_active).length} icon={Users} />
        <StatCard label="Registrar" value={count('registrar')} icon={UserCog} tone="info" />
        <StatCard label="Finance" value={count('finance')} icon={UserCog} tone="warning" />
        <StatCard label="SAO" value={count('sao')} icon={UserCog} tone="rose" />
        <StatCard label="Administrators" value={count('admin')} icon={ShieldCheck} tone="violet" />
      </div>
      <div className="split-form">
        <form className="card sticky" onSubmit={submit}>
          <div className="card-header"><div><h2>Add a team member</h2><p>They can sign in immediately.</p></div></div>
          <div className="card-body form-grid">
            <label className="field">Full name<input required minLength="2" maxLength="80" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="field">Work email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label className="field">Temporary password<input required minLength="6" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><span className="field-hint">At least 6 characters. Ask them to change it after first sign-in.</span></label>
            <label className="field">Role
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="registrar">Registrar staff</option>
                <option value="finance">Finance staff</option>
                <option value="sao">SAO staff</option>
                <option value="admin">Administrator</option>
              </select>
            </label>
            <button className="btn" disabled={busy === 'form'}>{busy === 'form' ? <Spinner light /> : <><Plus size={16} /> Create account</>}</button>
          </div>
        </form>

        <section className="card">
          <div className="card-header"><div><h2>Team members <span className="subtle" style={{ fontWeight: 500 }}>{rows.length}</span></h2><p>You can’t change your own role or access.</p></div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Member</th><th>Role</th><th>Added</th><th>Status</th><th className="num">Access</th></tr></thead>
              <tbody>
                {loading ? <TableLoading colSpan={5} /> : rows.length ? rows.map((row) => {
                  const self = row.id === profile?.id;
                  return (
                    <tr key={row.id}>
                      <td><div className="cell-user"><Avatar name={row.name} soft /><div>{row.name}{self && <span className="subtle"> (you)</span>}<span className="sub">{row.email}</span></div></div></td>
                      <td>
                        <select className="input" style={{ minWidth: 130, minHeight: 34, padding: '5px 10px' }} aria-label={`Role for ${row.name}`} value={row.role} disabled={self || !row.is_active || busy === row.id}
                          onChange={(e) => update(row, { role: e.target.value }, `${row.name} is now ${roleInfo(e.target.value).label.toLowerCase()}.`)}>
                          <option value="registrar">Registrar</option>
                          <option value="finance">Finance</option>
                          <option value="sao">SAO</option>
                          <option value="staff">Legacy staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>{formatDate(row.created_at)}</td>
                      <td><StatusBadge status={row.is_active ? 'ACTIVE' : 'INACTIVE'} /></td>
                      <td><div className="row-actions">
                        <button className={row.is_active ? 'btn btn-sm btn-danger' : 'btn btn-sm btn-secondary'} disabled={self || busy === row.id}
                          title={self ? 'You can’t change your own access.' : undefined}
                          onClick={() => update(row, { is_active: !row.is_active }, `${row.name} has been ${row.is_active ? 'deactivated' : 'reactivated'}.`)}>
                          {row.is_active ? <><UserX size={14} /> Deactivate</> : <><UserCheck size={14} /> Activate</>}
                        </button>
                      </div></td>
                    </tr>
                  );
                }) : <tr><td colSpan={5}><EmptyState icon={UserCog} title="No staff yet">Create the first Registrar, Finance or SAO account.</EmptyState></td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

/* ============ Users ============ */
export function CustomerManagement() {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const { data, error: loadError, loading, reload } = useApi(`/users?search=${encodeURIComponent(search)}`, { initial: [] });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const all = data || [];
  const rows = useMemo(() => all.filter((r) => status === 'all' || (status === 'active' ? r.is_active : !r.is_active)), [all, status]);

  async function toggle(row) {
    if (row.is_active && !window.confirm(`Deactivate ${row.name}? They won’t be able to sign in or join queues.`)) return;
    setBusy(row.id); setError(''); setNotice('');
    try {
      await api(`/users/${row.id}`, { method: 'PUT', body: JSON.stringify({ is_active: !row.is_active }) });
      setNotice(`${row.name} has been ${row.is_active ? 'deactivated' : 'reactivated'}.`);
      await reload();
    } catch (err) { setError(err.message); } finally { setBusy(''); }
  }

  return (
    <>
      <PageHeader eyebrow="Administration" title="User accounts" description="Look up customer accounts and control who can sign in." />
      <Alert message={error || loadError} />
      <Alert type="success" message={notice} />
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <StatCard label="Accounts found" value={all.length} icon={Users} />
        <StatCard label="Active" value={all.filter((r) => r.is_active).length} icon={UserCheck} tone="success" />
        <StatCard label="Deactivated" value={all.filter((r) => !r.is_active).length} icon={UserX} tone="danger" />
      </div>
      <section className="card">
        <form className="toolbar" onSubmit={(e) => { e.preventDefault(); setSearch(input.trim()); }}>
          <div className="search-input grow">
            <Search size={16} />
            <input className="input" type="search" value={input} onChange={(e) => { setInput(e.target.value); if (!e.target.value) setSearch(''); }} placeholder="Search by name or email" aria-label="Search users" />
          </div>
          <button className="btn">Search</button>
          <div className="tabs" role="tablist" aria-label="Account status">
            {[['all', 'All'], ['active', 'Active'], ['inactive', 'Deactivated']].map(([value, label]) => (
              <button type="button" key={value} role="tab" aria-selected={status === value} className={status === value ? 'tab active' : 'tab'} onClick={() => setStatus(value)}>{label}</button>
            ))}
          </div>
        </form>
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Joined</th><th>Status</th><th className="num">Action</th></tr></thead>
            <tbody>
              {loading ? <TableLoading colSpan={5} /> : rows.length ? rows.map((row) => (
                <tr key={row.id}>
                  <td><div className="cell-user"><Avatar name={row.name} soft /><div>{row.name}<span className="sub">{row.email}</span></div></div></td>
                  <td><RoleTag role={row.role} /></td>
                  <td>{formatDate(row.created_at)}</td>
                  <td><StatusBadge status={row.is_active ? 'ACTIVE' : 'INACTIVE'} /></td>
                  <td><div className="row-actions">
                    <button className={row.is_active ? 'btn btn-sm btn-danger' : 'btn btn-sm btn-secondary'} disabled={busy === row.id} onClick={() => toggle(row)}>
                      {busy === row.id ? 'Saving…' : row.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div></td>
                </tr>
              )) : <tr><td colSpan={5}><EmptyState icon={Users} title="No users found">{search ? `Nothing matches “${search}”.` : 'Customer accounts appear here after they register.'}</EmptyState></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
