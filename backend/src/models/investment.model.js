const { supabaseAdmin } = require("../config/supabase");

async function upsertInvestmentCache({ onchainPubkey, businessPubkey, investorWallet, tokensOwned, totalInvested }) {
  const { data, error } = await supabaseAdmin
    .from("investments_cache")
    .upsert(
      {
        onchain_pubkey: onchainPubkey,
        business_pubkey: businessPubkey,
        investor_wallet: investorWallet,
        tokens_owned: tokensOwned,
        total_invested: totalInvested,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "onchain_pubkey" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function listInvestorPortfolio(investorWallet) {
  const { data, error } = await supabaseAdmin
    .from("investments_cache")
    .select("*, businesses:business_pubkey (name, cover_image_url, price_per_token)")
    .eq("investor_wallet", investorWallet);

  if (error) throw error;
  return data;
}

async function recordProfitClaim({ businessPubkey, investorWallet, year, month, amountClaimed }) {
  const { data, error } = await supabaseAdmin
    .from("profit_history_cache")
    .upsert(
      {
        business_pubkey: businessPubkey,
        investor_wallet: investorWallet,
        year,
        month,
        amount_claimed: amountClaimed,
        claimed_at: new Date().toISOString(),
      },
      { onConflict: "business_pubkey,investor_wallet,year,month" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Powers the "how much did I earn in Jan / Feb / ..." chart on the
// investor dashboard.
async function getProfitHistory(investorWallet) {
  const { data, error } = await supabaseAdmin
    .from("profit_history_cache")
    .select("*")
    .eq("investor_wallet", investorWallet)
    .order("year", { ascending: true })
    .order("month", { ascending: true });

  if (error) throw error;
  return data;
}

module.exports = {
  upsertInvestmentCache,
  listInvestorPortfolio,
  recordProfitClaim,
  getProfitHistory,
};
