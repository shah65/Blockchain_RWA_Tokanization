// ============================================================================
// src/pages/owner/OwnerDashboard.jsx
// Lists the businesses this owner has created (off-chain data from Supabase,
// via GET /api/businesses/mine) with quick links to manage each one.
// ============================================================================
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../config/api";
import Spinner from "../../components/Spinner";
import toast from "react-hot-toast";
export default function OwnerDashboard() {
  const [businesses, setBusinesses] = useState(null);
  useEffect(() => {
    api
      .get("/businesses/mine")
      .then(({ data }) => setBusinesses(data.businesses))
      .catch(() => toast.error("Could not load your businesses."));
  }, []);
  if (businesses === null) return <Spinner label="Loading your businesses..." />;
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Your Businesses</h1>
        <Link className="primary-button" to="/owner/create-business">
          + New Business
        </Link>
      </div>
      {businesses.length === 0 ? (
        <p className="empty-state">
          You haven't created a business yet. Click "New Business" to tokenize
          your first one.
        </p>
      ) : (
        <div className="business-grid">
          {businesses.map((b) => (
            <div className="business-card" key={b.onchain_pubkey}>
              {b.cover_image_url && <img src={b.cover_image_url} alt={b.name} />}
              <h3>{b.name}</h3>
              <p>{b.description}</p>
              <div className="business-stats">
                <span>{b.total_tokens} total tokens</span>
                <span>${(b.price_per_token / 1_000_000).toFixed(2)} / token</span>
              </div>
              <Link to={`/owner/deposit-profit/${b.onchain_pubkey}`} className="secondary-button">
                Deposit Monthly Profit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}