import { useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = false,
  requirePassword = false,
  busy = false,
  onCancel,
  onConfirm,
}) {
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!open) setPassword('');
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && open && !busy) onCancel();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="confirm-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel();
    }}>
      <form
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(password);
        }}
      >
        <button type="button" className="confirm-close" aria-label="Close confirmation" onClick={onCancel} disabled={busy}>
          <X size={18} />
        </button>
        <span className={danger ? 'confirm-icon danger' : 'confirm-icon'}>
          {danger ? <AlertTriangle size={23} /> : <ShieldCheck size={23} />}
        </span>
        <h2 id="confirm-title">{title}</h2>
        <p>{description}</p>
        {requirePassword && (
          <label>
            Your current password
            <input
              required
              autoFocus
              type="password"
              minLength="1"
              maxLength="128"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Confirm your identity"
            />
          </label>
        )}
        <div className="confirm-actions">
          <button type="button" className="button secondary" onClick={onCancel} disabled={busy}>Go back</button>
          <button className={danger ? 'button confirm-danger' : 'button'} disabled={busy || (requirePassword && !password)}>
            {busy ? <span className="spinner light" /> : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
