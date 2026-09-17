// backend/src/models/user.model.js
// -----------------------------------------------------------------------------
// All database work for the `profiles` table lives here.
// Nothing in this file knows about Express, requests, or responses.
// It just takes plain values in, and returns plain objects out.
// -----------------------------------------------------------------------------

const { supabaseAdmin } = require("../config/supabase");

// ---------------------------------------------------------------------------
// Find a profile by wallet address.
// Returns the row, or `null` if there is no row yet.
// We use .maybeSingle() so a missing row does NOT throw an error.
// ---------------------------------------------------------------------------
async function getProfileByWallet(walletAddress) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  if (error) throw error;
  return data; // may be null
}

// ---------------------------------------------------------------------------
// Create a minimal profile row for a wallet if one doesn't exist yet.
// This runs the first time a wallet ever signs in.
// The only required columns are wallet_address and role.
// ---------------------------------------------------------------------------
async function createProfileIfMissing(walletAddress, role) {
  // If it already exists, do nothing.
  const existing = await getProfileByWallet(walletAddress);
  if (existing) return existing;

  // Otherwise insert a new row with just the essentials.
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .insert({
      wallet_address: walletAddress,
      role: role,               // 'business_owner' or 'investor'
      kyc_status: "pending",    // schema default, but explicit is safer
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Save the metadata the user typed into the profile form.
// Field names use snake_case to match the DB column names exactly.
// ---------------------------------------------------------------------------
async function upsertProfile(walletAddress, fields) {
  // `fields` is a plain object from req.body — we only pull the keys we allow.
  const payload = {
    wallet_address: walletAddress,
    updated_at: new Date().toISOString(),
  };

  // Only copy keys that are actually present, so we don't wipe existing data
  // when the form only submits a subset of fields.
  const allowed = [
    "role",
    "full_name",
    "email",
    "phone_number",
    "address",
    "avatar_url",
    "kyc_document_url",
  ];
  for (const key of allowed) {
    if (fields[key] !== undefined) payload[key] = fields[key];
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .upsert(payload, { onConflict: "wallet_address" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Update KYC status — used later, when you build the admin approval flow.
// ---------------------------------------------------------------------------
async function setKycStatus(walletAddress, status) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ kyc_status: status, updated_at: new Date().toISOString() })
    .eq("wallet_address", walletAddress)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  getProfileByWallet,
  createProfileIfMissing,
  upsertProfile,
  setKycStatus,
};