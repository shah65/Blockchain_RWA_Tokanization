// backend/src/models/business.model.js
const { supabaseAdmin } = require("../config/supabase");

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

async function listActiveBusinesses() {
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

async function getBusinessByPubkey(onchainPubkey) {
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .eq("onchain_pubkey", onchainPubkey)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function listBusinessesByOwner(ownerWallet) {
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .eq("owner_wallet", ownerWallet)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

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
  upsertProfitDeposit,
  createBusinessRecord,
  listActiveBusinesses,
  getBusinessByPubkey,
  listBusinessesByOwner,
  updateTokensSold,
};