const { ForbiddenError } = require("../utils/error");

const ADMIN_WALLETS = (process.env.ADMIN_WALLETS || "")
  .split(",")
  .map((w) => w.trim())
  .filter(Boolean);

function isAdminWallet(wallet) {
  return ADMIN_WALLETS.includes(wallet);
}

function requireAdmin(req, res, next) {
  if (!req.walletAddress || !isAdminWallet(req.walletAddress)) {
    return next(new ForbiddenError("Admin access required"));
  }
  next();
}

module.exports = requireAdmin;
module.exports.isAdminWallet = isAdminWallet;