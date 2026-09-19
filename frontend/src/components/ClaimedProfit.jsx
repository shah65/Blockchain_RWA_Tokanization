// ============================================================================
// src/components/ClaimableProfit.jsx
// Lists every unclaimed deposit for the logged-in investor and lets them
// claim each one. Runs the on-chain `claim_profit` instruction.
// ============================================================================
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import toast from "react-hot-toast";
import { getProgram, pdas } from "../config/web3";
import { api } from "../config/api";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function Icon({ name, size = 18 }) {
  const p = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.8,
    strokeLinecap: "round", strokeLinejoin: "round",
  };
  switch (name) {
    case "gift":
      return <svg {...p}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" /><path d="M8 8a3 3 0 1 1 4-3 3 3 0 1 1 4 3" /></svg>;
    case "spark":
      return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
    case "check":
      return <svg {...p}><path d="m20 6-11 11L4 12" /></svg>;
    default:
      return null;
  }
}

export default function ClaimableProfit({ onClaimed }) {
  const { publicKey, wallet } = useWallet();
  const [rows, setRows] = useState(null);
  const [busyPda, setBusyPda] = useState(null);

  async function load() {
    try {
      const { data } = await api.get("/investments/claimable");
      setRows(data.claimable || []);
    } catch (err) {
      console.error(err);
      toast.error("Could not load claimable profit.");
      setRows([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleClaim(row) {
    if (!publicKey) {
      toast.error("Connect your wallet first.");
      return;
    }
    setBusyPda(row.deposit_pda);
    try {
      const program = getProgram(wallet);
      const businessPubkey = new PublicKey(row.business_pubkey);
      const investmentPda = pdas.investment(businessPubkey, publicKey);
      const depositPda = new PublicKey(row.deposit_pda);

      await program.methods
        .claimProfit(row.year, row.month)
        .accounts({
          investor: publicKey,
          business: businessPubkey,
          investment: investmentPda,
          profitDeposit: depositPda,
        })
        .rpc();

      toast.success(
        `Claimed $${row.claimable_usd.toFixed(2)} for ${MONTH_NAMES[row.month - 1]} ${row.year}`
      );

      // Mirror to Supabase so the owner's deposits page and the investor's
      // portfolio history both update.
      try {
        await api.post("/investments/record-claim", {
          businessPubkey: row.business_pubkey,
          year: row.year,
          month: row.month,
          amountClaimed: row.claimable,
        });
      } catch (syncErr) {
        console.error("[claim] failed to sync to Supabase:", syncErr);
        toast.error("Claimed on-chain, but the history may be stale.");
      }

      // Remove from the local list immediately
      setRows((prev) => prev.filter((r) => r.deposit_pda !== row.deposit_pda));

      // Notify parent so the portfolio can refresh
      onClaimed?.();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Claim failed.");
    } finally {
      setBusyPda(null);
    }
  }

  if (rows === null) {
    return (
      <div className="cl-card">
        <div className="cl-head">
          <div className="cl-icon"><Icon name="gift" size={18} /></div>
          <div>
            <h3 className="cl-title">Claimable profit</h3>
            <p className="cl-sub">Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="cl-card cl-card-empty">
        <div className="cl-head">
          <div className="cl-icon"><Icon name="spark" size={18} /></div>
          <div>
            <h3 className="cl-title">Claimable profit</h3>
            <p className="cl-sub">
              Nothing to claim right now. New payouts will appear here as soon
              as businesses deposit them.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalClaimable = rows.reduce((s, r) => s + r.claimable_usd, 0);

  return (
    <div className="cl-card">
      <div className="cl-head">
        <div className="cl-icon"><Icon name="gift" size={18} /></div>
        <div className="cl-head-body">
          <h3 className="cl-title">Claimable profit</h3>
          <p className="cl-sub">
            {rows.length} month{rows.length === 1 ? "" : "s"} available ·{" "}
            <strong>${totalClaimable.toFixed(2)}</strong> total
          </p>
        </div>
      </div>

      <ul className="cl-list">
        {rows.map((r) => (
          <li key={r.deposit_pda} className="cl-item">
            <div className="cl-item-period">
              <span className="cl-item-month">{MONTH_NAMES[r.month - 1]}</span>
              <span className="cl-item-year">{r.year}</span>
            </div>
            <div className="cl-item-body">
              <span className="cl-item-biz">{r.business_name}</span>
              <span className="cl-item-meta">
                {r.tokens_owned.toLocaleString()} shares
              </span>
            </div>
            <span className="cl-item-amount">
              ${r.claimable_usd.toFixed(2)}
            </span>
            <button
              className="cl-item-btn"
              onClick={() => handleClaim(r)}
              disabled={busyPda === r.deposit_pda}
            >
              {busyPda === r.deposit_pda ? (
                <span className="cl-spinner" />
              ) : (
                <><Icon name="check" size={14} /> Claim</>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}