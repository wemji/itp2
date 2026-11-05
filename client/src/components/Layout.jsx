import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, BarChart3, Bell, Building2, ClipboardList, History, LayoutDashboard, LogOut, Menu,
  MonitorPlay, ScrollText, Search, Settings2, ShieldCheck, Ticket, User, UserCog, Users, Wallet, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { isStaff, roleInfo } from '../lib/roles';
import { useApi, Avatar } from './ui';

const WORKSPACE_ICONS = { admin: ShieldCheck, registrar: Building2, finance: Wallet, staff: MonitorPlay, customer: Ticket };

function navFor(role) {
  if (role === 'admin') return [
    ['Operations', [['/admin', 'Overview', LayoutDashboard], ['/admin/queues', 'Queue console', Activity], ['/admin/history', 'Queue history', History]]],
    ['Management', [['/admin/services', 'Services', Settings2], ['/admin/counters', 'Counters', ClipboardList], ['/admin/staff', 'Staff accounts', UserCog], ['/admin/users', 'User accounts', Users]]],
    ['Insights', [['/admin/reports', 'Reports', BarChart3], ['/admin/activity', 'Activity log', ScrollText]]],
    ['Account', [['/admin/notifications', 'Notifications', Bell], ['/admin/profile', 'Profile', User]]],
  ];
  if (isStaff(role)) return [
    ['Service desk', [['/admin', 'Overview', LayoutDashboard], ['/admin/queues', 'Queue console', Activity], ['/admin/history', 'Queue history', History]]],
    ['Setup', [['/admin/services', 'Service availability', Settings2], ['/admin/counters', 'Counters', ClipboardList]]],
    ['Account', [['/admin/notifications', 'Notifications', Bell], ['/admin/profile', 'Profile', User]]],
  ];
  return [
    ['Queue', [['/dashboard', 'Dashboard', LayoutDashboard], ['/services', 'Find a service', Search], ['/history', 'Visit history', History]]],
    ['Account', [['/notifications', 'Notifications', Bell], ['/profile', 'Profile', User]]],
  ];
}

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  return <span className="clock">{now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>;
}

export default function Layout() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const role = profile?.role || 'customer';
  const staff = isStaff(role);
  const info = roleInfo(role);
  const sections = navFor(role);
  const links = sections.flatMap(([, items]) => items);
  const notificationsPath = staff ? '/admin/notifications' : '/notifications';
  const home = staff ? '/admin' : '/dashboard';
  const WorkspaceIcon = WORKSPACE_ICONS[role] || Ticket;

  const { data: notifications, reload } = useApi('/notifications', { interval: 30000, initial: [] });
  const unread = (notifications || []).filter((n) => !n.is_read).length;
  useEffect(() => {
    if (!profile?.id) return undefined;
    const channel = supabase.channel(`nav-notifications-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, reload)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, reload]);
  useEffect(() => { setOpen(false); }, [pathname]);

  const current = links.find(([to]) => pathname === to)?.[1] || (pathname.startsWith('/queue/') ? 'Live queue' : info.desk);

  async function signOut() { await logout(); navigate('/'); }

  return (
    <div className="app-shell" data-role={role}>
      <aside className={open ? 'sidebar open' : 'sidebar'} aria-label="Sidebar">
        <Link to={home} className="brand"><span className="brand-mark">O</span>ONEQUEUE</Link>
        <div className="workspace">
          <span className="workspace-icon"><WorkspaceIcon size={16} /></span>
          <div><strong>{info.workspace}</strong><small>{info.label}</small></div>
        </div>
        <nav aria-label="Main navigation">
          {sections.map(([title, items]) => (
            <div key={title}>
              <div className="nav-section">{title}</div>
              {items.map(([to, label, Icon]) => (
                <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                  <Icon size={17} /><span>{label}</span>
                  {to === notificationsPath && unread > 0 && <span className="nav-count">{unread > 99 ? '99+' : unread}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Link to={staff ? '/admin/profile' : '/profile'} className="user-chip">
            <Avatar name={profile?.name} />
            <div><strong>{profile?.name || 'User'}</strong><small>{profile?.email}</small></div>
          </Link>
          <button className="signout" onClick={signOut}><LogOut size={16} />Sign out</button>
        </div>
      </aside>
      {open && <button className="backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
          <div className="crumbs"><span>{info.desk}</span><span>/</span><strong>{current}</strong></div>
          <div className="topbar-right">
            {staff && <Clock />}
            <Link to={notificationsPath} className="icon-btn" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
              <Bell size={18} />{unread > 0 && <span className="dot-indicator" />}
            </Link>
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
