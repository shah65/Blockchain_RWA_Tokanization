const express = require("express");
const router = express.Router();
const investmentController = require("../controller/investment.controller");
const { requireAuth } = require("../middleware/auth");

router.get("/investments/portfolio", requireAuth, investmentController.getPortfolio);
router.get("/investments/profit-history", requireAuth, investmentController.getProfitHistory);
router.post("/investments/sync", investmentController.syncInvestment);
router.post("/investments/record", requireAuth, investmentController.recordPurchase);
router.get("/investments/by-owner", requireAuth, investmentController.listInvestorsForOwner);
router.get("/investments/deposits-by-owner", requireAuth, investmentController.listDepositsForOwner);
router.post("/investments/deposit-record", requireAuth, investmentController.recordDeposit);
router.get("/investments/claimable", requireAuth, investmentController.listClaimable);
router.post("/investments/record-claim", requireAuth, investmentController.recordClaim);

module.exports = router;