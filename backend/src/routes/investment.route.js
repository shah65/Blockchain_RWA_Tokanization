const express = require("express");
const router = express.Router();
const investmentController = require("../controller/investment.controller");
const { requireAuth } = require("../middleware/auth");

router.get("/investments/portfolio", requireAuth, investmentController.getPortfolio);
router.get("/investments/profit-history", requireAuth, investmentController.getProfitHistory);
router.post("/investments/sync", investmentController.syncInvestment); // called by indexer job

module.exports = router;
