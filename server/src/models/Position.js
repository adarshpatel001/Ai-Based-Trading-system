const mongoose = require("mongoose");

const positionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    symbol: { type: String, required: true, uppercase: true, index: true },
    quantity: { type: Number, required: true, min: 0 },
    avgPrice: { type: Number, required: true, min: 0 },
    avgPriceLocal: { type: Number, required: true, min: 0, default: 0 },
    avgPriceUsd: { type: Number, required: true, min: 0, default: 0 },
    localCurrency: { type: String, required: true, uppercase: true, default: "USD" },
    fxRateToUsd: { type: Number, required: true, min: 0, default: 1 },
  },
  { timestamps: true }
);

positionSchema.index({ userId: 1, symbol: 1 }, { unique: true });

module.exports = mongoose.model("Position", positionSchema);
