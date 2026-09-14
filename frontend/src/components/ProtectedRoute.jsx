// ============================================================================
// src/components/ProtectedRoute.jsx
// Blocks a route until the user has the required role.
// ============================================================================
import { Navigate } from "react-router-dom";
import { useRole } from "../hooks/useRole.js";

export default function ProtectedRoute({ allowedRole, children }) {
  const { role, hasRole } = useRole();

  // No profile / no role yet → back to role selection.
  if (!hasRole) return <Navigate to="/" replace />;

  // Wrong role → send them to their own dashboard.
  if (role !== allowedRole) {
    return (
      <Navigate
        to={role === "business_owner" ? "/owner" : "/investor"}
        replace
      />
    );
  }

  return children;
}