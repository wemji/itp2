import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import AuthShell from '../components/AuthShell';
import { Alert, Spinner } from '../components/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      setMessage(result.message || 'If an account exists for that email, a reset link is on its way.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Reset your password" description="Enter the email you signed up with and we’ll send you a secure reset link.">
      <Alert message={error} />
      <Alert type="success" message={message} />
      <form className="form-grid" onSubmit={submit}>
        <label className="field">Email address
          <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <button className="btn btn-lg btn-block" disabled={busy}>{busy ? <Spinner light /> : 'Send reset link'}</button>
      </form>
      <p className="auth-switch"><Link className="link" to="/login"><ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> Back to sign in</Link></p>
    </AuthShell>
  );
}
