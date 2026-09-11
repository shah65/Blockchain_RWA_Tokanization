const businessModel = require("../models/business.model");

// POST /api/businesses (auth required, role must be business_owner)
// Body: { onchainPubkey, name, description, category, location,
//         coverImageUrl, galleryImageUrls, totalTokens, pricePerToken }
async function createBusiness(req, res) {
  try {
    const business = await businessModel.createBusinessRecord({
      ...req.body,
      ownerWallet: req.walletAddress,
    });
    res.status(201).json({ business });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/businesses  (public — marketplace browse page for investors)
async function listBusinesses(req, res) {
  try {
    const businesses = await businessModel.listActiveBusinesses();
    res.json({ businesses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/businesses/:pubkey  (public — single business detail page)
async function getBusiness(req, res) {
  try {
    const business = await businessModel.getBusinessByPubkey(req.params.pubkey);
    if (!business) return res.status(404).json({ error: "Not found" });
    res.json({ business });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/businesses/mine  (auth required — business owner dashboard)
async function listMyBusinesses(req, res) {
  try {
    const businesses = await businessModel.listBusinessesByOwner(req.walletAddress);
    res.json({ businesses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createBusiness, listBusinesses, getBusiness, listMyBusinesses };
