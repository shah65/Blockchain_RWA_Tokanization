const userModel = require("../models/user.model");
const { verifyWalletSignature, issueJwt } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler"); // <-- add

const nonceStore = new Map();

const getNonce = asyncHandler(async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: "wallet is required" });

  const nonce = Math.random().toString(36).slice(2);
  const message = `Sign in to RWA Tokenization\nNonce: ${nonce}`;
  nonceStore.set(wallet, message);

  res.json({ message });
});

const verifySignature = asyncHandler(async (req, res) => {
  const { walletAddress, signature } = req.body;
  const message = nonceStore.get(walletAddress);
  if (!message) return res.status(400).json({ error: "No pending nonce for this wallet" });

  const isValid = verifyWalletSignature({ walletAddress, signature, message });
  if (!isValid) return res.status(401).json({ error: "Signature verification failed" });

  nonceStore.delete(walletAddress);
  const token = issueJwt(walletAddress);

  const profile = await userModel.getProfileByWallet(walletAddress);
  res.json({ token, profile });
});

const saveProfile = asyncHandler(async (req, res) => {
  const profile = await userModel.upsertProfile(req.walletAddress, req.body);
  res.json({ profile });
});

const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await userModel.getProfileByWallet(req.walletAddress);
  res.json({ profile });
});

module.exports = { getNonce, verifySignature, saveProfile, getMyProfile };  