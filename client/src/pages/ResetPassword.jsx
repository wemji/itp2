import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AuthShell from '../components/AuthShell';
import { Alert, Spinner } from '../components/ui';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    if (password.length < 6) return setError('Use at least 6 characters for your new password.');
    if (password !== confirm) return setError('The two passwords don’t match.');
    setBusy(true); setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage('Password updated. Redirecting you to sign in…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Choose a new password" description="Pick something at least 6 characters long that you haven’t used before.">
      <Alert message={error} />
      <Alert type="success" message={message} />
      <form className="form-grid" onSubmit={submit}>
        <label className="field">New password
          <input required minLength="6" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="field">Confirm new password
          <input required minLength="6" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        <button className="btn btn-lg btn-block" disabled={busy || Boolean(message)}>{busy ? <Spinner light /> : 'Update password'}</button>
      </form>
      <p className="auth-switch"><Link className="link" to="/login">Back to sign in</Link></p>
    </AuthShell>
  );
}
