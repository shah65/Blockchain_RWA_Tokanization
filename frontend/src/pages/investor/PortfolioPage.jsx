// ============================================================================
// src/pages/investor/PortfolioPage.jsx
// Shows what the investor holds (from investments_cache) and their
// month-by-month profit history (from profit_history_cache) — "how much
// did I earn in January, February, etc."
// ============================================================================
import { useEffect, useState } from "react";
import { api } from "../../config/api";
import Spinner from "../../components/Spinner";
import toast from "react-hot-toast";
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState(null);
  const [history, setHistory] = useState(null);
  useEffect(() => {
    Promise.all([api.get("/investments/portfolio"), api.get("/investments/profit-history")])
      .then(([portfolioRes, historyRes]) => {
        setPortfolio(portfolioRes.data.portfolio);
        setHistory(historyRes.data.history);
      })
      .catch(() => toast.error("Could not load portfolio data."));
  }, []);
  if (portfolio === null || history === null) return <Spinner label="Loading portfolio..." />;
  return (
    <div className="portfolio-page">
      <h1>Your Portfolio</h1>
      <section>
        <h2>Holdings</h2>
        {portfolio.length === 0 ? (
          <p className="empty-state">You haven't invested in any businesses yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Tokens owned</th>
                <th>Total invested</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((p) => (
                <tr key={p.onchain_pubkey}>
                  <td>{p.businesses?.name || p.business_pubkey}</td>
                  <td>{p.tokens_owned}</td>
                  <td>${(p.total_invested / 1_000_000).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section>
        <h2>Profit History</h2>
        {history.length === 0 ? (
          <p className="empty-state">No profit claimed yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Amount claimed</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={`${h.business_pubkey}-${h.year}-${h.month}`}>
                  <td>
                    {MONTH_NAMES[h.month - 1]} {h.year}
                  </td>
                  <td>${(h.amount_claimed / 1_000_000).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}