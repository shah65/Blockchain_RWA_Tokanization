// ============================================================================
// src/components/ProtectedRoute.jsx
// Blocks a route until:
//   1. the user is signed in, AND
//   2. their profile is complete, AND
//   3. their role matches allowedRole.
// ============================================================================
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRole, children }) {
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

  // Wrong role → send to their own dashboard.
  if (profile.role !== allowedRole) {
    return (
      <Navigate
        to={profile.role === "business_owner" ? "/owner" : "/investor"}
        replace
      />
    );
  }

  return children;
}