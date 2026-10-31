import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Toast from '../components/Toast';
import LoadingButton from '../components/LoadingButton';
import BrandMark from '../components/BrandMark';
import '../auth.css';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const acceptSession = (session) => {
      if (!mounted || !session) return false;
      setRecoveryReady(true);
      setCheckingLink(false);
      setError('');
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') acceptSession(session);
    });

    async function resolveRecoverySession() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const hash = new URLSearchParams(url.hash.slice(1));
        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');

        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          if (acceptSession(data.session)) return;
        } else if (accessToken && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          if (acceptSession(data.session)) return;
        } else {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          if (acceptSession(data.session)) return;
        }

        if (mounted) {
          setError('This password-reset link is invalid or expired. Request a new link and try again.');
          setCheckingLink(false);
        }
      } catch {
        if (mounted) {
          setError('We could not verify this password-reset link. Request a new link and try again.');
          setCheckingLink(false);
        }
      }
    }

    resolveRecoverySession();
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
      await supabase.auth.signOut({ scope: 'local' });
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
        <BrandMark />
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

          {checkingLink && (
            <div className="recovery-success" role="status">
              <span className="spinner" />
              <span>Verifying your secure recovery link…</span>
            </div>
          )}

          {recoveryReady && <form onSubmit={submit}>
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
                placeholder="8+ characters with letters and numbers"
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
                placeholder="Re-enter your new password"
              />
            </label>
            <LoadingButton className="button full" loading={busy} loadingLabel="Updating password…">
              Update password
            </LoadingButton>
          </form>}

          {!checkingLink && !recoveryReady && (
            <p className="auth-switch"><Link to="/forgot-password">Request a new reset link</Link></p>
          )}
        </section>
      </main>
    </div>
  );
}
