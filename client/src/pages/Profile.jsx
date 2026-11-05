import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { roleInfo } from '../lib/roles';
import { formatDate } from '../lib/format';
import { Alert, Avatar, PageHeader, RoleTag, Spinner } from '../components/ui';

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (profile) setName(profile.name || ''); }, [profile]);
  const dirty = name.trim() !== (profile?.name || '');

  async function save(e) {
    e.preventDefault();
    setMessage(''); setError(''); setBusy(true);
    try {
      await api('/profile', { method: 'PUT', body: JSON.stringify({ name: name.trim() }) });
      await refreshProfile();
      setMessage('Your profile has been updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Account" title="Profile" description="Manage your personal details and sign-in settings." />
      <div className="split-form">
        <aside className="card profile-card">
          <Avatar name={profile?.name} size="lg" />
          <h2 style={{ marginTop: 8 }}>{profile?.name}</h2>
          <p>{profile?.email}</p>
          <RoleTag role={profile?.role} />
          <div className="kv">
            <div><span>Account type</span><strong>{roleInfo(profile?.role).label}</strong></div>
            <div><span>Workspace</span><strong>{roleInfo(profile?.role).workspace}</strong></div>
            {profile?.created_at && <div><span>Member since</span><strong>{formatDate(profile.created_at)}</strong></div>}
          </div>
        </aside>

        <div className="grid" style={{ gap: 20 }}>
          <form className="card" onSubmit={save}>
            <div className="card-header"><div><h2>Personal information</h2><p>This name appears on your tickets and to service staff.</p></div></div>
            <div className="card-body form-grid">
              <Alert message={error} />
              <Alert type="success" message={message} />
              <label className="field">Display name<input required minLength="2" maxLength="80" value={name} onChange={(e) => setName(e.target.value)} /></label>
              <div className="form-row">
                <label className="field">Email address<input disabled value={profile?.email || ''} /><span className="field-hint">Contact an administrator to change your email.</span></label>
                <label className="field">Role<input disabled value={roleInfo(profile?.role).label} /></label>
              </div>
              <div><button className="btn" disabled={busy || !dirty}>{busy ? <Spinner light /> : 'Save changes'}</button></div>
            </div>
          </form>

          <div className="card">
            <div className="card-header"><div><h2>Password</h2><p>Reset your password with a secure link sent to your email.</p></div></div>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span className="tile"><KeyRound size={17} /></span>
              <p className="muted" style={{ flex: 1, minWidth: 200, fontSize: 14 }}>For security, password changes are confirmed by email.</p>
              <Link className="btn btn-secondary" to="/forgot-password">Send reset link</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
