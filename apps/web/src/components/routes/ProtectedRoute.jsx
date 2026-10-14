import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute({
  children,
  adminOnly = false,
  employeeOnly = false,
  clientOnly = false,
  nonClientOnly = false,
}) {
  const { user, status } = useSelector((state) => state.auth);
  if (status === "loading")
    return (
      <div className="app-loading">
        <span className="loading-mark">W</span>
        <span>Preparing your workspace…</span>
      </div>
    );
  if (!user) return <Navigate to={clientOnly ? "/client/login" : "/login"} replace />;
  if (adminOnly && user.accountRole !== "admin")
    return <Navigate to="/dashboard" replace />;
  if (employeeOnly && user.accountRole === "admin")
    return <Navigate to="/dashboard" replace />;
  if (clientOnly && user.accountRole !== "client")
    return <Navigate to="/dashboard" replace />;
  if (nonClientOnly && user.accountRole === "client")
    return <Navigate to="/client/portal" replace />;
  return children;
}
