const mongoose = require("mongoose");

function genCode(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

const shipmentSchema = new mongoose.Schema({
  // ── Colis ────────────────────────────────────────────
  image:   { type: String, default: "" },
  contenu: { type: String, required: true, trim: true },
  valeur:  { type: Number, required: true, max: 200000 },

  // ── Expéditeur ───────────────────────────────────────
  expediteur:          { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
  nomExpediteur:       { type: String, default: "" },
  telephoneExpediteur: { type: String, default: "" },

  // ── Destinataire ─────────────────────────────────────
  nomDestinataire:       { type: String, required: true, trim: true },
  telephoneDestinataire: { type: String, required: true },
  emailDestinataire:     { type: String, default: "" },

  // ── Logistique ───────────────────────────────────────
  regionDepart:      { type: String, required: true },
  villeDepart:       { type: String, default: "" },
  regionDestination: { type: String, required: true },
  villeDestination:  { type: String, default: "" },
  adresseDepart:     { type: String, default: "" },
  agence:            { type: mongoose.Schema.Types.ObjectId, ref: "Agence", required: true },
  agenceDestination: { type: mongoose.Schema.Types.ObjectId, ref: "Agence", required: true },

  // ── Calculs ──────────────────────────────────────────
  prixExpedition:  { type: Number, default: 0 },
  fraisPlateforme: { type: Number, default: 0 },
  montantTotal:    { type: Number, default: 0 },

  // ── Codes de suivi ───────────────────────────────────
  codeClient:  { type: String, default: () => genCode("CLI") },
  codeAgence:  { type: String, default: () => Math.floor(100000 + Math.random() * 900000).toString() },

  // ── Statut ───────────────────────────────────────────
  status: {
    type: String,
    enum: ["En attente", "Reçu en agence de départ", "En transit", "Arrivé en agence de destination", "Collecté", "Annulé"],
    default: "En attente",
  },
  receivedAt:  { type: Date, default: null },
  departedAt:  { type: Date, default: null },
  arrivedAt:   { type: Date, default: null },
  collectedAt: { type: Date, default: null },

  // ── OTP de retrait en agence de destination (destinataire) ───
  // select: false — jamais renvoyé par défaut dans les réponses API (client ou agence)
  otpDestinataire:        { type: String, default: null, select: false },
  otpDestinataireExpires: { type: Date, default: null, select: false },

  // ── Paiement ─────────────────────────────────────────
  paymentStatus: {
    type: String,
    enum: ["PENDING", "PAID", "REFUNDED"],
    default: "PENDING",
  },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
}, { timestamps: true });

module.exports = mongoose.model("Shipment", shipmentSchema);
