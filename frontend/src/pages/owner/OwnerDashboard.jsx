// ============================================================================
// src/pages/owner/OwnerDashboard.jsx
// ============================================================================
import { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "../../config/api";
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
    case "grid":
      return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case "coins":
      return <svg {...p}><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></svg>;
    case "trend":
      return <svg {...p}><path d="M3 17l6-6 4 4 8-8M14 7h7v7" /></svg>;
    case "plus":
      return <svg {...p}><path d="M12 5v14M5 12h14" /></svg>;
    case "copy":
      return <svg {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>;
    case "check":
      return <svg {...p}><path d="m20 6-11 11L4 12" /></svg>;
    case "arrow":
      return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "deposit":
      return <svg {...p}><path d="M12 3v13M6 10l6 6 6-6M4 21h16" /></svg>;
    case "spark":
      return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Animated number counter — counts up when the value changes.
// Uses requestAnimationFrame; no dependencies.
// ---------------------------------------------------------------------------
function Counter({ value, duration = 800, format = (n) => Math.round(n).toLocaleString() }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = Number(value) || 0;

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <>{format(display)}</>;
}

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------
function StatTile({ icon, label, value, suffix, prefix, accent = "violet" }) {
  return (
    <div className={`od-stat od-stat-${accent}`}>
      <div className="od-stat-icon"><Icon name={icon} size={20} /></div>
      <div className="od-stat-body">
        <span className="od-stat-label">{label}</span>
        <span className="od-stat-value">
          {prefix}
          <Counter value={value} />
          {suffix}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Copy button — copies text to clipboard with a transient "copied" state.
// ---------------------------------------------------------------------------
function CopyButton({ text, label = "Copy address" }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Address copied");
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  return (
    <button
      className="od-copy"
      onClick={handleCopy}
      title={label}
      aria-label={label}
    >
      <Icon name={copied ? "check" : "copy"} size={13} />
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Business card
// ---------------------------------------------------------------------------
function BusinessCard({ business, index }) {
  const tokensSold = Number(business.tokens_sold || 0);
  const totalTokens = Number(business.total_tokens || 0);
  const ratio = totalTokens > 0 ? Math.min(1, tokensSold / totalTokens) : 0;
  const pct = Math.round(ratio * 100);
  const priceUsd = Number(business.price_per_token || 0) / 1_000_000;
  const raiseUsd = priceUsd * totalTokens;
  const shortAddr = business.onchain_pubkey
    ? `${business.onchain_pubkey.slice(0, 4)}…${business.onchain_pubkey.slice(-4)}`
    : "—";

  return (
    <div
      className="od-card"
      style={{ "--delay": `${index * 60}ms` }}
    >
      <div className="od-card-cover">
        <div className="od-card-cover-grad" aria-hidden />
        <span className="od-card-badge">{business.category || "Business"}</span>
        <span className="od-card-address" title={business.onchain_pubkey}>
          <span>{shortAddr}</span>
          <CopyButton text={business.onchain_pubkey || ""} />
        </span>
      </div>

      <div className="od-card-body">
        <h3 className="od-card-title">{business.name}</h3>
        <p className="od-card-desc">{business.description || "No description yet."}</p>

        <div className="od-card-metrics">
          <div className="od-metric">
            <span className="od-metric-label">Price / token</span>
            <span className="od-metric-value">${priceUsd.toFixed(2)}</span>
          </div>
          <div className="od-metric">
            <span className="od-metric-label">Potential raise</span>
            <span className="od-metric-value">
              ${raiseUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        <div className="od-progress">
          <div className="od-progress-head">
            <span>Shares sold</span>
            <span>{tokensSold.toLocaleString()} / {totalTokens.toLocaleString()}</span>
          </div>
          <div className="od-progress-track">
            <div className="od-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="od-card-actions">
          <Link
            to={`/owner/deposit-profit/${business.onchain_pubkey}`}
            className="od-action od-action-primary"
          >
            <Icon name="deposit" size={15} />
            Deposit profit
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton (loading state) — shimmering placeholders
// ---------------------------------------------------------------------------
function SkeletonCard() {
  return (
    <div className="od-card od-card-skeleton">
      <div className="od-skel od-skel-cover" />
      <div className="od-card-body">
        <div className="od-skel od-skel-line od-skel-title" />
        <div className="od-skel od-skel-line" />
        <div className="od-skel od-skel-line od-skel-short" />
        <div className="od-skel od-skel-metrics" />
        <div className="od-skel od-skel-bar" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function OwnerDashboard() {
  const [businesses, setBusinesses] = useState(null);

  useEffect(() => {
    api
      .get("/businesses/mine")
      .then(({ data }) => setBusinesses(data.businesses))
      .catch(() => {
        toast.error("Could not load your businesses.");
        setBusinesses([]);   // fall through to empty state, don't hang
      });
  }, []);

  // Aggregate stats for the top strip
  const stats = useMemo(() => {
    if (!businesses) return { count: 0, shares: 0, raise: 0 };
    const count = businesses.length;
    let shares = 0;
    let raise = 0;
    for (const b of businesses) {
      const t = Number(b.total_tokens || 0);
      const p = Number(b.price_per_token || 0) / 1_000_000;
      shares += t;
      raise += t * p;
    }
    return { count, shares, raise };
  }, [businesses]);

  return (
    <div className="od-page">
      <div className="od-halo" aria-hidden />

      <div className="od-container">
        {/* Header */}
        <header className="od-header">
          <div>
            <span className="od-eyebrow">Owner dashboard</span>
            <h1 className="od-title">
              Your <span className="od-title-accent">businesses</span>
            </h1>
            <p className="od-subtitle">
              Every business you tokenize appears here. Click{" "}
              <strong>New business</strong> to launch another one — it takes
              about a minute.
            </p>
          </div>
          <Link to="/owner/create-business" className="od-cta">
            <Icon name="plus" size={16} />
            New business
          </Link>
        </header>

        {/* Stat strip */}
        <div className="od-stats">
          <StatTile
            icon="grid"
            label="Businesses"
            value={stats.count}
            accent="violet"
          />
          <StatTile
            icon="coins"
            label="Shares issued"
            value={stats.shares}
            accent="cyan"
          />
          <StatTile
            icon="trend"
            label="Potential raise"
            value={stats.raise}
            prefix="$"
            accent="indigo"
          />
        </div>

        {/* Content */}
        {businesses === null ? (
          <div className="od-grid">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : businesses.length === 0 ? (
          <div className="od-empty">
            <div className="od-empty-icon">
              <Icon name="spark" size={32} />
            </div>
            <h2>No businesses yet</h2>
            <p>
              When you create your first business, it will show up here with
              live metrics and a link to manage profit deposits.
            </p>
            <Link to="/owner/create-business" className="od-cta od-cta-large">
              <Icon name="plus" size={16} />
              Create your first business
            </Link>
          </div>
        ) : (
          <div className="od-grid">
            {businesses.map((b, i) => (
              <BusinessCard key={b.onchain_pubkey} business={b} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}