import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Clock3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import LoadingButton from '../components/LoadingButton';
import BrandMark from '../components/BrandMark';
import '../auth.css';

export default function Auth({ register = false }) {
  const { login, register: signup, authNotice } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (register && form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);

    try {
      const data = register
        ? await signup(form.name, form.email, form.password)
        : await login(form.email, form.password);

      if (register && !data.authenticated) {
        nav('/login', {
          state: { message: 'Account created. Check your email to confirm it, then log in.' },
        });
      } else if (data.requiresMfa) {
        nav('/mfa');
      } else {
        nav('/dashboard');
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`auth-page auth-neu${register ? ' auth-register-page' : ''}`}>
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <main className="auth-shell">
        <section className="auth-welcome" aria-label="ONEQUEUE benefits">
          <div className="auth-badge"><span /> Smart queue access</div>
          <h2>Skip the line.<br /><em>Keep your place.</em></h2>
          <p>Sign in once, join remotely, and know exactly when it is your turn.</p>

          <div className="auth-perks">
            <span><Check size={14} /> Real-time updates</span>
            <span><Clock3 size={14} /> Wait from anywhere</span>
          </div>
        </section>

        <section className="auth-card">
          <Link to="/" className="brand auth-brand" aria-label="Back to ONEQUEUE home">
            <BrandMark />
            <span>ONEQUEUE</span>
          </Link>
          <div className="eyebrow">{register ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}</div>
          <h1>{register ? 'Join ONEQUEUE' : 'Sign in to continue'}</h1>
          <p className="muted">
            {register
              ? 'Create an account and manage your queues from anywhere.'
              : 'Enter your details to access your queues and updates.'}
          </p>

          <Toast message={error} />
          {!error && authNotice && <div className="session-notice" role="status">{authNotice}</div>}

          <form onSubmit={submit}>
            {register && (
              <label>
                Full name
                <input
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="e.g. Maria Santos"
                />
              </label>
            )}

            <label>
              Email
              <input
                required
                type="email"
                maxLength="200"
                autoComplete="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="name@school.edu"
              />
            </label>

            <label>
              Password
              <input
                required
                minLength="8"
                maxLength="128"
                pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,128}"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="8+ characters with letters and numbers"
              />
            </label>

            {register && (
              <label>
                Confirm password
                <input
                  required
                  minLength="8"
                  maxLength="128"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={(event) => setForm({ ...form, confirm: event.target.value })}
                  placeholder="Re-enter your password"
                />
              </label>
            )}

            {!register && (
              <div className="forgot-row">
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
            )}

            <LoadingButton
              className="button full"
              loading={busy}
              loadingLabel={register ? 'Creating account…' : 'Signing in…'}
            >
              {register ? 'Create account' : 'Log in'}
            </LoadingButton>
          </form>

          <p className="auth-switch">
            {register ? 'Already have an account?' : 'New to ONEQUEUE?'}{' '}
            <Link to={register ? '/login' : '/register'}>
              {register ? 'Log in' : 'Create an account'}
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
