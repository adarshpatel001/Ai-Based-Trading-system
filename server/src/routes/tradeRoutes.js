const express = require("express");
const {
  getWallet,
  orderHistory,
  placeOrder,
  portfolio,
  topUpWallet,
} = require("../controllers/tradeController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/wallet", getWallet);
router.post("/wallet/top-up", topUpWallet);
router.get("/portfolio", portfolio);
router.get("/orders", orderHistory);
router.post("/orders", placeOrder);

module.exports = router;
