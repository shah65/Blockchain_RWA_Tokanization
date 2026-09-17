// ============================================================================
// src/pages/owner/CreateBusinessPage.jsx
// ============================================================================
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import toast from "react-hot-toast";
import { getProgram, pdas, USDC_MINT } from "../../config/web3";
import { api } from "../../config/api";

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
    case "text":
      return <svg {...p}><path d="M4 6h16M4 12h16M4 18h10" /></svg>;
    case "tag":
      return <svg {...p}><path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.2" /></svg>;
    case "pin":
      return <svg {...p}><path d="M12 21s-7-6.5-7-12a7 7 0 1 1 14 0c0 5.5-7 12-7 12Z" /><circle cx="12" cy="9" r="2.4" /></svg>;
    case "coins":
      return <svg {...p}><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></svg>;
    case "dollar":
      return <svg {...p}><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
    case "spark":
      return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
    case "shield":
      return <svg {...p}><path d="M12 3 4 6v6c0 4.5 3.4 8.6 8 9 4.6-.4 8-4.5 8-9V6l-8-3Z" /></svg>;
    case "send":
      return <svg {...p}><path d="m22 2-7 20-4-9-9-4 20-7Z" /></svg>;
    default:
      return null;
  }
}

const CATEGORIES = [
  "Restaurant", "Retail", "Real Estate", "Manufacturing",
  "Services", "Tech", "Agriculture", "Other",
];

const initialForm = {
  name: "",
  description: "",
  category: "",
  location: "",
  totalTokens: "",
  pricePerToken: "",
};

export default function CreateBusinessPage() {
  const { publicKey, wallet } = useWallet();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Progress
  const required = ["name", "description", "category", "location", "totalTokens", "pricePerToken"];
  const filled = required.filter((k) => form[k] && String(form[k]).trim()).length;
  const progress = Math.round((filled / required.length) * 100);

  // Totals preview
  const totalRaise = useMemo(() => {
    const t = Number(form.totalTokens);
    const p = Number(form.pricePerToken);
    if (!Number.isFinite(t) || !Number.isFinite(p) || t <= 0 || p <= 0) return null;
    return t * p;
  }, [form.totalTokens, form.pricePerToken]);

  function validate() {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Give your business a name (2+ characters).";
    if (form.description.trim().length < 10) e.description = "Describe your business (10+ characters).";
    if (!form.category) e.category = "Pick a category.";
    if (form.location.trim().length < 2) e.location = "Where is the business located?";
    const t = Number(form.totalTokens);
    if (!Number.isInteger(t) || t <= 0) e.totalTokens = "Enter a whole number greater than 0.";
    const p = Number(form.pricePerToken);
    if (!(p > 0)) e.pricePerToken = "Enter a price greater than $0.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    if (!USDC_MINT) {
      toast.error("Test USDC mint not configured. Set VITE_USDC_MINT in .env");
      return;
    }
    setSubmitting(true);
    try {
      const program = getProgram(wallet);
      const businessId = new anchor.BN(Date.now());
      const totalTokens = new anchor.BN(form.totalTokens);
      const pricePerToken = new anchor.BN(Math.round(Number(form.pricePerToken) * 1_000_000));

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
      await api.post("/businesses/create", {
        onchainPubkey: businessPda.toBase58(),
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        location: form.location.trim(),
        totalTokens: form.totalTokens,
        pricePerToken: pricePerToken.toString(),
      });

      toast.success("Business listed on the marketplace!");
      navigate("/owner");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to create business.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="cb-page">
      <div className="cb-halo" aria-hidden />

      <div className="cb-grid">
        {/* ============== LEFT: the form ============== */}
        <div className="cb-panel">
          <div className="cb-panel-header">
            <div className="cb-icon-badge"><Icon name="spark" size={22} /></div>
            <h1 className="cb-title">
              Tokenize your <span className="cb-title-accent">business</span>
            </h1>
            <p className="cb-subtitle">
              Fill in the details below. When you submit, one signature creates
              your business and its USDC vault on Solana, then lists it on the
              marketplace.
            </p>
          </div>

          <div className="cb-progress">
            <div className="cb-progress-track">
              <div className="cb-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="cb-progress-label">
              {progress === 100 ? "Ready to launch" : `${progress}% complete`}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="cb-form" noValidate>
            {/* ---- Identity ---- */}
            <div className="cb-section">
              <span className="cb-section-eyebrow">Identity</span>

              <div className="cb-field">
                <label className="cb-label">
                  <span className="cb-label-icon"><Icon name="store" /></span>
                  <span>
                    Business name
                    <small className="cb-hint">What investors will see first</small>
                  </span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Aroma Café"
                  maxLength={120}
                />
                {errors.name && <span className="cb-error">{errors.name}</span>}
              </div>

              <div className="cb-field">
                <label className="cb-label">
                  <span className="cb-label-icon"><Icon name="text" /></span>
                  <span>
                    Description
                    <small className="cb-hint">A short pitch (10–1000 chars)</small>
                  </span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="A specialty coffee shop serving hand-roasted beans in the heart of Lahore."
                  maxLength={1000}
                  rows={4}
                />
                {errors.description && <span className="cb-error">{errors.description}</span>}
              </div>

              <div className="cb-row">
                <div className="cb-field">
                  <label className="cb-label">
                    <span className="cb-label-icon"><Icon name="tag" /></span>
                    <span>
                      Category
                      <small className="cb-hint">Helps investors find you</small>
                    </span>
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                  >
                    <option value="">Choose…</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {errors.category && <span className="cb-error">{errors.category}</span>}
                </div>

                <div className="cb-field">
                  <label className="cb-label">
                    <span className="cb-label-icon"><Icon name="pin" /></span>
                    <span>
                      Location
                      <small className="cb-hint">City / region</small>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                    placeholder="Lahore, Pakistan"
                  />
                  {errors.location && <span className="cb-error">{errors.location}</span>}
                </div>
              </div>
            </div>

            {/* ---- Tokenization ---- */}
            <div className="cb-section">
              <span className="cb-section-eyebrow">Tokenization</span>

              <div className="cb-row">
                <div className="cb-field">
                  <label className="cb-label">
                    <span className="cb-label-icon"><Icon name="coins" /></span>
                    <span>
                      Total shares
                      <small className="cb-hint">How many tokens exist in total</small>
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.totalTokens}
                    onChange={(e) => update("totalTokens", e.target.value)}
                    placeholder="1000"
                  />
                  {errors.totalTokens && <span className="cb-error">{errors.totalTokens}</span>}
                </div>

                <div className="cb-field">
                  <label className="cb-label">
                    <span className="cb-label-icon"><Icon name="dollar" /></span>
                    <span>
                      Price per token (USD)
                      <small className="cb-hint">What each share costs</small>
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.pricePerToken}
                    onChange={(e) => update("pricePerToken", e.target.value)}
                    placeholder="1.50"
                  />
                  {errors.pricePerToken && <span className="cb-error">{errors.pricePerToken}</span>}
                </div>
              </div>
            </div>

            <button type="submit" className="cb-submit" disabled={submitting || progress < 100}>
              {submitting ? (
                <><span className="cb-spinner" /> Creating on Solana…</>
              ) : progress < 100 ? (
                `Fill ${required.length - filled} more field${required.length - filled === 1 ? "" : "s"}`
              ) : (
                <><Icon name="send" size={16} /> Create & list business</>
              )}
            </button>

            <div className="cb-assurance">
              <Icon name="shield" size={14} />
              <span>One signature. Your wallet pays only the Solana network fee.</span>
            </div>
          </form>
        </div>

        {/* ============== RIGHT: live preview ============== */}
        <aside className="cb-preview">
          <span className="cb-section-eyebrow">Live preview</span>

          <div className="cb-preview-card">
            <div className="cb-preview-cover">
              <span className="cb-preview-badge">{form.category || "Category"}</span>
            </div>
            <div className="cb-preview-body">
              <h3 className="cb-preview-name">
                {form.name || "Your business name"}
              </h3>
              <p className="cb-preview-desc">
                {form.description || "A short description will appear here once you start typing."}
              </p>
              <div className="cb-preview-meta">
                <span><Icon name="pin" size={12} /> {form.location || "Location"}</span>
              </div>
              <div className="cb-preview-stats">
                <div>
                  <span className="cb-preview-stat-label">Shares</span>
                  <span className="cb-preview-stat-value">{form.totalTokens || "—"}</span>
                </div>
                <div>
                  <span className="cb-preview-stat-label">Per token</span>
                  <span className="cb-preview-stat-value">
                    {form.pricePerToken ? `$${Number(form.pricePerToken).toFixed(2)}` : "—"}
                  </span>
                </div>
              </div>

              {totalRaise !== null && (
                <div className="cb-preview-total">
                  <span>Total raise if fully sold</span>
                  <strong>
                    ${totalRaise.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </strong>
                </div>
              )}
            </div>
          </div>

          <div className="cb-note">
            <Icon name="shield" size={14} />
            <p>
              <strong>On-chain:</strong> share count and price — the money math
              is trustless.
            </p>
          </div>
          <div className="cb-note">
            <Icon name="text" size={14} />
            <p>
              <strong>Off-chain:</strong> name, description, category, location —
              cheap to edit later.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}