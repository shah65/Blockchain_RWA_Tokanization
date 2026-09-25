// ============================================================================
// src/pages/admin/AdminDashboard.jsx
// ============================================================================
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

function Icon({ name, size = 22 }) {
  const p = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.8,
    strokeLinecap: "round", strokeLinejoin: "round",
  };
  switch (name) {
    case "shield":
      return <svg {...p}><path d="M12 3 4 6v6c0 4.5 3.4 8.6 8 9 4.6-.4 8-4.5 8-9V6l-8-3Z" /></svg>;
    case "inbox":
      return <svg {...p}><path d="M4 13h4l2 3h4l2-3h4M4 13V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7M4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" /></svg>;
    case "lock":
      return <svg {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
    case "eye":
      return <svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
    case "store":
      return <svg {...p}><path d="M3 9 5 4h14l2 5M3 9v10h18V9M3 9h18M9 13a3 3 0 0 0 6 0" /></svg>;
    case "chart":
      return <svg {...p}><path d="M3 20h18M6 20V10M11 20V4M16 20v-7M21 20v-4" /></svg>;
    case "arrow":
      return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    default:
      return null;
  }
}

export default function AdminDashboard() {
  const { profile } = useAuth();

  const { data: pending } = useQuery({
    queryKey: ["kyc-pending-count"],
    queryFn: () => api.get("/admin/kyc/pending").then((r) => r.data.pending || []),
    refetchInterval: 30_000,
  });

  const pendingCount = pending?.length ?? 0;

  return (
    <div className="kyc-shell" style={{ maxWidth: 1100 }}>
      <div className="kyc-header">
        <div>
          <span className="kyc-eyebrow">Super-admin</span>
          <h1 className="kyc-title">Admin dashboard</h1>
          <p className="kyc-sub">
            Identity reviews, fraud controls, and preview of user-facing views.
          </p>
        </div>
        <span
          className="kyc-eyebrow"
          style={{ alignSelf: "flex-start", color: "#fca5a5" }}
        >
          {profile?.wallet_address?.slice(0, 6)}…
          {profile?.wallet_address?.slice(-4)}
        </span>
      </div>

      <div className="admin-cards">
        <Link to="/admin/kyc" className="admin-card">
          <div className="admin-card-icon admin-card-icon-crimson">
            <Icon name="inbox" />
          </div>
          <div>
            <h3>KYC review queue</h3>
            <p>Approve or reject submitted identity verifications.</p>
          </div>
          <div className="admin-card-badge">
            {pendingCount}
            <small>pending</small>
          </div>
        </Link>

        <Link to="/admin/frozen" className="admin-card">
          <div className="admin-card-icon admin-card-icon-amber">
            <Icon name="lock" />
          </div>
          <div>
            <h3>Frozen accounts</h3>
            <p>Manage accounts blocked for suspected fraud.</p>
          </div>
          <Icon name="arrow" size={16} />
        </Link>

        <Link to="/owner" className="admin-card">
          <div className="admin-card-icon admin-card-icon-violet">
            <Icon name="store" />
          </div>
          <div>
            <h3>View as Business Owner</h3>
            <p>Preview the owner-facing dashboard and tools.</p>
          </div>
          <Icon name="eye" size={16} />
        </Link>

        <Link to="/investor" className="admin-card">
          <div className="admin-card-icon admin-card-icon-cyan">
            <Icon name="chart" />
          </div>
          <div>
            <h3>View as Investor</h3>
            <p>Preview the marketplace and portfolio experience.</p>
          </div>
          <Icon name="eye" size={16} />
        </Link>
      </div>
    </div>
  );
}