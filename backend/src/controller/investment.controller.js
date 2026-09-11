// ============================================================================
// controllers/investmentController.js
// Investor-facing read endpoints, backed by the *_cache tables that mirror
// on-chain state (kept fresh by utils/indexer.js).
// ============================================================================

const investmentModel = require("../models/investment.model");

// GET /api/investments/portfolio (auth required)
// "Which businesses have I bought tokens in, and how much" — the investor dashboard.
async function getPortfolio(req, res) {
  try {
    const portfolio = await investmentModel.listInvestorPortfolio(req.walletAddress);
    res.json({ portfolio });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/investments/profit-history (auth required)
// "How much did I earn in January, February, etc." chart data.
async function getProfitHistory(req, res) {
  try {
    const history = await investmentModel.getProfitHistory(req.walletAddress);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/investments/sync (internal — called by the indexer job, or by
// the frontend right after a buy_tokens / claim_profit tx confirms, to
// eagerly warm the cache instead of waiting for the next indexer pass).
async function syncInvestment(req, res) {
  try {
    const record = await investmentModel.upsertInvestmentCache(req.body);
    res.json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getPortfolio, getProfitHistory, syncInvestment };
