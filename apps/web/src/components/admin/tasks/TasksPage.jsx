import { useCallback, useEffect, useMemo, useState } from 'react';
import { request } from '../../../services/api.js';

const EMPTY_CLIENT = { name: '', company: '', email: '', phone: '' };
const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`)) : 'Not set';
const localToday = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};
function openDatePicker(event) {
  if (typeof event.currentTarget.showPicker === 'function') {
    try { event.currentTarget.showPicker(); } catch { /* The browser may already have opened its native picker. */ }
  }
}

export default function TasksPage() {
  const today = localToday();
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [reportingDate, setReportingDate] = useState('');
  const [hasClientInfo, setHasClientInfo] = useState(false);
  const [client, setClient] = useState(EMPTY_CLIENT);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeeLoadError, setEmployeeLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedEmployee = employees.find((employee) => employee.id === assigneeId);
  const availableRoles = useMemo(() => selectedEmployee?.roles ?? [], [selectedEmployee]);

  const loadTaskWorkspace = useCallback(async () => {
    const employeeRequest = request('/api/v1/employees')
      .then((employeeData) => {
        setEmployees(employeeData.employees.filter((employee) => employee.isActive));
        setEmployeeLoadError('');
      })
      .catch((loadError) => {
        setEmployees([]);
        setEmployeeLoadError(loadError.message);
        throw loadError;
      })
      .finally(() => setEmployeesLoading(false));
    const taskRequest = request('/api/v1/tasks')
      .then((taskData) => { setTasks(taskData.tasks); setError(''); })
      .catch((loadError) => { setError(loadError.message); throw loadError; });

    const [employeeResult] = await Promise.allSettled([employeeRequest, taskRequest]);
    if (employeeResult.status === 'rejected') throw employeeResult.reason;
  }, []);

  useEffect(() => {
    let active = true;
    loadTaskWorkspace().catch((loadError) => { if (active) setError(loadError.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadTaskWorkspace]);

  function chooseEmployee(id) {
    const employee = employees.find((record) => record.id === id);
    setAssigneeId(id);
    setRoleId(employee?.roles[0]?.id ?? '');
  }

  function updateClient(field, value) {
    setClient((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault(); setError(''); setNotice(''); setSaving(true);
    try {
      await request('/api/v1/tasks', {
        method: 'POST',
        body: JSON.stringify({ title, description, assigneeId, roleId, completionDate, reportingDate, hasClientInfo, client: hasClientInfo ? client : undefined })
      });
      setTitle(''); setDescription(''); setAssigneeId(''); setRoleId(''); setCompletionDate(''); setReportingDate(''); setHasClientInfo(false); setClient(EMPTY_CLIENT);
      await loadTaskWorkspace(); setNotice('Task created and assigned to the selected employee.');
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }

  return <div className="content dashboard-content tasks-page">
    <div className="welcome"><div><p className="eyebrow">PLAN &amp; ASSIGN WORK</p><h1>Tasks</h1><p className="subtitle">Create a task, assign the right employee and role, and set the dates everyone is working toward.</p></div><div className="date-chip"><span className="date-icon">▤</span><span><small>TASKS</small><strong>{tasks.length} in workspace</strong></span></div></div>
    {notice && <p className="notice-banner" role="status">✓ {notice}</p>}{error && <p className="form-error page-error" role="alert">{error}</p>}
    {employeeLoadError && <p className="form-error page-error" role="alert">Could not load employees: {employeeLoadError}</p>}

    <article className="panel task-form-panel">
      <div className="panel-heading"><div><h2>Create a task</h2><p>Assign work to an active employee under one of their job roles.</p></div><span className="setup-badge">ADMIN</span></div>
      <form className="task-form" onSubmit={handleSubmit}>
        <div className="task-form-grid">
          <div className="task-field task-field-wide"><label htmlFor="taskTitle">Task name</label><input id="taskTitle" value={title} onChange={(event) => setTitle(event.target.value)} required minLength="2" maxLength="140" placeholder="e.g. Create the spring campaign graphics" /></div>
          <div className="task-field"><label htmlFor="taskAssignee">Assign to employee</label><select id="taskAssignee" value={assigneeId} onChange={(event) => chooseEmployee(event.target.value)} required disabled={employeesLoading || Boolean(employeeLoadError)}><option value="">{employeesLoading ? 'Loading employees…' : employeeLoadError ? 'Employees unavailable' : 'Select an employee'}</option>{employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.fullName}</option>)}</select></div>
          <div className="task-field"><label htmlFor="taskRole">Job role</label><select id="taskRole" value={roleId} onChange={(event) => setRoleId(event.target.value)} required disabled={!assigneeId || availableRoles.length === 0}><option value="">{assigneeId ? 'Select a role' : 'Select an employee first'}</option>{availableRoles.map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select>{assigneeId && availableRoles.length === 0 && <small className="task-field-hint">Assign a role to this employee in Team &amp; roles first.</small>}</div>
          <div className="task-field"><label htmlFor="completionDate">Target completion date</label><input id="completionDate" type="date" min={today} value={completionDate} onClick={openDatePicker} onChange={(event) => setCompletionDate(event.target.value)} required /></div>
          <div className="task-field"><label htmlFor="reportingDate">Final reporting date</label><input id="reportingDate" type="date" min={today} value={reportingDate} onClick={openDatePicker} onChange={(event) => setReportingDate(event.target.value)} required /></div>
          <div className="task-field task-field-wide"><label htmlFor="taskDescription">Description</label><textarea id="taskDescription" value={description} onChange={(event) => setDescription(event.target.value)} required maxLength="5000" rows="5" placeholder="Add the brief, deliverables, and any instructions the employee needs." /></div>
        </div>

        <div className={`client-info-section${hasClientInfo ? ' is-expanded' : ''}`}>
          <label className="client-toggle-row" htmlFor="includeClientInfo"><span className="client-toggle-copy"><strong>Client information</strong><small>Attach client contact details to this task when needed.</small></span><span className="switch-control"><input id="includeClientInfo" type="checkbox" checked={hasClientInfo} onChange={(event) => setHasClientInfo(event.target.checked)} /><i /></span></label>
          {hasClientInfo && <div className="task-form-grid client-fields">
            <div className="task-field"><label htmlFor="clientName">Client name</label><input id="clientName" value={client.name} onChange={(event) => updateClient('name', event.target.value)} required minLength="2" maxLength="120" placeholder="Contact person" /></div>
            <div className="task-field"><label htmlFor="clientCompany">Company <span>Optional</span></label><input id="clientCompany" value={client.company} onChange={(event) => updateClient('company', event.target.value)} maxLength="120" placeholder="Company or organization" /></div>
            <div className="task-field"><label htmlFor="clientEmail">Email <span>Optional</span></label><input id="clientEmail" type="email" value={client.email} onChange={(event) => updateClient('email', event.target.value)} maxLength="254" placeholder="client@example.com" /></div>
            <div className="task-field"><label htmlFor="clientPhone">Phone <span>Optional</span></label><input id="clientPhone" type="tel" value={client.phone} onChange={(event) => updateClient('phone', event.target.value)} maxLength="30" placeholder="Contact number" /></div>
          </div>}
        </div>
        <div className="task-form-footer"><span>Tasks are saved to the WorkGraph database.</span><button className="primary-button" type="submit" disabled={saving || loading || employees.length === 0}>{saving ? 'Creating task…' : 'Create task'}<span>→</span></button></div>
        {!loading && !employeeLoadError && employees.length === 0 && <p className="task-field-hint">Create an active employee account and assign them a job role before creating a task.</p>}
      </form>
    </article>

    <article className="panel created-tasks-panel"><div className="panel-heading"><div><h2>Workspace tasks</h2><p>Recently created and assigned tasks</p></div><span className="count-badge">{tasks.length}</span></div>
      {loading ? <div className="list-empty"><strong>Loading tasks…</strong></div> : tasks.length ? <div className="task-list">{tasks.map((task) => <article className="task-list-item" key={task.id}>
        <div className="task-list-main"><span className="task-list-icon">▤</span><div><h3>{task.title}</h3><p>{task.description}</p></div></div>
        <div className="task-list-meta"><span><small>ASSIGNED TO</small><strong>{task.assignee.fullName}</strong></span><span><small>ROLE</small><strong>{task.role.name}</strong></span><span><small>COMPLETION</small><strong>{formatDate(task.completionDate)}</strong></span><span><small>FINAL REPORT</small><strong>{formatDate(task.reportingDate)}</strong></span><span className={`task-status status-${task.status}`}>{task.status.replaceAll('_', ' ')}</span>{task.hasClientInfo && <span className="task-client-tag">Client attached</span>}</div>
      </article>)}</div> : <div className="list-empty"><span>▤</span><strong>No tasks created yet</strong><small>Create a task above and it will appear here.</small></div>}
    </article>
    <footer>WorkGraph <span>·</span> Task planning and assignment</footer>
  </div>;
}
