import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { AdminDashboard, QueueManagement, ServiceManagement } from './pages/Admin';
import { CounterManagement, StaffManagement } from './pages/AdminExtras';
import Auth from './pages/Auth';
import { Dashboard, Services } from './pages/Customer';
import ForgotPassword from './pages/ForgotPassword';
import History from './pages/History';
import Landing from './pages/Landing';
import LiveQueue from './pages/LiveQueue';
import Mfa from './pages/Mfa';
import NotificationsPage from './pages/NotificationsPage';
import Profile from './pages/Profile';
import ResetPassword from './pages/ResetPassword';
import SecurityLog from './pages/SecurityLog';
import './styles.css';
import './security-ui.css';
import './readability.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AuthProvider>
  );
}
