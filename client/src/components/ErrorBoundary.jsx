import { Component } from 'react';
import { AlertTriangle, LayoutDashboard, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, details) {
    console.error('ONEQUEUE interface error:', error, details);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="fatal-error" role="alert">
        <section className="fatal-error-card">
          <span className="fatal-error-icon" aria-hidden="true"><AlertTriangle /></span>
          <div className="eyebrow">PAGE RECOVERY</div>
          <h1>We couldn’t display this page.</h1>
          <p>Your data is safe. Try loading the page again, or return to your dashboard.</p>
          <div className="fatal-error-actions">
            <button type="button" className="button" onClick={() => window.location.reload()}><RotateCcw size={17} /> Try again</button>
            <button type="button" className="button secondary" onClick={() => window.location.assign('/dashboard')}><LayoutDashboard size={17} /> Return to dashboard</button>
          </div>
        </section>
      </main>
    );
  }
}
