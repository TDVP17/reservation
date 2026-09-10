const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");

const livreurSchema = new mongoose.Schema({
  // Un livreur s'inscrit indépendamment (pas forcément un client)
  nom:       { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true },
  telephone: { type: String, required: true },
  whatsapp:  { type: String, default: "" },
  photo:     { type: String, default: "" },
  vehicule:  { type: String, default: "Moto" },

  region:    { type: String, default: "" },
  ville:     { type: String, required: true },
  disponible:{ type: Boolean, default: true },

  // Position en temps réel (mise à jour via socket)
  latitude:  { type: Number, default: null },
  longitude: { type: Number, default: null },

  totalCourses: { type: Number, default: 0 },
  note:         { type: Number, default: 0, min: 0, max: 5 },
  noteCount:    { type: Number, default: 0 },

  authTokens: [{ authToken: { type: String, required: true } }],
}, { timestamps: true });

livreurSchema.index({ nom: 1 });
livreurSchema.index({ telephone: 1 });
livreurSchema.index({ createdAt: -1 });

livreurSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 8);
  }
  next();
});

livreurSchema.methods.generateAuthTokenAndSaveUser = async function () {
  const token = jwt.sign({ _id: this._id.toString() }, process.env.JWT_SECRET);
  this.authTokens.push({ authToken: token });
  await this.save();
  return token;
};

livreurSchema.statics.findUser = async (email, password) => {
  const livreur = await Livreur.findOne({ email });
  if (!livreur) throw new Error("Identifiants invalides");
  const isMatch = await bcrypt.compare(password, livreur.password);
  if (!isMatch) throw new Error("Identifiants invalides");
  return livreur;
};

const Livreur = mongoose.model("Livreur", livreurSchema);
module.exports = Livreur;
