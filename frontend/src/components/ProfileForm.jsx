// ============================================================================
// src/components/ProfileForm.jsx
// ============================================================================
import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../config/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

// ---- Tiny inline SVG icons (no icon library needed) ----------------------
const Icon = ({ name, className = "" }) => {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    width: 18,
    height: 18,
  };
  switch (name) {
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );
    case "phone":
      return (
        <svg {...common}>
          <path d="M4 5c0-1 1-2 2-2h2l2 5-2 1a12 12 0 0 0 5 5l1-2 5 2v2c0 1-1 2-2 2A15 15 0 0 1 4 5Z" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="M12 21s-7-6.5-7-12a7 7 0 1 1 14 0c0 5.5-7 12-7 12Z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
        </svg>
      );
    default:
      return null;
  }
};

export default function ProfileForm() {
  const { profile, refreshProfile, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from;

  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    email: profile?.email || "",
    phone_number: profile?.phone_number || "",
    address: profile?.address || "",
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ---- Progress: how many required fields are filled -------------------
  const required = role === "business_owner"
    ? ["full_name", "email", "phone_number", "address"]
    : ["full_name", "email"];
  const filled = required.filter((k) => form[k] && form[k].trim()).length;
  const progress = useMemo(
    () => Math.round((filled / required.length) * 100),
    [filled, required.length]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      await api.post("/users/profile", {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone_number: form.phone_number.trim(),
        address: form.address.trim(),
      });

      await refreshProfile().catch(() => { });

      toast.success("Profile saved!");

      const destination =
        redirectTo || (role === "business_owner" ? "/owner" : "/investor");
      navigate(destination, { replace: true });
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.error?.message ||
        err.response?.data?.error ||
        "Could not save your profile."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pf-page">
      {/* Animated gradient halo behind the card */}
      <div className="pf-vignette" aria-hidden />

      <div className="pf-card">
        {/* Header */}
        <div className="pf-header">
          <div className="pf-icon-badge">
            <Icon name="spark" />
          </div>
          <h1 className="pf-title">
            Complete your <span className="pf-title-accent">profile</span>
          </h1>
          <p className="pf-subtitle">
            {role === "business_owner"
              ? "Tell us about yourself. These details appear on your business listings."
              : "Just the basics to get you started. You can add more later."}
          </p>
        </div>

        {/* Progress bar */}
        <div className="pf-progress" aria-label={`Profile ${progress}% complete`}>
          <div className="pf-progress-track">
            <div
              className="pf-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="pf-progress-label">
            {progress === 100 ? "Ready to go" : `${progress}% complete`}
          </span>
        </div>

        {/* The form */}
        <form onSubmit={handleSubmit} className="pf-form">
          {/* Full name */}
          <div className="pf-field">
            <label htmlFor="pf-full-name" className="pf-label">
              <span className="pf-label-icon"><Icon name="user" /></span>
              <span>
                Full name
                <small className="pf-hint">How we'll address you on the platform</small>
              </span>
            </label>
            <input
              id="pf-full-name"
              type="text"
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              placeholder="Ayesha Khan"
              required
              autoComplete="name"
            />
          </div>

          {/* Email */}
          <div className="pf-field">
            <label htmlFor="pf-email" className="pf-label">
              <span className="pf-label-icon"><Icon name="mail" /></span>
              <span>
                Email
                <small className="pf-hint">For receipts and account updates</small>
              </span>
            </label>
            <input
              id="pf-email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          {/* Business-owner-only fields */}
          {role === "business_owner" && (
            <>
              <div className="pf-field">
                <label htmlFor="pf-phone" className="pf-label">
                  <span className="pf-label-icon"><Icon name="phone" /></span>
                  <span>
                    Phone number
                    <small className="pf-hint">So investors can reach you about your business</small>
                  </span>
                </label>
                <input
                  id="pf-phone"
                  type="tel"
                  value={form.phone_number}
                  onChange={(e) => update("phone_number", e.target.value)}
                  placeholder="+92 300 0000000"
                  autoComplete="tel"
                />
              </div>

              <div className="pf-field">
                <label htmlFor="pf-address" className="pf-label">
                  <span className="pf-label-icon"><Icon name="pin" /></span>
                  <span>
                    Business address
                    <small className="pf-hint">Where your business is located</small>
                  </span>
                </label>
                <input
                  id="pf-address"
                  type="text"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Lahore, Pakistan"
                  autoComplete="street-address"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="pf-submit"
            disabled={submitting || progress < 100}
          >
            {submitting ? (
              <>
                <span className="pf-spinner" /> Saving...
              </>
            ) : progress < 100 ? (
              "Fill in the required fields"
            ) : (
              "Save and continue"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}