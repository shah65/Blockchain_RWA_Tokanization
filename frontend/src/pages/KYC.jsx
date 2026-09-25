import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import {api} from "../config/api";
import LiveSelfie from "../components/LiveSelfie";
import { supabase, KYC_DOCS_BUCKET, KYC_SELFIE_BUCKET } from "../lib/supabaseClient";
import KYCBadge from "../components/KYCBadge";
import { useAuthContext } from "../context/AuthContext";
import "./KYC.css";

const STEPS = ["Personal", "Document", "Selfie"];

export default function KYC() {
  const { publicKey } = useWallet();
  const { refreshProfile } = useAuthContext();
  const navigate = useNavigate();

  const [status, setStatus] = useState(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [personal, setPersonal] = useState({
    fullName: "",
    dob: "",
    country: "",
    idType: "passport",
    idNumber: "",
    issueDate: "",
    expiryDate: "",
    issuingCountry: "",
    issuingAuthority: "",
    idAddress: "",
  });
   
  const [documentFile, setDocumentFile] = useState(null);
  const [documentBackFile, setDocumentBackFile] = useState(null);
  const [selfieResult, setSelfieResult] = useState(null);


  useEffect(() => {
    api.get("/users/kyc/status")
      .then((r) => setStatus(r.data))
      .catch(() => setStatus({ status: "not_started" }));
  }, []);

  if (!status) return null;

  const displayStatus =
    status.status === "pending" && !status.submittedAt
      ? "not_started"
      : status.status;

  const isApproved = status.status === "approved";
  const isRejected = status.status === "rejected";
  const isUnderReview = status.status === "pending" && !!status.submittedAt;

  // Only approved or truly-submitted-pending shows a terminal screen.
  if (isApproved || isUnderReview) {
    return (
      <div className="kyc-shell">
        <div className="kyc-status-card">
          <KYCBadge status={isApproved ? "approved" : "pending"} size="lg" />
          <h2>{isApproved ? "You're verified" : "Verification in progress"}</h2>
          <p>
            {isApproved
              ? "You have full access to create businesses and invest."
              : "Our compliance team is reviewing your submission. This usually takes less than 24 hours."}
          </p>
          <button className="kyc-btn-primary" onClick={() => navigate("/")}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  async function uploadFile(file, folder) {
    const wallet = publicKey.toBase58();
    const bucket = folder === "selfie" ? KYC_SELFIE_BUCKET : KYC_DOCS_BUCKET;
    const path = `${wallet}/${folder}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async function submit() {
    setBusy(true);
    try {
      if (!publicKey) throw new Error("Connect wallet first");

      const v = validatePersonal();
      if (v) throw new Error(v);

      if (!documentFile) throw new Error("Upload the front of your document");
      if (
        (personal.idType === "national_id" ||
          personal.idType === "drivers_license") &&
        !documentBackFile
      ) {
        throw new Error("Upload the back of your document");
      }
      if (!selfieResult) throw new Error("Complete the live selfie first");

      const documentUrl = await uploadFile(documentFile, "document-front");
      const documentBackUrl = documentBackFile
        ? await uploadFile(documentBackFile, "document-back")
        : null;

      const selfieBlob = dataUrlToBlob(selfieResult.finalFrame);
      const selfieAsFile = new File([selfieBlob], `selfie-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      const selfieUrl = await uploadFile(selfieAsFile, "selfie");

      const selfieFramesMeta = {
        capturedAt: new Date().toISOString(),
        count: selfieResult.frames.length,
      };

      await api.post("/users/kyc", {
        fullName: personal.fullName,
        dob: personal.dob,
        country: personal.country,
        idType: personal.idType,
        idNumber: personal.idNumber,
        issueDate: personal.issueDate || null,
        expiryDate: personal.expiryDate || null,
        issuingCountry: personal.issuingCountry || null,
        issuingAuthority: personal.issuingAuthority || null,
        idAddress: personal.idAddress || null,
        documentUrl,
        documentBackUrl,
        selfieUrl,
        selfieFrames: selfieFramesMeta,
      });

      await refreshProfile();
      toast.success("KYC submitted — under review");
      navigate("/");
    } catch (e) {
      toast.error(
        e?.response?.data?.error?.message ||
        e?.response?.data?.error ||
        e.message
      );
    } finally {
      setBusy(false);
    }
  }
  function validatePersonal() {
    const base = ["fullName", "dob", "country", "idNumber"];
    const missing = base.filter((k) => !String(personal[k] || "").trim());
    if (missing.length) return "Fill all required personal fields.";

    if (personal.idType === "passport") {
      if (!personal.issuingCountry.trim()) return "Enter the passport's issuing country.";
      if (!personal.issueDate) return "Enter the passport issue date.";
      if (!personal.expiryDate) return "Enter the passport expiry date.";
    }

    if (personal.idType === "national_id") {
      if (!personal.idAddress.trim()) return "Enter the address printed on your CNIC.";
      if (!personal.issueDate) return "Enter the CNIC issue date.";
      if (!personal.expiryDate) return "Enter the CNIC expiry date.";
    }

    if (personal.idType === "drivers_license") {
      if (!personal.issuingAuthority.trim()) return "Enter the issuing authority.";
      if (!personal.issueDate) return "Enter the license issue date.";
      if (!personal.expiryDate) return "Enter the license expiry date.";
    }

    return null;
  }
  function dataUrlToBlob(dataUrl) {
    const [meta, b64] = dataUrl.split(",");
    const mime = meta.match(/data:(.*?);/)[1];
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return new Blob([buf], { type: mime });
  }

  return (
    <div className="kyc-shell">
      <div className="kyc-header">
        <div>
          <span className="kyc-eyebrow">Identity verification</span>
          <h1 className="kyc-title">Verify your identity</h1>
          <p className="kyc-sub">
            Required to create businesses or invest. Your data is encrypted and never shared on-chain.
          </p>
        </div>
        <KYCBadge status={displayStatus} size="lg" />
      </div>

      {isRejected && (
        <div className="kyc-gate-banner">
          <div>
            <KYCBadge status="rejected" />
            <h3>Your previous submission was rejected</h3>
            <p>
              {status.rejectionReason ||
                "Please review your documents and try again."}
            </p>
          </div>
        </div>
      )}
      <div className="kyc-steps">
        {STEPS.map((label, i) => (
          <div key={label} className={`kyc-step ${i <= step ? "active" : ""}`}>
            <span className="kyc-step-num">{i + 1}</span>
            <span className="kyc-step-label">{label}</span>
          </div>
        ))}
      </div>

      <div className="kyc-card">
        {step === 0 && (
          <div className="kyc-form">
            {/* --- Fields every document type needs --- */}
            <Field label="Full legal name">
              <input
                value={personal.fullName}
                onChange={(e) => setPersonal((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Exactly as printed on your document"
              />
            </Field>

            <Field label="Date of birth">
              <input
                type="date"
                value={personal.dob}
                onChange={(e) => setPersonal((p) => ({ ...p, dob: e.target.value }))}
              />
            </Field>

            <Field label="Country of residence">
              <input
                value={personal.country}
                onChange={(e) => setPersonal((p) => ({ ...p, country: e.target.value }))}
                placeholder="PK"
              />
            </Field>

            <Field label="Document type">
              <select
                value={personal.idType}
                onChange={(e) =>
                  setPersonal((p) => ({
                    ...p,
                    idType: e.target.value,
                    // clear type-specific fields so stale data doesn't get submitted
                    issuingCountry: "",
                    issuingAuthority: "",
                    idAddress: "",
                    issueDate: "",
                    expiryDate: "",
                  }))
                }
              >
                <option value="passport">Passport</option>
                <option value="national_id">National ID</option>
                <option value="drivers_license">Driver's License</option>
              </select>
            </Field>

            {/* --- Passport-only fields --- */}
            {personal.idType === "passport" && (
              <>
                <Field label="Passport number">
                  <input
                    value={personal.idNumber}
                    onChange={(e) => setPersonal((p) => ({ ...p, idNumber: e.target.value }))}
                    placeholder="AB1234567"
                  />
                </Field>
                <Field label="Issuing country">
                  <input
                    value={personal.issuingCountry}
                    onChange={(e) => setPersonal((p) => ({ ...p, issuingCountry: e.target.value }))}
                    placeholder="Pakistan"
                  />
                </Field>
                <div className="kyc-row">
                  <Field label="Issue date">
                    <input
                      type="date"
                      value={personal.issueDate}
                      onChange={(e) => setPersonal((p) => ({ ...p, issueDate: e.target.value }))}
                    />
                  </Field>
                  <Field label="Expiry date">
                    <input
                      type="date"
                      value={personal.expiryDate}
                      onChange={(e) => setPersonal((p) => ({ ...p, expiryDate: e.target.value }))}
                    />
                  </Field>
                </div>
              </>
            )}

            {/* --- National ID-only fields --- */}
            {personal.idType === "national_id" && (
              <>
                <Field label="CNIC / National ID number">
                  <input
                    value={personal.idNumber}
                    onChange={(e) => setPersonal((p) => ({ ...p, idNumber: e.target.value }))}
                    placeholder="35202-1234567-8"
                  />
                </Field>
                <Field label="Address on the ID">
                  <input
                    value={personal.idAddress}
                    onChange={(e) => setPersonal((p) => ({ ...p, idAddress: e.target.value }))}
                    placeholder="House #, Street, City"
                  />
                </Field>
                <div className="kyc-row">
                  <Field label="Issue date">
                    <input
                      type="date"
                      value={personal.issueDate}
                      onChange={(e) => setPersonal((p) => ({ ...p, issueDate: e.target.value }))}
                    />
                  </Field>
                  <Field label="Expiry date">
                    <input
                      type="date"
                      value={personal.expiryDate}
                      onChange={(e) => setPersonal((p) => ({ ...p, expiryDate: e.target.value }))}
                    />
                  </Field>
                </div>
              </>
            )}

            {/* --- Driver's License-only fields --- */}
            {personal.idType === "drivers_license" && (
              <>
                <Field label="License number">
                  <input
                    value={personal.idNumber}
                    onChange={(e) => setPersonal((p) => ({ ...p, idNumber: e.target.value }))}
                    placeholder="LHR-12345-2024"
                  />
                </Field>
                <Field label="Issuing authority">
                  <input
                    value={personal.issuingAuthority}
                    onChange={(e) => setPersonal((p) => ({ ...p, issuingAuthority: e.target.value }))}
                    placeholder="Punjab Excise & Taxation"
                  />
                </Field>
                <div className="kyc-row">
                  <Field label="Issue date">
                    <input
                      type="date"
                      value={personal.issueDate}
                      onChange={(e) => setPersonal((p) => ({ ...p, issueDate: e.target.value }))}
                    />
                  </Field>
                  <Field label="Expiry date">
                    <input
                      type="date"
                      value={personal.expiryDate}
                      onChange={(e) => setPersonal((p) => ({ ...p, expiryDate: e.target.value }))}
                    />
                  </Field>
                </div>
              </>
            )}
          </div>
        )}
        {step === 1 && (
          <div className="kyc-form">
            {personal.idType === "passport" && (
              <>
                <Field label="Passport photo page">
                  <DropZone
                    accept="image/*,.pdf"
                    file={documentFile}
                    onChange={setDocumentFile}
                    hint="The page with your photo and MRZ lines. JPG/PNG/PDF up to 10MB."
                  />
                </Field>
              </>
            )}

            {personal.idType === "national_id" && (
              <>
                <Field label="CNIC — front">
                  <DropZone
                    accept="image/*"
                    file={documentFile}
                    onChange={setDocumentFile}
                    hint="The side with your photo and name."
                  />
                </Field>
                <Field label="CNIC — back">
                  <DropZone
                    accept="image/*"
                    file={documentBackFile}
                    onChange={setDocumentBackFile}
                    hint="The side with your address and expiry."
                  />
                </Field>
              </>
            )}

            {personal.idType === "drivers_license" && (
              <>
                <Field label="Driver's license — front">
                  <DropZone
                    accept="image/*"
                    file={documentFile}
                    onChange={setDocumentFile}
                    hint="The side with your photo and license number."
                  />
                </Field>
                <Field label="Driver's license — back">
                  <DropZone
                    accept="image/*"
                    file={documentBackFile}
                    onChange={setDocumentBackFile}
                    hint="The side with categories, issue/expiry dates."
                  />
                </Field>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="kyc-form">
            {!selfieResult ? (
              <LiveSelfie
                onCapture={setSelfieResult}
                onError={(kind) =>
                  toast.error(
                    kind === "camera"
                      ? "Camera access is required for the live selfie."
                      : "Could not start the live selfie."
                  )
                }
              />
            ) : (
              <div className="kyc-selfie-success">
                <img src={selfieResult.finalFrame} alt="Captured selfie" />
                <div className="kyc-selfie-success-actions">
                  <button
                    type="button"
                    className="kyc-btn-ghost"
                    onClick={() => setSelfieResult(null)}
                  >
                    Retake
                  </button>
                  <span>Looks good — hit Submit for review.</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="kyc-actions">
          <button className="kyc-btn-ghost" disabled={step === 0 || busy} onClick={() => setStep((s) => s - 1)}>Back</button>
          {step < STEPS.length - 1 ? (
            <button className="kyc-btn-primary" disabled={busy} onClick={() => setStep((s) => s + 1)}>Continue</button>
          ) : (
            <button className="kyc-btn-primary" disabled={busy} onClick={submit}>
              {busy ? "Submitting…" : "Submit for review"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="kyc-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function DropZone({ accept, capture, file, onChange, hint }) {
  return (
    <label className="kyc-drop">
      <input type="file" accept={accept} capture={capture}
        onChange={(e) => onChange(e.target.files?.[0] || null)} hidden />
      {file ? (
        <div className="kyc-drop-preview">
          <span>{file.name}</span>
          <span className="kyc-drop-hint">Click to replace</span>
        </div>
      ) : (
        <div className="kyc-drop-empty">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 16V4M6 10l6-6 6 6M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Click to upload</span>
          <span className="kyc-drop-hint">{hint}</span>
        </div>
      )}
    </label>
  );
}