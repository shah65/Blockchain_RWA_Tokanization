// ============================================================================
// src/components/ProfileForm.jsx
// ============================================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../config/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function ProfileForm() {
  const { profile, refreshProfile, role } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/users/profile", { full_name: fullName, email });
      await refreshProfile();
      toast.success("Profile saved!");
      navigate(role === "business_owner" ? "/owner" : "/investor");
    } catch {
      toast.error("Could not save your profile.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Complete your profile</h1>
      <label>
        Full name
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </label>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save"}
      </button>
    </form>
  );
}