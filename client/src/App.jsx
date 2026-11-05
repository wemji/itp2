import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { Dashboard, Services } from './pages/Customer';
import NotificationsPage from './pages/NotificationsPage';
import History from './pages/History';
import LiveQueue from './pages/LiveQueue';
import Profile from './pages/Profile';
import { AdminDashboard, QueueManagement, ServiceManagement } from './pages/Admin';
import { CounterManagement, StaffManagement, CustomerManagement } from './pages/AdminExtras';
import { AdminReports, AdminActivity } from './pages/AdminReports';
import './styles.css';

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

          <Route element={<ProtectedRoute customerOnly />}>
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
              <Route path="/admin/history" element={<History />} />
              <Route path="/admin/services" element={<ServiceManagement />} />
              <Route path="/admin/counters" element={<CounterManagement />} />
              <Route path="/admin/notifications" element={<NotificationsPage />} />
              <Route path="/admin/profile" element={<Profile />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute adminOnly />}>
            <Route element={<Layout />}>
              <Route path="/admin/staff" element={<StaffManagement />} />
              <Route path="/admin/users" element={<CustomerManagement />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/activity" element={<AdminActivity />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
