import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import './styles.css';
import './security-ui.css';
import './readability.css';
import './glass-theme.css';

const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/Auth'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Mfa = lazy(() => import('./pages/Mfa'));
const LiveQueue = lazy(() => import('./pages/LiveQueue'));
const History = lazy(() => import('./pages/History'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const Profile = lazy(() => import('./pages/Profile'));
const SecurityLog = lazy(() => import('./pages/SecurityLog'));
const Dashboard = lazy(() => import('./pages/Customer').then((module) => ({ default: module.Dashboard })));
const Services = lazy(() => import('./pages/Customer').then((module) => ({ default: module.Services })));
const AdminDashboard = lazy(() => import('./pages/Admin').then((module) => ({ default: module.AdminDashboard })));
const QueueManagement = lazy(() => import('./pages/Admin').then((module) => ({ default: module.QueueManagement })));
const ServiceManagement = lazy(() => import('./pages/Admin').then((module) => ({ default: module.ServiceManagement })));
const CounterManagement = lazy(() => import('./pages/AdminExtras').then((module) => ({ default: module.CounterManagement })));
const StaffManagement = lazy(() => import('./pages/AdminExtras').then((module) => ({ default: module.StaffManagement })));

function RouteFallback() {
  return <div className="center-screen"><span className="spinner" /></div>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/mfa" element={<Mfa />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/services" element={<Services />} />
              <Route path="/queue/:id" element={<LiveQueue />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/history" element={<History />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute staffOnly />}>
            <Route element={<Layout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/queues" element={<QueueManagement />} />
              <Route path="/admin/services" element={<ServiceManagement />} />
              <Route path="/admin/counters" element={<CounterManagement />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute adminOnly />}>
            <Route element={<Layout />}>
              <Route path="/admin/staff" element={<StaffManagement />} />
              <Route path="/admin/security" element={<SecurityLog />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
