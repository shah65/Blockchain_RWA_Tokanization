import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";

// Keep this in sync with the helper in App.jsx
function homeRouteFor(profile) {
  if (!profile) return "/";
  if (profile.is_admin || profile.role === "admin") return "/admin";
  if (!profile.full_name || !profile.full_name.trim()) return "/complete-profile";
  if (profile.role === "business_owner") return "/owner";
  if (profile.role === "investor") return "/investor";
  return "/";
}

export default function ProtectedRoute({ allowedRole, requireAdmin, children }) {
  const { profile, isAuthenticated, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) return <Spinner label="Loading session..." />;
  if (!isAuthenticated || !profile) return <Navigate to="/" replace />;

  const isAdmin = Boolean(profile.is_admin || profile.role === "admin");

  // --- Admin-only routes --------------------------------------------------
  if (requireAdmin) {
    return isAdmin ? children : <Navigate to={homeRouteFor(profile)} replace />;
  }

  // --- Admin preview mode: admin may open any role's page -----------------
  if (isAdmin) return children;

  // --- Force profile completion for non-admins ----------------------------
  const profileComplete = Boolean(profile.full_name && profile.full_name.trim());
  if (!profileComplete) {
    return (
      <Navigate
        to="/complete-profile"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // --- Enforce the allowed role -------------------------------------------
  if (allowedRole && profile.role !== allowedRole) {
    return <Navigate to={homeRouteFor(profile)} replace />;
  }

  return children;
}