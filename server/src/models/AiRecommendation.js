const mongoose = require("mongoose");

const aiRecommendationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    symbol: { type: String, required: true, uppercase: true },
    action: { type: String, enum: ["BUY", "HOLD", "AVOID"], required: true },
    confidence: { type: Number, min: 0, max: 1, required: true },
    reason: { type: String, required: true },
    indicators: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AiRecommendation", aiRecommendationSchema);
