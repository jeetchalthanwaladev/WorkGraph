import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';

function Home() {
  const [apiStatus, setApiStatus] = useState('Checking connection…');

  useEffect(() => {
    let active = true;
    fetch('/api/v1/health')
      .then((response) => {
        if (!response.ok) throw new Error('API unavailable');
        return response.json();
      })
      .then(() => active && setApiStatus('API connected'))
      .catch(() => active && setApiStatus('API not connected'));
    return () => { active = false; };
  }, []);

  return (
    <main className="shell">
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="WorkGraph home"><span className="brand-mark">W</span><span>workgraph</span></Link>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          <a className="nav-item active" href="#overview"><span>◫</span> Overview</a>
          <a className="nav-item" href="#tasks"><span>▤</span> Tasks</a>
          <a className="nav-item" href="#team"><span>♙</span> Team</a>
        </nav>
        <div className="sidebar-bottom"><span className="avatar">WN</span><span><strong>Workspace</strong><small>Getting started</small></span><span className="dots">···</span></div>
      </aside>
      <section className="main-panel">
        <header className="topbar"><span className="crumb">Workspace <span>/</span> Overview</span><div className="top-actions"><span className="connection"><i />{apiStatus}</span><button className="icon-button" aria-label="Notifications">♧</button><span className="profile">A</span></div></header>
        <div className="content" id="overview">
          <div className="welcome"><div><p className="eyebrow">YOUR OFFICE, IN SYNC</p><h1>Welcome to WorkGraph</h1><p className="subtitle">Your team’s work has a home. The workspace foundation is ready for the next build steps.</p></div><div className="date-chip"><span className="date-icon">▦</span><span><small>WORKSPACE</small><strong>Getting started</strong></span></div></div>
          <div className="stats-grid">
            <article className="stat-card"><div className="stat-icon purple">▤</div><span className="stat-label">TOTAL TASKS</span><strong className="stat-value">—</strong><span className="stat-note">Tasks will appear here</span></article>
            <article className="stat-card"><div className="stat-icon blue">◷</div><span className="stat-label">IN PROGRESS</span><strong className="stat-value">—</strong><span className="stat-note">Work underway</span></article>
            <article className="stat-card"><div className="stat-icon amber">✳</div><span className="stat-label">AWAITING REVIEW</span><strong className="stat-value">—</strong><span className="stat-note">Submitted for approval</span></article>
            <article className="stat-card"><div className="stat-icon green">✓</div><span className="stat-label">COMPLETED</span><strong className="stat-value">—</strong><span className="stat-note">Finished work</span></article>
          </div>
          <div className="panels"><article className="panel tasks-panel" id="tasks"><div className="panel-heading"><div><h2>Recent tasks</h2><p>Your latest workspace activity</p></div><button className="text-button" disabled>View all <span>→</span></button></div><div className="empty-state"><div className="empty-art"><span>▤</span><i>✳</i></div><h3>Your task list is taking shape</h3><p>Once tasks are assigned, you’ll find your team’s priorities and progress here.</p></div></article><article className="panel team-panel" id="team"><div className="panel-heading"><div><h2>Workspace setup</h2><p>Core services at a glance</p></div><span className="setup-badge">IN PROGRESS</span></div><div className="setup-list"><div><span className="check done">✓</span><span><strong>Web application</strong><small>React workspace is ready</small></span><span className="setup-state">Ready</span></div><div><span className="check done">✓</span><span><strong>REST API</strong><small>{apiStatus}</small></span><span className="setup-state">Ready</span></div><div><span className="check done">✓</span><span><strong>MongoDB collections</strong><small>Initial collections and indexes are ready</small></span><span className="setup-state">Ready</span></div></div></article></div>
          <footer>WorkGraph <span>·</span> Office task management</footer>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  return <Routes><Route path="*" element={<Home />} /></Routes>;
}
