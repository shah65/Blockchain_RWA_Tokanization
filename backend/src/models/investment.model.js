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

// backend/src/models/investment.model.js

async function listInvestorsByOwner(ownerWallet) {
  // 1. Get this owner's businesses
  const { data: businesses, error: bErr } = await supabaseAdmin
    .from("businesses")
    .select("onchain_pubkey, name, total_tokens, price_per_token")
    .eq("owner_wallet", ownerWallet);

  if (bErr) throw bErr;
  if (!businesses || businesses.length === 0) return [];

  const businessPubkeys = businesses.map((b) => b.onchain_pubkey);

  // 2. Get every investment into those businesses
  const { data: investments, error: iErr } = await supabaseAdmin
    .from("investments_cache")
    .select("*")
    .in("business_pubkey", businessPubkeys);

  if (iErr) throw iErr;
  if (!investments || investments.length === 0) return [];

  const investorWallets = [...new Set(investments.map((i) => i.investor_wallet))];

  // 3. Investor profiles (name, email, phone)
  const { data: profiles, error: pErr } = await supabaseAdmin
    .from("profiles")
    .select("wallet_address, full_name, email, phone_number")
    .in("wallet_address", investorWallets);

  if (pErr) throw pErr;

  // 4. Profit claimed by each investor per business
  const { data: profits, error: hErr } = await supabaseAdmin
    .from("profit_history_cache")
    .select("business_pubkey, investor_wallet, amount_claimed")
    .in("business_pubkey", businessPubkeys)
    .in("investor_wallet", investorWallets);

  if (hErr) throw hErr;

  // Build lookup maps
  const profileMap = new Map((profiles || []).map((p) => [p.wallet_address, p]));
  const businessMap = new Map(businesses.map((b) => [b.onchain_pubkey, b]));
  const profitMap = new Map();
  for (const row of profits || []) {
    const key = `${row.business_pubkey}|${row.investor_wallet}`;
    profitMap.set(key, (profitMap.get(key) || 0) + Number(row.amount_claimed || 0));
  }

  // 5. Combine into flat rows
  return investments.map((inv) => {
    const business = businessMap.get(inv.business_pubkey);
    const profile = profileMap.get(inv.investor_wallet);
    const profitClaimed = profitMap.get(`${inv.business_pubkey}|${inv.investor_wallet}`) || 0;

    return {
      investment_pda: inv.onchain_pubkey,
      business_pubkey: inv.business_pubkey,
      business_name: business?.name || "Unknown business",
      business_total_tokens: Number(business?.total_tokens || 0),
      business_price_per_token: Number(business?.price_per_token || 0),
      investor_wallet: inv.investor_wallet,
      investor_name: profile?.full_name || "—",
      investor_email: profile?.email || "—",
      investor_phone: profile?.phone_number || "—",
      tokens_owned: Number(inv.tokens_owned || 0),
      total_invested: Number(inv.total_invested || 0),
      profit_claimed: profitClaimed,
      last_synced_at: inv.last_synced_at,
    };
  });
}

async function listDepositsByOwner(ownerWallet) {
  // 1. Owner's businesses
  const { data: businesses, error: bErr } = await supabaseAdmin
    .from("businesses")
    .select("onchain_pubkey, name, total_tokens, tokens_sold")
    .eq("owner_wallet", ownerWallet);

  if (bErr) throw bErr;
  if (!businesses || businesses.length === 0) return [];

  const businessPubkeys = businesses.map((b) => b.onchain_pubkey);
  const businessMap = new Map(businesses.map((b) => [b.onchain_pubkey, b]));

  // 2. Deposits for those businesses
  const { data: deposits, error: dErr } = await supabaseAdmin
    .from("profit_deposits_cache")
    .select("*")
    .in("business_pubkey", businessPubkeys)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (dErr) throw dErr;

  // 3. Claims for those businesses
  const { data: claims, error: cErr } = await supabaseAdmin
    .from("profit_history_cache")
    .select("*")
    .in("business_pubkey", businessPubkeys);

  if (cErr) throw cErr;

  // 4. Profiles for the claimants
  const claimWallets = [...new Set((claims || []).map((c) => c.investor_wallet))];
  let profileMap = new Map();
  if (claimWallets.length > 0) {
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("wallet_address, full_name, email")
      .in("wallet_address", claimWallets);
    if (pErr) throw pErr;
    profileMap = new Map((profiles || []).map((p) => [p.wallet_address, p]));
  }

  // 5. Build the response: one row per (business, year, month)
  return (deposits || []).map((d) => {
    const business = businessMap.get(d.business_pubkey);
    const depositClaims = (claims || []).filter(
      (c) =>
        c.business_pubkey === d.business_pubkey &&
        c.year === d.year &&
        c.month === d.month
    );

    const totalDepositedUsd = Number(d.total_deposited || 0) / 1_000_000;
    const totalClaimedUsd = Number(d.total_claimed || 0) / 1_000_000;
    const investorPoolUsd =
      totalDepositedUsd * ((d.investor_share_bps || 7000) / 10_000);

    return {
      onchain_pubkey: d.onchain_pubkey,
      business_pubkey: d.business_pubkey,
      business_name: business?.name || "Unknown business",
      year: d.year,
      month: d.month,
      total_deposited: Number(d.total_deposited || 0),
      total_claimed: Number(d.total_claimed || 0),
      investor_share_bps: d.investor_share_bps || 7000,
      deposited_at: d.deposited_at,
      total_deposited_usd: totalDepositedUsd,
      total_claimed_usd: totalClaimedUsd,
      investor_pool_usd: investorPoolUsd,
      remaining_usd: investorPoolUsd - totalClaimedUsd,
      claim_count: depositClaims.length,
      claims: depositClaims.map((c) => {
        const profile = profileMap.get(c.investor_wallet);
        return {
          investor_wallet: c.investor_wallet,
          investor_name: profile?.full_name || "—",
          investor_email: profile?.email || "—",
          amount_claimed_usd: Number(c.amount_claimed || 0) / 1_000_000,
          claimed_at: c.claimed_at,
        };
      }),
    };
  });
}

async function listClaimableByInvestor(investorWallet) {
  // 1. All investments this wallet has made
  const { data: investments, error: iErr } = await supabaseAdmin
    .from("investments_cache")
    .select("business_pubkey, tokens_owned, total_invested")
    .eq("investor_wallet", investorWallet);

  if (iErr) throw iErr;
  if (!investments || investments.length === 0) return [];

  const businessPubkeys = [...new Set(investments.map((i) => i.business_pubkey))];

  // 2. All deposits for those businesses
  const { data: deposits, error: dErr } = await supabaseAdmin
    .from("profit_deposits_cache")
    .select("*")
    .in("business_pubkey", businessPubkeys)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (dErr) throw dErr;
  if (!deposits || deposits.length === 0) return [];

  // 3. Business metadata (name, total_tokens, tokens_sold)
  const { data: businesses, error: bErr } = await supabaseAdmin
    .from("businesses")
    .select("onchain_pubkey, name, total_tokens, tokens_sold")
    .in("onchain_pubkey", businessPubkeys);

  if (bErr) throw bErr;
  const businessMap = new Map((businesses || []).map((b) => [b.onchain_pubkey, b]));

  // 4. Claims this investor has already made — to exclude those deposits
  const { data: claims, error: cErr } = await supabaseAdmin
    .from("profit_history_cache")
    .select("business_pubkey, year, month")
    .eq("investor_wallet", investorWallet);

  if (cErr) throw cErr;
  const claimedSet = new Set(
    (claims || []).map((c) => `${c.business_pubkey}|${c.year}|${c.month}`)
  );

  // 5. Investment lookup by business
  const invMap = new Map(investments.map((i) => [i.business_pubkey, i]));

  // 6. Compute claimable for each deposit the investor hasn't already claimed
  const rows = [];
  for (const d of deposits) {
    const key = `${d.business_pubkey}|${d.year}|${d.month}`;
    if (claimedSet.has(key)) continue;

    const inv = invMap.get(d.business_pubkey);
    const biz = businessMap.get(d.business_pubkey);
    if (!inv || !biz) continue;

    const tokensSold = Number(biz.tokens_sold || 0);
    if (tokensSold === 0) continue;

    const investorPool =
      Number(d.total_deposited || 0) * ((d.investor_share_bps || 7000) / 10_000);

    const share =
      (investorPool * Number(inv.tokens_owned || 0)) / tokensSold;

    // On-chain uses integer lamport math, so round down to match.
    const shareBaseUnits = Math.floor(share);

    if (shareBaseUnits <= 0) continue;

    rows.push({
      business_pubkey: d.business_pubkey,
      business_name: biz.name || "Unknown business",
      deposit_pda: d.onchain_pubkey,
      year: d.year,
      month: d.month,
      tokens_owned: Number(inv.tokens_owned || 0),
      total_deposited: Number(d.total_deposited || 0),
      total_claimed: Number(d.total_claimed || 0),
      investor_pool: investorPool,
      claimable: shareBaseUnits,
      claimable_usd: shareBaseUnits / 1_000_000,
      deposited_at: d.deposited_at,
    });
  }

  return rows;
}
module.exports = {
  listDepositsByOwner,
  listInvestorsByOwner,
  upsertInvestmentCache,
  listInvestorPortfolio,
  recordProfitClaim,
  getProfitHistory,
  listClaimableByInvestor
};
