import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRole, requireAdmin,children }) {
  const { profile } = useAuth();
  const location = useLocation();

  // Not signed in → back to role select.
  if (!profile) return <Navigate to="/" replace />;

  // Signed in but profile metadata is incomplete → force the form.
  const profileComplete = Boolean(
    profile.full_name && profile.full_name.trim()
  );
  if (!profileComplete) {
    return (
      <Navigate
        to="/complete-profile"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // Admins can see any role's UI (view-as / preview mode)
  if (
    allowedRole &&
    !profile.is_admin &&
    profile.role !== allowedRole
  ) {
    return (
      <Navigate
        to={profile.role === "business_owner" ? "/owner" : "/investor"}
        replace
      />
    );
  }

  // ✅ Non-admins get bounced away from admin-only routes
  if (requireAdmin && !profile.is_admin) {
    return <Navigate to="/" replace />;
  }

  return children;
}