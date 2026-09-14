// ============================================================================
// src/pages/owner/DepositProfitPage.jsx
// Owner deposits that month's USDC profit into the business's profit vault.
// ============================================================================
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import toast from "react-hot-toast";
import { getProgram, USDC_MINT } from "../../config/web3";
export default function DepositProfitPage() {
  const { businessPubkey } = useParams();
  const { publicKey, wallet } = useWallet();
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault();
    const usd = Number(amount);
    if (!(usd > 0)) {
      toast.error("Enter an amount greater than $0.");
      return;
    }
    setSubmitting(true);
    try {
      const program = getProgram(wallet);
      const business = new PublicKey(businessPubkey);
      const amountBaseUnits = new anchor.BN(Math.round(usd * 1_000_000));
      const ownerTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, publicKey);
      await program.methods
        .depositProfit(year, month, amountBaseUnits)
        .accounts({
          owner: publicKey,
          business,
          ownerTokenAccount,
          usdcMint: USDC_MINT,
          // profitVault + systemProgram/tokenProgram accounts resolved by
          // Anchor's account resolution based on your program's IDL seeds.
        })
        .rpc();
      toast.success(`Deposited $${usd.toFixed(2)} for ${year}-${String(month).padStart(2, "0")}`);
      navigate("/owner");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Deposit failed.");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <form className="deposit-profit-form" onSubmit={handleSubmit}>
      <h1>Deposit Monthly Profit</h1>
      <p className="form-description">
        This USDC is held in escrow and investors can claim their proportional
        share based on how many tokens they hold.
      </p>
      <label>
        Year
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
      </label>
      <label>
        Month
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>
      </label>
      <label>
        Amount (USD)
        <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? "Depositing..." : "Deposit"}
      </button>
    </form>
  );
}