const { supabaseAdmin } = require("../config/supabase");

const ADMIN_WALLETS = (process.env.ADMIN_WALLETS || "")
  .split(",").map((w) => w.trim()).filter(Boolean);

function withAdminFlag(profile) {
  if (!profile) return profile;
  return { ...profile, is_admin: ADMIN_WALLETS.includes(profile.wallet_address) };
}

async function getProfileByWallet(walletAddress) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("wallet_address", walletAddress)
    .maybeSingle();
  if (error) throw error;
  return withAdminFlag(data);
}

async function createProfileIfMissing(walletAddress, role = "investor") {
  // 1. Read first — if it exists, return it unchanged
  const { data: existing, error: readErr } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  if (readErr) throw readErr;
  if (existing) return withAdminFlag(existing);

  // 2. Doesn't exist → insert fresh row with the chosen role
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .insert({
      wallet_address: walletAddress,
      role,
      kyc_status: "not_started",
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return withAdminFlag(data);
}

async function upsertProfile(walletAddress, { role, fullName, email, phoneNumber, address, avatarUrl }) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        wallet_address: walletAddress,
        role,
        full_name: fullName,
        email,
        phone_number: phoneNumber,
        address,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "wallet_address" }
    )
    .select()
    .single();
  if (error) throw error;
  return withAdminFlag(data);
}

async function setKycStatus(walletAddress, status) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ kyc_status: status, updated_at: new Date().toISOString() })
    .eq("wallet_address", walletAddress)
    .select()
    .single();
  if (error) throw error;
  return withAdminFlag(data);
}

// ---------------------------------------------------------------------------
// KYC functions
// ---------------------------------------------------------------------------
async function submitKyc(walletAddress, payload) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({
      kyc_status: "pending",
      kyc_submitted_at: new Date().toISOString(),
      kyc_reviewed_at: null,
      kyc_rejection_reason: null,

      kyc_full_name: payload.fullName,
      kyc_dob: payload.dob,
      kyc_country: payload.country,
      kyc_id_type: payload.idType,
      kyc_id_number: payload.idNumber,

      kyc_issue_date: payload.issueDate || null,
      kyc_expiry_date: payload.expiryDate || null,
      kyc_issuing_country: payload.issuingCountry || null,
      kyc_issuing_authority: payload.issuingAuthority || null,
      kyc_address: payload.idAddress || null,

      kyc_document_url: payload.documentUrl,
      kyc_document_back_url: payload.documentBackUrl || null,
      kyc_selfie_url: payload.selfieUrl,
      kyc_selfie_frames: payload.selfieFrames || null,

      updated_at: new Date().toISOString(),
    })
    .eq("wallet_address", walletAddress)
    .select()
    .single();
  if (error) throw error;
  return withAdminFlag(data); }

async function setKycDecision(walletAddress, { status, reason, reviewerWallet }) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({
      kyc_status: status,
      kyc_rejection_reason: reason || null,
      kyc_reviewed_at: new Date().toISOString(),
      kyc_reviewer_wallet: reviewerWallet,
      updated_at: new Date().toISOString(),
    })
    .eq("wallet_address", walletAddress)
    .select()
    .single();
  if (error) throw error;
  return withAdminFlag(data);
}

async function listPendingKyc() {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(
      [
        "wallet_address",
        "role",
        "full_name",
        "kyc_status",
        "kyc_submitted_at",
        "kyc_full_name",
        "kyc_dob",
        "kyc_country",
        "kyc_id_type",
        "kyc_id_number",
        "kyc_issue_date",
        "kyc_expiry_date",
        "kyc_issuing_country",
        "kyc_issuing_authority",
        "kyc_address",
        "kyc_document_url",
        "kyc_document_back_url",
        "kyc_selfie_url",
        "kyc_selfie_frames",
      ].join(", ")
    )
    .eq("kyc_status", "pending")
    .not("kyc_submitted_at", "is", null)   // only truly-submitted rows
    .order("kyc_submitted_at", { ascending: true });
  if (error) throw error;
  return data;
}

module.exports = {
  getProfileByWallet,
  createProfileIfMissing,
  upsertProfile,
  setKycStatus,
  submitKyc,
  setKycDecision,
  listPendingKyc,
};