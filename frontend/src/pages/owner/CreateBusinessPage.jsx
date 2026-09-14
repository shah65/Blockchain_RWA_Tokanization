// ============================================================================
// src/pages/owner/CreateBusinessPage.jsx
// Two-step create flow: (1) on-chain create_business + vault init,
// (2) off-chain metadata save to Supabase, keyed by the new Business PDA.
// ============================================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@anchor-lang/core";
import { SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import toast from "react-hot-toast";
import { getProgram, pdas, USDC_MINT } from "../../config/web3";
import { api } from "../../config/api";
const initialForm = {
  name: "",
  description: "",
  category: "",
  location: "",
  totalTokens: "",
  pricePerToken: "", // entered as dollars, converted to USDC base units before submit
};
export default function CreateBusinessPage() {
  const { publicKey, wallet } = useWallet();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function validate() {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Business name is required.";
    if (form.description.trim().length < 10) e.description = "Add a short description (10+ characters).";
    const total = Number(form.totalTokens);
    if (!Number.isInteger(total) || total <= 0) e.totalTokens = "Enter a whole number greater than 0.";
    const price = Number(form.pricePerToken);
    if (!(price > 0)) e.pricePerToken = "Enter a price greater than $0.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const program = getProgram(wallet);
      const businessId = new anchor.BN(Date.now()); // simple unique id per owner; swap for a counter if you prefer sequential ids
      const totalTokens = new anchor.BN(form.totalTokens);
      const pricePerToken = new anchor.BN(Math.round(Number(form.pricePerToken) * 1_000_000)); // USDC has 6 decimals
      const ownerProfilePda = pdas.userProfile(publicKey);
      const businessPda = pdas.business(publicKey, businessId);
      const vaultPda = pdas.vault(businessPda);
      // ---- Step 1: on-chain ----
      await program.methods
        .createBusiness(businessId, totalTokens, pricePerToken)
        .accounts({
          owner: publicKey,
          ownerProfile: ownerProfilePda,
          business: businessPda,
          usdcMint: USDC_MINT,
          vault: vaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      toast.success("Business created on-chain!");
      // ---- Step 2: off-chain metadata ----
      await api.post("/businesses", {
        onchainPubkey: businessPda.toBase58(),
        name: form.name,
        description: form.description,
        category: form.category,
        location: form.location,
        totalTokens: form.totalTokens,
        pricePerToken: pricePerToken.toString(),
      });
      toast.success("Business listed!");
      navigate("/owner");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to create business.");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <form className="create-business-form" onSubmit={handleSubmit} noValidate>
      <h1>Create a Business</h1>
      <p className="form-description">
        This creates your business on-chain (with its own USDC escrow vault)
        and lists it for investors to browse.
      </p>
      <label>
        Business name
        <input value={form.name} onChange={(e) => update("name", e.target.value)} maxLength={120} />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </label>
      <label>
        Description
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          maxLength={1000}
          rows={4} />
        {errors.description && <span className="field-error">{errors.description}</span>}
      </label>
      <label>
        Category
        <input value={form.category} onChange={(e) => update("category", e.target.value)} placeholder="e.g. Restaurant" />
      </label>
      <label>
        Location
        <input value={form.location} onChange={(e) => update("location", e.target.value)} />
      </label>
      <label>
        Total tokens (total shares available)
        <input
          type="number"
          min="1"
          value={form.totalTokens}
          onChange={(e) => update("totalTokens", e.target.value)}
        />
        {errors.totalTokens && <span className="field-error">{errors.totalTokens}</span>}
      </label>
      <label>
        Price per token (USD)
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={form.pricePerToken}
          onChange={(e) => update("pricePerToken", e.target.value)}
        />
        {errors.pricePerToken && <span className="field-error">{errors.pricePerToken}</span>}
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? "Creating..." : "Create Business"}
      </button>
    </form>
  );
}