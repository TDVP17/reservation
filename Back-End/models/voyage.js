// models voyage
const mongoose = require("mongoose");

const voyageSchema = new mongoose.Schema(
  {
    depart: {
      type: String,
      default: "",
    },

    destination: {
      type: String,
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    heure: {
      type: String,
      required: true,
    },

    placesTotal: {
      type: Number,
      required: true,
      min: 1,
    },

    placesRestantes: {
      type: Number,
      min: 0,
    },

    mat: {
      type: String,
      required: true,
    },

    prix: {
      type: Number,
      required: true,
    },
    typeBus: {
    type: String,
    enum: ['Classique', 'VIP', 'Super VIP'],
    default: 'Classique'
      },
    imageBus: {
      type: String,
      default: null,
    },

    agence: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agence",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['scheduled', 'en_route', 'arrived'],
      default: 'scheduled',
      index: true,
    },
    departedAt: { type: Date, default: null },
    arrivedAt:  { type: Date, default: null },

    lastPosition: {
      latitude:  { type: Number, default: null },
      longitude: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

voyageSchema.index({ createdAt: -1 });

// 🔒 Sécurité logique
voyageSchema.pre("save", function (next) {
  if (this.placesRestantes > this.placesTotal) {
    this.placesRestantes = this.placesTotal;
  }
  next();
});

module.exports = mongoose.model("Voyage", voyageSchema);