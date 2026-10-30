import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { KeyRound, ShieldCheck, Smartphone } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import '../auth.css';

function getQrCodeSource(qrCode) {
  if (typeof qrCode !== 'string') return '';
  const value = qrCode.trim();
  if (/^data:image\/svg\+xml(?:;[^,]*)?,/i.test(value)) return value;
  if (value.startsWith('<svg')) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`;
  }
  return '';
}

export default function Mfa() {
  const { profile, refreshMfa } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/auth/mfa/status')
      .then((data) => {
        setStatus(data);
        if (data.currentLevel === 'aal2') navigate('/admin', { replace: true });
      })
      .catch((loadError) => setError(loadError.message));
  }, [navigate]);

  if (!['admin', 'staff'].includes(profile?.role)) return <Navigate to="/dashboard" replace />;

  const verifiedFactor = status?.factors?.find((factor) => factor.status === 'verified');
  const factorId = enrollment?.factorId || verifiedFactor?.id;
  const qrCodeSource = getQrCodeSource(enrollment?.qrCode);

  async function enroll() {
    setBusy(true);
    setError('');
    try {
      setEnrollment(await api('/auth/mfa/enroll', { method: 'POST' }));
    } catch (enrollError) {
      setError(enrollError.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ factorId, code }),
      });
      await refreshMfa();
      navigate('/admin', { replace: true });
    } catch (verifyError) {
      setError(verifyError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page auth-neu recovery-page">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />
      <div className="brand auth-brand"><span className="brand-mark">O</span><span>ONEQUEUE</span></div>
      <main className="auth-shell">
        <section className="auth-welcome">
          <div className="auth-badge"><span /> Privileged account protection</div>
          <h2>One more check.<br /><em>Keep operations secure.</em></h2>
          <p>Staff and administrator accounts use an authenticator code before operational access is granted.</p>
          <div className="recovery-preview" aria-hidden="true">
            <div className="recovery-icon"><ShieldCheck size={25} /></div>
            <div><span>Multi-factor security</span><strong>Protected staff access</strong><p>Your password and a rotating code are both required.</p></div>
            <Smartphone className="recovery-shield" size={20} />
          </div>
        </section>
        <section className="auth-card mfa-card">
          <div className="eyebrow">SECURITY VERIFICATION</div>
          <h1>{verifiedFactor ? 'Enter your security code' : 'Set up an authenticator'}</h1>
          <p className="muted">{verifiedFactor ? 'Open your authenticator app and enter the current 6-digit code.' : 'Use Google Authenticator, Microsoft Authenticator, or another TOTP app.'}</p>
          <Toast message={error} />

          {!verifiedFactor && !enrollment && (
            <button className="button full mfa-start" onClick={enroll} disabled={busy || !status}>
              {busy ? <span className="spinner light" /> : <><KeyRound size={17} /> Set up authenticator</>}
            </button>
          )}

          {enrollment && (
            <div className="mfa-enrollment">
              {qrCodeSource && <img src={qrCodeSource} alt="Authenticator setup QR code" />}
              <div><span>Can&apos;t scan?</span><code>{enrollment.secret}</code></div>
            </div>
          )}

          {factorId && (
            <form onSubmit={verify}>
              <label>
                6-digit authenticator code
                <input
                  required
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  minLength="6"
                  maxLength="6"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                />
              </label>
              <button className="button full" disabled={busy || code.length !== 6}>{busy ? <span className="spinner light" /> : 'Verify and continue'}</button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
