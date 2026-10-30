import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Toast from '../components/Toast';
import '../auth.css';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password) || password !== confirm) {
      setError('Passwords must match and contain at least 8 characters, including a letter and number.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage('Password updated. You can now sign in.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page auth-neu recovery-page">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <Link to="/" className="brand auth-brand" aria-label="Back to ONEQUEUE home">
        <span className="brand-mark">O</span>
        <span>ONEQUEUE</span>
      </Link>

      <main className="auth-shell">
        <section className="auth-welcome" aria-label="New password guidance">
          <div className="auth-badge"><span /> Final recovery step</div>
          <h2>One last step.<br /><em>Secure your account.</em></h2>
          <p>Choose a new password and you will be ready to manage your queues again.</p>

          <div className="recovery-preview" aria-hidden="true">
            <div className="recovery-icon"><KeyRound size={25} /></div>
            <div>
              <span>Password guidance</span>
              <strong>Use 8 or more characters</strong>
              <p>Make it memorable for you and difficult for anyone else to guess.</p>
            </div>
            <ShieldCheck className="recovery-shield" size={20} />
          </div>

          <div className="auth-perks">
            <span><CheckCircle2 size={14} /> Secure update</span>
            <span><LockKeyhole size={14} /> Protected account access</span>
          </div>
        </section>

        <section className="auth-card">
          <div className="eyebrow">ACCOUNT RECOVERY</div>
          <h1>Choose a new password</h1>
          <p className="muted">Use at least eight characters with a letter and number, then enter it twice.</p>

          <Toast message={error} />
          {message && (
            <div className="recovery-success" role="status">
              <CheckCircle2 size={18} />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={submit}>
            <label>
              New password
              <input
                required
                minLength="8"
                maxLength="128"
                pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,128}"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="8+ characters with a letter and number"
              />
            </label>
            <label>
              Confirm password
              <input
                required
                minLength="8"
                maxLength="128"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Enter your new password again"
              />
            </label>
            <button className="button full" disabled={busy}>
              {busy ? <span className="spinner light" /> : 'Update password'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
