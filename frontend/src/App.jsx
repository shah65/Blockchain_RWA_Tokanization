// ============================================================================
// src/App.jsx
// Top-level routing. Role-based access is enforced here via ProtectedRoute —
// an investor can never render an owner page component and vice versa, even
// if they type the URL directly.
// ============================================================================
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleSelectScreen from "./components/RoleSelectionScreen";
import ProfileForm from "./components/ProfileForm";
import Navbar from "./components/ProfileForm";
import Spinner from "./components/Spinner";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import CreateBusinessPage from "./pages/owner/CreateBusinessPage";
import DepositProfitPage from "./pages/owner/DepositProfitPage";
import InvestorDashboard from "./pages/investor/InvestorDashboard";
import MarketplacePage from "./pages/investor/MarketPlacePage";
import PortfolioPage from "./pages/investor/PortfolioPage";
export default function App() {
  const { connected, profile, isReady } = useAuth();
  if (!isReady) return <Spinner label="Loading session..." />;
  return (
    <div className="app-shell">
      {connected && profile && <Navbar />}
      <main className="app-main"><Routes>
        {/* First-time / logged-out entry point: two-button role choice */}
        <Route
          path="/"
          element={
            !connected || !profile ? (
              <RoleSelectScreen />
            ) : (
              <Navigate to={profile.role === "business_owner" ? "/owner" : "/investor"} replace />
            )
          }
        />
        {/* Metadata/KYC form — shown once, right after role is chosen */}
        <Route path="/complete-profile" element={<ProfileForm />} />
        {/* --- Business owner area --- */}
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
          path="/owner/deposit-profit/:businessPubkey"
          element={
            <ProtectedRoute allowedRole="business_owner">
              <DepositProfitPage />
            </ProtectedRoute>
          }
        />
        {/* --- Investor area --- */}
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