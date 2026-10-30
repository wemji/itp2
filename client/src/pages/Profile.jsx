import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import LoadingButton from '../components/LoadingButton';
import Toast from '../components/Toast';

export default function Profile() {
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setName(profile.name);
  }, [profile]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api('/profile', { method: 'PUT', body: JSON.stringify({ name }) });
      setMessage('Profile updated successfully.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR ACCOUNT</div>
          <h1>Profile</h1>
          <p className="muted">Keep your contact details up to date.</p>
        </div>
      </div>
      <div className="profile-layout">
        <form className="form-card" onSubmit={save}>
          <h2>Personal information</h2>
          {error && <Toast message={error} />}
          {message && <div className="success-alert">{message}</div>}
          <label>Display name<input required minLength="2" maxLength="80" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Email<input disabled value={profile?.email || ''} /></label>
          <label>Role<input disabled value={profile?.role || ''} /></label>
          <LoadingButton className="button" loading={saving} loadingLabel="Saving changes…">
            Save changes
          </LoadingButton>
        </form>
        <div className="profile-summary">
          <div className="avatar large">{profile?.name?.[0]?.toUpperCase() || 'U'}</div>
          <h2>{profile?.name}</h2>
          <p>{profile?.email}</p>
          <span className="status serving">{profile?.role}</span>
        </div>
      </div>
    </>
  );
}
