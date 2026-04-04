const express = require("express");
const { quote, candles } = require("../controllers/marketController");

const router = express.Router();

router.get("/:symbol/quote", quote);
router.get("/:symbol/candles", candles);

module.exports = router;
