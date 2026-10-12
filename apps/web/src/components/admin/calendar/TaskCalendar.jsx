import { useEffect, useMemo, useState } from 'react';
import { request } from '../../../services/api.js';

const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const statusLabel = (status) => status.replaceAll('_', ' ');

export default function TaskCalendar() {
  const [tasks, setTasks] = useState([]);
  const [range, setRange] = useState(3);
  const [dateMode, setDateMode] = useState('scheduled');
  const [search, setSearch] = useState('');
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
    const offset = dateMode === 'scheduled' ? index - range + 1 : index;
    date.setDate(date.getDate() + offset);
    return { date, key: dayKey(date) };
  }), [dateMode, range]);

  const taskEvents = useMemo(() => {
    const events = new Map(days.map(({ key }) => [key, []]));
    tasks.forEach((task) => {
      const eventDate = dateMode === 'scheduled'
        ? task.createdAt ? dayKey(new Date(task.createdAt)) : ''
        : task.completionDate;
      if (events.has(eventDate)) events.get(eventDate).push({ task, kind: dateMode === 'scheduled' ? 'Scheduled' : 'Completion due' });
    });
    return events;
  }, [days, tasks, dateMode]);

  const searchResults = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return [];
    return tasks.filter((task) => {
      const scheduled = task.createdAt ? new Date(task.createdAt) : null;
      const searchable = [
        task.title,
        task.assignee?.fullName,
        task.role?.name,
        task.client?.name,
        task.client?.company,
        task.createdAt ? dayKey(scheduled) : '',
        task.createdAt ? dayLabel.format(scheduled) : '',
        task.completionDate,
        task.reportingDate
      ].filter(Boolean).join(' ').toLocaleLowerCase();
      return searchable.includes(query);
    });
  }, [search, tasks]);

  return <div className="content dashboard-content task-calendar-page">
    <div className="welcome"><div><p className="eyebrow">ADMIN WORKSPACE</p><h1>Task calendar</h1><p className="subtitle">See what work is due and who is responsible each day.</p></div><div className="date-chip"><span className="date-icon">▦</span><span><small>SHOWING</small><strong>{dateMode === 'scheduled' ? `Last ${range} days` : `Next ${range} days`}</strong></span></div></div>
    {error && <p className="form-error page-error" role="alert">Calendar tasks could not be loaded: {error}</p>}
    <section className="panel calendar-panel"><div className="panel-heading calendar-heading"><div><h2>Team schedule</h2><p>{dateMode === 'scheduled' ? 'See tasks on the day they were assigned to the team.' : 'See tasks on the completion date set in each task.'}</p></div><div className="calendar-controls"><div className="calendar-filter-group" role="group" aria-label="Calendar date type">{[['scheduled', 'Scheduled date'], ['completion', 'Completion date']].map(([mode, label]) => <button type="button" key={mode} className={dateMode === mode ? 'selected' : ''} aria-pressed={dateMode === mode} onClick={() => setDateMode(mode)}>{label}</button>)}</div><div className="calendar-range" role="group" aria-label="Calendar date range">{[3, 7, 15].map((daysCount) => <button type="button" key={daysCount} className={range === daysCount ? 'selected' : ''} aria-pressed={range === daysCount} onClick={() => setRange(daysCount)}>{daysCount} days</button>)}</div></div></div>
      <div className="calendar-search-row"><label className="calendar-search-field"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search task, employee, role, client, company, or scheduled date" aria-label="Search all tasks"/>{search && <button type="button" onClick={() => setSearch('')} aria-label="Clear task search">×</button>}</label></div>{search.trim() && <div className="calendar-search-count-row" role="status">{searchResults.length} matching {searchResults.length === 1 ? 'task' : 'tasks'}</div>}
      {loading ? <div className="calendar-empty">Loading assigned work…</div> : search.trim() ? <div className="calendar-search-results">{searchResults.length ? searchResults.map((task) => { const scheduled = task.createdAt ? new Date(task.createdAt) : null; return <article className="calendar-task-card" key={task.id}><div className="calendar-task-meta"><span>Task details</span><span className={`calendar-status calendar-status-${task.status}`}>{statusLabel(task.status)}</span></div><h3>{task.title}</h3><p className="calendar-assignee">Assigned to <strong>{task.assignee.fullName}</strong></p><p className="calendar-role">{task.role.name}</p>{task.client && <p className="calendar-role">Client: {task.client.name}{task.client.company ? ` · ${task.client.company}` : ''}</p>}<div className="calendar-task-dates"><span>Scheduled: {scheduled ? `${dayLabel.format(scheduled)} (${dayKey(scheduled)})` : 'Not set'}</span><span>Completion: {task.completionDate || 'Not set'}</span><span>Final report: {task.reportingDate || 'Not set'}</span></div></article>; }) : <div className="calendar-day-empty">No tasks match “{search.trim()}”.</div>}</div> : <div className={`calendar-grid calendar-grid-${range}`}>{days.map(({ date, key }) => <section className="calendar-day" key={key}><header className="calendar-day-heading"><strong>{dayLabel.format(date)}</strong><span>{taskEvents.get(key)?.length ?? 0} items</span></header><div className="calendar-day-tasks">{taskEvents.get(key)?.length ? taskEvents.get(key).map(({ task, kind }) => <article className="calendar-task-card" key={`${task.id}-${kind}`}><div className="calendar-task-meta"><span>{kind}</span><span className={`calendar-status calendar-status-${task.status}`}>{statusLabel(task.status)}</span></div><h3>{task.title}</h3><p className="calendar-assignee">Assigned to <strong>{task.assignee.fullName}</strong></p><p className="calendar-role">{task.role.name}</p><div className="calendar-task-dates"><span>Completion: {task.completionDate || 'Not set'}</span><span>Report: {task.reportingDate || 'Not set'}</span></div></article>) : <div className="calendar-day-empty">No tasks scheduled</div>}</div></section>)}</div>}
    </section>
  </div>;
}
