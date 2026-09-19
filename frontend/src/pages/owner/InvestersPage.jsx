// ============================================================================
// src/pages/owner/InvestorsPage.jsx
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
    case "users":
      return <svg {...p}><path d="M16 20a4 4 0 0 0-8 0" /><circle cx="12" cy="10" r="3.5" /><path d="M20 20a4 4 0 0 0-3-3.87M4 20a4 4 0 0 1 3-3.87" /></svg>;
    case "coins":
      return <svg {...p}><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></svg>;
    case "trend":
      return <svg {...p}><path d="M3 17l6-6 4 4 8-8M14 7h7v7" /></svg>;
    case "mail":
      return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>;
    case "phone":
      return <svg {...p}><path d="M4 5c0-1 1-2 2-2h2l2 5-2 1a12 12 0 0 0 5 5l1-2 5 2v2c0 1-1 2-2 2A15 15 0 0 1 4 5Z" /></svg>;
    case "wallet":
      return <svg {...p}><rect x="3" y="6" width="18" height="14" rx="2.5" /><path d="M3 10h18M16 15h2" /></svg>;
    case "store":
      return <svg {...p}><path d="M3 9 5 4h14l2 5M3 9v10h18V9M3 9h18M9 13a3 3 0 0 0 6 0" /></svg>;
    case "copy":
      return <svg {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>;
    case "check":
      return <svg {...p}><path d="m20 6-11 11L4 12" /></svg>;
    case "search":
      return <svg {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>;
    case "spark":
      return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Counter
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
// Copy button
// ---------------------------------------------------------------------------
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Couldn't copy");
    }
  }
  return (
    <button className="iv-copy" onClick={handleCopy} aria-label="Copy">
      <Icon name={copied ? "check" : "copy"} size={12} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------
function StatTile({ icon, label, value, prefix, decimals = 0, accent = "violet" }) {
  return (
    <div className={`iv2-stat iv2-stat-${accent}`}>
      <div className="iv2-stat-icon"><Icon name={icon} size={20} /></div>
      <div className="iv2-stat-body">
        <span className="iv2-stat-label">{label}</span>
        <span className="iv2-stat-value">
          <Counter value={value} prefix={prefix} decimals={decimals} />
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Investor card
// ---------------------------------------------------------------------------
function InvestorCard({ investor, index }) {
  const shortWallet = investor.wallet
    ? `${investor.wallet.slice(0, 4)}…${investor.wallet.slice(-4)}`
    : "—";
  const initial = (investor.name || investor.wallet || "?").charAt(0).toUpperCase();

  return (
    <div className="iv2-card" style={{ "--delay": `${index * 50}ms` }}>
      {/* Head: avatar + identity */}
      <div className="iv2-card-head">
        <div className="iv2-avatar">{initial}</div>
        <div className="iv2-identity">
          <h3 className="iv2-name">{investor.name}</h3>
          {investor.email !== "—" && (
            <span className="iv2-contact">
              <Icon name="mail" size={12} />
              {investor.email}
            </span>
          )}
          {investor.phone !== "—" && (
            <span className="iv2-contact">
              <Icon name="phone" size={12} />
              {investor.phone}
            </span>
          )}
        </div>
      </div>

      {/* Wallet row */}
      <div className="iv2-wallet-row">
        <Icon name="wallet" size={13} />
        <span className="iv2-wallet-addr">{shortWallet}</span>
        <CopyButton text={investor.wallet} />
      </div>

      {/* Metrics */}
      <div className="iv2-metrics">
        <div className="iv2-metric">
          <span className="iv2-metric-label">Tokens</span>
          <span className="iv2-metric-value">
            {investor.tokens.toLocaleString()}
          </span>
        </div>
        <div className="iv2-metric">
          <span className="iv2-metric-label">Invested</span>
          <span className="iv2-metric-value">${investor.invested.toFixed(2)}</span>
        </div>
        <div className="iv2-metric">
          <span className="iv2-metric-label">Profit</span>
          <span className="iv2-metric-value iv2-metric-profit">
            ${investor.profit.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Positions list */}
      <div className="iv2-positions">
        <span className="iv2-positions-label">Positions</span>
        <ul className="iv2-positions-list">
          {investor.positions.map((pos) => (
            <li key={pos.investmentPda} className="iv2-position">
              <div className="iv2-position-dot" />
              <span className="iv2-position-name">{pos.businessName}</span>
              <span className="iv2-position-amount">
                {pos.tokens.toLocaleString()} · ${pos.invested.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Share of total */}
      <div className="iv2-share">
        <span className="iv2-share-label">
          {investor.sharePct}% of your total raised
        </span>
        <div className="iv2-share-track">
          <div
            className="iv2-share-fill"
            style={{ width: `${Math.min(100, investor.sharePct)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function SkeletonCard() {
  return (
    <div className="iv2-card iv2-card-skel">
      <div className="iv2-skel iv2-skel-avatar" />
      <div className="iv2-skel iv2-skel-line" />
      <div className="iv2-skel iv2-skel-line iv2-skel-short" />
      <div className="iv2-skel iv2-skel-metrics" />
      <div className="iv2-skel iv2-skel-line" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function InvestorsPage() {
  const [rows, setRows] = useState(null);
  const [query, setQuery] = useState("");
  const [businessFilter, setBusinessFilter] = useState("All");

  useEffect(() => {
    api
      .get("/investments/by-owner")
      .then(({ data }) => setRows(data.investors || []))
      .catch(() => {
        toast.error("Could not load investors.");
        setRows([]);
      });
  }, []);

  // Unique business names for the filter dropdown
  const businessOptions = useMemo(() => {
    if (!rows) return ["All"];
    return ["All", ...new Set(rows.map((r) => r.business_name))];
  }, [rows]);

  // Group by investor wallet
  const grouped = useMemo(() => {
    if (!rows) return [];

    // Apply filters first (per row)
    const filtered = rows.filter((r) => {
      if (businessFilter !== "All" && r.business_name !== businessFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const hay = `${r.investor_name} ${r.investor_email} ${r.investor_wallet} ${r.business_name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const map = new Map();
    for (const r of filtered) {
      const key = r.investor_wallet;
      if (!map.has(key)) {
        map.set(key, {
          wallet: r.investor_wallet,
          name: r.investor_name,
          email: r.investor_email,
          phone: r.investor_phone,
          tokens: 0,
          invested: 0,
          profit: 0,
          positions: [],
        });
      }
      const g = map.get(key);
      g.tokens += r.tokens_owned;
      g.invested += r.total_invested / 1_000_000;
      g.profit += r.profit_claimed / 1_000_000;
      g.positions.push({
        investmentPda: r.investment_pda,
        businessName: r.business_name,
        tokens: r.tokens_owned,
        invested: r.total_invested / 1_000_000,
        profit: r.profit_claimed / 1_000_000,
      });
    }

    const list = [...map.values()];
    const grandTotal = list.reduce((s, x) => s + x.invested, 0);
    for (const g of list) {
      g.sharePct = grandTotal > 0 ? Math.round((g.invested / grandTotal) * 100) : 0;
    }

    // Sort by invested descending
    list.sort((a, b) => b.invested - a.invested);
    return list;
  }, [rows, query, businessFilter]);

  const stats = useMemo(() => {
    if (!rows) return { investors: 0, invested: 0, profit: 0 };
    const wallets = new Set();
    let invested = 0;
    let profit = 0;
    for (const r of rows) {
      wallets.add(r.investor_wallet);
      invested += r.total_invested / 1_000_000;
      profit += r.profit_claimed / 1_000_000;
    }
    return { investors: wallets.size, invested, profit };
  }, [rows]);

  return (
    <div className="iv2-page">
      <div className="iv2-halo" aria-hidden />

      <div className="iv2-container">
        {/* Header */}
        <header className="iv2-header">
          <div>
            <span className="iv2-eyebrow">Investors</span>
            <h1 className="iv2-title">
              Who owns your <span className="iv2-title-accent">shares</span>
            </h1>
            <p className="iv2-subtitle">
              Every investor across every business you've tokenized — with
              their contact details, wallet, position, and profit paid out.
            </p>
          </div>
          <Link to="/owner" className="iv2-cta">
            <Icon name="store" size={15} />
            Back to businesses
          </Link>
        </header>

        {/* Stats */}
        <div className="iv2-stats">
          <StatTile
            icon="users"
            label="Unique investors"
            value={stats.investors}
            accent="violet"
          />
          <StatTile
            icon="coins"
            label="Total raised"
            value={stats.invested}
            prefix="$"
            decimals={2}
            accent="cyan"
          />
          <StatTile
            icon="trend"
            label="Profit distributed"
            value={stats.profit}
            prefix="$"
            decimals={2}
            accent="indigo"
          />
        </div>

        {/* Toolbar */}
        <div className="iv2-toolbar">
          <div className="iv2-search">
            <Icon name="search" size={15} />
            <input
              type="text"
              placeholder="Search by name, email, wallet, or business"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="iv2-select">
            <select
              value={businessFilter}
              onChange={(e) => setBusinessFilter(e.target.value)}
            >
              {businessOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {rows === null ? (
          <div className="iv2-grid">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : grouped.length === 0 ? (
          <div className="iv2-empty">
            <div className="iv2-empty-icon"><Icon name="users" size={28} /></div>
            <h2>{rows.length === 0 ? "No investors yet" : "No matches"}</h2>
            <p>
              {rows.length === 0
                ? "When someone buys shares in one of your businesses, they'll appear here."
                : "Try clearing the search or picking a different business."}
            </p>
          </div>
        ) : (
          <div className="iv2-grid">
            {grouped.map((g, i) => (
              <InvestorCard key={g.wallet} investor={g} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}