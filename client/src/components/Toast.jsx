import { useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const toastConfig = {
  success: { Icon: CheckCircle2, label: 'Success', duration: 4000 },
  error: { Icon: AlertCircle, label: 'Error', duration: 0 },
  warning: { Icon: AlertTriangle, label: 'Warning', duration: 0 },
  info: { Icon: Info, label: 'Information', duration: 6000 },
};

export default function Toast({ message, type = 'error', onDismiss }) {
  const [visible, setVisible] = useState(Boolean(message));
  const [leaving, setLeaving] = useState(false);
  const dismissTimer = useRef(null);
  const removeTimer = useRef(null);
  const onDismissRef = useRef(onDismiss);
  const config = toastConfig[type] || toastConfig.error;
  onDismissRef.current = onDismiss;

  useEffect(() => {
    clearTimeout(dismissTimer.current);
    clearTimeout(removeTimer.current);
    setLeaving(false);
    setVisible(Boolean(message));

    if (message && config.duration) {
      dismissTimer.current = setTimeout(() => setLeaving(true), config.duration);
      removeTimer.current = setTimeout(() => {
        setVisible(false);
        onDismissRef.current?.();
      }, config.duration + 220);
    }

    return () => {
      clearTimeout(dismissTimer.current);
      clearTimeout(removeTimer.current);
    };
  }, [message, type, config.duration]);

  function dismiss() {
    clearTimeout(dismissTimer.current);
    setLeaving(true);
    removeTimer.current = setTimeout(() => {
      setVisible(false);
      onDismissRef.current?.();
    }, 220);
  }

  if (!message || !visible) return null;

  const { Icon } = config;
  const assertive = type === 'error' || type === 'warning';

  return (
    <div
      className={`toast toast-${type}${leaving ? ' toast-leaving' : ''}`}
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <span className="toast-icon" aria-hidden="true"><Icon size={19} /></span>
      <div className="toast-copy"><strong>{config.label}</strong><span>{message}</span></div>
      <button type="button" className="toast-close" onClick={dismiss} aria-label={`Dismiss ${config.label.toLowerCase()} message`}>
        <X size={17} />
      </button>
      {config.duration > 0 && <span className="toast-progress" style={{ '--toast-duration': `${config.duration}ms` }} aria-hidden="true" />}
    </div>
  );
}
