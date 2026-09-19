// ============================================================================
// src/App.jsx
// ============================================================================
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleSelectScreen from "./components/RoleSelectionScreen";
import ProfileForm from "./components/ProfileForm";
import Navbar from "./components/Navbar";
import Spinner from "./components/Spinner";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import CreateBusinessPage from "./pages/owner/CreateBusinessPage";
import DepositProfitPage from "./pages/owner/DepositProfitPage";
import InvestorsPage from "./pages/owner/InvestersPage";
import InvestorDashboard from "./pages/investor/InvestorDashboard";
import MarketplacePage from "./pages/investor/MarketPlacePage";
import PortfolioPage from "./pages/investor/PortfolioPage";
import DepositsHistoryPage from "./pages/investor/DepositsHistoryPage";

export default function App() {
  const { profile, isReady } = useAuth();

  if (!isReady) return <Spinner label="Loading session..." />;

  return (
    <div className="app-shell">
      {profile && <Navbar />}
      <main className="app-main">
        <Routes>
          {/* ---------- Public entry ---------- */}
          <Route
            path="/"
            element={
              !profile ? (
                <RoleSelectScreen />
              ) : !profile.full_name ? (
                <Navigate to="/complete-profile" replace />
              ) : (
                <Navigate
                  to={profile.role === "business_owner" ? "/owner" : "/investor"}
                  replace
                />
              )
            }
          />

          {/* Profile completion — requires a session, but not a role yet */}
          <Route
            path="/complete-profile"
            element={profile ? <ProfileForm /> : <Navigate to="/" replace />}
          />

          {/* ---------- Business owner ---------- */}
          <Route
            path="/owner"
            element={
              <ProtectedRoute allowedRole="business_owner">
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/create-business"
            element={
              <ProtectedRoute allowedRole="business_owner">
                <CreateBusinessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/investors"
            element={
              <ProtectedRoute allowedRole="business_owner">
                <InvestorsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/deposit-profit/:businessPubkey"
            element={
              <ProtectedRoute allowedRole="business_owner">
                <DepositProfitPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/owner/deposits"
            element={
              <ProtectedRoute allowedRole="business_owner">
                <DepositsHistoryPage />
              </ProtectedRoute>
            }
          />

          {/* ---------- Investor ---------- */}
          <Route
            path="/investor"
            element={
              <ProtectedRoute allowedRole="investor">
                <InvestorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/investor/marketplace"
            element={
              <ProtectedRoute allowedRole="investor">
                <MarketplacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/investor/portfolio"
            element={
              <ProtectedRoute allowedRole="investor">
                <PortfolioPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}