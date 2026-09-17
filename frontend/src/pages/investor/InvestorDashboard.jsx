// ============================================================================
// src/pages/investor/InvestorDashboard.jsx
// ============================================================================
import { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

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
    case "store":
      return <svg {...p}><path d="M3 9 5 4h14l2 5M3 9v10h18V9M3 9h18M9 13a3 3 0 0 0 6 0" /></svg>;
    case "chart":
      return <svg {...p}><path d="M3 20h18M6 20V10M11 20V4M16 20v-7M21 20v-4" /></svg>;
    case "coins":
      return <svg {...p}><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></svg>;
    case "grid":
      return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case "trend":
      return <svg {...p}><path d="M3 17l6-6 4 4 8-8M14 7h7v7" /></svg>;
    case "spark":
      return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
    case "arrow":
      return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "bulb":
      return <svg {...p}><path d="M9 21h6M10 17h4M12 3a6 6 0 0 1 4 10.5c-.6.6-1 1.4-1 2.2V17H9v-1.3c0-.8-.4-1.6-1-2.2A6 6 0 0 1 12 3Z" /></svg>;
    case "shield":
      return <svg {...p}><path d="M12 3 4 6v6c0 4.5 3.4 8.6 8 9 4.6-.4 8-4.5 8-9V6l-8-3Z" /></svg>;
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
function StatTile({ icon, label, value, prefix, suffix, accent = "violet", decimals = 0, pulse = false }) {
  return (
    <div className={`iv-stat iv-stat-${accent} ${pulse ? "iv-stat-pulse" : ""}`}>
      <div className="iv-stat-icon"><Icon name={icon} size={20} /></div>
      <div className="iv-stat-body">
        <span className="iv-stat-label">{label}</span>
        <span className="iv-stat-value">
          <Counter value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flip action card — a 3D card that flips on hover.
// ---------------------------------------------------------------------------
function FlipCard({ to, front, back, accent = "violet" }) {
  return (
    <Link to={to} className={`iv-flip iv-flip-${accent}`}>
      <div className="iv-flip-inner">
        <div className="iv-flip-face iv-flip-front">
          <div className="iv-flip-icon">{front.icon}</div>
          <h3 className="iv-flip-title">{front.title}</h3>
          <p className="iv-flip-desc">{front.desc}</p>
          <span className="iv-flip-cta">
            {front.cta}
            <Icon name="arrow" size={15} />
          </span>
        </div>
        <div className="iv-flip-face iv-flip-back">
          <h4 className="iv-flip-back-title">{back.title}</h4>
          <ul className="iv-flip-list">
            {back.points.map((p, i) => (
              <li key={i}>
                <span className="iv-flip-dot" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Rotating tips — cycles through useful messages.
// ---------------------------------------------------------------------------
const TIPS = [
  "Small positions across many businesses spread your risk.",
  "Profit payouts are automatic once the owner deposits them.",
  "Every purchase is recorded on-chain — your holdings are verifiable.",
  "You can buy into the same business multiple times; your position accumulates.",
  "Filter businesses by category to find ones you understand.",
];

function TipCard() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % TIPS.length), 6000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="iv-tip">
      <div className="iv-tip-icon"><Icon name="bulb" size={16} /></div>
      <div key={i} className="iv-tip-text">{TIPS[i]}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function SkeletonDashboard() {
  return (
    <div className="iv-page">
      <div className="iv-container">
        <div className="iv-skel iv-skel-head" />
        <div className="iv-stats">
          <div className="iv-skel iv-skel-tile" />
          <div className="iv-skel iv-skel-tile" />
          <div className="iv-skel iv-skel-tile" />
        </div>
        <div className="iv-actions">
          <div className="iv-skel iv-skel-action" />
          <div className="iv-skel iv-skel-action" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function InvestorDashboard() {
  const { profile } = useAuth();
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
        toast.error("Could not load your portfolio.");
        setPortfolio([]);
        setHistory([]);
      });
  }, []);

  const stats = useMemo(() => {
    if (!portfolio) return { count: 0, invested: 0, claimed: 0 };
    let invested = 0;
    for (const p of portfolio) invested += Number(p.total_invested || 0);
    invested /= 1_000_000;

    let claimed = 0;
    if (history) for (const h of history) claimed += Number(h.amount_claimed || 0);
    claimed /= 1_000_000;

    return { count: portfolio.length, invested, claimed };
  }, [portfolio, history]);

  if (portfolio === null) return <SkeletonDashboard />;

  const recent = [...portfolio].slice(0, 3);
  const first = (profile?.full_name || "").split(" ")[0];

  return (
    <div className="iv-page">
      <div className="iv-halo" aria-hidden />

      <div className="iv-container">
        {/* Header */}
        <header className="iv-header">
          <div>
            <span className="iv-eyebrow">Investor dashboard</span>
            <h1 className="iv-title">
              {first ? `Welcome back, ` : "Welcome back"}
              {first && <span className="iv-title-accent">{first}</span>}
            </h1>
            <p className="iv-subtitle">
              Track your positions, browse new businesses, and see what your
              shares have earned.
            </p>
          </div>
        </header>

        {/* Stat strip */}
        <div className="iv-stats">
          <StatTile
            icon="grid"
            label="Businesses"
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
            pulse
          />
        </div>

        {/* Action flip cards */}
        <div className="iv-actions">
          <FlipCard
            to="/investor/marketplace"
            accent="violet"
            front={{
              icon: <Icon name="store" size={26} />,
              title: "Browse the marketplace",
              desc: "Explore tokenized businesses and buy shares in USDC.",
              cta: "Open marketplace",
            }}
            back={{
              title: "What you can do",
              points: [
                "Filter businesses by category",
                "See live share prices in USDC",
                "Buy with one wallet signature",
                "Own real, on-chain positions",
              ],
            }}
          />
          <FlipCard
            to="/investor/portfolio"
            accent="cyan"
            front={{
              icon: <Icon name="chart" size={26} />,
              title: "Your portfolio & history",
              desc: "See every holding and every profit claim, month by month.",
              cta: "View portfolio",
            }}
            back={{
              title: "What's inside",
              points: [
                "All businesses you own shares in",
                "Total amount invested per business",
                "Monthly profit-claim history",
                "Claimable profit if any is pending",
              ],
            }}
          />
        </div>

        {/* Recent + Tip */}
        <div className="iv-bottom">
          <div className="iv-recent">
            <div className="iv-section-head">
              <h2>Recent positions</h2>
              {portfolio.length > 3 && (
                <Link to="/investor/portfolio" className="iv-see-all">
                  See all
                  <Icon name="arrow" size={14} />
                </Link>
              )}
            </div>

            {recent.length === 0 ? (
              <div className="iv-empty">
                <div className="iv-empty-icon"><Icon name="spark" size={26} /></div>
                <h3>No positions yet</h3>
                <p>Your first investment will appear here.</p>
                <Link to="/investor/marketplace" className="iv-cta iv-cta-inline">
                  Browse businesses
                  <Icon name="arrow" size={15} />
                </Link>
              </div>
            ) : (
              <ul className="iv-recent-list">
                {recent.map((p) => {
                  const name = p.businesses?.name || p.business_pubkey.slice(0, 10);
                  const invested = Number(p.total_invested || 0) / 1_000_000;
                  return (
                    <li key={p.onchain_pubkey || p.business_pubkey} className="iv-recent-item">
                      <div className="iv-recent-avatar">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="iv-recent-body">
                        <span className="iv-recent-name">{name}</span>
                        <span className="iv-recent-meta">
                          {Number(p.tokens_owned || 0).toLocaleString()} shares
                        </span>
                      </div>
                      <span className="iv-recent-value">
                        ${invested.toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="iv-side">
            <div className="iv-side-card">
              <div className="iv-side-head">
                <Icon name="shield" size={16} />
                <span>Did you know?</span>
              </div>
              <TipCard />
            </div>

            <Link to="/investor/marketplace" className="iv-cta">
              <Icon name="store" size={16} />
              Start investing
              <Icon name="arrow" size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}