import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { signedOut } from '../../store.js';
import { request } from '../../services/api.js';
import AdminDashboard from '../admin/dashboard/AdminDashboard.jsx';
import TeamManagement from '../admin/team/TeamManagement.jsx';
import EmployeeDashboard from '../employee/dashboard/EmployeeDashboard.jsx';
import ProfilePage from '../profile/ProfilePage.jsx';

export default function DashboardLayout({ section = 'overview' }) {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch(); const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const admin = user.accountRole === 'admin';
  async function handleLogout() {
    try { await request('/api/v1/auth/logout', { method: 'POST' }); }
    finally { dispatch(signedOut()); navigate('/login', { replace: true }); }
  }
  function handleProfileMenuKeyDown(event) {
    if (event.key === 'Escape') setProfileMenuOpen(false);
  }
  const displayRole = admin ? 'Administrator' : user.roles.map((role) => role.name).join(' · ') || 'Employee';
  const sectionTitle = section === 'team' ? 'Team & roles' : section === 'profile' ? 'Profile' : 'Overview';
  return <main className="shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">W</span><span>workgraph</span></div><p className="nav-label">WORKSPACE</p>
      <nav aria-label="Main navigation"><NavLink end to="/dashboard" className={({ isActive }) => `nav-item${isActive && section === 'overview' ? ' active' : ''}`}><span>◫</span> Overview</NavLink>{admin && <NavLink to="/dashboard/team" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><span>♙</span> Team &amp; roles</NavLink>}</nav>
      <div className="sidebar-bottom"><span className="avatar">{user.fullName.slice(0, 1).toUpperCase()}</span><span><strong>{user.fullName}</strong><small>{displayRole}</small></span><button className="logout-link" onClick={handleLogout} aria-label="Sign out">↪</button></div>
    </aside>
    <section className="main-panel"><header className="topbar"><span className="crumb">Workspace <span>/</span> {sectionTitle}</span><div className="top-actions"><span className="role-pill">{admin ? 'ADMIN' : 'EMPLOYEE'}</span>
      <div className="profile-menu" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setProfileMenuOpen(false); }} onKeyDown={handleProfileMenuKeyDown}>
        <button className="profile" type="button" aria-label="Toggle profile menu" aria-haspopup="menu" aria-expanded={profileMenuOpen} aria-controls="profile-menu-options" onClick={() => setProfileMenuOpen((isOpen) => !isOpen)}>{user.fullName.slice(0, 1).toUpperCase()}</button>
        {profileMenuOpen && <div className="profile-dropdown" id="profile-menu-options" role="menu">
          <div className="profile-menu-summary"><span className="profile-menu-avatar">{user.fullName.slice(0, 1).toUpperCase()}</span><span><strong>{user.fullName}</strong><small>{displayRole}</small></span></div>
          <div className="profile-menu-options"><NavLink role="menuitem" to="/dashboard/profile" onClick={() => setProfileMenuOpen(false)}><span>♙</span>Profile</NavLink><button role="menuitem" type="button" onClick={() => { setProfileMenuOpen(false); handleLogout(); }}><span>↪</span>Log out</button></div>
        </div>}
      </div>
    </div></header>
      {section === 'team' ? <TeamManagement /> : section === 'profile' ? <ProfilePage user={user} displayRole={displayRole} /> : admin ? <AdminDashboard user={user} /> : <EmployeeDashboard user={user} />}
    </section>
  </main>;
}
