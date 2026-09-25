// ============================================================================
// src/pages/admin/FrozenAccounts.jsx
// ============================================================================
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../config/api";
import toast from "react-hot-toast";
import "../KYC.css";

function fmtDate(v) {
  return v ? new Date(v).toLocaleString() : "—";
}

export default function FrozenAccounts() {
  const qc = useQueryClient();
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-frozen"],
    queryFn: () =>
      api.get("/admin/accounts/frozen").then((r) => r.data.frozen || []),
  });

  const freeze = useMutation({
    mutationFn: (payload) => api.post("/admin/accounts/freeze", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-frozen"] });
      toast.success("Account frozen");
      setTarget("");
      setReason("");
    },
    onError: (e) =>
      toast.error(e?.response?.data?.error?.message || e.message || "Failed"),
  });

  const unfreeze = useMutation({
    mutationFn: (payload) => api.post("/admin/accounts/unfreeze", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-frozen"] });
      toast.success("Account unfrozen");
    },
    onError: (e) =>
      toast.error(e?.response?.data?.error?.message || e.message || "Failed"),
  });

  return (
    <div className="kyc-shell" style={{ maxWidth: 1100 }}>
      <div className="kyc-header">
        <div>
          <span className="kyc-eyebrow">Super-admin</span>
          <h1 className="kyc-title">Frozen accounts</h1>
          <p className="kyc-sub">
            Freeze an account to block all write actions. Unfreeze when resolved.
          </p>
        </div>
      </div>

      <div className="fa-form">
        <input
          type="text"
          placeholder="Wallet address to freeze"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="fa-input"
        />
        <input
          type="text"
          placeholder="Reason (e.g. missed deposits, fraudulent document)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="fa-input"
        />
        <button
          className="kyc-btn-primary"
          disabled={!target || !reason || freeze.isPending}
          onClick={() => freeze.mutate({ walletAddress: target, reason })}
        >
          {freeze.isPending ? "Freezing…" : "Freeze account"}
        </button>
      </div>

      <div className="kr-list" style={{ marginTop: 24 }}>
        {isLoading && (
          <p style={{ color: "rgba(255,255,255,0.6)" }}>Loading…</p>
        )}
        {!isLoading && (!data || data.length === 0) && (
          <p style={{ color: "rgba(255,255,255,0.6)" }}>
            No frozen accounts.
          </p>
        )}
        {(data || []).map((row) => (
          <div key={row.id} className="kr-card">
            <div className="kr-card-body">
              <div className="kr-grid" style={{ padding: "8px 0 16px" }}>
                <div className="kr-field">
                  <span className="kr-field-label">Wallet</span>
                  <span className="kr-field-value kr-mono">
                    {row.wallet_address.slice(0, 6)}…
                    {row.wallet_address.slice(-4)}
                  </span>
                </div>
                <div className="kr-field">
                  <span className="kr-field-label">Frozen at</span>
                  <span className="kr-field-value">
                    {fmtDate(row.frozen_at)}
                  </span>
                </div>
                <div className="kr-field">
                  <span className="kr-field-label">Frozen by</span>
                  <span className="kr-field-value kr-mono">
                    {row.frozen_by.slice(0, 6)}…{row.frozen_by.slice(-4)}
                  </span>
                </div>
                <div className="kr-field" style={{ gridColumn: "1 / -1" }}>
                  <span className="kr-field-label">Reason</span>
                  <span className="kr-field-value">{row.reason}</span>
                </div>
              </div>

              <div className="kr-actions">
                <button
                  className="kr-approve"
                  disabled={unfreeze.isPending}
                  onClick={() => {
                    const r = prompt("Reason for unfreezing?");
                    if (r)
                      unfreeze.mutate({
                        walletAddress: row.wallet_address,
                        reason: r,
                      });
                  }}
                >
                  Unfreeze
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}