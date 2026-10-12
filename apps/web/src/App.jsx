import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { sessionLoaded } from './store.js';
import { request } from './services/api.js';
import LoginPage from './components/auth/LoginPage.jsx';
import ProtectedRoute from './components/routes/ProtectedRoute.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';

export default function App() {
  const { status } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    let active = true;
    request('/api/v1/auth/me')
      .then(({ user }) => { if (active) dispatch(sessionLoaded(user)); })
      .catch(() => { if (active) dispatch(sessionLoaded(null)); });
    return () => { active = false; };
  }, [dispatch]);

  if (status === 'loading') return <div className="app-loading"><span className="loading-mark">W</span><span>Preparing your workspace…</span></div>;
  return <Routes>
    <Route path="/login" element={status === 'authenticated' ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
    <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
    <Route path="/dashboard/team" element={<ProtectedRoute adminOnly><DashboardLayout section="team" /></ProtectedRoute>} />
    <Route path="/dashboard/profile" element={<ProtectedRoute><DashboardLayout section="profile" /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to={status === 'authenticated' ? '/dashboard' : '/login'} replace />} />
  </Routes>;
}
