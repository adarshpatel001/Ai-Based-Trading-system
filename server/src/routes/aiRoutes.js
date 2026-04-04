const express = require("express");
const { analyze, latestRecommendations } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/analyze", protect, analyze);
router.get("/recommendations", protect, latestRecommendations);

module.exports = router;
