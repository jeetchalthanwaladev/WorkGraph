import { useCallback, useEffect, useState } from 'react';
import { request } from '../../../services/api.js';

export default function TeamManagement() {
  const [employees, setEmployees] = useState([]); const [roles, setRoles] = useState([]);
  const [fullName, setFullName] = useState(''); const [loginId, setLoginId] = useState(''); const [password, setPassword] = useState('');
  const [roleIds, setRoleIds] = useState([]); const [newRole, setNewRole] = useState(''); const [notice, setNotice] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const loadTeam = useCallback(async () => { const [employeeData, roleData] = await Promise.all([request('/api/v1/employees'), request('/api/v1/roles')]); setEmployees(employeeData.employees); setRoles(roleData.roles); }, []);
  useEffect(() => { loadTeam().catch((loadError) => setError(loadError.message)); }, [loadTeam]);
  async function handleCreateEmployee(event) {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try { await request('/api/v1/employees', { method: 'POST', body: JSON.stringify({ fullName, loginId, password, roleIds }) }); setFullName(''); setLoginId(''); setPassword(''); setRoleIds([]); await loadTeam(); setNotice('Employee account created. Share the login ID and password with them securely.'); }
    catch (createError) { setError(createError.message); } finally { setBusy(false); }
  }
  async function handleCreateRole(event) {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try { await request('/api/v1/roles', { method: 'POST', body: JSON.stringify({ name: newRole }) }); setNewRole(''); await loadTeam(); setNotice('Job role added and is ready to assign.'); }
    catch (createError) { setError(createError.message); } finally { setBusy(false); }
  }
  function toggleRole(id) { setRoleIds((current) => current.includes(id) ? current.filter((roleId) => roleId !== id) : [...current, id]); }

  return <div className="content dashboard-content">
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
    </article><footer>WorkGraph <span>·</span> Employee access is managed by administrators</footer>
  </div>;
}
