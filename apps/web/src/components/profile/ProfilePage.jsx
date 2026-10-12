import { Link } from 'react-router-dom';

export default function ProfilePage({ user, displayRole }) {
  const initials = user.fullName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const roles = user.accountRole === 'admin' ? ['Administrator'] : user.roles.map((role) => role.name);

  return <div className="content dashboard-content profile-page">
    <div className="welcome"><div><p className="eyebrow">YOUR ACCOUNT</p><h1>Profile</h1><p className="subtitle">Your WorkGraph account details and workspace access.</p></div><div className="date-chip"><span className="date-icon">♙</span><span><small>ACCOUNT TYPE</small><strong>{displayRole}</strong></span></div></div>
    <article className="panel profile-card">
      <div className="profile-card-heading"><span className="profile-card-avatar">{initials}</span><div><h2>{user.fullName}</h2><p>{user.accountRole === 'admin' ? 'Administrator account' : 'Employee account'}</p></div><span className="profile-status"><i /> Active</span></div>
      <div className="profile-details">
        <div><span>Full name</span><strong>{user.fullName}</strong></div>
        <div><span>Login ID</span><strong>{user.loginId}</strong></div>
        <div><span>Account type</span><strong>{user.accountRole === 'admin' ? 'Administrator' : 'Employee'}</strong></div>
        <div><span>Job roles</span><strong>{roles.length ? roles.join(', ') : 'No job role assigned'}</strong></div>
      </div>
      <div className="profile-card-footer"><p>For a name, login ID, or role change, contact your WorkGraph administrator.</p><Link to="/dashboard">Back to dashboard <span>→</span></Link></div>
    </article>
    <footer>WorkGraph <span>·</span> Account profile</footer>
  </div>;
}
