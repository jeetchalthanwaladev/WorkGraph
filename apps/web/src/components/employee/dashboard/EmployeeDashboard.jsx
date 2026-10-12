import { useEffect, useState } from 'react';
import { request } from '../../../services/api.js';

const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'Not set';

export default function EmployeeDashboard({ user }) {
  const roleNames = user.roles.map((role) => role.name);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    request('/api/v1/tasks').then(({ tasks: assignedTasks }) => { if (active) setTasks(assignedTasks); }).catch((loadError) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, []);
  const countStatus = (status) => tasks.filter((task) => task.status === status).length;

  return <div className="content dashboard-content">
    <div className="welcome"><div><p className="eyebrow">YOUR OFFICE, IN SYNC</p><h1>Welcome, {user.fullName.split(' ')[0]}</h1><p className="subtitle">Your WorkGraph workspace is ready. Your assigned work will show up here.</p></div><div className="date-chip"><span className="date-icon">✧</span><span><small>YOUR ACCESS</small><strong>{roleNames.join(', ') || 'Employee'}</strong></span></div></div>
    {error && <p className="form-error page-error" role="alert">Your assigned tasks could not be loaded: {error}</p>}
    <div className="stats-grid">{[['AVAILABLE TASKS', String(countStatus('available')), 'Assigned and ready to start'], ['MY TASKS', String(tasks.length), 'Assigned to your account'], ['AWAITING REVIEW', String(countStatus('submitted_for_review')), 'Submitted for review'], ['COMPLETED', String(countStatus('completed')), 'Your finished work']].map(([label, value, note], index) => <article className="stat-card" key={label}><div className={`stat-icon ${['purple', 'blue', 'amber', 'green'][index]}`}>{['▤', '◷', '✳', '✓'][index]}</div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-note">{note}</span></article>)}</div>
    <div className="panels employee-panels"><article className="panel employee-tasks-panel"><div className="panel-heading"><div><h2>Your tasks</h2><p>Tasks assigned to your account and job roles</p></div><span className="count-badge">{tasks.length}</span></div>
      {tasks.length ? <div className="employee-task-list">{tasks.map((task) => <article className="employee-task-card" key={task.id}><div className="employee-task-heading"><span className="task-list-icon">▤</span><div><h3>{task.title}</h3><span className="task-role-label">{task.role.name}</span></div><span className={`task-status status-${task.status}`}>{task.status.replaceAll('_', ' ')}</span></div><p className="employee-task-description">{task.description}</p><div className="employee-task-dates"><span><small>COMPLETION</small><strong>{formatDate(task.completionDate)}</strong></span><span><small>FINAL REPORT</small><strong>{formatDate(task.reportingDate)}</strong></span></div>
        {task.hasClientInfo && task.client && <div className="employee-client-info"><strong>Client contact</strong><span>{task.client.name}{task.client.company ? ` · ${task.client.company}` : ''}</span>{task.client.email && <a href={`mailto:${task.client.email}`}>{task.client.email}</a>}{task.client.phone && <a href={`tel:${task.client.phone}`}>{task.client.phone}</a>}</div>}
      </article>)}</div> : <div className="empty-state"><div className="empty-art"><span>▤</span><i>✳</i></div><h3>Your work will appear here</h3><p>When your administrator assigns work to you, you’ll find its details and deadlines here.</p></div>}
    </article><article className="panel setup-panel"><div className="panel-heading"><div><h2>Your account</h2><p>Signed in securely</p></div><span className="setup-badge">ACTIVE</span></div><div className="account-summary"><span className="large-avatar">{user.fullName.slice(0, 1).toUpperCase()}</span><strong>{user.fullName}</strong><small>{user.loginId}</small><div className="role-chips">{roleNames.map((name) => <span key={name}>{name}</span>)}</div></div></article></div>
    <footer>WorkGraph <span>·</span> Office task management</footer>
  </div>;
}
