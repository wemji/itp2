import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, BellRing, Building2, Check, Clock3, MonitorSmartphone, Radio, Search, ShieldCheck, Ticket, Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { homeFor } from '../lib/roles';

const STEPS = [
  [Search, 'Choose a service', 'Browse Registrar and Finance services with live wait estimates.'],
  [Ticket, 'Get your number', 'Receive a digital queue number instantly — no paper slips.'],
  [MonitorSmartphone, 'Track from anywhere', 'Watch your position update in real time on any device.'],
  [BellRing, 'Arrive on time', 'Get notified when you’re next, then head to the counter.'],
];

const ROLES = [
  [Ticket, 'customer', 'Customers', ['Join queues remotely', 'Live position & wait time', 'Visit history and alerts']],
  [Building2, 'registrar', 'Registrar desk', ['Call, serve and complete', 'Department-only queues', 'Counter availability']],
  [Wallet, 'finance', 'Finance desk', ['Dedicated finance queue', 'Recall and skip no-shows', 'Daily desk overview']],
  [ShieldCheck, 'admin', 'Administrators', ['Manage staff and services', 'Reports with CSV export', 'Full activity audit log']],
];

export default function Landing() {
  const { profile } = useAuth();
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link to="/" className="brand"><span className="brand-mark">O</span>ONEQUEUE</Link>
          <div className="landing-nav-links">
            {profile ? (
              <Link to={homeFor(profile.role)} className="btn">Open dashboard <ArrowRight size={16} /></Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost">Sign in</Link>
                <Link to="/register" className="btn">Get started <ArrowRight size={16} /></Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="landing-section hero-grid">
          <div className="hero-copy">
            <span className="hero-pill"><Radio size={14} /> Digital queue management</span>
            <h1>Skip the line.<br /><em>Keep your place.</em></h1>
            <p>Join Registrar and Finance queues from your phone, follow your place live, and arrive just as you’re called.</p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-lg">Join a queue <ArrowRight size={18} /></Link>
              <Link to="/login" className="btn btn-lg btn-secondary">I have an account</Link>
            </div>
            <div className="hero-proof">
              <div><strong>Real-time</strong><span>position updates</span></div>
              <div><strong>2 desks</strong><span>Registrar &amp; Finance</span></div>
              <div><strong>0 paper</strong><span>tickets to lose</span></div>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="ticket">
              <div className="ticket-label"><Radio size={13} /> Your queue · Registrar’s Office</div>
              <div className="ticket-number">R-057</div>
              <div className="ticket-service">Transcript request</div>
              <div className="ticket-stats">
                <div><span>Now serving</span><strong className="mono">R-052</strong></div>
                <div><span>Ahead of you</span><strong>4</strong></div>
                <div><span>Est. wait</span><strong>12 min</strong></div>
              </div>
              <div className="progress"><span style={{ width: '72%' }} /></div>
            </div>
            <div className="card hero-board">
              <div className="hero-board-row"><span className="muted"><Clock3 size={14} style={{ verticalAlign: '-2px' }} /> Finance · Payments</span><span className="badge badge-open">~8 min</span></div>
              <div className="hero-board-row"><span className="muted"><Clock3 size={14} style={{ verticalAlign: '-2px' }} /> Registrar · Enrollment</span><span className="badge badge-waiting">~15 min</span></div>
            </div>
          </div>
        </div>
      </header>

      <section className="features">
        <div className="landing-section">
          <div className="section-title">
            <div className="eyebrow" style={{ justifyContent: 'center' }}>How it works</div>
            <h2>Four steps from line to counter</h2>
            <p>No more standing around. ONEQUEUE keeps you informed from the moment you join.</p>
          </div>
          <div className="grid grid-4">
            {STEPS.map(([Icon, title, text], i) => (
              <div className="card feature" key={title}>
                <span className="num">0{i + 1}</span>
                <div className="tile"><Icon size={19} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="roles-band">
        <div className="landing-section">
          <div className="section-title">
            <div className="eyebrow" style={{ justifyContent: 'center' }}>Built for every role</div>
            <h2>A dedicated workspace for each team</h2>
            <p>Every desk sees exactly what it needs — and nothing it shouldn’t.</p>
          </div>
          <div className="grid grid-4">
            {ROLES.map(([Icon, key, title, points]) => (
              <div className="card role-card" key={key} data-role={key}>
                <div className="tile" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon size={19} /></div>
                <h3>{title}</h3>
                <ul>{points.map((p) => <li key={p}><Check size={14} />{p}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="landing-section">
          <BarChart3 size={28} color="var(--brand)" />
          <h2>Ready to stop waiting in line?</h2>
          <p>Create a free account and join your first queue in under a minute.</p>
          <Link to="/register" className="btn btn-lg">Create your account <ArrowRight size={18} /></Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-section"><span>© {new Date().getFullYear()} ONEQUEUE</span><span>Digital queue management for Registrar &amp; Finance services</span></div>
      </footer>
    </div>
  );
}
