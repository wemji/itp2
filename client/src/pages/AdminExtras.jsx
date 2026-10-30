import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import LoadingButton from '../components/LoadingButton';

export function CounterManagement() {
  const [rows, setRows] = useState([]);
  const [services, setServices] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [form, setForm] = useState({ service_id: '', counter_name: '', staff_id: '' });

  const load = () => api('/counters').then(setRows).catch((loadError) => setError(loadError.message));
  useEffect(() => {
    load();
    api('/services').then(setServices).catch((loadError) => setError(loadError.message));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/counters', {
        method: 'POST',
        body: JSON.stringify({ ...form, staff_id: form.staff_id || null }),
      });
      setForm({ service_id: '', counter_name: '', staff_id: '' });
      await load();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(row) {
    setBusy(true);
    setError('');
    try {
      await api(`/counters/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: row.status === 'ACTIVE' ? 'OFFLINE' : 'ACTIVE' }),
      });
      await load();
      setPending(null);
    } catch (toggleError) {
      setError(toggleError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-heading"><div><div className="eyebrow">CONFIGURATION</div><h1>Service counters</h1><p className="muted">Connect counters to services and keep track of their availability.</p></div></div>
      <Toast message={error} />
      <div className="two-col">
        <form className="form-card" onSubmit={submit}>
          <h2>Add counter</h2>
          <label>Service<select required value={form.service_id} onChange={(event) => setForm({ ...form, service_id: event.target.value })}><option value="">Select service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
          <label>Counter name<input required minLength="1" maxLength="80" value={form.counter_name} onChange={(event) => setForm({ ...form, counter_name: event.target.value })} placeholder="e.g. Counter A" /></label>
          <LoadingButton className="button" loading={busy && !pending} loadingLabel="Creating counter…" disabled={busy}>
            Create counter
          </LoadingButton>
        </form>
        <div>
          <h2 className="list-heading">All counters <span>{rows.length}</span></h2>
          <div className="service-admin-list">
            {rows.length ? rows.map((row) => (
              <article className="admin-service" key={row.id}>
                <div className="service-icon">C</div>
                <div className="admin-service-copy"><strong>{row.counter_name}</strong><p>{row.services?.name}</p><small>{row.users?.name || 'No staff assigned'}</small></div>
                <span className={`status ${row.status === 'ACTIVE' ? 'serving' : 'cancelled'}`}>{row.status}</span>
                <button className="text-button" onClick={() => setPending(row)}>{row.status === 'ACTIVE' ? 'Set offline' : 'Activate'}</button>
              </article>
            )) : <div className="empty-card compact-empty">No counters yet. Add one to make it available to your team.</div>}
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.status === 'ACTIVE' ? 'Set this counter offline?' : 'Activate this counter?'}
        description={pending?.status === 'ACTIVE' ? `${pending?.counter_name} will stop accepting active service work.` : `${pending?.counter_name} will become available for service work.`}
        confirmLabel={pending?.status === 'ACTIVE' ? 'Set offline' : 'Activate counter'}
        busyLabel={pending?.status === 'ACTIVE' ? 'Setting offline…' : 'Activating counter…'}
        danger={pending?.status === 'ACTIVE'}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => toggle(pending)}
      />
    </>
  );
}

export function StaffManagement() {
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });

  const load = () => api('/staff').then(setRows).catch((loadError) => setError(loadError.message));
  useEffect(() => { load(); }, []);

  function submit(event) {
    event.preventDefault();
    setPending({
      kind: 'create',
      title: `Create ${form.role} account?`,
      description: `${form.name.trim()} will receive ${form.role} access to ONEQUEUE. Confirm your identity to continue.`,
      confirmLabel: 'Create account',
      danger: form.role === 'admin',
      busyLabel: 'Creating account…',
    });
  }

  async function confirmAction(password) {
    setBusy(true);
    setError('');
    try {
      if (pending.kind === 'create') {
        await api('/staff', {
          method: 'POST',
          body: JSON.stringify({ ...form, reauth_password: password }),
        });
        setForm({ name: '', email: '', password: '', role: 'staff' });
      } else if (pending.kind === 'role') {
        await api(`/staff/${pending.row.id}`, {
          method: 'PUT',
          body: JSON.stringify({ role: pending.role, reauth_password: password }),
        });
      } else {
        await api(`/staff/${pending.row.id}`, {
          method: 'PUT',
          body: JSON.stringify({ is_active: !pending.row.is_active, reauth_password: password }),
        });
      }
      await load();
      setPending(null);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy(false);
    }
  }

  function requestRole(row, role) {
    if (role === row.role) return;
    setPending({
      kind: 'role',
      row,
      role,
      title: role === 'admin' ? 'Grant administrator access?' : 'Change this account to staff?',
      description: role === 'admin'
        ? `${row.name} will be able to create accounts and manage team access.`
        : `${row.name} will keep operational access but lose team-management permissions.`,
      confirmLabel: 'Change role',
      danger: role === 'admin',
      busyLabel: 'Updating role…',
    });
  }

  function requestToggle(row) {
    setPending({
      kind: 'toggle',
      row,
      title: row.is_active ? 'Deactivate this account?' : 'Reactivate this account?',
      description: row.is_active
        ? `${row.name} will no longer be able to access staff operations.`
        : `${row.name} will regain access based on their assigned role.`,
      confirmLabel: row.is_active ? 'Deactivate account' : 'Reactivate account',
      danger: row.is_active,
      busyLabel: row.is_active ? 'Deactivating account…' : 'Reactivating account…',
    });
  }

  return (
    <>
      <div className="page-heading"><div><div className="eyebrow">ADMINISTRATION</div><h1>Staff accounts</h1><p className="muted">Manage access for the team running your service center.</p></div></div>
      <Toast message={error} />
      <div className="two-col">
        <form className="form-card" onSubmit={submit}>
          <h2>Add a team member</h2>
          <label>Full name<input required minLength="2" maxLength="80" autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Maria Santos" /></label>
          <label>Email<input required type="email" maxLength="200" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="staff@school.edu" /></label>
          <label>Temporary password<input required minLength="8" maxLength="128" pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,128}" type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="8+ characters with letters and numbers" /></label>
          <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="staff">Staff</option><option value="admin">Admin</option></select></label>
          <LoadingButton className="button" loading={busy && pending?.kind === 'create'} loadingLabel="Creating account…" disabled={busy}>
            Create account
          </LoadingButton>
        </form>
        <div>
          <h2 className="list-heading">Team members <span>{rows.length}</span></h2>
          <div className="service-admin-list">
            {rows.map((row) => (
              <article className="admin-service" key={row.id}>
                <div className="avatar">{row.name?.[0]?.toUpperCase()}</div>
                <div className="admin-service-copy"><strong>{row.name}</strong><p>{row.email}</p><small>Added {new Date(row.created_at).toLocaleDateString()}</small></div>
                <select aria-label={`Role for ${row.name}`} value={row.role} disabled={row.id === profile?.id || !row.is_active} onChange={(event) => requestRole(row, event.target.value)}><option value="staff">Staff</option><option value="admin">Admin</option></select>
                <button className="text-button" disabled={row.id === profile?.id} title={row.id === profile?.id ? 'You cannot change your own access here.' : undefined} onClick={() => requestToggle(row)}>{row.is_active ? 'Deactivate' : 'Activate'}</button>
                <span className={`status ${row.is_active ? 'serving' : 'cancelled'}`}>{row.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
              </article>
            ))}
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.title}
        description={pending?.description}
        confirmLabel={pending?.confirmLabel}
        busyLabel={pending?.busyLabel}
        danger={pending?.danger}
        requirePassword
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={confirmAction}
      />
    </>
  );
}
