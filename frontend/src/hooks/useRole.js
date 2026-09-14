import { useAuthContext } from "../context/AuthContext.jsx";
export function useRole() {
  const { profile } = useAuthContext();
  const role = profile?.role || null;
  return {
    role,
    isInvestor: role === "investor",
    isOwner: role === "business_owner",
    hasRole: !!role,
  };
}