// backend/src/controller/business.controller.js
const businessModel = require("../models/business.model");
const asyncHandler = require("../utils/asyncHandler");
const { NotFoundError } = require("../utils/error");

// POST /api/businesses/create  (auth required)
const createBusiness = asyncHandler(async (req, res) => {
  const business = await businessModel.createBusinessRecord({
    ...req.body,
    ownerWallet: req.walletAddress,
  });
  res.status(201).json({ business });
});

// GET /api/businesses  (public)
const listBusinesses = asyncHandler(async (req, res) => {
  const businesses = await businessModel.listActiveBusinesses();
  res.json({ businesses });
});

// GET /api/businesses/:pubkey  (public)
const getBusiness = asyncHandler(async (req, res) => {
  const business = await businessModel.getBusinessByPubkey(req.params.pubkey);
  if (!business) throw new NotFoundError("Business not found");
  res.json({ business });
});

// GET /api/businesses/mine  (auth required)
const listMyBusinesses = asyncHandler(async (req, res) => {
  const businesses = await businessModel.listBusinessesByOwner(req.walletAddress);
  res.json({ businesses });
});

module.exports = {
  createBusiness,
  listBusinesses,
  getBusiness,
  listMyBusinesses,
};