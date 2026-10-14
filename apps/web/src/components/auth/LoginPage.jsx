import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { sessionLoaded } from "../../store.js";
import { request } from "../../services/api.js";
import BrandLogoIcon from "../common/BrandLogoIcon.jsx";

export default function LoginPage({ clientPortal = false }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { user } = await request("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ loginId, password }),
      });
      dispatch(sessionLoaded(user));
      navigate(user.accountRole === "client" ? "/client/portal" : "/dashboard", { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-art" aria-label="WorkGraph workspace">
        <div className="login-brand">
          <BrandLogoIcon />
          <span>workgraph</span>
        </div>
        <div className="art-copy">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-card">
            <span className="art-card-icon">✦</span>
            <span className="art-card-label">TEAM WORKSPACE</span>
            <strong>
              Great work
              <br />
              happens together.
            </strong>
            <div className="art-avatars">
              <i>J</i>
              <i>M</i>
              <i>A</i>
              <b>+8</b>
            </div>
          </div>
          <div className="floating-dot dot-a" />
          <div className="floating-dot dot-b" />
        </div>
        <div className="art-caption">
          <span className="caption-line" />A little more organized. A lot more
          in sync.
        </div>
      </section>
      <section className="login-side">
        <div className="login-card-wrap">
          <p className="login-kicker">{clientPortal ? "CLIENT PORTAL" : "WELCOME BACK"}</p>
          <h1>
            {clientPortal ? "Sign in to the client" : "Sign in to your"}
            <br />
            <span>{clientPortal ? "portal." : "workspace."}</span>
          </h1>
          <p className="login-description">
            {clientPortal ? "Use the client portal login provided by your WorkGraph contact." : "Use the login ID provided by your WorkGraph administrator."}
          </p>
          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="loginId">Login ID</label>
            <div className="input-wrap">
              <span className="input-icon">◎</span>
              <input
                autoComplete="username"
                autoFocus
                id="loginId"
                name="loginId"
                placeholder="Enter your login ID"
                value={loginId}
                onChange={(event) => setLoginId(event.target.value)}
                required
              />
            </div>
            <label htmlFor="password">Password</label>
            <div className="input-wrap">
              <span className="input-icon">⌑</span>
              <input
                autoComplete="current-password"
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="login-form-links">
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="sign-in-button" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
              <span>→</span>
            </button>
          </form>
          <p className="no-signup">
            <span className="lock-mark">▣</span>Accounts are created by your
            administrator. There is no public sign up.
          </p>
          <p className="client-login-switch">{clientPortal ? "WorkGraph team member?" : "A client?"} <Link to={clientPortal ? "/login" : "/client/login"}>{clientPortal ? "Team sign in" : "Client portal sign in"}</Link></p>
        </div>
        <div className="login-footer">
          <span>© WorkGraph</span>
          <span>Private team workspace</span>
        </div>
      </section>
    </main>
  );
}
