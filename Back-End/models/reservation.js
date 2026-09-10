// models/reservation.js
const mongoose = require("mongoose");

function genCode() {
  return "BIL-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

// models/reservation.js
const reservationSchema = new mongoose.Schema({
  voyage:      { type: mongoose.Schema.Types.ObjectId, ref: 'Voyage', required: true, index: true },
  client:      { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null, index: true },
  fullName:    { type: String, required: true },
  phoneNumber: { type: String, required: true },
  placesReservees: { type: Number, required: true },
  montantBillets:  { type: Number, default: 0 },
  fraisSite:       { type: Number, default: 0 },
  montantTotal:    { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["En attente", "Confirmé", "Annulé"],
    default: "En attente",
    index: true,
  },
  // Mode de paiement — "CASH" pour les réservations enregistrées sur place par
  // l'agence (espèces), "ONLINE" pour tout le reste (mobile money/carte/wallet).
  paymentMethod: {
    type: String,
    enum: ["ONLINE", "CASH"],
    default: "ONLINE",
  },
  isGuest:         { type: Boolean, default: false },
  guestMobileMoney:{ type: String, default: null },
  // Code de vérification du billet, affiché sur le ticket client et chez l'agence
  codeBillet:      { type: String, default: () => genCode() },
  // Marqué par l'agence quand le passager embarque (code présenté et validé
  // au comptoir/quai) — un billet dont le code a déjà été validé ne peut
  // plus être annulé.
  codeUsed:        { type: Boolean, default: false },
  codeUsedAt:      { type: Date, default: null },
}, { timestamps: true }); // Indispensable pour l'heure de réservation (createdAt)

reservationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Reservation", reservationSchema);