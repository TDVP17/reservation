const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      default: null,
    },
    shipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipment",
      default: null,
    },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ["MOBILE_MONEY", "CARD", "WALLET"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
    },
    phone:     { type: String },
    reference: { type: String },
    transId:   { type: String },
  },
  { timestamps: true }
);

paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ client: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
