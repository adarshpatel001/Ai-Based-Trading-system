const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, index: true },
    balance: { type: Number, default: 1000000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wallet", walletSchema);
