import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Bell,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LoadingButton from './LoadingButton';
import '../customer.css';
import '../admin.css';

export default function Layout() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const staff = ['admin', 'staff'].includes(profile?.role);

  const links = staff
    ? [
        ['/admin', 'Overview', LayoutDashboard],
        ['/admin/queues', 'Live queues', Activity],
        ['/history', 'Queue history', History],
        ['/admin/services', 'Services', Settings],
        ['/admin/counters', 'Counters', ClipboardList],
        ...(profile?.role === 'admin' ? [['/admin/staff', 'Staff accounts', Users]] : []),
        ...(profile?.role === 'admin' ? [['/admin/security', 'Security log', ShieldCheck]] : []),
      ]
    : [
        ['/dashboard', 'My dashboard', LayoutDashboard],
        ['/services', 'Find a service', ClipboardList],
        ['/history', 'Queue history', History],
        ['/notifications', 'Notifications', Bell],
        ['/profile', 'Profile', Users],
      ];

  const pageName = links.find(([to]) => location.pathname === to)?.[1] || 'Queue details';

  return (
    <div className={`app-shell ${staff ? 'staff-shell' : 'customer-shell'}`}>
      <aside className={open ? 'sidebar open' : 'sidebar'}>
        <div className="sidebar-top">
          <Link to={staff ? '/admin' : '/dashboard'} className="brand">
            <span className="brand-mark">O</span>
            <span>ONEQUEUE</span>
          </Link>
          <span className="workspace-label">{staff ? 'SERVICE DESK' : 'CUSTOMER PORTAL'}</span>
        </div>

        <button className="close-mobile" aria-label="Close menu" onClick={() => setOpen(false)}>
          <X />
        </button>

        <nav aria-label="Main navigation">
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              end={to === '/admin' || to === '/dashboard'}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-mini">
            <div className="avatar">{profile?.name?.[0]?.toUpperCase() || 'U'}</div>
            <div className="user-meta">
              <strong>{profile?.name || 'User'}</strong>
              <small>{profile?.role || 'customer'}</small>
            </div>
          </div>
          <LoadingButton
            className="logout"
            loading={loggingOut}
            loadingLabel="Logging out…"
            onClick={async () => {
              setLoggingOut(true);
              try {
                await logout();
              } finally {
                setLoggingOut(false);
                navigate('/');
              }
            }}
          >
            <LogOut size={17} />
            <span>Log out</span>
          </LoadingButton>
        </div>
      </aside>

      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}

      <main className="main">
        <header className="topbar">
          <button className="menu" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu />
          </button>
          <div className="breadcrumb">
            <span>{staff ? 'Operations' : 'Your account'}</span>
            <span className="breadcrumb-dot">/</span>
            <strong>{pageName}</strong>
          </div>
          <div className="topbar-user"><span className="online-dot" />{profile?.name}</div>
        </header>
        <div className="content"><Outlet /></div>
      </main>
    </div>
  );
}
