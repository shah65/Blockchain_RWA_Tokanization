import { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "../../config/api";
import ClaimableProfit from "../../components/ClaimedProfit";

import toast from "react-hot-toast";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function Icon({ name, size = 18 }) {
  const p = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.8,
    strokeLinecap: "round", strokeLinejoin: "round",
  };
  switch (name) {
    case "briefcase":
      return <svg {...p}><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" /></svg>;
    case "coins":
      return <svg {...p}><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></svg>;
    case "trend":
      return <svg {...p}><path d="M3 17l6-6 4 4 8-8M14 7h7v7" /></svg>;
    case "chart":
      return <svg {...p}><path d="M3 20h18M6 20V10M11 20V4M16 20v-7M21 20v-4" /></svg>;
    case "calendar":
      return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
    case "store":
      return <svg {...p}><path d="M3 9 5 4h14l2 5M3 9v10h18V9M3 9h18M9 13a3 3 0 0 0 6 0" /></svg>;
    case "arrow":
      return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "spark":
      return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
    case "check":
      return <svg {...p}><path d="m20 6-11 11L4 12" /></svg>;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Animated counter
// ---------------------------------------------------------------------------
function Counter({ value, prefix = "", suffix = "", decimals = 0, duration = 900 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const to = Number(value) || 0;
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(to * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);

  const formatted = display.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return <>{prefix}{formatted}{suffix}</>;
}

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------
function StatTile({ icon, label, value, prefix, suffix, decimals = 0, accent = "violet" }) {
  return (
    <div className={`pt-stat pt-stat-${accent}`}>
      <div className="pt-stat-icon"><Icon name={icon} size={20} /></div>
      <div className="pt-stat-body">
        <span className="pt-stat-label">{label}</span>
        <span className="pt-stat-value">
          <Counter value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Holding card
// ---------------------------------------------------------------------------
function HoldingCard({ holding, totalInvested, index }) {
  const invested = Number(holding.total_invested || 0) / 1_000_000;
  const tokens = Number(holding.tokens_owned || 0);
  const share = totalInvested > 0 ? invested / totalInvested : 0;
  const pct = Math.round(share * 100);

  const businessName =
    holding.businesses?.name ||
    holding.business_pubkey?.slice(0, 8) + "…" ||
    "Unknown";

  const initial = businessName.charAt(0).toUpperCase();

  return (
    <div className="pt-holding" style={{ "--delay": `${index * 60}ms` }}>
      <div className="pt-holding-head">
        <div className="pt-holding-avatar">{initial}</div>
        <div className="pt-holding-name-wrap">
          <h3 className="pt-holding-name">{businessName}</h3>
          <span className="pt-holding-meta">
            {holding.businesses?.category || "Business"}
          </span>
        </div>
      </div>

      <div className="pt-holding-body">
        <div className="pt-metric">
          <span className="pt-metric-label">Shares owned</span>
          <span className="pt-metric-value">{tokens.toLocaleString()}</span>
        </div>
        <div className="pt-metric">
          <span className="pt-metric-label">Invested</span>
          <span className="pt-metric-value">${invested.toFixed(2)}</span>
        </div>
      </div>

      <div className="pt-holding-foot">
        <div className="pt-holding-share">
          <span className="pt-holding-share-label">Portfolio share</span>
          <div className="pt-holding-share-track">
            <div
              className="pt-holding-share-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="pt-holding-share-value">{pct}%</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profit row
// ---------------------------------------------------------------------------
function ProfitRow({ entry, maxAmount }) {
  const amount = Number(entry.amount_claimed || 0) / 1_000_000;
  const ratio = maxAmount > 0 ? amount / maxAmount : 0;
  const pct = Math.max(4, Math.round(ratio * 100));

  return (
    <li className="pt-profit-row">
      <div className="pt-profit-month">
        <span className="pt-profit-month-name">
          {MONTH_NAMES[entry.month - 1]}
        </span>
        <span className="pt-profit-month-year">{entry.year}</span>
      </div>

      <div className="pt-profit-track">
        <div
          className="pt-profit-fill"
          style={{ width: `${pct}%` }}
        />
      </div>

      <span className="pt-profit-amount">${amount.toFixed(2)}</span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function SkeletonPortfolio() {
  return (
    <div className="pt-page">
      <div className="pt-container">
        <div className="pt-skel pt-skel-head" />
        <div className="pt-stats">
          <div className="pt-skel pt-skel-tile" />
          <div className="pt-skel pt-skel-tile" />
          <div className="pt-skel pt-skel-tile" />
        </div>
        <div className="pt-grid">
          <div className="pt-skel pt-skel-card" />
          <div className="pt-skel pt-skel-card" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState(null);
  const [history, setHistory] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/investments/portfolio"),
      api.get("/investments/profit-history").catch(() => ({ data: { history: [] } })),
    ])
      .then(([p, h]) => {
        setPortfolio(p.data.portfolio || []);
        setHistory(h.data.history || []);
      })
      .catch(() => {
        toast.error("Could not load portfolio data.");
        setPortfolio([]);
        setHistory([]);
      });
  }, []);

  const stats = useMemo(() => {
    if (!portfolio) return { count: 0, invested: 0, claimed: 0, maxProfit: 0 };
    let invested = 0;
    for (const p of portfolio) invested += Number(p.total_invested || 0);
    invested /= 1_000_000;

    let claimed = 0;
    let maxProfit = 0;
    if (history) {
      for (const h of history) {
        const a = Number(h.amount_claimed || 0) / 1_000_000;
        claimed += a;
        if (a > maxProfit) maxProfit = a;
      }
    }
    return { count: portfolio.length, invested, claimed, maxProfit };
  }, [portfolio, history]);

  if (portfolio === null || history === null) return <SkeletonPortfolio />;

  return (
    <div className="pt-page">
      <div className="pt-halo" aria-hidden />

      <div className="pt-container">
        {/* Header */}
        <header className="pt-header">
          <div>
            <span className="pt-eyebrow">Your portfolio</span>
            <h1 className="pt-title">
              What you <span className="pt-title-accent">own</span>
            </h1>
            <p className="pt-subtitle">
              Every share you hold across the platform, and every profit
              distribution you've claimed.
            </p>
          </div>
          <Link to="/investor/marketplace" className="pt-cta">
            <Icon name="store" size={15} />
            Find more businesses
            <Icon name="arrow" size={14} />
          </Link>
        </header>

        {/* Stats */}
        <div className="pt-stats">
          <StatTile
            icon="briefcase"
            label="Businesses held"
            value={stats.count}
            accent="violet"
          />
 
        
          <StatTile
            icon="coins"
            label="Total invested"
            value={stats.invested}
            prefix="$"
            decimals={2}
            accent="cyan"
          />
          <StatTile
            icon="trend"
            label="Profit claimed"
            value={stats.claimed}
            prefix="$"
            decimals={2}
            accent="indigo"
          />
        </div>

        <ClaimableProfit
          onClaimed={async () => {
            const [p, h] = await Promise.all([
              api.get("/investments/portfolio"),
              api.get("/investments/profit-history"),
            ]);
            setPortfolio(p.data.portfolio || []);
            setHistory(p.data.history || []);
          }}
        />

        {/* Holdings */}
        <section className="pt-section">
          <div className="pt-section-head">
            <h2 className="pt-section-title">
              <Icon name="chart" size={18} />
              Holdings
            </h2>
            {portfolio.length > 0 && (
              <span className="pt-section-count">
                {portfolio.length} position{portfolio.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {portfolio.length === 0 ? (
            <div className="pt-empty">
              <div className="pt-empty-icon"><Icon name="spark" size={28} /></div>
              <h3>No positions yet</h3>
              <p>Browse the marketplace to make your first investment.</p>
              <Link to="/investor/marketplace" className="pt-cta pt-cta-sm">
                <Icon name="store" size={14} />
                Open marketplace
              </Link>
            </div>
          ) : (
            <div className="pt-grid">
              {portfolio.map((p, i) => (
                <HoldingCard
                  key={p.onchain_pubkey}
                  holding={p}
                  index={i}
                  totalInvested={stats.invested}
                />
              ))}
            </div>
          )}
        </section>

        {/* Profit history */}
        <section className="pt-section">
          <div className="pt-section-head">
            <h2 className="pt-section-title">
              <Icon name="calendar" size={18} />
              Profit history
            </h2>
            {history.length > 0 && (
              <span className="pt-section-count">
                {history.length} month{history.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {history.length === 0 ? (
            <div className="pt-empty pt-empty-soft">
              <h3>No profit claimed yet</h3>
              <p>
                When a business you own shares in deposits monthly profit,
                your share will appear here.
              </p>
            </div>
          ) : (
            <ul className="pt-profit-list">
              {history.map((h) => (
                <ProfitRow
                  key={`${h.business_pubkey}-${h.year}-${h.month}`}
                  entry={h}
                  maxAmount={stats.maxProfit}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}