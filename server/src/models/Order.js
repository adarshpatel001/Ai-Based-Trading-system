const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    symbol: { type: String, required: true, uppercase: true },
    side: { type: String, enum: ["BUY", "SELL"], required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    priceLocal: { type: Number, required: true, min: 0 },
    priceUsd: { type: Number, required: true, min: 0 },
    notionalLocal: { type: Number, required: true, min: 0 },
    notionalUsd: { type: Number, required: true, min: 0 },
    localCurrency: { type: String, required: true, uppercase: true, default: "USD" },
    fxRateToUsd: { type: Number, required: true, min: 0, default: 1 },
    status: { type: String, enum: ["FILLED", "REJECTED"], default: "FILLED" },
    rejectionReason: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
