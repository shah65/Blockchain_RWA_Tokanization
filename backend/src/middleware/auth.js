const nacl = require("tweetnacl");
const bs58 = require("bs58");
const jwt = require("jsonwebtoken");

function verifyWalletSignature({ walletAddress, signature, message }) {
  const publicKeyBytes = bs58.decode(walletAddress);
  const signatureBytes = bs58.decode(signature);
  const messageBytes = new TextEncoder().encode(message);

  return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
}

function issueJwt(walletAddress) {
  return jwt.sign(
    { wallet_address: walletAddress },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
}

// Express middleware: protects routes that require a logged-in wallet.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing auth token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.walletAddress = decoded.wallet_address;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { verifyWalletSignature, issueJwt, requireAuth };
