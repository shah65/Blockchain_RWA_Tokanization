// src/pages/Profile.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../config/api";
import toast from "react-hot-toast";
import KYCBadge from "../components/KYCBadge";
import { useAuthContext } from "../context/AuthContext";
import "./KYC.css";

export default function Profile() {
  const { profile, refreshProfile } = useAuthContext();
  const [form, setForm] = useState({
    role: "", fullName: "", email: "", phoneNumber: "", address: "", avatarUrl: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        role: profile.role || "",
        fullName: profile.full_name || "",
        email: profile.email || "",
        phoneNumber: profile.phone_number || "",
        address: profile.address || "",
        avatarUrl: profile.avatar_url || "",
      });
    }
  }, [profile]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/users/profile", form);
      await refreshProfile();
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kyc-shell" style={{ maxWidth: 640 }}>
      <div className="kyc-header">
        <div>
          <span className="kyc-eyebrow">Account</span>
          <h1 className="kyc-title">Profile</h1>
          <p className="kyc-sub">Manage your personal information and identity verification.</p>
        </div>
        <KYCBadge status={profile?.kyc_status || "not_started"} size="lg" />
      </div>

      {/* KYC card */}
      <div className="kyc-card" style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
        <div>
          <span className="kyc-eyebrow" style={{ fontSize: "0.7rem" }}>Identity verification</span>
          <div style={{ marginTop: 8 }}>
            <KYCBadge status={profile?.kyc_status || "not_started"} size="lg" />
          </div>
        </div>
        {profile?.kyc_status !== "approved" && (
          <Link to="/kyc" className="kyc-btn-primary">
            {profile?.kyc_status === "pending" ? "View status" : "Verify identity"}
          </Link>
        )}
      </div>

      {/* Profile form */}
      <form onSubmit={save} className="kyc-card">
        <div className="kyc-form">
          <label className="kyc-field">
            <span>Wallet</span>
            <input value={profile?.wallet_address || ""} disabled />
          </label>

          <label className="kyc-field">
            <span>Role</span>
            <input value={form.role} disabled />
          </label>

          <label className="kyc-field">
            <span>Full name</span>
            <input value={form.fullName} onChange={set("fullName")} placeholder="Your name" />
          </label>

          <label className="kyc-field">
            <span>Email</span>
            <input value={form.email} onChange={set("email")} placeholder="you@example.com" />
          </label>

          <label className="kyc-field">
            <span>Phone</span>
            <input value={form.phoneNumber} onChange={set("phoneNumber")} placeholder="+92..." />
          </label>

          <label className="kyc-field">
            <span>Address</span>
            <input value={form.address} onChange={set("address")} placeholder="City, Country" />
          </label>

          <label className="kyc-field">
            <span>Avatar URL</span>
            <input value={form.avatarUrl} onChange={set("avatarUrl")} placeholder="https://..." />
          </label>
        </div>

        <div className="kyc-actions">
          <span />
          <button className="kyc-btn-primary" disabled={busy} type="submit">
            {busy ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}