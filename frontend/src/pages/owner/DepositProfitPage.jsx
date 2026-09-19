// ============================================================================
// src/pages/owner/DepositProfitPage.jsx
// ============================================================================
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import toast from "react-hot-toast";
import { getProgram, USDC_MINT, pdas } from "../../config/web3";
import { api } from "../../config/api";

function Icon({ name, size = 18 }) {
  const p = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.8,
    strokeLinecap: "round", strokeLinejoin: "round",
  };
  switch (name) {
    case "calendar":
      return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
    case "dollar":
      return <svg {...p}><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
    case "users":
      return <svg {...p}><path d="M16 20a4 4 0 0 0-8 0" /><circle cx="12" cy="10" r="3.5" /><path d="M20 20a4 4 0 0 0-3-3.87M4 20a4 4 0 0 1 3-3.87" /></svg>;
    case "trend":
      return <svg {...p}><path d="M3 17l6-6 4 4 8-8M14 7h7v7" /></svg>;
    case "check":
      return <svg {...p}><path d="m20 6-11 11L4 12" /></svg>;
    case "spark":
      return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
    case "arrow":
      return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "shield":
      return <svg {...p}><path d="M12 3 4 6v6c0 4.5 3.4 8.6 8 9 4.6-.4 8-4.5 8-9V6l-8-3Z" /></svg>;
    default:
      return null;
  }
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function DepositProfitPage() {
  const { businessPubkey } = useParams();
  const { publicKey, wallet } = useWallet();
  const navigate = useNavigate();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Business + its investors, for the live preview
  const [business, setBusiness] = useState(null);
  const [investors, setInvestors] = useState([]);

  useEffect(() => {
    api.get(`/businesses/${businessPubkey}`)
      .then(({ data }) => setBusiness(data.business))
      .catch(() => { });

    api.get("/investments/by-owner")
      .then(({ data }) => {
        const rows = (data.investors || []).filter(
          (r) => r.business_pubkey === businessPubkey
        );
        setInvestors(rows);
      })
      .catch(() => { });
  }, [businessPubkey]);

  const usdAmount = Number(amount) || 0;
  const investorShareBps = 7000; // 70% — matches the program
  const investorPool = usdAmount * (investorShareBps / 10_000);
  const ownerShare = usdAmount - investorPool;

  // Live split preview
  const split = useMemo(() => {
    if (!business || investors.length === 0 || usdAmount === 0) return [];
    const totalSold = Number(business.tokens_sold || 0) || 1;
    return investors
      .map((i) => {
        const tokens = Number(i.tokens_owned || 0);
        const share = (tokens / totalSold) * investorPool;
        return {
          wallet: i.investor_wallet,
          name: i.investor_name || "—",
          tokens,
          payout: share,
        };
      })
      .sort((a, b) => b.payout - a.payout);
  }, [business, investors, usdAmount, investorPool]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!(usdAmount > 0)) {
      toast.error("Enter an amount greater than $0.");
      return;
    }
    setSubmitting(true);
    try {
      const program = getProgram(wallet);
      const businessKey = new PublicKey(businessPubkey);
      const amountBaseUnits = new anchor.BN(Math.round(usdAmount * 1_000_000));
      const ownerTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, publicKey);
      const depositPda = pdas.profitDeposit(businessKey, year, month);

      await program.methods
        .depositProfit(year, month, amountBaseUnits)
        .accounts({
          owner: publicKey,
          business: businessKey,
          profitDeposit: depositPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      // Mirror to Supabase
      try {
        await api.post("/investments/deposit-record", {
          businessPubkey,
          depositPda: depositPda.toBase58(),
          year,
          month,
          totalDeposited: amountBaseUnits.toString(),
          investorShareBps,
        });
      } catch (syncErr) {
        console.error("Failed to mirror deposit:", syncErr);
        toast.error("Deposit succeeded on-chain, but the history may be stale.");
      }

      toast.success(
        `Deposited $${usdAmount.toFixed(2)} for ${MONTH_NAMES[month - 1]} ${year}`
      );
      navigate("/owner");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Deposit failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dp-page">
      <div className="dp-halo" aria-hidden />

      <div className="dp-container">
        <header className="dp-header">
          <div>
            <span className="dp-eyebrow">Deposit profit</span>
            <h1 className="dp-title">
              Share this month's <span className="dp-title-accent">profit</span>
            </h1>
            <p className="dp-subtitle">
              Deposit USDC into the business's profit pool. Investors claim
              their share based on how many tokens they own.
            </p>
          </div>
          <Link to="/owner" className="dp-back">
            <Icon name="arrow" size={14} />
            Back to dashboard
          </Link>
        </header>

        <div className="dp-grid">
          {/* ---------- LEFT: form ---------- */}
          <form className="dp-form" onSubmit={handleSubmit}>
            <div className="dp-section">
              <span className="dp-section-eyebrow">
                <Icon name="calendar" size={13} />
                Period
              </span>
              <div className="dp-row">
                <label className="dp-field">
                  <span className="dp-label">Year</span>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    min="2024"
                    max="2100"
                  />
                </label>
                <label className="dp-field">
                  <span className="dp-label">Month</span>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                  >
                    {MONTH_NAMES.map((name, i) => (
                      <option key={i + 1} value={i + 1}>{name}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="dp-section">
              <span className="dp-section-eyebrow">
                <Icon name="dollar" size={13} />
                Amount
              </span>
              <label className="dp-field">
                <span className="dp-label">Total to deposit (USD)</span>
                <div className="dp-amount-wrap">
                  <span className="dp-amount-symbol">$</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="dp-amount-input"
                  />
                </div>
              </label>

              <div className="dp-split">
                <div className="dp-split-row">
                  <span>Investor pool (70%)</span>
                  <strong>${investorPool.toFixed(2)}</strong>
                </div>
                <div className="dp-split-row dp-split-row-sub">
                  <span>Your share (30%)</span>
                  <span>${ownerShare.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button type="submit" className="dp-submit" disabled={submitting}>
              {submitting ? (
                <><span className="dp-spinner" /> Depositing…</>
              ) : (
                <><Icon name="check" size={16} /> Deposit USDC</>
              )}
            </button>

            <div className="dp-note">
              <Icon name="shield" size={13} />
              <span>One signature. Rent is free after the first deposit.</span>
            </div>
          </form>

          {/* ---------- RIGHT: live split preview ---------- */}
          <aside className="dp-preview">
            <span className="dp-section-eyebrow">
              <Icon name="users" size={13} />
              Who gets what
            </span>

            {investors.length === 0 ? (
              <div className="dp-empty">
                <div className="dp-empty-icon"><Icon name="spark" size={24} /></div>
                <p>No investors have bought shares yet.</p>
                <span className="dp-empty-sub">
                  Once they do, you'll see the exact payout split here as you
                  type an amount.
                </span>
              </div>
            ) : usdAmount === 0 ? (
              <div className="dp-empty">
                <p>Enter an amount to see the split.</p>
              </div>
            ) : (
              <>
                <ul className="dp-split-list">
                  {split.map((s) => (
                    <li key={s.wallet} className="dp-split-item">
                      <div className="dp-split-avatar">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="dp-split-body">
                        <span className="dp-split-name">{s.name}</span>
                        <span className="dp-split-tokens">
                          {s.tokens.toLocaleString()} shares
                        </span>
                      </div>
                      <span className="dp-split-payout">
                        ${s.payout.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="dp-split-total">
                  <span>Investors pay out</span>
                  <strong>${investorPool.toFixed(2)}</strong>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}