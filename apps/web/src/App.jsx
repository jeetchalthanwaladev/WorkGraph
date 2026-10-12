import { useCallback, useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { sessionLoaded, signedOut } from './store.js';

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message ?? 'Something went wrong. Please try again.');
  return payload.data;
}

function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { user } = await request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ loginId, password }) });
      dispatch(sessionLoaded(user));
      navigate('/dashboard', { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-art" aria-label="WorkGraph workspace">
        <div className="login-brand"><span className="brand-mark">W</span><span>workgraph</span></div>
        <div className="art-copy"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-card"><span className="art-card-icon">✦</span><span className="art-card-label">TEAM WORKSPACE</span><strong>Great work<br />happens together.</strong><div className="art-avatars"><i>J</i><i>M</i><i>A</i><b>+8</b></div></div><div className="floating-dot dot-a" /><div className="floating-dot dot-b" /></div>
        <div className="art-caption"><span className="caption-line" />A little more organized. A lot more in sync.</div>
      </section>
      <section className="login-side">
        <div className="login-card-wrap">
          <p className="login-kicker">WELCOME BACK</p>
          <h1>Sign in to your<br /><span>workspace.</span></h1>
          <p className="login-description">Use the login ID provided by your WorkGraph administrator.</p>
          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="loginId">Login ID</label>
            <div className="input-wrap"><span className="input-icon">◎</span><input autoComplete="username" autoFocus id="loginId" name="loginId" placeholder="Enter your login ID" value={loginId} onChange={(event) => setLoginId(event.target.value)} required /></div>
            <label htmlFor="password">Password</label>
            <div className="input-wrap"><span className="input-icon">⌑</span><input autoComplete="current-password" id="password" name="password" type="password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="sign-in-button" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}<span>→</span></button>
          </form>
          <p className="no-signup"><span className="lock-mark">▣</span>Accounts are created by your administrator. There is no public sign up.</p>
        </div>
        <div className="login-footer"><span>© WorkGraph</span><span>Private team workspace</span></div>
      </section>
    </main>
  );
}

function Protected({ children, adminOnly = false }) {
  const { user, status } = useSelector((state) => state.auth);
  if (status === 'loading') return <div className="app-loading"><span className="loading-mark">W</span><span>Preparing your workspace…</span></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.accountRole !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function DashboardLayout({ section = 'overview' }) {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const admin = user.accountRole === 'admin';

  async function handleLogout() {
    try { await request('/api/v1/auth/logout', { method: 'POST' }); } finally {
      dispatch(signedOut());
      navigate('/login', { replace: true });
    }
  }

  const displayRole = admin ? 'Administrator' : user.roles.map((role) => role.name).join(' · ') || 'Employee';
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">W</span><span>workgraph</span></div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          <NavLink end to="/dashboard" className={({ isActive }) => `nav-item${isActive && section === 'overview' ? ' active' : ''}`}><span>◫</span> Overview</NavLink>
          {admin && <NavLink to="/dashboard/team" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><span>♙</span> Team &amp; roles</NavLink>}
        </nav>
        <div className="sidebar-bottom"><span className="avatar">{user.fullName.slice(0, 1).toUpperCase()}</span><span><strong>{user.fullName}</strong><small>{displayRole}</small></span><button className="logout-link" onClick={handleLogout} aria-label="Sign out">↪</button></div>
      </aside>
      <section className="main-panel">
        <header className="topbar"><span className="crumb">Workspace <span>/</span> {section === 'team' ? 'Team & roles' : 'Overview'}</span><div className="top-actions"><span className="role-pill">{admin ? 'ADMIN' : 'EMPLOYEE'}</span><span className="profile">{user.fullName.slice(0, 1).toUpperCase()}</span></div></header>
        {section === 'team' ? <TeamManagement /> : <Overview user={user} admin={admin} />}
      </section>
    </main>
  );
}

function Overview({ user, admin }) {
  const roleNames = user.roles.map((role) => role.name);
  return (
    <div className="content dashboard-content">
      <div className="welcome"><div><p className="eyebrow">YOUR OFFICE, IN SYNC</p><h1>Welcome, {user.fullName.split(' ')[0]}</h1><p className="subtitle">{admin ? 'Your team workspace is ready. Manage your people and roles from Team & roles.' : 'Your WorkGraph workspace is ready. Your assigned work will show up here.'}</p></div><div className="date-chip"><span className="date-icon">✧</span><span><small>YOUR ACCESS</small><strong>{admin ? 'Administrator' : roleNames.join(', ') || 'Employee'}</strong></span></div></div>
      <div className="stats-grid">
        {(admin ? [['TEAM MEMBERS', '—', 'Employee accounts'], ['OPEN TASKS', '—', 'Ready for your team'], ['AWAITING REVIEW', '—', 'Submitted work'], ['COMPLETED', '—', 'Approved work']] : [['AVAILABLE TASKS', '—', 'Matched to your role'], ['MY TASKS', '—', 'Assigned to you'], ['AWAITING REVIEW', '—', 'Submitted work'], ['COMPLETED', '—', 'Your finished work']]).map(([label, value, note], index) => <article className="stat-card" key={label}><div className={`stat-icon ${['purple', 'blue', 'amber', 'green'][index]}`}>{['▤', '◷', '✳', '✓'][index]}</div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-note">{note}</span></article>)}
      </div>
      <div className="panels"><article className="panel tasks-panel"><div className="panel-heading"><div><h2>{admin ? 'Workspace activity' : 'Your tasks'}</h2><p>{admin ? 'A clear view of your office work' : 'Tasks assigned to your roles and account'}</p></div><span className="setup-badge">READY</span></div><div className="empty-state"><div className="empty-art"><span>▤</span><i>✳</i></div><h3>{admin ? 'Your workspace is set up' : 'Your work will appear here'}</h3><p>{admin ? 'Create employee accounts and choose their job roles from Team & roles. Task management is the next workspace milestone.' : 'When your administrator assigns or opens work for your role, you’ll find it here.'}</p></div></article><article className="panel setup-panel"><div className="panel-heading"><div><h2>Your account</h2><p>Signed in securely</p></div><span className="setup-badge">ACTIVE</span></div><div className="account-summary"><span className="large-avatar">{user.fullName.slice(0, 1).toUpperCase()}</span><strong>{user.fullName}</strong><small>{user.loginId}</small><div className="role-chips">{admin ? <span>Administrator</span> : roleNames.map((name) => <span key={name}>{name}</span>)}</div></div></article></div>
      <footer>WorkGraph <span>·</span> Office task management</footer>
    </div>
  );
}

function TeamManagement() {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [fullName, setFullName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [roleIds, setRoleIds] = useState([]);
  const [newRole, setNewRole] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadTeam = useCallback(async () => {
    const [employeeData, roleData] = await Promise.all([request('/api/v1/employees'), request('/api/v1/roles')]);
    setEmployees(employeeData.employees);
    setRoles(roleData.roles);
  }, []);

  useEffect(() => { loadTeam().catch((loadError) => setError(loadError.message)); }, [loadTeam]);

  async function handleCreateEmployee(event) {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try {
      await request('/api/v1/employees', { method: 'POST', body: JSON.stringify({ fullName, loginId, password, roleIds }) });
      setFullName(''); setLoginId(''); setPassword(''); setRoleIds([]);
      await loadTeam(); setNotice('Employee account created. Share the login ID and password with them securely.');
    } catch (createError) { setError(createError.message); }
    finally { setBusy(false); }
  }

  async function handleCreateRole(event) {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try {
      await request('/api/v1/roles', { method: 'POST', body: JSON.stringify({ name: newRole }) });
      setNewRole(''); await loadTeam(); setNotice('Job role added and is ready to assign.');
    } catch (createError) { setError(createError.message); }
    finally { setBusy(false); }
  }

  function toggleRole(id) { setRoleIds((current) => current.includes(id) ? current.filter((roleId) => roleId !== id) : [...current, id]); }

  return (
    <div className="content dashboard-content">
      <div className="welcome"><div><p className="eyebrow">PEOPLE &amp; PERMISSIONS</p><h1>Team &amp; roles</h1><p className="subtitle">Create employee accounts and choose the job roles they can work under.</p></div><div className="date-chip"><span className="date-icon">♙</span><span><small>TEAM MEMBERS</small><strong>{employees.length} employees</strong></span></div></div>
      {notice && <p className="notice-banner" role="status">✓ {notice}</p>}{error && <p className="form-error page-error" role="alert">{error}</p>}
      <div className="management-grid">
        <article className="panel management-panel"><div className="panel-heading"><div><h2>Create employee account</h2><p>No public sign-up. Admins control account access.</p></div><span className="setup-badge">ADMIN</span></div>
          <form className="management-form" onSubmit={handleCreateEmployee}>
            <div className="field-pair"><div><label htmlFor="employeeName">Full name</label><input id="employeeName" value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength="2" maxLength="100" placeholder="e.g. Jordan Lee" /></div><div><label htmlFor="employeeLogin">Login ID</label><input id="employeeLogin" value={loginId} onChange={(event) => setLoginId(event.target.value)} required minLength="3" maxLength="100" placeholder="Choose a login ID" /></div></div>
            <label htmlFor="employeePassword">Temporary password</label><input id="employeePassword" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength="8" placeholder="At least 8 characters" />
            <fieldset className="role-picker"><legend>Assign job roles</legend>{roles.length ? roles.map((role) => <label className="role-option" key={role.id}><input type="checkbox" checked={roleIds.includes(role.id)} onChange={() => toggleRole(role.id)} /><span>{role.name}</span></label>) : <p className="field-hint">Add a job role to assign it to this employee.</p>}</fieldset>
            <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create employee account'}<span>→</span></button>
          </form>
        </article>
        <article className="panel management-panel role-panel"><div className="panel-heading"><div><h2>Job roles</h2><p>Choose from these roles when creating accounts.</p></div><span className="count-badge">{roles.length}</span></div>
          <form className="role-create-form" onSubmit={handleCreateRole}><label htmlFor="newRole">Add a role</label><div className="inline-form"><input id="newRole" value={newRole} onChange={(event) => setNewRole(event.target.value)} required minLength="2" maxLength="60" placeholder="e.g. Video Editor" /><button className="secondary-button" type="submit" disabled={busy}>Add role</button></div></form>
          <div className="role-list">{roles.map((role) => <div className="role-list-item" key={role.id}><span className="role-symbol">✦</span><span><strong>{role.name}</strong><small>{role.description || 'Employee job role'}</small></span></div>)}</div>
        </article>
      </div>
      <article className="panel employee-list-panel"><div className="panel-heading"><div><h2>Employee accounts</h2><p>Active accounts managed by your workspace</p></div><span className="count-badge">{employees.length}</span></div>
        {employees.length ? <div className="employee-table-wrap"><table className="employee-table"><thead><tr><th>EMPLOYEE</th><th>LOGIN ID</th><th>JOB ROLES</th><th>STATUS</th></tr></thead><tbody>{employees.map((employee) => <tr key={employee.id}><td><span className="employee-name"><i>{employee.fullName.slice(0, 1).toUpperCase()}</i>{employee.fullName}</span></td><td>{employee.loginId}</td><td><div className="role-chips">{employee.roles.length ? employee.roles.map((role) => <span key={role.id}>{role.name}</span>) : <span className="empty-role">No role assigned</span>}</div></td><td><span className="active-status"><i /> Active</span></td></tr>)}</tbody></table></div> : <div className="list-empty"><span>♙</span><strong>No employee accounts yet</strong><small>Create an account above to add someone to your workspace.</small></div>}
      </article>
      <footer>WorkGraph <span>·</span> Employee access is managed by administrators</footer>
    </div>
  );
}

function App() {
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
    <Route path="/dashboard" element={<Protected><DashboardLayout /></Protected>} />
    <Route path="/dashboard/team" element={<Protected adminOnly><DashboardLayout section="team" /></Protected>} />
    <Route path="*" element={<Navigate to={status === 'authenticated' ? '/dashboard' : '/login'} replace />} />
  </Routes>;
}

export default App;
