// backend/src/routes/business.route.js
const express = require("express");
const router = express.Router();
const businessController = require("../controller/business.controller");
const { requireAuth } = require("../middleware/auth");

// /mine MUST come before /:pubkey, otherwise Express treats "mine" as a pubkey.
router.get("/businesses/mine", requireAuth, businessController.listMyBusinesses);

router.get("/businesses", businessController.listBusinesses);
router.get("/businesses/:pubkey", businessController.getBusiness);

router.post("/businesses/create", requireAuth, businessController.createBusiness);

module.exports = router;