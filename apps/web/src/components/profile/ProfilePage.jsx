import { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { request } from "../../services/api.js";
import { sessionLoaded } from "../../store.js";

export default function ProfilePage({ user, displayRole }) {
  const dispatch = useDispatch();
  const [fullName, setFullName] = useState(user.fullName);
  const [loginId, setLoginId] = useState(user.loginId);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const initials = user.fullName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const roles =
    user.accountRole === "admin"
      ? ["Administrator"]
      : user.roles.map((role) => role.name);

  async function saveProfile(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const { user: updatedUser } = await request("/api/v1/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ fullName, loginId }),
      });
      dispatch(sessionLoaded(updatedUser));
      setNotice("Your profile details have been updated.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await request("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("Your password has been changed.");
    } catch (passwordError) {
      setError(passwordError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="content dashboard-content profile-page">
      <div className="welcome">
        <div>
          <p className="eyebrow">YOUR ACCOUNT</p>
          <h1>Profile</h1>
          <p className="subtitle">Update your account details and password.</p>
        </div>
        <div className="date-chip">
          <span className="date-icon">♙</span>
          <span>
            <small>ACCOUNT TYPE</small>
            <strong>{displayRole}</strong>
          </span>
        </div>
      </div>
      {notice && (
        <p className="notice-banner" role="status">
          ✓ {notice}
        </p>
      )}
      {error && (
        <p className="form-error page-error" role="alert">
          {error}
        </p>
      )}
      <article className="panel profile-card">
        <div className="profile-card-heading">
          <span className="profile-card-avatar">{initials}</span>
          <div>
            <h2>{user.fullName}</h2>
            <p>
              {user.accountRole === "admin"
                ? "Administrator account"
                : "Employee account"}
            </p>
          </div>
          <span className="profile-status">
            <i /> Active
          </span>
        </div>
        <form className="profile-edit-form" onSubmit={saveProfile}>
          <div className="profile-form-heading">
            <h3>Profile details</h3>
            <p>Your job roles are managed by your administrator.</p>
          </div>
          <div className="profile-edit-grid">
            <label>
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                minLength="2"
                maxLength="100"
                autoComplete="name"
              />
            </label>
            <label>
              Login ID
              <input
                value={loginId}
                onChange={(event) => setLoginId(event.target.value)}
                required
                minLength="3"
                maxLength="100"
                autoComplete="username"
              />
            </label>
            <label>
              Account type
              <input
                value={
                  user.accountRole === "admin" ? "Administrator" : "Employee"
                }
                disabled
              />
            </label>
            <label>
              Job roles
              <input
                value={roles.join(", ") || "No job role assigned"}
                disabled
              />
            </label>
          </div>
          <div className="profile-form-actions">
            <span>Changing your login ID updates how you sign in.</span>
            <button className="primary-button" disabled={busy}>
              Save profile
            </button>
          </div>
        </form>
        <form
          className="profile-edit-form password-edit-form"
          onSubmit={changePassword}
        >
          <div className="profile-form-heading">
            <h3>Change password</h3>
            <p>
              Use at least 8 characters. Other signed-in sessions will be ended.
            </p>
          </div>
          <div className="profile-edit-grid password-grid">
            <label>
              Current password
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <label>
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength="8"
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength="8"
                autoComplete="new-password"
              />
            </label>
          </div>
          <div className="profile-form-actions">
            <span>
              Forgot your password?{" "}
              <Link to="/forgot-password">Request a reset</Link>
            </span>
            <button className="secondary-button" type="submit" disabled={busy}>
              Change password
            </button>
          </div>
        </form>
      </article>
      <div className="profile-card-footer">
        <p>Need a role change? Contact your WorkGraph administrator.</p>
        <Link to="/dashboard">
          Back to dashboard <span>→</span>
        </Link>
      </div>
      <footer>
        WorkGraph <span>·</span> Account profile
      </footer>
    </div>
  );
}
