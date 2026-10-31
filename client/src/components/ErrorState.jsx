import { AlertCircle, RefreshCw } from 'lucide-react';
import LoadingButton from './LoadingButton';

export default function ErrorState({
  title = 'We couldn’t load this information.',
  message = 'Check your connection and try again.',
  onRetry,
  retrying = false,
  compact = false,
}) {
  return (
    <section className={`error-state${compact ? ' error-state-compact' : ''}`} role="alert">
      <span className="error-state-icon" aria-hidden="true"><AlertCircle /></span>
      <div className="error-state-copy"><h2>{title}</h2><p>{message}</p></div>
      {onRetry && (
        <LoadingButton type="button" className="button secondary" onClick={onRetry} loading={retrying} loadingLabel="Trying again…">
          <RefreshCw size={16} /> Try again
        </LoadingButton>
      )}
    </section>
  );
}
