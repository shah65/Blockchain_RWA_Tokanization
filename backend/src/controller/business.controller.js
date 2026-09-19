// backend/src/controller/business.controller.js
const businessModel = require("../models/business.model");

// POST /api/businesses/create  (auth required)
async function createBusiness(req, res) {
  try {
    const business = await businessModel.createBusinessRecord({
      ...req.body,
      ownerWallet: req.walletAddress,
    });
    res.status(201).json({ business });
  } catch (err) {
    console.error("[createBusiness] failed:", err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/businesses  (public)
async function listBusinesses(req, res) {
  try {
    const businesses = await businessModel.listActiveBusinesses();
    res.json({ businesses });
  } catch (err) {
    console.error("[listBusinesses] failed:", err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/businesses/:pubkey  (public)
async function getBusiness(req, res) {
  try {
    const business = await businessModel.getBusinessByPubkey(req.params.pubkey);
    if (!business) return res.status(404).json({ error: "Not found" });
    res.json({ business });
  } catch (err) {
    console.error("[getBusiness] failed:", err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/businesses/mine  (auth required)
async function listMyBusinesses(req, res) {
  try {
    const businesses = await businessModel.listBusinessesByOwner(req.walletAddress);
    res.json({ businesses });
  } catch (err) {
    console.error("[listMyBusinesses] failed:", err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createBusiness,
  listBusinesses,
  getBusiness,
  listMyBusinesses,
};