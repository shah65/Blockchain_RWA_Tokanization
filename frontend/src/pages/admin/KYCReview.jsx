import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../config/api";
import toast from "react-hot-toast";
import KYCBadge from "../../components/KYCBadge";
import "../KYC.css";

function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString() : "—";
}

function Field({ label, value, mono = false }) {
  return (
    <div className="kr-field">
      <span className="kr-field-label">{label}</span>
      <span className={`kr-field-value ${mono ? "kr-mono" : ""}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function ReviewCard({ row, onApprove, onReject, onViewDoc }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`kr-card ${open ? "kr-card-open" : ""}`}>
      <button className="kr-card-head" onClick={() => setOpen((o) => !o)}>
        <div className="kr-card-head-main">
          <strong>{row.kyc_full_name || row.full_name || "—"}</strong>
          <span className="kr-card-sub">
            {row.kyc_id_type} · {row.kyc_country} ·{" "}
            {row.kyc_submitted_at && new Date(row.kyc_submitted_at).toLocaleString()}
          </span>
        </div>
        <KYCBadge status="pending" size="sm" showLabel={false} />
      </button>

      {open && (
        <div className="kr-card-body">
          {/* --- Common fields --- */}
          <div className="kr-grid">
            <Field label="Wallet" value={`${row.wallet_address.slice(0, 6)}…${row.wallet_address.slice(-4)}`} mono />
            <Field label="Role" value={row.role} />
            <Field label="Full legal name" value={row.kyc_full_name} />
            <Field label="Date of birth" value={fmtDate(row.kyc_dob)} />
            <Field label="Country of residence" value={row.kyc_country} />
            <Field label="Document type" value={row.kyc_id_type} />
            <Field label="Document number" value={row.kyc_id_number} mono />
            <Field label="Issue date" value={fmtDate(row.kyc_issue_date)} />
            <Field label="Expiry date" value={fmtDate(row.kyc_expiry_date)} />

            {/* --- Conditional fields, only shown if present --- */}
            {row.kyc_id_type === "passport" && (
              <Field label="Issuing country" value={row.kyc_issuing_country} />
            )}
            {row.kyc_id_type === "national_id" && (
              <Field label="Address on ID" value={row.kyc_address} />
            )}
            {row.kyc_id_type === "drivers_license" && (
              <Field label="Issuing authority" value={row.kyc_issuing_authority} />
            )}
          </div>

          {/* --- Documents --- */}
          <div className="kr-docs">
            <button className="kr-doc-btn" onClick={() => onViewDoc(row.wallet_address, "document")}>
              View {row.kyc_id_type === "passport" ? "passport" : "front"}
            </button>
            {row.kyc_document_back_url && (
              <button className="kr-doc-btn" onClick={() => onViewDoc(row.wallet_address, "document_back")}>
                View back
              </button>
            )}
            <button className="kr-doc-btn" onClick={() => onViewDoc(row.wallet_address, "selfie")}>
              View selfie
            </button>
          </div>

          {/* --- Decision buttons --- */}
          <div className="kr-actions">
            <button
              className="kr-approve"
              onClick={() => onApprove(row.wallet_address)}
            >
              Approve
            </button>
            <button
              className="kr-reject"
              onClick={() => {
                const reason = prompt("Reason for rejection?");
                if (reason) onReject(row.wallet_address, reason);
              }}
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function KYCReview() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["kyc-pending"],
    queryFn: () => api.get("/admin/kyc/pending").then((r) => r.data.pending),
  });

  const decide = useMutation({
    mutationFn: (payload) => api.post("/admin/kyc/decide", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kyc-pending"] });
      toast.success("Decision recorded");
    },
    onError: (e) =>
      toast.error(e?.response?.data?.error?.message || e.message || "Failed"),
  });

  async function viewDoc(wallet, field) {
    try {
      const { data } = await api.get(
        `/admin/kyc/signed-url?walletAddress=${wallet}&field=${field}`
      );
      window.open(data.url, "_blank");
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e.message);
    }
  }

  return (
    <div className="kyc-shell" style={{ maxWidth: 1100 }}>
      <div className="kyc-header">
        <div>
          <span className="kyc-eyebrow">Admin</span>
          <h1 className="kyc-title">KYC Review Queue</h1>
          <p className="kyc-sub">
            Pending identity verifications. Click a card to see the submitted
            fields and open the documents side-by-side.
          </p>
        </div>
      </div>

      {isLoading && <p style={{ color: "rgba(255,255,255,0.6)" }}>Loading…</p>}

      {!isLoading && (!data || data.length === 0) && (
        <p style={{ color: "rgba(255,255,255,0.6)" }}>
          No pending submissions.
        </p>
      )}

      <div className="kr-list">
        {(data || []).map((row) => (
          <ReviewCard
            key={row.wallet_address}
            row={row}
            onApprove={(w) => decide.mutate({ walletAddress: w, status: "approved" })}
            onReject={(w, r) =>
              decide.mutate({ walletAddress: w, status: "rejected", reason: r })
            }
            onViewDoc={(w , field) => viewDoc(w, field)}
           />
        ))}
      </div>
    </div>
  );
}