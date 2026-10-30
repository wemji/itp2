import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  Check,
  CircleCheckBig,
  Clock3,
  Hash,
  MonitorSmartphone,
  Radio,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { api } from '../lib/api';
import { PUBLIC_STATS_POLL_INTERVAL_MS } from '../lib/polling';
import '../landing.css';

const steps = [
  [Hash, '01', 'Choose a service', 'Find the office or service you need in seconds.'],
  [UsersRound, '02', 'Join the queue', 'Get a digital queue number without standing in line.'],
  [MonitorSmartphone, '03', 'Track it live', 'Follow your position and estimated wait from anywhere.'],
  [BellRing, '04', 'Arrive on time', 'Get updates so you can return when your turn is close.'],
];

const benefits = [
  [Clock3, 'Less time waiting', 'Use your time elsewhere while ONEQUEUE keeps your place.'],
  [BellRing, 'Live notifications', 'Stay informed as your queue moves and your turn approaches.'],
  [ShieldCheck, 'Simple and reliable', 'A clear, secure experience designed for every device.'],
];

function LiveQueueActivity() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    const loadStats = async () => {
      try {
        const nextStats = await api('/public/stats');
        if (!active) return;
        setStats(nextStats);
        setError(false);
      } catch {
        if (active) setError(true);
      }
    };

    loadStats();
    const poller = window.setInterval(loadStats, PUBLIC_STATS_POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(poller);
    };
  }, []);

  const values = {
    openServices: stats?.openServices ?? '—',
    peopleWaiting: stats?.peopleWaiting ?? '—',
    typicalWait: stats
      ? (stats.typicalWaitMinutes > 0 ? `~${stats.typicalWaitMinutes} min` : 'No wait')
      : '—',
    completedToday: stats?.completedToday ?? '—',
  };

  return (
    <div className="landing-live-wrap">
      <article className="landing-live-card" aria-busy={!stats && !error}>
        <header className="landing-live-header">
          <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
          <strong><Radio size={15} /> Live queue activity</strong>
          <span><ShieldCheck size={14} /> Aggregate only</span>
        </header>

        <div className="landing-live-content">
          <div className="landing-live-heading">
            <div>
              <span>Public system status</span>
              <h2>Queue activity<br />at a glance.</h2>
            </div>
            <span className="landing-live-status"><i /> Live</span>
          </div>
          <p>Anonymous totals across all services. No customer details are shown.</p>

          <div className="landing-live-metrics">
            <div>
              <span className="landing-live-icon"><MonitorSmartphone size={18} /></span>
              <span>Open services</span>
              <strong>{values.openServices}</strong>
            </div>
            <div>
              <span className="landing-live-icon"><UsersRound size={18} /></span>
              <span>People waiting</span>
              <strong>{values.peopleWaiting}</strong>
            </div>
            <div>
              <span className="landing-live-icon"><Clock3 size={18} /></span>
              <span>Typical wait</span>
              <strong>{values.typicalWait}</strong>
            </div>
            <div>
              <span className="landing-live-icon"><CircleCheckBig size={18} /></span>
              <span>Completed today</span>
              <strong>{values.completedToday}</strong>
            </div>
          </div>

          <footer className="landing-live-footer" aria-live="polite">
            <span className={error ? 'is-reconnecting' : ''}><i /> {error ? 'Reconnecting to live activity' : stats ? 'Updated just now' : 'Loading live activity'}</span>
            <span>Refreshes every 10 sec</span>
          </footer>
        </div>
      </article>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="landing landing-refresh">
      <nav className="landing-nav">
        <Link to="/" className="brand" aria-label="ONEQUEUE home">
          <span className="brand-mark">O</span>
          <span>ONEQUEUE</span>
        </Link>

        <div className="landing-nav-links">
          <a href="#how-it-works" className="landing-nav-link">How it works</a>
          <Link to="/login" className="text-link">Log in</Link>
          <Link to="/register" className="button small">
            Create account <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      <main>
        <section className="landing-hero">
          <div className="landing-glow landing-glow-one" />
          <div className="landing-glow landing-glow-two" />

          <div className="landing-hero-copy">
            <div className="landing-badge">
              <span className="landing-live-dot" />
              Smart queue access
            </div>
            <h1>
              Skip the line.<br />
              <em>Keep your place.</em>
            </h1>
            <p>
              Sign in once, join remotely, and know exactly when it is your turn.
            </p>

            <div className="landing-actions">
              <Link to="/login" className="button landing-primary-action">
                Sign in to join <ArrowRight size={18} />
              </Link>
              <a href="#how-it-works" className="landing-secondary-action">
                See how it works
              </a>
            </div>

            <div className="landing-trust-row">
              <span><Check size={15} /> Real-time updates</span>
              <span><Clock3 size={15} /> Wait from anywhere</span>
            </div>
          </div>

          <LiveQueueActivity />

          <div className="landing-mobile-trust" aria-label="Queue benefits">
            <span><Check size={15} /> Real-time updates</span>
            <span><Clock3 size={15} /> Wait from anywhere</span>
          </div>
        </section>

        <section className="landing-benefits" aria-label="ONEQUEUE benefits">
          {benefits.map(([Icon, title, text]) => (
            <article key={title}>
              <span className="benefit-icon"><Icon size={21} /></span>
              <div><h2>{title}</h2><p>{text}</p></div>
            </article>
          ))}
        </section>

        <section className="landing-how" id="how-it-works">
          <div className="landing-section-heading">
            <div className="landing-badge landing-badge-light"><Sparkles size={14} /> Simple by design</div>
            <h2>From the line to your phone<br />in four easy steps.</h2>
            <p>No complicated setup. Create an account and manage your wait from anywhere.</p>
          </div>

          <div className="landing-steps">
            {steps.map(([Icon, number, title, text]) => (
              <article className="landing-step" key={number}>
                <div className="landing-step-top">
                  <span className="landing-step-icon"><Icon size={22} /></span>
                  <span className="landing-step-number">{number}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-cta">
          <div>
            <span className="landing-cta-kicker">READY WHEN YOU ARE</span>
            <h2>Stop waiting in line.<br />Start waiting on your terms.</h2>
          </div>
          <div className="landing-cta-actions">
            <Link to="/register" className="button landing-cta-button">
              Create your account <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="landing-cta-login">I already have an account</Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-main">
          <div className="landing-footer-brand">
            <Link to="/" className="brand">
              <span className="brand-mark">O</span>
              <span>ONEQUEUE</span>
            </Link>
            <p>Join remotely, follow your place, and arrive when your turn is near.</p>
          </div>

          <nav className="landing-footer-nav" aria-label="Footer navigation">
            <span>Explore</span>
            <a href="#how-it-works">How it works</a>
            <Link to="/login">Log in</Link>
            <Link to="/register">Create account</Link>
          </nav>

          <div className="landing-footer-promise">
            <span className="landing-footer-promise-icon"><BellRing size={18} /></span>
            <div>
              <span>Stay in control</span>
              <strong>Your place, wherever you wait.</strong>
            </div>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <span>&copy; {new Date().getFullYear()} ONEQUEUE. All rights reserved.</span>
          <div className="landing-footer-signals">
            <span><i /> Real-time queue updates</span>
            <span>Designed for every device</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
