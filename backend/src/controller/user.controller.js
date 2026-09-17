// backend/src/controller/user.controller.js
const userModel = require("../models/user.model");
const { verifyWalletSignature, issueJwt } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

// ---------------------------------------------------------------------------
// Simple in-memory nonce store.
// Fine for local dev with ONE server process. For production, use Redis or a
// `nonces` table in Supabase. Otherwise a second server instance will not see
// the nonce and every login will fail.
// ---------------------------------------------------------------------------
const nonceStore = new Map();

// ---------------------------------------------------------------------------
// GET /api/auth/nonce?wallet=<address>
// Returns a random message the wallet needs to sign.
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
// POST /api/auth/verify
// Body: { walletAddress, signature, role }
// 1. Check the nonce exists for this wallet.
// 2. Verify the signature.
// 3. Create the profile row if it's a first-time wallet.
// 4. Issue a JWT.
// 5. Return { token, profile }.
// ---------------------------------------------------------------------------
const verifySignature = asyncHandler(async (req, res) => {
  const { walletAddress, signature, role } = req.body;

  // Role must be one of the two allowed values. We store it on first login.
  const safeRole =
    role === "business_owner" || role === "investor" ? role : "investor";

  const message = nonceStore.get(walletAddress);
  if (!message) {
    return res.status(400).json({ error: "No pending nonce for this wallet" });
  }

  const isValid = verifyWalletSignature({ walletAddress, signature, message });
  if (!isValid) {
    return res.status(401).json({ error: "Signature verification failed" });
  }

  // Nonce can only be used once.
  nonceStore.delete(walletAddress);

  // First-time wallet → creates a row with just wallet_address + role.
  // Returning wallet → returns the existing row unchanged.
  const profile = await userModel.createProfileIfMissing(
    walletAddress,
    safeRole
  );

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

const saveProfile = asyncHandler(async (req, res) => {
  // Fetch existing so we don't lose required columns on upsert.
  const existing = await userModel.getProfileByWallet(req.walletAddress);

  // Never let the client overwrite these.
  const {
    wallet_address: _w,
    role: _r,
    kyc_status: _k,
    id: _i,
    created_at: _c,
    updated_at: _u,
    ...safeFields
  } = req.body;

  const payload = {
    ...safeFields,
    wallet_address: req.walletAddress,
    role: existing?.role || "investor",   // always a valid value
  };

  const profile = await userModel.upsertProfile(req.walletAddress, payload);
  res.json({ profile });
});

module.exports = { getNonce, verifySignature, getMyProfile, saveProfile };