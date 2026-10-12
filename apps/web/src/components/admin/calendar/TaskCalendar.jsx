import { useEffect, useMemo, useState } from 'react';
import { request } from '../../../services/api.js';

const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const statusLabel = (status) => status.replaceAll('_', ' ');

export default function TaskCalendar() {
  const [tasks, setTasks] = useState([]);
  const [range, setRange] = useState(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    request('/api/v1/tasks').then(({ tasks: assignedTasks }) => { if (active) setTasks(assignedTasks); })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const days = useMemo(() => Array.from({ length: range }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return { date, key: dayKey(date) };
  }), [range]);

  const taskEvents = useMemo(() => {
    const events = new Map(days.map(({ key }) => [key, []]));
    tasks.forEach((task) => {
      if (events.has(task.completionDate)) events.get(task.completionDate).push({ task, kind: 'Completion due' });
      if (task.reportingDate && task.reportingDate !== task.completionDate && events.has(task.reportingDate)) events.get(task.reportingDate).push({ task, kind: 'Final report' });
    });
    return events;
  }, [days, tasks]);

  return <div className="content dashboard-content task-calendar-page">
    <div className="welcome"><div><p className="eyebrow">ADMIN WORKSPACE</p><h1>Task calendar</h1><p className="subtitle">See what work is due and who is responsible each day.</p></div><div className="date-chip"><span className="date-icon">▦</span><span><small>SHOWING</small><strong>Next {range} days</strong></span></div></div>
    {error && <p className="form-error page-error" role="alert">Calendar tasks could not be loaded: {error}</p>}
    <section className="panel calendar-panel"><div className="panel-heading calendar-heading"><div><h2>Team schedule</h2><p>Tasks are listed on their completion and final-report dates</p></div><div className="calendar-range" aria-label="Calendar date range">{[3, 7, 15].map((daysCount) => <button type="button" key={daysCount} className={range === daysCount ? 'selected' : ''} aria-pressed={range === daysCount} onClick={() => setRange(daysCount)}>{daysCount} days</button>)}</div></div>
      {loading ? <div className="calendar-empty">Loading assigned work…</div> : <div className={`calendar-grid calendar-grid-${range}`}>{days.map(({ date, key }) => <section className="calendar-day" key={key}><header className="calendar-day-heading"><strong>{dayLabel.format(date)}</strong><span>{taskEvents.get(key)?.length ?? 0} items</span></header><div className="calendar-day-tasks">{taskEvents.get(key)?.length ? taskEvents.get(key).map(({ task, kind }) => <article className="calendar-task-card" key={`${task.id}-${kind}`}><div className="calendar-task-meta"><span>{kind}</span><span className={`calendar-status calendar-status-${task.status}`}>{statusLabel(task.status)}</span></div><h3>{task.title}</h3><p className="calendar-assignee">Assigned to <strong>{task.assignee.fullName}</strong></p><p className="calendar-role">{task.role.name}</p><div className="calendar-task-dates"><span>Completion: {task.completionDate || 'Not set'}</span><span>Report: {task.reportingDate || 'Not set'}</span></div></article>) : <div className="calendar-day-empty">No tasks scheduled</div>}</div></section>)}</div>}
    </section>
  </div>;
}
