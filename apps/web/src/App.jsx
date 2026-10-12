import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { sessionLoaded } from './store.js';
import { request } from './services/api.js';
import LoginPage from './components/auth/LoginPage.jsx';
import ProtectedRoute from './components/routes/ProtectedRoute.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';

const ForgotPasswordPage = lazy(() => import('./components/auth/ForgotPasswordPage.jsx'));

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
    <Route path="/forgot-password" element={status === 'authenticated' ? <Navigate to="/dashboard/profile" replace /> : <Suspense fallback={<div className="app-loading"><span className="loading-mark">W</span><span>Opening password help…</span></div>}><ForgotPasswordPage /></Suspense>} />
    <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
    <Route path="/dashboard/tasks" element={<ProtectedRoute adminOnly><DashboardLayout section="tasks" taskView="overview" /></ProtectedRoute>} />
    <Route path="/dashboard/tasks/review" element={<ProtectedRoute adminOnly><DashboardLayout section="tasks" taskView="review" /></ProtectedRoute>} />
    <Route path="/dashboard/tasks/new" element={<ProtectedRoute adminOnly><DashboardLayout section="tasks" taskView="new" /></ProtectedRoute>} />
    <Route path="/dashboard/calendar" element={<ProtectedRoute adminOnly><DashboardLayout section="calendar" /></ProtectedRoute>} />
    <Route path="/dashboard/status/in-progress" element={<ProtectedRoute employeeOnly><DashboardLayout section="status" statusView="in_progress" /></ProtectedRoute>} />
    <Route path="/dashboard/status/review" element={<ProtectedRoute employeeOnly><DashboardLayout section="status" statusView="submitted_for_review" /></ProtectedRoute>} />
    <Route path="/dashboard/status/completed" element={<ProtectedRoute employeeOnly><DashboardLayout section="status" statusView="completed" /></ProtectedRoute>} />
    <Route path="/dashboard/status/changes-requested" element={<ProtectedRoute employeeOnly><DashboardLayout section="status" statusView="changes_requested" /></ProtectedRoute>} />
    <Route path="/dashboard/team" element={<ProtectedRoute adminOnly><DashboardLayout section="team" /></ProtectedRoute>} />
    <Route path="/dashboard/profile" element={<ProtectedRoute><DashboardLayout section="profile" /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to={status === 'authenticated' ? '/dashboard' : '/login'} replace />} />
  </Routes>;
}
