import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import { Alert, Spinner } from '../components/ui';
import { homeFor } from '../lib/roles';

export default function Auth({ register = false }) {
  const { login, register: signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const data = register ? await signup(form.name, form.email, form.password) : await login(form.email, form.password);
      if (register && !data.session) {
        navigate('/login', { state: { message: 'Account created. Check your email to confirm it, then sign in.' } });
      } else {
        navigate(homeFor(data.profile?.role), { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={register ? 'Create your account' : 'Welcome back'}
      description={register ? 'Join queues remotely and get notified when it’s your turn.' : 'Sign in to your ONEQUEUE account to continue.'}
    >
      {!register && location.state?.message && <Alert type="success" message={location.state.message} />}
      <Alert message={error} />
      <form className="form-grid" onSubmit={submit}>
        {register && (
          <label className="field">Full name
            <input required minLength="2" maxLength="80" autoComplete="name" value={form.name} onChange={update('name')} placeholder="Juan Dela Cruz" />
          </label>
        )}
        <label className="field">Email address
          <input required type="email" autoComplete="email" value={form.email} onChange={update('email')} placeholder="you@example.com" />
        </label>
        <label className="field">Password
          <div style={{ position: 'relative' }}>
            <input required minLength="6" type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} value={form.password} onChange={update('password')} placeholder={register ? 'At least 6 characters' : 'Enter your password'} style={{ paddingRight: 42 }} />
            <button type="button" className="icon-btn" style={{ position: 'absolute', right: 2, top: 1 }} aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>
        {!register && <div className="auth-row"><Link className="link" to="/forgot-password">Forgot password?</Link></div>}
        <button className="btn btn-lg btn-block" disabled={busy}>{busy ? <Spinner light /> : register ? 'Create account' : 'Sign in'}</button>
      </form>
      <p className="auth-switch">
        {register ? 'Already have an account?' : 'New to ONEQUEUE?'}{' '}
        <Link className="link" to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link>
      </p>
    </AuthShell>
  );
}
