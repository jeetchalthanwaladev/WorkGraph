import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { request } from '../../../services/api.js';
import MetricCard from './MetricCard.jsx';
import StatusBreakdown from './StatusBreakdown.jsx';
import TaskStatusPie from './TaskStatusPie.jsx';

const EMPTY_SUMMARY = { summary: { employeeCount: 0, totalTasks: 0, openTaskCount: 0, overdueTasks: 0 }, statuses: [], upcomingDeadlines: [], recentActivity: [] };
const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const timeLabel = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

function ActivityList({ items }) {
  if (!items.length) return <div className="widget-empty"><span className="widget-empty-icon">✦</span><strong>No activity yet</strong><p>Task updates from your team will appear here.</p></div>;
  return <ul className="activity-list">{items.map((item) => <li key={item.id}><span className="activity-mark">↗</span><span className="activity-copy"><strong>{item.actorName}</strong><span>{item.action || `updated ${item.taskTitle}`}</span><small>{item.taskTitle}</small></span><time>{item.createdAt ? timeLabel.format(new Date(item.createdAt)) : ''}</time></li>)}</ul>;
}

function DeadlineList({ items }) {
  if (!items.length) return <div className="widget-empty compact"><span className="widget-empty-icon">◷</span><strong>No upcoming deadlines</strong><p>Deadlines in the next seven days will show here.</p></div>;
  return <ul className="deadline-list">{items.map((item) => <li key={item.id}><span className="deadline-mark">◷</span><span><strong>{item.title || 'Untitled task'}</strong><small>{item.status?.replaceAll('_', ' ') || 'Open task'}</small></span><time>{item.dueAt ? dateLabel.format(new Date(item.dueAt)) : 'No date'}</time></li>)}</ul>;
}

export default function AdminDashboard({ user }) {
  const [data, setData] = useState(EMPTY_SUMMARY); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    request('/api/v1/dashboard/summary').then((summary) => { if (active) setData(summary); }).catch((loadError) => { if (active) setError(loadError.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const { summary, statuses, upcomingDeadlines, recentActivity } = data;

  return <div className="content dashboard-content admin-dashboard">
    <div className="welcome"><div><p className="eyebrow">WORKSPACE OVERVIEW</p><h1>Good to see you, {user.fullName.split(' ')[0]}</h1><p className="subtitle">A live snapshot of your people, work, and deadlines.</p></div><div className="date-chip"><span className="date-icon">✧</span><span><small>TODAY</small><strong>{dateLabel.format(new Date())}</strong></span></div></div>
    {error && <p className="form-error page-error" role="alert">Dashboard data could not be refreshed: {error}</p>}
    <div className="dashboard-section-heading"><div><h2>Workspace at a glance</h2><p>{loading ? 'Refreshing live workspace data…' : 'Live totals from your WorkGraph workspace'}</p></div><span className={`live-indicator${loading ? ' is-loading' : ''}`}><i />{loading ? 'UPDATING' : 'LIVE DATA'}</span></div>
    <div className="stats-grid admin-stats">
      <MetricCard label="ACTIVE EMPLOYEES" value={summary.employeeCount} note="People on your team" icon="♙" tone="purple" />
      <MetricCard label="TOTAL TASKS" value={summary.totalTasks} note="Across the workspace" icon="▤" tone="blue" />
      <MetricCard label="OPEN TASKS" value={summary.openTaskCount} note="Not yet completed" icon="◷" tone="amber" />
      <MetricCard label="OVERDUE" value={summary.overdueTasks} note="Past their due date" icon="!" tone="rose" />
    </div>
    <div className="admin-overview-grid">
      <StatusBreakdown statuses={statuses} totalTasks={summary.totalTasks} />
      <TaskStatusPie statuses={statuses} totalTasks={summary.totalTasks} />
      <article className="panel admin-widget"><div className="panel-heading"><div><h2>Recent activity</h2><p>Latest changes across your workspace</p></div><span className="setup-badge">ACTIVITY</span></div><ActivityList items={recentActivity} /></article>
      <article className="panel admin-widget"><div className="panel-heading"><div><h2>Upcoming deadlines</h2><p>Due in the next seven days</p></div><span className="setup-badge">7 DAYS</span></div><DeadlineList items={upcomingDeadlines} /></article>
    </div>
    <div className="admin-note"><span>✦</span><div><strong>Your admin workspace</strong><p><Link to="/dashboard/tasks/new">Create and assign tasks</Link> to your team. Manage employee access and job roles from <Link to="/dashboard/team">Team &amp; roles</Link>.</p></div></div>
    <footer>WorkGraph <span>·</span> Office task management</footer>
  </div>;
}
