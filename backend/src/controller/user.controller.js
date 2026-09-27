// backend/src/controller/user.controller.js
const userModel = require("../models/user.model");
const { verifyWalletSignature, issueJwt } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

// ---------------------------------------------------------------------------
// Simple in-memory nonce store (single-process dev only).
// ---------------------------------------------------------------------------
const nonceStore = new Map();

// ---------------------------------------------------------------------------
// GET /api/auth/nonce?wallet=<address>
// ---------------------------------------------------------------------------
const getNonce = asyncHandler(async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: "wallet is required" });

  const nonce = Math.random().toString(36).slice(2);
  const message = `Sign in to RWA Tokenization\nNonce: ${nonce}`;
  nonceStore.set(wallet, message);

  res.json({ message });
});

// ---------------------------------------------------------------------------
// Admin allowlist — renamed to plural for consistency.                   // ← CHANGED
// ---------------------------------------------------------------------------
const ADMIN_WALLETS = (process.env.ADMIN_WALLETS || "")
  .split(",")
  .map((w) => w.trim())
  .filter(Boolean);

// ---------------------------------------------------------------------------
// POST /api/auth/verify
// ---------------------------------------------------------------------------
const verifySignature = asyncHandler(async (req, res) => {
  const { walletAddress, signature, role } = req.body;

  // 1. Nonce must exist BEFORE we bother verifying the signature.
  const message = nonceStore.get(walletAddress);
  if (!message) {
    return res.status(400).json({ error: "No pending nonce for this wallet" });
  }

  // 2. Verify the signature.
  const isValid = verifyWalletSignature({ walletAddress, signature, message });
  if (!isValid) {
    return res.status(401).json({ error: "Signature verification failed" });
  }

  nonceStore.delete(walletAddress);

  // 3. Resolve the persisted role.                                     // ← CHANGED
  //    Admin wallets ALWAYS become 'admin'. The client cannot downgrade
  //    an admin, and cannot self-promote to admin.
  const isAdminWallet = ADMIN_WALLETS.includes(walletAddress);

  let safeRole;
  if (isAdminWallet) {
    safeRole = "admin";
  } else if (role === "business_owner" || role === "investor") {
    safeRole = role;
  } else {
    safeRole = "investor";
  }

  // 4. Insert-if-missing, then promote legacy rows that predate the role.
  let profile = await userModel.createProfileIfMissing(walletAddress, safeRole);

  if (isAdminWallet && profile.role !== "admin") {
    profile = await userModel.updateRole(walletAddress, "admin");
  }

  const token = issueJwt(walletAddress);
  res.json({ token, profile });
});

// ---------------------------------------------------------------------------
// GET /api/users/profile  (requires auth)
// ---------------------------------------------------------------------------
const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await userModel.getProfileByWallet(req.walletAddress);
  res.json({ profile });
});

// ---------------------------------------------------------------------------
// PUT /api/users/profile  (requires auth)
// ---------------------------------------------------------------------------
const saveProfile = asyncHandler(async (req, res) => {
  const existing = await userModel.getProfileByWallet(req.walletAddress);

  // Never let the client overwrite these fields.
  const {
    wallet_address: _w,
    role: _r,
    kyc_status: _k,
    id: _i,
    created_at: _c,
    updated_at: _u,
    is_admin: _a,
    ...safeFields
  } = req.body;

  const payload = {
    ...safeFields,
    wallet_address: req.walletAddress,
    role: existing?.role || "investor",
  };

  const profile = await userModel.upsertProfile(req.walletAddress, payload);
  res.json({ profile });
});

module.exports = { getNonce, verifySignature, getMyProfile, saveProfile };