import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import Toast from '../components/Toast';
import LoadingButton from '../components/LoadingButton';
import BrandMark from '../components/BrandMark';
import '../auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const result = await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage(result.message);
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
        <BrandMark />
        <span>ONEQUEUE</span>
      </Link>

      <main className="auth-shell">
        <section className="auth-welcome" aria-label="Password recovery information">
          <div className="auth-badge"><span /> Secure account recovery</div>
          <h2>Get back in.<br /><em>Keep your place.</em></h2>
          <p>We will help you securely recover access to your queues and account updates.</p>

          <div className="recovery-preview" aria-hidden="true">
            <div className="recovery-icon"><LockKeyhole size={25} /></div>
            <div>
              <span>Simple recovery</span>
              <strong>Check your inbox</strong>
              <p>Use the secure link we send to choose a new password.</p>
            </div>
            <ShieldCheck className="recovery-shield" size={20} />
          </div>

          <div className="auth-perks">
            <span><CheckCircle2 size={14} /> Secure reset link</span>
            <span><Mail size={14} /> Sent to your account email</span>
          </div>
        </section>

        <section className="auth-card">
          <div className="eyebrow">ACCOUNT RECOVERY</div>
          <h1>Reset your password</h1>
          <p className="muted">Enter the email connected to your ONEQUEUE account.</p>

          <Toast message={error} />
          {message && (
            <div className="recovery-success" role="status">
              <CheckCircle2 size={18} />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={submit}>
            <label>
              Email
              <input
                required
                type="email"
                maxLength="200"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@school.edu"
              />
            </label>
            <LoadingButton className="button full" loading={busy} loadingLabel="Sending reset link…">
              Send reset link
            </LoadingButton>
          </form>

          <p className="auth-switch recovery-back">
            <Link to="/login"><ArrowLeft size={14} /> Back to login</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
