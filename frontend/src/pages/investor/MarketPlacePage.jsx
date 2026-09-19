// ============================================================================
// src/pages/investor/MarketplacePage.jsx
// ============================================================================
import { useEffect, useState, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import toast from "react-hot-toast";
import { api } from "../../config/api";
import { getProgram, pdas, USDC_MINT } from "../../config/web3";

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
    case "search":
      return <svg {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>;
    case "filter":
      return <svg {...p}><path d="M3 6h18M6 12h12M10 18h4" /></svg>;
    case "coin":
      return <svg {...p}><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></svg>;
    case "tag":
      return <svg {...p}><path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.2" /></svg>;
    case "pin":
      return <svg {...p}><path d="M12 21s-7-6.5-7-12a7 7 0 1 1 14 0c0 5.5-7 12-7 12Z" /><circle cx="12" cy="9" r="2.4" /></svg>;
    case "close":
      return <svg {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>;
    case "check":
      return <svg {...p}><path d="m20 6-11 11L4 12" /></svg>;
    case "arrow":
      return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "spark":
      return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
    case "cart":
      return <svg {...p}><circle cx="9" cy="21" r="1.4" /><circle cx="19" cy="21" r="1.4" /><path d="M3 3h2l2.4 12h12L22 7H6" /></svg>;
    case "shield":
      return <svg {...p}><path d="M12 3 4 6v6c0 4.5 3.4 8.6 8 9 4.6-.4 8-4.5 8-9V6l-8-3Z" /></svg>;
    default:
      return null;
  }
}

const CATEGORIES = [
  "All", "Restaurant", "Retail", "Real Estate", "Manufacturing",
  "Services", "Tech", "Agriculture", "Other",
];

const SORTS = [
  { id: "new", label: "Newest" },
  { id: "price-asc", label: "Price ↑" },
  { id: "price-desc", label: "Price ↓" },
  { id: "raise-desc", label: "Biggest raise" },
];

// ---------------------------------------------------------------------------
// Business card
// ---------------------------------------------------------------------------
function BusinessCard({ business, onBuy, index }) {
  const totalTokens = Number(business.total_tokens || 0);
  const tokensSold = Number(business.tokens_sold || 0);
  const remaining = Math.max(0, totalTokens - tokensSold);
  const ratio = totalTokens > 0 ? tokensSold / totalTokens : 0;
  const pct = Math.round(ratio * 100);
  const priceUsd = Number(business.price_per_token || 0) / 1_000_000;

  const soldOut = remaining === 0;

  return (
    <article
      className="mk-card"
      style={{ "--delay": `${index * 50}ms` }}
    >
      <div className="mk-cover">
        <div className="mk-cover-grad" aria-hidden />
        <span className="mk-badge">
          <Icon name="tag" size={11} />
          {business.category || "Business"}
        </span>
        <span className="mk-price">
          ${priceUsd.toFixed(2)}
          <small>/token</small>
        </span>
      </div>

      <div className="mk-body">
        <h3 className="mk-name">{business.name}</h3>
        <p className="mk-desc">{business.description || "No description."}</p>

        {business.location && (
          <div className="mk-location">
            <Icon name="pin" size={12} />
            {business.location}
          </div>
        )}

        <div className="mk-progress">
          <div className="mk-progress-head">
            <span>Sold {pct}%</span>
            <span>{remaining.toLocaleString()} left</span>
          </div>
          <div className="mk-progress-track">
            <div
              className="mk-progress-fill"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>

        <button
          className="mk-cta"
          onClick={() => onBuy(business)}
          disabled={soldOut}
        >
          {soldOut ? (
            "Sold out"
          ) : (
            <>
              <Icon name="cart" size={15} />
              Buy shares
              <Icon name="arrow" size={14} />
            </>
          )}
        </button>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------
function SkeletonCard() {
  return (
    <div className="mk-card mk-card-skel">
      <div className="mk-skel mk-skel-cover" />
      <div className="mk-body">
        <div className="mk-skel mk-skel-title" />
        <div className="mk-skel mk-skel-line" />
        <div className="mk-skel mk-skel-line mk-skel-short" />
        <div className="mk-skel mk-skel-bar" />
        <div className="mk-skel mk-skel-cta" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Buy drawer
// ---------------------------------------------------------------------------
function BuyDrawer({ business, onClose, onSubmit, submitting }) {
  const [amount, setAmount] = useState(1);

  if (!business) return null;

  const priceUsd = Number(business.price_per_token || 0) / 1_000_000;
  const totalTokens = Number(business.total_tokens || 0);
  const tokensSold = Number(business.tokens_sold || 0);
  const remaining = Math.max(0, totalTokens - tokensSold);
  const total = amount * priceUsd;

  const overMax = amount > remaining;
  const underMin = amount < 1;

  return (
    <div className="mk-drawer-backdrop" onClick={onClose}>
      <div className="mk-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="mk-drawer-close" onClick={onClose} aria-label="Close">
          <Icon name="close" size={16} />
        </button>

        <div className="mk-drawer-cover">
          <div className="mk-drawer-cover-grad" aria-hidden />
          <span className="mk-badge">
            <Icon name="tag" size={11} />
            {business.category || "Business"}
          </span>
        </div>

        <h2 className="mk-drawer-title">{business.name}</h2>
        <p className="mk-drawer-desc">{business.description}</p>

        <div className="mk-drawer-stats">
          <div>
            <span className="mk-metric-label">Price</span>
            <span className="mk-metric-value">${priceUsd.toFixed(2)}</span>
          </div>
          <div>
            <span className="mk-metric-label">Available</span>
            <span className="mk-metric-value">{remaining.toLocaleString()}</span>
          </div>
        </div>

        <label className="mk-field">
          <span className="mk-field-label">How many shares?</span>
          <div className="mk-stepper">
            <button
              type="button"
              onClick={() => setAmount((a) => Math.max(1, a - 1))}
              disabled={amount <= 1}
            >
              –
            </button>
            <input
              type="number"
              min="1"
              max={remaining}
              value={amount}
              onChange={(e) => {
                const v = e.target.value === "" ? "" : Number(e.target.value);
                setAmount(v);
              }}
              onBlur={(e) => {
                if (e.target.value === "" || Number(e.target.value) < 1) setAmount(1);
              }}
            />
            <button
              type="button"
              onClick={() => setAmount((a) => Math.min(remaining, a + 1))}
              disabled={amount >= remaining}
            >
              +
            </button>
          </div>
        </label>

        <div className="mk-total">
          <span>Total cost</span>
          <strong>${total.toFixed(2)}</strong>
          <small>USDC</small>
        </div>

        <button
          className="mk-drawer-cta"
          onClick={() => onSubmit(business, amount)}
          disabled={submitting || overMax || underMin}
        >
          {submitting ? (
            <><span className="mk-spinner" /> Confirming…</>
          ) : overMax ? (
            `Only ${remaining.toLocaleString()} left`
          ) : (
            <><Icon name="check" size={16} /> Confirm purchase</>
          )}
        </button>

        <p className="mk-drawer-note">
          <Icon name="shield" size={13} />
          Your wallet will ask you to sign once. USDC is transferred on-chain.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function MarketplacePage() {
  const { publicKey, wallet } = useWallet();
  const [businesses, setBusinesses] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [active, setActive] = useState(null);   // business open in drawer
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("new");

  useEffect(() => {
    api
      .get("/businesses")
      .then(({ data }) => setBusinesses(data.businesses || []))
      .catch(() => {
        toast.error("Could not load businesses.");
        setBusinesses([]);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!businesses) return [];
    let list = [...businesses];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (b) =>
          (b.name || "").toLowerCase().includes(q) ||
          (b.description || "").toLowerCase().includes(q) ||
          (b.location || "").toLowerCase().includes(q)
      );
    }

    if (category !== "All") {
      list = list.filter((b) => b.category === category);
    }

    const price = (b) => Number(b.price_per_token || 0);
    const raise = (b) =>
      Number(b.total_tokens || 0) * price(b) / 1_000_000;

    switch (sort) {
      case "price-asc": list.sort((a, b) => price(a) - price(b)); break;
      case "price-desc": list.sort((a, b) => price(b) - price(a)); break;
      case "raise-desc": list.sort((a, b) => raise(b) - raise(a)); break;
      default: /* "new" — assume server returns newest first */ break;
    }

    return list;
  }, [businesses, query, category, sort]);

  const stats = useMemo(() => {
    if (!businesses || businesses.length === 0)
      return { count: 0, avg: 0, shares: 0 };
    let avg = 0;
    let shares = 0;
    for (const b of businesses) {
      avg += Number(b.price_per_token || 0) / 1_000_000;
      shares += Number(b.total_tokens || 0);
    }
    return {
      count: businesses.length,
      avg: avg / businesses.length,
      shares,
    };
  }, [businesses]);

  async function handleBuy(business, amount) {
    if (!publicKey) {
      toast.error("Connect your wallet first.");
      return;
    }
    if (!USDC_MINT) {
      toast.error("USDC mint not configured.");
      return;
    }
    setSubmitting(true);
    try {
      const program = getProgram(wallet);
      const businessPubkey = new PublicKey(business.onchain_pubkey);
      const ownerPubkey = new PublicKey(business.owner_wallet);
      const investorProfilePda = pdas.userProfile(publicKey);
      const vaultPda = pdas.vault(businessPubkey);
      const investmentPda = pdas.investment(businessPubkey, publicKey);
      const investorTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, publicKey);
      const ownerTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, ownerPubkey);

      // 1. Send the on-chain transaction
      await program.methods
        .buyTokens(new anchor.BN(amount))
        .accounts({
          investor: publicKey,
          investorProfile: investorProfilePda,
          business: businessPubkey,
          usdcMint: USDC_MINT,
          investorTokenAccount,
          vault: vaultPda,
          owner: ownerPubkey,
          ownerTokenAccount,
          investment: investmentPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      toast.success(`Bought ${amount} shares of ${business.name}!`);

      // 2. Re-fetch the on-chain state so we know the new totals
      let updatedBusiness = null;
      let updatedInvestment = null;
      try {
        updatedBusiness = await program.account.business.fetch(businessPubkey);
        updatedInvestment = await program.account.investment.fetch(investmentPda);
      } catch (fetchErr) {
        console.warn("[marketplace] could not re-fetch on-chain state:", fetchErr);
      }

      // 3. Mirror the result to Supabase so dashboards reflect it after refresh
      if (updatedBusiness && updatedInvestment) {
        try {
          await api.post("/investments/record", {
            businessPubkey: businessPubkey.toBase58(),
            investmentPda: investmentPda.toBase58(),
            tokensOwned: updatedInvestment.tokensOwned.toString(),
            totalInvested: updatedInvestment.totalInvested.toString(),
            businessTokensSold: updatedBusiness.tokensSold.toString(),
          });
        } catch (syncErr) {
          console.error("[marketplace] failed to sync purchase to Supabase:", syncErr);
          toast.error("Purchase succeeded on-chain, but the dashboard may be stale.");
        }
      }

      // 4. Optimistic local update so the card reflects the new count immediately
      setBusinesses((prev) =>
        prev
          ? prev.map((b) =>
            b.onchain_pubkey === business.onchain_pubkey
              ? { ...b, tokens_sold: Number(b.tokens_sold || 0) + amount }
              : b
          )
          : prev
      );

      setActive(null);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Purchase failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mk-page">
      <div className="mk-halo" aria-hidden />

      <div className="mk-container">
        {/* Header */}
        <header className="mk-header">
          <div>
            <span className="mk-eyebrow">Marketplace</span>
            <h1 className="mk-title">
              Invest in <span className="mk-title-accent">real businesses</span>
            </h1>
            <p className="mk-subtitle">
              Every listing is a real, on-chain share in a business. Buy in
              USDC, own your position, and receive profit distributions.
            </p>
          </div>

          <div className="mk-stats">
            <div className="mk-stat">
              <span className="mk-stat-label">Businesses</span>
              <span className="mk-stat-value">{stats.count}</span>
            </div>
            <div className="mk-stat">
              <span className="mk-stat-label">Avg. price</span>
              <span className="mk-stat-value">${stats.avg.toFixed(2)}</span>
            </div>
            <div className="mk-stat">
              <span className="mk-stat-label">Shares available</span>
              <span className="mk-stat-value">
                {stats.shares.toLocaleString()}
              </span>
            </div>
          </div>
        </header>

        {/* Filter bar */}
        <div className="mk-toolbar">
          <div className="mk-search">
            <Icon name="search" size={15} />
            <input
              type="text"
              placeholder="Search by name, description, or location"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="mk-select">
            <Icon name="filter" size={14} />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="mk-select">
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {businesses === null ? (
          <div className="mk-grid">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mk-empty">
            <div className="mk-empty-icon"><Icon name="spark" size={28} /></div>
            <h2>No businesses match</h2>
            <p>Try clearing the search or picking a different category.</p>
          </div>
        ) : (
          <div className="mk-grid">
            {filtered.map((b, i) => (
              <BusinessCard
                key={b.onchain_pubkey}
                business={b}
                index={i}
                onBuy={(bus) => setActive(bus)}
              />
            ))}
          </div>
        )}
      </div>

      <BuyDrawer
        business={active}
        submitting={submitting}
        onClose={() => setActive(null)}
        onSubmit={handleBuy}
      />
    </div>
  );
}