const mongoose = require("mongoose");

const agenceBalanceSchema = new mongoose.Schema({
  agence: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agence",
    required: true,
    unique: true,
  },
  amount: {
    type: Number,
    default: 0, // L'agence commence à 0
  },
}, { timestamps: true });

module.exports = mongoose.model("AgenceBalance", agenceBalanceSchema);