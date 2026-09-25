// backend/src/models/business.model.js
const { supabaseAdmin } = require("../config/supabase");

// ---------------------------------------------------------------------------
// createBusinessRecord — now gated on owner KYC approval
// ---------------------------------------------------------------------------
async function createBusinessRecord({
  onchainPubkey,
  ownerWallet,
  name,
  description,
  category,
  location,
  coverImageUrl,
  galleryImageUrls,
  totalTokens,
  pricePerToken,
}) {
  // ---- KYC GATE ----
  const { data: profile, error: pErr } = await supabaseAdmin
    .from("profiles")
    .select("kyc_status")
    .eq("wallet_address", ownerWallet)
    .maybeSingle();

  if (pErr) throw pErr;
  if (!profile) {
    const e = new Error("Profile not found");
    e.statusCode = 400;
    throw e;
  }
  if (profile.kyc_status !== "approved") {
    const e = new Error("KYC verification required before creating a business");
    e.statusCode = 403;
    e.code = "KYC_REQUIRED";
    throw e;
  }

  // ---- Insert ----
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .insert({
      onchain_pubkey: onchainPubkey,
      owner_wallet: ownerWallet,
      name,
      description,
      category,
      location,
      cover_image_url: coverImageUrl,
      gallery_image_urls: galleryImageUrls,
      total_tokens: totalTokens,
      price_per_token: pricePerToken,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// listActiveBusinesses — returns only businesses whose owner is KYC approved
// ---------------------------------------------------------------------------
async function listActiveBusinesses() {
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Fetch the KYC status of every owner in one query
  const wallets = [...new Set(data.map((b) => b.owner_wallet))];
  const { data: profs, error: pErr } = await supabaseAdmin
    .from("profiles")
    .select("wallet_address, kyc_status, full_name")
    .in("wallet_address", wallets);

  if (pErr) throw pErr;

  const byWallet = Object.fromEntries((profs || []).map((p) => [p.wallet_address, p]));

  // Only return businesses whose owner is approved
  return data
    .filter((b) => byWallet[b.owner_wallet]?.kyc_status === "approved")
    .map((b) => ({
      ...b,
      owner_profile: byWallet[b.owner_wallet] || null,
      owner_kyc_verified: true,
    }));
}

// ---------------------------------------------------------------------------
// getBusinessByPubkey — includes owner KYC info so the badge can be shown
// ---------------------------------------------------------------------------
async function getBusinessByPubkey(onchainPubkey) {
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .eq("onchain_pubkey", onchainPubkey)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("wallet_address, kyc_status, full_name")
    .eq("wallet_address", data.owner_wallet)
    .maybeSingle();

  return {
    ...data,
    owner_profile: profile || null,
    owner_kyc_verified: profile?.kyc_status === "approved",
  };
}

// ---------------------------------------------------------------------------
// listBusinessesByOwner — unchanged (owner sees their own businesses regardless)
// ---------------------------------------------------------------------------
async function listBusinessesByOwner(ownerWallet) {
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .eq("owner_wallet", ownerWallet)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// updateTokensSold — unchanged
// ---------------------------------------------------------------------------
async function updateTokensSold(onchainPubkey, tokensSold) {
  const { error } = await supabaseAdmin
    .from("businesses")
    .update({
      tokens_sold: tokensSold,
      updated_at: new Date().toISOString(),
    })
    .eq("onchain_pubkey", onchainPubkey);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// upsertProfitDeposit — unchanged
// ---------------------------------------------------------------------------
async function upsertProfitDeposit({
  onchainPubkey,
  businessPubkey,
  year,
  month,
  totalDeposited,
  totalClaimed,
  investorShareBps,
}) {
  const { data, error } = await supabaseAdmin
    .from("profit_deposits_cache")
    .upsert(
      {
        onchain_pubkey: onchainPubkey,
        business_pubkey: businessPubkey,
        year,
        month,
        total_deposited: totalDeposited,
        total_claimed: totalClaimed,
        investor_share_bps: investorShareBps,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "business_pubkey,year,month" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  createBusinessRecord,
  listActiveBusinesses,
  getBusinessByPubkey,
  listBusinessesByOwner,
  updateTokensSold,
  upsertProfitDeposit,
};