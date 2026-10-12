import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { signedOut } from '../../store.js';
import { request } from '../../services/api.js';
import AdminDashboard from '../admin/dashboard/AdminDashboard.jsx';
import TeamManagement from '../admin/team/TeamManagement.jsx';
import EmployeeDashboard from '../employee/dashboard/EmployeeDashboard.jsx';

export default function DashboardLayout({ section = 'overview' }) {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch(); const navigate = useNavigate();
  const admin = user.accountRole === 'admin';
  async function handleLogout() {
    try { await request('/api/v1/auth/logout', { method: 'POST' }); }
    finally { dispatch(signedOut()); navigate('/login', { replace: true }); }
  }
  const displayRole = admin ? 'Administrator' : user.roles.map((role) => role.name).join(' · ') || 'Employee';
  return <main className="shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">W</span><span>workgraph</span></div><p className="nav-label">WORKSPACE</p>
      <nav aria-label="Main navigation"><NavLink end to="/dashboard" className={({ isActive }) => `nav-item${isActive && section === 'overview' ? ' active' : ''}`}><span>◫</span> Overview</NavLink>{admin && <NavLink to="/dashboard/team" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><span>♙</span> Team &amp; roles</NavLink>}</nav>
      <div className="sidebar-bottom"><span className="avatar">{user.fullName.slice(0, 1).toUpperCase()}</span><span><strong>{user.fullName}</strong><small>{displayRole}</small></span><button className="logout-link" onClick={handleLogout} aria-label="Sign out">↪</button></div>
    </aside>
    <section className="main-panel"><header className="topbar"><span className="crumb">Workspace <span>/</span> {section === 'team' ? 'Team & roles' : 'Overview'}</span><div className="top-actions"><span className="role-pill">{admin ? 'ADMIN' : 'EMPLOYEE'}</span><span className="profile">{user.fullName.slice(0, 1).toUpperCase()}</span></div></header>
      {section === 'team' ? <TeamManagement /> : admin ? <AdminDashboard user={user} /> : <EmployeeDashboard user={user} />}
    </section>
  </main>;
}
