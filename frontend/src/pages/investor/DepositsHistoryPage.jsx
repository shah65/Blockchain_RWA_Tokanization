// ============================================================================
// src/pages/owner/DepositsHistoryPage.jsx
// ============================================================================
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../../config/api";
import toast from "react-hot-toast";

function Icon({ name, size = 18 }) {
  const p = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.8,
    strokeLinecap: "round", strokeLinejoin: "round",
  };
  switch (name) {
    case "calendar":
      return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
    case "chevron":
      return <svg {...p}><path d="m6 9 6 6 6-6" /></svg>;
    case "check":
      return <svg {...p}><path d="m20 6-11 11L4 12" /></svg>;
    case "spark":
      return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
    case "arrow":
      return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "trend":
      return <svg {...p}><path d="M3 17l6-6 4 4 8-8M14 7h7v7" /></svg>;
    case "coins":
      return <svg {...p}><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></svg>;
    default:
      return null;
  }
}

function Counter({ value, prefix = "", decimals = 0, duration = 900 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const to = Number(value) || 0;
    let raf;
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(to * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  const f = display.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return <>{prefix}{f}</>;
}

function StatTile({ icon, label, value, prefix, decimals = 0, accent = "violet" }) {
  return (
    <div className={`dh-stat dh-stat-${accent}`}>
      <div className="dh-stat-icon"><Icon name={icon} size={20} /></div>
      <div className="dh-stat-body">
        <span className="dh-stat-label">{label}</span>
        <span className="dh-stat-value">
          <Counter value={value} prefix={prefix} decimals={decimals} />
        </span>
      </div>
    </div>
  );
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function DepositCard({ deposit }) {
  const [open, setOpen] = useState(false);
  const claimedPct = deposit.investor_pool_usd > 0
    ? Math.round((deposit.total_claimed_usd / deposit.investor_pool_usd) * 100)
    : 0;

  return (
    <div className={`dh-deposit ${open ? "dh-deposit-open" : ""}`}>
      <button
        className="dh-deposit-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="dh-deposit-period">
          <span className="dh-deposit-month">{MONTH_NAMES[deposit.month - 1]}</span>
          <span className="dh-deposit-year">{deposit.year}</span>
        </div>

        <div className="dh-deposit-business">
          <span className="dh-deposit-biz-name">{deposit.business_name}</span>
          <span className="dh-deposit-biz-pda">
            {deposit.onchain_pubkey.slice(0, 6)}…{deposit.onchain_pubkey.slice(-4)}
          </span>
        </div>

        <div className="dh-deposit-amounts">
          <div className="dh-deposit-amount-row">
            <span className="dh-deposit-amount-label">Deposited</span>
            <span className="dh-deposit-amount-value">
              ${deposit.total_deposited_usd.toFixed(2)}
            </span>
          </div>
          <div className="dh-deposit-amount-row">
            <span className="dh-deposit-amount-label">Claimed</span>
            <span className="dh-deposit-amount-value dh-deposit-amount-claim">
              ${deposit.total_claimed_usd.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="dh-deposit-progress">
          <div className="dh-deposit-progress-track">
            <div
              className="dh-deposit-progress-fill"
              style={{ width: `${Math.min(100, claimedPct)}%` }}
            />
          </div>
          <span className="dh-deposit-progress-label">{claimedPct}%</span>
        </div>

        <div className={`dh-chevron ${open ? "dh-chevron-open" : ""}`}>
          <Icon name="chevron" size={16} />
        </div>
      </button>

      {open && (
        <div className="dh-deposit-body">
          <div className="dh-deposit-meta">
            <div className="dh-meta">
              <span className="dh-meta-label">On-chain PDA</span>
              <span className="dh-meta-value dh-meta-mono">
                {deposit.onchain_pubkey.slice(0, 20)}…
              </span>
            </div>
            <div className="dh-meta">
              <span className="dh-meta-label">Investor pool</span>
              <span className="dh-meta-value">${deposit.investor_pool_usd.toFixed(2)}</span>
            </div>
            <div className="dh-meta">
              <span className="dh-meta-label">Remaining</span>
              <span className="dh-meta-value">${deposit.remaining_usd.toFixed(2)}</span>
            </div>
            <div className="dh-meta">
              <span className="dh-meta-label">Claims</span>
              <span className="dh-meta-value">{deposit.claim_count}</span>
            </div>
          </div>

          {deposit.claims.length === 0 ? (
            <p className="dh-no-claims">No investors have claimed yet.</p>
          ) : (
            <table className="dh-claims">
              <thead>
                <tr>
                  <th>Investor</th>
                  <th>Wallet</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {deposit.claims.map((c) => (
                  <tr key={c.investor_wallet}>
                    <td>
                      <div className="dh-claim-who">
                        <div className="dh-claim-avatar">
                          {(c.investor_name !== "—" ? c.investor_name : c.investor_wallet)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="dh-claim-info">
                          <span className="dh-claim-name">{c.investor_name}</span>
                          <span className="dh-claim-email">{c.investor_email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="dh-claim-wallet">
                      {c.investor_wallet.slice(0, 6)}…{c.investor_wallet.slice(-4)}
                    </td>
                    <td className="dh-claim-amount">
                      ${c.amount_claimed_usd.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonDeposit() {
  return (
    <div className="dh-deposit dh-deposit-skel">
      <div className="dh-skel dh-skel-line" />
      <div className="dh-skel dh-skel-line dh-skel-short" />
      <div className="dh-skel dh-skel-bar" />
    </div>
  );
}

export default function DepositsHistoryPage() {
  const [deposits, setDeposits] = useState(null);

  useEffect(() => {
    api.get("/investments/deposits-by-owner")
      .then(({ data }) => setDeposits(data.deposits || []))
      .catch(() => {
        toast.error("Could not load deposit history.");
        setDeposits([]);
      });
  }, []);

  const stats = useMemo(() => {
    if (!deposits) return { count: 0, deposited: 0, claimed: 0, outstanding: 0 };
    let deposited = 0, claimed = 0;
    for (const d of deposits) {
      deposited += d.total_deposited_usd;
      claimed += d.total_claimed_usd;
    }
    return {
      count: deposits.length,
      deposited,
      claimed,
      outstanding: deposited - claimed,
    };
  }, [deposits]);

  return (
    <div className="dh-page">
      <div className="dh-halo" aria-hidden />

      <div className="dh-container">
        <header className="dh-header">
          <div>
            <span className="dh-eyebrow">Deposit history</span>
            <h1 className="dh-title">
              Every month's <span className="dh-title-accent">payout</span>
            </h1>
            <p className="dh-subtitle">
              All profit you've deposited, and every claim investors have made.
              Click a month to see who was paid.
            </p>
          </div>
          <Link to="/owner" className="dh-cta">
            <Icon name="arrow" size={14} />
            Back to businesses
          </Link>
        </header>

        <div className="dh-stats">
          <StatTile icon="calendar" label="Deposits" value={stats.count} accent="violet" />
          <StatTile icon="coins" label="Total deposited" value={stats.deposited} prefix="$" decimals={2} accent="cyan" />
          <StatTile icon="check" label="Total claimed" value={stats.claimed} prefix="$" decimals={2} accent="indigo" />
          <StatTile icon="trend" label="Outstanding" value={stats.outstanding} prefix="$" decimals={2} accent="violet" />
        </div>

        {deposits === null ? (
          <div className="dh-list">
            <SkeletonDeposit />
            <SkeletonDeposit />
            <SkeletonDeposit />
          </div>
        ) : deposits.length === 0 ? (
          <div className="dh-empty">
            <div className="dh-empty-icon"><Icon name="spark" size={28} /></div>
            <h2>No deposits yet</h2>
            <p>
              When you deposit monthly profit for a business, it appears here
              with every investor's claim.
            </p>
          </div>
        ) : (
          <div className="dh-list">
            {deposits.map((d) => (
              <DepositCard key={d.onchain_pubkey} deposit={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}