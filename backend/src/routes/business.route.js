const express = require("express");
const router = express.Router();
const businessController = require("../controller/business.controller");
const { requireAuth } = require("../middleware/auth");

router.get("/business", businessController.listBusinesses);           // public marketplace
router.get("/business/mine", requireAuth, businessController.listMyBusinesses);
router.get("/business/:pubkey", businessController.getBusiness);       // public detail page
router.post("/business", requireAuth, businessController.createBusiness);

module.exports = router;
