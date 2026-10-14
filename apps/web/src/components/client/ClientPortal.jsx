import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { signedOut } from '../../store.js';
import { request } from '../../services/api.js';
import BrandLogoIcon from '../common/BrandLogoIcon.jsx';

const statusDetails = {
  available: { label: 'Scheduled', progress: 10 },
  in_progress: { label: 'In progress', progress: 50 },
  submitted_for_review: { label: 'In review', progress: 80 },
  changes_requested: { label: 'Changes in progress', progress: 65 },
  completed: { label: 'Completed', progress: 100 },
  cancelled: { label: 'Cancelled', progress: 0 }
};
const dateLabel = (value) => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`)) : 'Not set';

export default function ClientPortal() {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    request('/api/v1/client/portal/tasks').then(({ tasks: clientTasks }) => { if (active) setTasks(clientTasks); })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function logout() {
    try { await request('/api/v1/auth/logout', { method: 'POST' }); }
    finally { dispatch(signedOut()); navigate('/client/login', { replace: true }); }
  }

  const completed = tasks.filter((task) => task.status === 'completed').length;
  const active = tasks.filter((task) => !['completed', 'cancelled'].includes(task.status)).length;

  return <main className="client-portal-shell"><header className="client-portal-header"><div className="client-portal-brand"><BrandLogoIcon/><span>workgraph <small>CLIENT PORTAL</small></span></div><div className="client-portal-user"><span>{user.fullName}</span><button type="button" onClick={logout}>Log out</button></div></header>
    <section className="client-portal-content"><div className="client-portal-welcome"><div><p className="eyebrow">YOUR WORKGRAPH PROJECTS</p><h1>Hello, {user.fullName.split(' ')[0]}</h1><p>Track the progress of work connected to your client account.</p></div><div className="client-portal-metrics"><span><strong>{tasks.length}</strong><small>Total projects</small></span><span><strong>{active}</strong><small>Active</small></span><span><strong>{completed}</strong><small>Completed</small></span></div></div>
      {error && <p className="form-error" role="alert">Projects could not be loaded: {error}</p>}
      <section className="client-portal-projects"><div className="client-portal-section-heading"><div><h2>Your projects</h2><p>Only work linked to your client account is shown here.</p></div></div>
        {loading ? <div className="client-portal-empty">Loading your projects…</div> : tasks.length ? <div className="client-project-grid">{tasks.map((task) => { const stage = statusDetails[task.status] ?? { label: 'Updated', progress: 0 }; return <article className="client-project-card" key={task.id}><div className="client-project-title-row"><div><p className="eyebrow">WORKGRAPH PROJECT</p><h3>{task.title}</h3></div><span className={`client-project-status client-status-${task.status}`}>{stage.label}</span></div><p className="client-project-description">{task.description}</p><div className="client-progress-label"><span>Progress</span><strong>{stage.label}</strong></div><div className="client-progress-track" role="progressbar" aria-label={`${task.title} progress`} aria-valuenow={stage.progress} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${stage.progress}%` }}/></div><div className="client-project-dates"><span><small>COMPLETION DATE</small><strong>{dateLabel(task.completionDate)}</strong></span><span><small>FINAL REPORT DATE</small><strong>{dateLabel(task.reportingDate)}</strong></span></div>{task.workSummary && <div className="client-work-update"><strong>Latest work update</strong><p>{task.workSummary}</p>{task.submittedAt && <small>Submitted {dateLabel(new Date(task.submittedAt).toISOString())}</small>}</div>}</article>; })}</div> : <div className="client-portal-empty"><span className="widget-empty-icon">✦</span><strong>No projects linked yet</strong><p>Your WorkGraph contact will connect projects to your client account. They will appear here when ready.</p></div>}
      </section>
    </section><footer className="client-portal-footer">WorkGraph <span>·</span> Private client workspace</footer>
  </main>;
}
