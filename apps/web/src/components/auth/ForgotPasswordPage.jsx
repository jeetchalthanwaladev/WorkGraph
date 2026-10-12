import { useState } from 'react';
import { Link } from 'react-router-dom';
import { request } from '../../services/api.js';

export default function ForgotPasswordPage() {
  const [loginId, setLoginId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      await request('/api/v1/auth/password-reset-requests', { method: 'POST', body: JSON.stringify({ loginId }) });
      setSubmitted(true);
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  return <main className="login-shell">
    <section className="login-art" aria-label="WorkGraph workspace"><div className="login-brand"><span className="brand-mark">W</span><span>workgraph</span></div><div className="art-copy"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-card"><span className="art-card-icon">⌑</span><span className="art-card-label">ACCOUNT ACCESS</span><strong>Let’s get you<br />back to work.</strong></div><div className="floating-dot dot-a" /><div className="floating-dot dot-b" /></div><div className="art-caption"><span className="caption-line" />A little more organized. A lot more in sync.</div></section>
    <section className="login-side"><div className="login-card-wrap">
      <p className="login-kicker">PASSWORD HELP</p><h1>Forgot your<br /><span>password?</span></h1>
      {submitted ? <div className="reset-confirmation" role="status"><strong>Request received</strong><p>If an active account matches that login ID, your administrator can review the reset request in Team &amp; roles.</p><p>Contact your administrator to receive a new password after they approve the request.</p></div> : <>
        <p className="login-description">Enter your login ID to send a password reset request to your WorkGraph administrator.</p>
        <form className="login-form" onSubmit={handleSubmit}><label htmlFor="resetLoginId">Login ID</label><div className="input-wrap"><span className="input-icon">◎</span><input autoComplete="username" autoFocus id="resetLoginId" value={loginId} onChange={(event) => setLoginId(event.target.value)} required /></div>
          {error && <p className="form-error" role="alert">{error}</p>}<button className="sign-in-button" type="submit" disabled={busy}>{busy ? 'Sending request…' : 'Request password reset'}<span>→</span></button>
        </form>
      </>}
      <Link className="back-to-login" to="/login">← Back to sign in</Link>
    </div><div className="login-footer"><span>© WorkGraph</span><span>Private team workspace</span></div></section>
  </main>;
}
