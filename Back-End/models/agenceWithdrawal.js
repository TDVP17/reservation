const mongoose = require("mongoose");

const agenceWithdrawalSchema = new mongoose.Schema(
  {
    agence: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agence",
      required: true,
    },
    amount: { type: Number, required: true },
    phone: { type: String, required: true },
    accountName: { type: String, required: true },
    network: { type: String, required: true },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

agenceWithdrawalSchema.index({ status: 1, createdAt: -1 });
agenceWithdrawalSchema.index({ agence: 1, createdAt: -1 });

module.exports = mongoose.model("AgenceWithdrawal", agenceWithdrawalSchema);
