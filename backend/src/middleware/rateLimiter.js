const rateLimit = require("express-rate-limit");
const json = (message) => ({ success: false, error: { code: "RATE_LIMITED", message } });
// Global: 300 requests / 15 min / IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: json("Too many requests, slow down."),
});
// Auth endpoints: brute-force friendly paths get a tighter bucket
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: json("Too many auth attempts, try again later."),
});
module.exports = { generalLimiter, authLimiter };