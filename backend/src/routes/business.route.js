// backend/src/routes/business.route.js
const express = require("express");
const router = express.Router();
const businessController = require("../controller/business.controller");
const { requireAuth } = require("../middleware/auth");

// --- IMPORTANT: /mine MUST come before /:pubkey, otherwise Express treats
//     "mine" as a pubkey value and your controller tries to look up a
//     business literally named "mine". ---

router.get("/businesses/mine", requireAuth, businessController.listMyBusinesses);

// --- Public ---
router.get("/businesses", businessController.listBusinesses);
router.get("/businesses/:pubkey", businessController.getBusiness);

// --- Protected (owner only) ---
router.post("/businesses/create", requireAuth, businessController.createBusiness);

module.exports = router;