// ============================================================================
// src/pages/investor/InvestorDashboard.jsx
// Quick-glance summary: total invested, total tokens, links to marketplace
// and full portfolio. Kept intentionally light — the heavy views live in
// MarketplacePage and PortfolioPage.
// ============================================================================
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../config/api";
import Spinner from "../../components/Spinner";
import toast from "react-hot-toast";
export default function InvestorDashboard() {
  const [portfolio, setPortfolio] = useState(null);
  useEffect(() => {
    api
      .get("/investments/portfolio")
      .then(({ data }) => setPortfolio(data.portfolio))
      .catch(() => toast.error("Could not load your portfolio."));
  }, []);
  if (portfolio === null) return <Spinner label="Loading your portfolio..." />;
  const totalInvested = portfolio.reduce((sum, p) => sum + Number(p.total_invested), 0) / 1_000_000;
  return (
    <div className="dashboard">
      <h1>Investor Dashboard</h1>
      <div className="summary-cards">
        <div className="summary-card">
          <span className="summary-label">Businesses invested in</span>
          <span className="summary-value">{portfolio.length}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Total invested</span>
          <span className="summary-value">${totalInvested.toFixed(2)}</span>
        </div>
      </div>
      <div className="dashboard-links">
        <Link className="primary-button" to="/investor/marketplace">
          Browse Businesses
        </Link>
        <Link className="secondary-button" to="/investor/portfolio">
          View Full Portfolio & Profit History
        </Link>
      </div>
    </div>
  );
}