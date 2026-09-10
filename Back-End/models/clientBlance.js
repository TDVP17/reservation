//balance
const mongoose = require("mongoose");

const balanceSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Balance", balanceSchema);
