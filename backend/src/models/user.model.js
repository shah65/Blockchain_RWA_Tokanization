const { supabaseAdmin } = require("../config/supabase");

async function getProfileByWallet(walletAddress) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("wallet_address", walletAddress)
    .maybeSingle(); // returns null instead of erroring if not found

  if (error) throw error;
  return data;
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
  return data;
}

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

module.exports = { getProfileByWallet, upsertProfile, setKycStatus };
