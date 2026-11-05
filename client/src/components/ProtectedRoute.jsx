import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homeFor, isStaff } from '../lib/roles';
import { Spinner } from './ui';

export default function ProtectedRoute({ staffOnly = false, adminOnly = false, customerOnly = false }) {
  const { profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="center-screen"><Spinner /></div>;
  if (!profile) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  const staff = isStaff(profile.role);
  if (adminOnly && profile.role !== 'admin') return <Navigate to={homeFor(profile.role)} replace />;
  if (staffOnly && !staff) return <Navigate to="/dashboard" replace />;
  if (customerOnly && staff) return <Navigate to="/admin" replace />;
  return <Outlet />;
}
