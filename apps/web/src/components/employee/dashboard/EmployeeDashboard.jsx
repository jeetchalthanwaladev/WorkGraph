import { useEffect, useState } from 'react';
import { request } from '../../../services/api.js';

const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'Not set';

export default function EmployeeDashboard({ user }) {
  const roleNames = user.roles.map((role) => role.name);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submissionDrafts, setSubmissionDrafts] = useState({});
  const [submissionLinks, setSubmissionLinks] = useState({});
  const [busyTaskId, setBusyTaskId] = useState('');
  const [dropTargetActive, setDropTargetActive] = useState(false);
  useEffect(() => {
    let active = true;
    request('/api/v1/tasks').then(({ tasks: assignedTasks }) => { if (active) setTasks(assignedTasks); }).catch((loadError) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, []);
  const countStatus = (status) => tasks.filter((task) => task.status === status).length;

  async function updateTask(task, payload, successMessage) {
    setError(''); setNotice(''); setBusyTaskId(task.id);
    try {
      const { task: updatedTask } = await request(`/api/v1/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      setTasks((current) => current.map((item) => item.id === task.id ? updatedTask : item));
      setNotice(successMessage);
      setSubmissionDrafts((current) => ({ ...current, [task.id]: '' }));
      setSubmissionLinks((current) => ({ ...current, [task.id]: '' }));
    } catch (updateError) { setError(updateError.message); }
    finally { setBusyTaskId(''); }
  }

  function submitWork(event, task) {
    event.preventDefault();
    const summary = submissionDrafts[task.id] ?? '';
    if (summary.trim().length < 10) { setError('Add a short work summary of at least 10 characters before submitting.'); return; }
    updateTask(task, { action: 'submit', summary, link: submissionLinks[task.id] ?? '' }, 'Your work has been sent to your administrator for review.');
  }

  function handleReviewDrop(event) {
    event.preventDefault();
    setDropTargetActive(false);
    const taskId = event.dataTransfer.getData('text/plain');
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status !== 'in_progress') return;
    const summary = submissionDrafts[task.id] ?? '';
    if (summary.trim().length < 10) {
      setError(`Add a work summary of at least 10 characters for “${task.title}” before dropping it here.`);
      document.getElementById(`submission-${task.id}`)?.focus();
      return;
    }
    updateTask(task, { action: 'submit', summary, link: submissionLinks[task.id] ?? '' }, 'Your work has been sent to your administrator for review.');
  }

  return <div className="content dashboard-content">
    <div className="welcome"><div><p className="eyebrow">YOUR OFFICE, IN SYNC</p><h1>Welcome, {user.fullName.split(' ')[0]}</h1><p className="subtitle">Your WorkGraph workspace is ready. Your assigned work will show up here.</p></div><div className="date-chip"><span className="date-icon">✧</span><span><small>YOUR ACCESS</small><strong>{roleNames.join(', ') || 'Employee'}</strong></span></div></div>
    {error && <p className="form-error page-error" role="alert">Task update failed: {error}</p>}
    {notice && <p className="notice-banner" role="status">✓ {notice}</p>}
    <div className="stats-grid">{[['PENDING TASKS', String(countStatus('available')), 'Assigned and ready to start'], ['IN PROGRESS', String(countStatus('in_progress')), 'Work you have started'], ['NEEDS REVISION', String(countStatus('changes_requested')), 'Updates requested by admin'], ['ACTIVE TASKS', String(tasks.length), 'Pending or in progress']].map(([label, value, note], index) => <article className="stat-card" key={label}><div className={`stat-icon ${['purple', 'blue', 'amber', 'green'][index]}`}>{['▤', '◷', '✳', '✓'][index]}</div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-note">{note}</span></article>)}</div>
    <div className="panels employee-panels"><article className="panel employee-tasks-panel"><div className="panel-heading"><div><h2>Your tasks</h2><p>Pending and in-progress work assigned to your account</p></div><span className="count-badge">{tasks.length}</span></div>
      {tasks.length ? <div className="employee-task-list">{tasks.map((task) => <article className={`employee-task-card ${task.status === 'in_progress' ? 'draggable-task' : ''}`} key={task.id} draggable={task.status === 'in_progress'} onDragStart={(event) => { if (task.status === 'in_progress') { event.dataTransfer.setData('text/plain', task.id); event.dataTransfer.effectAllowed = 'move'; } }}><div className="employee-task-heading"><span className="task-list-icon">▤</span><div><h3>{task.title}</h3><span className="task-role-label">{task.role.name}</span></div><span className={`task-status status-${task.status}`}>{task.status.replaceAll('_', ' ')}</span></div><p className="employee-task-description">{task.description}</p><div className="employee-task-dates"><span><small>COMPLETION</small><strong>{formatDate(task.completionDate)}</strong></span><span><small>FINAL REPORT</small><strong>{formatDate(task.reportingDate)}</strong></span></div>
        {task.hasClientInfo && task.client && <div className="employee-client-info"><strong>Client contact</strong><span>{task.client.name}{task.client.company ? ` · ${task.client.company}` : ''}</span>{task.client.email && <a href={`mailto:${task.client.email}`}>{task.client.email}</a>}{task.client.phone && <a href={`tel:${task.client.phone}`}>{task.client.phone}</a>}</div>}
        {task.status === 'available' && <div className="task-action-row"><p>Ready to begin? Start this task to work on it.</p><button className="secondary-button" type="button" disabled={busyTaskId === task.id} onClick={() => updateTask(task, { action: 'start' }, 'Task started. You can submit it for review when your work is ready.')}>{busyTaskId === task.id ? 'Starting…' : 'Start task'}</button></div>}
        {task.status === 'changes_requested' && task.review?.feedback && <div className="review-feedback"><strong>Changes requested by {task.review.reviewerName}</strong><p>{task.review.feedback}</p></div>}
        {task.review?.feedback && task.status !== 'changes_requested' && task.status !== 'submitted_for_review' && <div className="review-feedback"><strong>Administrator feedback</strong><p>{task.review.feedback}</p></div>}
        {['in_progress', 'changes_requested'].includes(task.status) && <form className="employee-submit-form" onSubmit={(event) => submitWork(event, task)}><label htmlFor={`submission-${task.id}`}>Work summary</label><textarea id={`submission-${task.id}`} value={submissionDrafts[task.id] ?? ''} onChange={(event) => setSubmissionDrafts((current) => ({ ...current, [task.id]: event.target.value }))} required minLength="10" maxLength="5000" rows="3" placeholder="Describe what you completed and any details the reviewer should know." /><label htmlFor={`submission-link-${task.id}`}>Deliverable link <span>Optional</span></label><input id={`submission-link-${task.id}`} type="url" value={submissionLinks[task.id] ?? ''} onChange={(event) => setSubmissionLinks((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="https://…" /><button className="primary-button" type="submit" disabled={busyTaskId === task.id}>{busyTaskId === task.id ? 'Submitting…' : task.status === 'changes_requested' ? 'Resubmit for review' : 'Submit for review'}<span>→</span></button></form>}
        {['submitted_for_review', 'completed'].includes(task.status) && task.submission && <div className="submission-summary"><strong>{task.status === 'completed' ? 'Submitted work' : 'Submitted for review'}{task.submission.submittedAt ? ` · ${formatDate(task.submission.submittedAt)}` : ''}</strong><p>{task.submission.summary}</p>{task.submission.link && <a href={task.submission.link} target="_blank" rel="noreferrer">Open deliverable ↗</a>}</div>}
      </article>)}</div> : <div className="empty-state"><div className="empty-art"><span>▤</span><i>✳</i></div><h3>No active tasks right now</h3><p>Pending and in-progress tasks will appear here. Tasks awaiting review or already completed are hidden from this list.</p></div>}
    </article><article className="panel employee-review-panel"><div className="panel-heading"><div><h2>Going for review</h2><p>Tasks you have submitted to your administrator</p></div><span className="count-badge">{countStatus('submitted_for_review')}</span></div><div className="review-drop-zone" data-active={dropTargetActive} onDragOver={(event) => { event.preventDefault(); setDropTargetActive(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDropTargetActive(false); }} onDrop={handleReviewDrop}><span className="review-drop-icon">✧</span><strong>Drop an in-progress task here</strong><small>It will be submitted for review with the work summary you entered.</small></div><div className="review-queue-list">{tasks.filter((task) => task.status === 'submitted_for_review').length ? tasks.filter((task) => task.status === 'submitted_for_review').map((task) => <article className="review-queue-item" key={task.id}><div className="review-queue-heading"><strong>{task.title}</strong><span className="task-status status-submitted_for_review">Awaiting review</span></div><small>{task.submission?.submittedAt ? `Submitted ${formatDate(task.submission.submittedAt)}` : 'Submitted for review'}</small>{task.submission?.summary && <p>{task.submission.summary}</p>}</article>) : <div className="review-queue-empty">No tasks are waiting for review.</div>}</div></article></div>
    <footer>WorkGraph <span>·</span> Office task management</footer>
  </div>;
}
