// backend/src/controller/investment.controller.js
const investmentModel = require("../models/investment.model");
const businessModel = require("../models/business.model");

// GET /api/investments/portfolio  (auth required)
async function getPortfolio(req, res) {
  try {
    const portfolio = await investmentModel.listInvestorPortfolio(req.walletAddress);
    res.json({ portfolio });
  } catch (err) {
    console.error("[getPortfolio] failed:", err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/investments/profit-history  (auth required)
async function getProfitHistory(req, res) {
  try {
    const history = await investmentModel.getProfitHistory(req.walletAddress);
    res.json({ history });
  } catch (err) {
    console.error("[getProfitHistory] failed:", err);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/investments/sync  (internal — indexer)
async function syncInvestment(req, res) {
  try {
    const record = await investmentModel.upsertInvestmentCache(req.body);
    res.json({ record });
  } catch (err) {
    console.error("[syncInvestment] failed:", err);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/investments/record  (auth required)
// Called by the frontend right after buy_tokens confirms on-chain.
async function recordPurchase(req, res) {
  try {
    const {
      businessPubkey,
      investmentPda,
      tokensOwned,
      totalInvested,
      businessTokensSold,
    } = req.body;

    // Never trust the client for the wallet — it comes from the JWT.
    const investorWallet = req.walletAddress;

    const record = await investmentModel.upsertInvestmentCache({
      onchainPubkey: investmentPda,
      businessPubkey,
      investorWallet,
      tokensOwned: Number(tokensOwned),
      totalInvested: Number(totalInvested),
    });

    if (businessTokensSold !== undefined && businessTokensSold !== null) {
      await businessModel.updateTokensSold(
        businessPubkey,
        Number(businessTokensSold)
      );
    }

    res.json({ record });
  } catch (err) {
    console.error("[recordPurchase] failed:", err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/investments/by-owner  (auth required)
// Returns every investor across every business owned by the caller.
async function listInvestorsForOwner(req, res) {
  try {
    const investors = await investmentModel.listInvestorsByOwner(req.walletAddress);
    res.json({ investors });
  } catch (err) {
    console.error("[listInvestorsForOwner] failed:", err);
    res.status(500).json({ error: err.message });
  }
}
// GET /api/investments/deposits-by-owner  (auth required)
async function listDepositsForOwner(req, res) {
  try {
    const deposits = await investmentModel.listDepositsByOwner(req.walletAddress);
    res.json({ deposits });
  } catch (err) {
    console.error("[listDepositsForOwner] failed:", err);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/investments/deposit-record  (auth required)
// Called by the frontend right after deposit_profit confirms on-chain.
async function recordDeposit(req, res) {
  try {
    const {
      businessPubkey,
      depositPda,
      year,
      month,
      totalDeposited,
      investorShareBps,
    } = req.body;

    // Verify the caller owns the business they're recording a deposit for
    const business = await businessModel.getBusinessByPubkey(businessPubkey);
    if (!business) return res.status(404).json({ error: "Business not found" });
    if (business.owner_wallet !== req.walletAddress) {
      return res.status(403).json({ error: "Not your business" });
    }

    const record = await businessModel.upsertProfitDeposit({
      onchainPubkey: depositPda,
      businessPubkey,
      year,
      month,
      totalDeposited: Number(totalDeposited),
      totalClaimed: 0,
      investorShareBps: Number(investorShareBps || 7000),
    });

    res.json({ record });
  } catch (err) {
    console.error("[recordDeposit] failed:", err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/investments/claimable  (auth required)
async function listClaimable(req, res) {
  try {
    const rows = await investmentModel.listClaimableByInvestor(req.walletAddress);
    res.json({ claimable: rows });
  } catch (err) {
    console.error("[listClaimable] failed:", err);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/investments/record-claim  (auth required)
// Called by the frontend right after claim_profit confirms on-chain.
async function recordClaim(req, res) {
  try {
    const {
      businessPubkey,
      year,
      month,
      amountClaimed,
    } = req.body;

    const investorWallet = req.walletAddress;

    await investmentModel.recordProfitClaim({
      businessPubkey,
      investorWallet,
      year,
      month,
      amountClaimed: Number(amountClaimed),
    });

    // Also bump the deposit's total_claimed so the owner's view stays in sync.
    // Fetch current, add, and upsert.
    const { data: existing, error: fetchErr } = await require("../config/supabase")
      .supabaseAdmin
      .from("profit_deposits_cache")
      .select("total_claimed, total_deposited")
      .eq("business_pubkey", businessPubkey)
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (existing) {
      const newClaimed =
        Number(existing.total_claimed || 0) + Number(amountClaimed);

      await require("../config/supabase")
        .supabaseAdmin
        .from("profit_deposits_cache")
        .update({
          total_claimed: newClaimed,
          last_synced_at: new Date().toISOString(),
        })
        .eq("business_pubkey", businessPubkey)
        .eq("year", year)
        .eq("month", month);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[recordClaim] failed:", err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listClaimable,     // ← add
  recordClaim,
  getPortfolio,
  getProfitHistory,
  syncInvestment,
  recordPurchase,
  listInvestorsForOwner,
  listDepositsForOwner,   // ← add
  recordDeposit,          // ← add
};