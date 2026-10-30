import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  Check,
  Clock3,
  Hash,
  MapPin,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
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

          <div className="landing-preview-wrap" aria-label="Example live queue status">
            <div className="landing-preview">
              <div className="landing-preview-bar">
                <div className="window-dots"><i /><i /><i /></div>
                <span>Live queue</span>
                <span className="preview-secure"><ShieldCheck size={14} /> Secure</span>
              </div>

              <div className="landing-preview-content">
                <div className="preview-heading">
                  <div>
                    <span className="preview-label">YOUR QUEUE NUMBER</span>
                    <strong>A-057</strong>
                  </div>
                  <span className="preview-status"><i /> Waiting</span>
                </div>

                <div className="preview-office">
                  <span className="preview-office-icon"><MapPin size={18} /></span>
                  <span><strong>Registrar&apos;s Office</strong><small>Main Building · Ground Floor</small></span>
                </div>

                <div className="preview-progress-copy">
                  <span>Queue progress</span>
                  <strong>72%</strong>
                </div>
                <div className="preview-progress"><span /></div>

                <div className="preview-metrics">
                  <div><span>Now serving</span><strong>A-042</strong></div>
                  <div><span>People ahead</span><strong>15</strong></div>
                  <div><span>Est. wait</span><strong>~30 min</strong></div>
                </div>
              </div>
            </div>

            <div className="preview-notification">
              <span><BellRing size={18} /></span>
              <div><strong>We&apos;ll keep you posted</strong><small>Your queue is moving normally.</small></div>
              <i />
            </div>
            <div className="preview-time-card">
              <Clock3 size={18} />
              <div><strong>30 min</strong><small>to your turn</small></div>
            </div>
          </div>

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
        <Link to="/" className="brand"><span className="brand-mark">O</span><span>ONEQUEUE</span></Link>
        <p>Smarter queues. Better days.</p>
        <span>© {new Date().getFullYear()} ONEQUEUE</span>
      </footer>
    </div>
  );
}
