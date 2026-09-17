// ============================================================================
// src/pages/investor/MarketplacePage.jsx
// Public listing of active businesses (off-chain data), each with a
// "Buy Tokens" action that submits the on-chain buy_tokens instruction.
// ============================================================================
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import toast from "react-hot-toast";
import { api } from "../../config/api";
import { getProgram, pdas, USDC_MINT } from "../../config/web3";
import Spinner from "../../components/Spinner";
export default function MarketplacePage() {
  const { publicKey, wallet } = useWallet();
  const [businesses, setBusinesses] = useState(null);
  const [buyAmounts, setBuyAmounts] = useState({});
  const [submittingFor, setSubmittingFor] = useState(null);
  useEffect(() => {
    api
      .get("/businesses")
      .then(({ data }) => setBusinesses(data.businesses))
      .catch(() => toast.error("Could not load businesses."));
  }, []);
  async function handleBuy(business) {
    const amountStr = buyAmounts[business.onchain_pubkey];
    const amount = Number(amountStr); if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("Enter a whole number of tokens greater than 0.");
      return;
    }
    setSubmittingFor(business.onchain_pubkey);
    try {
      const program = getProgram(wallet);
      const businessPubkey = new PublicKey(business.onchain_pubkey);
      const ownerPubkey = new PublicKey(business.owner_wallet);
      const investorProfilePda = pdas.userProfile(publicKey);
      const vaultPda = pdas.vault(businessPubkey);
      const investmentPda = pdas.investment(businessPubkey, publicKey);
      const investorTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, publicKey);
      const ownerTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, ownerPubkey);
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
      toast.success(`Bought ${amount} tokens of ${business.name}!`);
      setBuyAmounts((prev) => ({ ...prev, [business.onchain_pubkey]: "" }));
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Purchase failed.");
    } finally {
      setSubmittingFor(null);
    }
  }
  if (businesses === null) return <Spinner label="Loading marketplace..." />;
  return (
    <div className="marketplace">
      <h1>Marketplace</h1>
      <div className="business-grid">
        {businesses.map((b) => (
          <div className="business-card" key={b.onchain_pubkey}>
            {b.cover_image_url && <img src={b.cover_image_url} alt={b.name} />}
            <h3>{b.name}</h3>
            <p>{b.description}</p>
            <div className="business-stats">
              <span>${(b.price_per_token / 1_000_000).toFixed(2)} / token</span>
              <span>{b.total_tokens} total tokens</span>
            </div>
            <div className="buy-row">
              <input
                type="number"
                min="1"
                placeholder="Tokens"
                value={buyAmounts[b.onchain_pubkey] || ""}
                onChange={(e) =>
                  setBuyAmounts((prev) => ({ ...prev, [b.onchain_pubkey]: e.target.value }))
                }
              />
              <button
                className="primary-button"
                disabled={submittingFor === b.onchain_pubkey}
                onClick={() => handleBuy(b)}
              >
                {submittingFor === b.onchain_pubkey ? "Buying..." : "Buy"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}