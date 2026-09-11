const express = require("express");
const router = express.Router();
const userController = require("../controller/user.controller");
const { requireAuth } = require("../middleware/auth");

// --- Auth (wallet sign-in) ---
router.get("/auth/nonce", userController.getNonce);
router.post("/auth/verify", userController.verifySignature);

// --- Profile / KYC metadata ---
router.get("/users/profile", requireAuth, userController.getMyProfile);
router.post("/users/profile", requireAuth, userController.saveProfile);

module.exports = router;
