const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipientType: { type: String, enum: ["Client", "Agence", "Admin"], required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "recipientType" },
  senderType: { type: String, enum: ["Agence", "Admin"], required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "senderType" },
  title: { type: String, required: true },
  body: { type: String, required: true },
  voyage: { type: mongoose.Schema.Types.ObjectId, ref: "Voyage", default: null },
  read: { type: Boolean, default: false },
  type: {
    type: String,
    enum: ["VOYAGE_FULL", "DEPARTURE", "AGENCY_BROADCAST", "ADMIN_BROADCAST", "GENERIC"],
    default: "GENERIC",
  },
}, { timestamps: true });

notificationSchema.index({ recipientType: 1, recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
