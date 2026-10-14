import { useCallback, useEffect, useState } from 'react';
import { request } from '../../../services/api.js';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [workTypesText, setWorkTypesText] = useState('');
  const [portalEnabled, setPortalEnabled] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadClients = useCallback(async () => {
    const { clients: records } = await request('/api/v1/clients');
    setClients(records);
  }, []);

  useEffect(() => {
    let active = true;
    request('/api/v1/clients').then(({ clients: records }) => { if (active) setClients(records); })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(''); setNotice(''); setCredentials(null); setSaving(true);
    const submittedPassword = password;
    try {
      const { client } = await request('/api/v1/clients', {
        method: 'POST',
        body: JSON.stringify({
          name,
          company,
          workTypes: workTypesText.split(',').map((item) => item.trim()).filter(Boolean),
          portalEnabled,
          loginId: portalEnabled ? loginId : '',
          password: portalEnabled ? password : ''
        })
      });
      setName(''); setCompany(''); setWorkTypesText(''); setPortalEnabled(false); setLoginId(''); setPassword('');
      setNotice(`${client.name} was added to your client directory.`);
      if (client.portalEnabled) setCredentials({ loginId: client.loginId, password: submittedPassword, clientName: client.name });
      await loadClients();
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }

  return <div className="content dashboard-content clients-page">
    <div className="welcome"><div><p className="eyebrow">ADMIN WORKSPACE</p><h1>Clients</h1><p className="subtitle">Manage client services, link work, and give clients a private progress portal.</p></div><div className="date-chip"><span className="date-icon">♧</span><span><small>CLIENTS</small><strong>{clients.length} registered</strong></span></div></div>
    {error && <p className="form-error page-error" role="alert">{error}</p>}
    {notice && <p className="notice-banner" role="status">✓ {notice}</p>}
    {credentials && <section className="client-credentials-banner"><div><strong>Client portal credentials for {credentials.clientName}</strong><p>Share these with the client. The password is shown only for this session.</p></div><div className="client-credential-values"><span>Login ID <strong>{credentials.loginId}</strong></span><span>Password <strong>{credentials.password}</strong></span></div><button type="button" aria-label="Dismiss credentials" onClick={() => setCredentials(null)}>×</button></section>}
    <section className="panel client-create-panel"><div className="panel-heading"><div><h2>Add a client</h2><p>Create a client record and optionally provision portal access.</p></div><span className="count-badge">NEW</span></div>
      <form className="client-create-form" onSubmit={handleSubmit}><div className="client-create-grid">
        <label className="client-field"><span>Client name</span><input value={name} onChange={(event) => setName(event.target.value)} minLength="2" maxLength="120" required placeholder="Client or contact name"/></label>
        <label className="client-field"><span>Company <small>Optional</small></span><input value={company} onChange={(event) => setCompany(event.target.value)} maxLength="120" placeholder="Company or organization"/></label>
        <label className="client-field client-field-wide"><span>Work types / services <small>Separate multiple items with commas</small></span><textarea value={workTypesText} onChange={(event) => setWorkTypesText(event.target.value)} maxLength="2400" rows="3" placeholder="Social media, print design, branding, video editing"/></label>
      </div>
      <label className="client-portal-toggle" htmlFor="clientPortalEnabled"><span><strong>Enable client portal</strong><small>Let this client sign in to view progress on tasks linked to their record.</small></span><span className="switch-control"><input id="clientPortalEnabled" type="checkbox" checked={portalEnabled} onChange={(event) => setPortalEnabled(event.target.checked)}/><i/></span></label>
      {portalEnabled && <div className="client-portal-fields"><label className="client-field"><span>Client login ID</span><input value={loginId} onChange={(event) => setLoginId(event.target.value)} minLength="3" maxLength="100" required autoComplete="off" placeholder="Create a unique login ID"/></label><label className="client-field"><span>Temporary password <small>At least 8 characters</small></span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength="8" maxLength="200" required autoComplete="new-password" placeholder="Create a temporary password"/></label><p className="client-security-note">Passwords are securely hashed before storage. The client can use the Client portal sign-in link on the login page.</p></div>}
      <div className="client-form-actions"><span>Clients without portal access can still be linked to tasks for internal tracking.</span><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Adding client…' : 'Add client'}<span>→</span></button></div></form>
    </section>
    <section className="panel client-directory-panel"><div className="panel-heading"><div><h2>Client directory</h2><p>Choose a client when creating a task to make it visible in their portal.</p></div><span className="count-badge">{clients.length}</span></div>
      {loading ? <div className="client-directory-empty">Loading clients…</div> : clients.length ? <div className="client-directory-list">{clients.map((client) => <article className="client-directory-card" key={client.id}><div className="client-directory-avatar">{client.name.slice(0, 1).toUpperCase()}</div><div className="client-directory-main"><h3>{client.name}</h3><p>{client.company || 'Independent client'}</p>{client.workTypes.length > 0 && <div className="client-work-types">{client.workTypes.map((type) => <span key={type}>{type}</span>)}</div>}</div><div className={`client-portal-status${client.portalEnabled ? ' enabled' : ''}`}><i/>{client.portalEnabled ? 'Portal enabled' : 'Portal off'}{client.portalEnabled && <small>{client.loginId}</small>}</div></article>)}</div> : <div className="client-directory-empty"><strong>No clients yet</strong><span>Add a client above to start linking work.</span></div>}
    </section>
  </div>;
}
