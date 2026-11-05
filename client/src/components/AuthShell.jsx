import { Link } from 'react-router-dom';
import { BellRing, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';

export default function AuthShell({ title, description, children }) {
  return (
    <div className="auth">
      <aside className="auth-aside">
        <Link to="/" className="brand"><span className="brand-mark">O</span>ONEQUEUE</Link>
        <div className="auth-aside-copy">
          <h2>Queue smarter. Serve faster.</h2>
          <p>One place for customers to join and track their queue, and for Registrar, Finance and admin teams to keep every line moving.</p>
          <div className="auth-points">
            <div><Clock3 size={18} /><span>Live position and wait estimates that update as the line moves.</span></div>
            <div><BellRing size={18} /><span>Instant notifications when it's almost your turn.</span></div>
            <div><ShieldCheck size={18} /><span>Separate, secure desks for every department.</span></div>
          </div>
        </div>
        <footer><CheckCircle2 size={13} style={{ verticalAlign: '-2px' }} /> Secured with encrypted sign-in</footer>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <Link to="/" className="brand"><span className="brand-mark">O</span>ONEQUEUE</Link>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}
