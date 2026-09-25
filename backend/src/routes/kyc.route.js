const express = require("express");
const router = express.Router();
const kyc = require("../controller/kyc.controller");
const { requireAuth } = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");
const { authLimiter } = require("../middleware/rateLimiter");

// User endpoints
router.get("/users/kyc/status", requireAuth, kyc.getKycStatus);
router.post("/users/kyc", authLimiter, requireAuth, kyc.submitKyc);

// Admin endpoints
router.get("/admin/kyc/pending", requireAuth, requireAdmin, kyc.listPending);
router.get("/admin/kyc/signed-url", requireAuth, requireAdmin, kyc.getSignedUrlForKyc);
router.post("/admin/kyc/decide", requireAuth, requireAdmin, kyc.decide);

module.exports = router;