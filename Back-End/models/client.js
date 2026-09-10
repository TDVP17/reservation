// client.js back
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate(v) {
      if (!validator.isEmail(v)) throw new Error('Email non valide!');
    }
  },
  password: {
  type: String,
  required: function() { return !this.googleId; },
  trim: true,
  validate(value) {
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value)) {
      throw new Error(
        "Mot de passe faible (8 caractères, majuscule, minuscule, chiffre)"
      );
    }
  }
},
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  resetCode: { type: String },
  resetCodeExpires: { type: Date },
  verifyCode: { type: String },
  verifyCodeExpires: { type: Date },
  verifyTarget: { type: String },
  verifyAction: { type: String },
  phone: {
    type: String,
    trim: true,
    default: ""
  },
  avatar: {
    type: String,
    default: ""
  },
  agence: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agence"
  },
  authTokens: [{
    authToken: {
      type: String,
      required: true
    }
  }],
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: null },
  bannedAt: { type: Date, default: null },
  preferredLang: { type: String, enum: ['fr', 'en'], default: 'fr' }
}, { timestamps: true });

clientSchema.index({ phone: 1 });
clientSchema.index({ createdAt: -1 });




clientSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10); // Hachage du mot de passe
  }
  next();
});


clientSchema.methods.generateAuthTokenAndSaveUser = async function() {
  const authToken = jwt.sign({ _id: this._id.toString() }, process.env.JWT_SECRET || 'foo');
  this.authTokens.push({ authToken: authToken });
  await this.save();
  return authToken;
};
clientSchema.statics.findUser = async function(email, password) {
  try {
    const client = await this.findOne({ email });
    if (!client) {
      console.error('Utilisateur non trouvé pour l\'email:', email);
      throw new Error('Identifiants invalides');
    }

    const isMatch = await bcrypt.compare(password, client.password);
    if (!isMatch) {
      console.error('Mot de passe incorrect pour l\'email:', email);
      throw new Error('Identifiants invalides');
    }

    return client;
  } catch (error) {
    console.error('Erreur lors de la recherche de l\'utilisateur :', error);
    throw error;
  }
};





clientSchema.methods.updateClient = async function(updates) {
  Object.keys(updates).forEach(update => {
    this[update] = updates[update];
  });
  await this.save();
  return this;
};

clientSchema.methods.deleteClient = async function() {
  await this.remove();
};

const Client = mongoose.model('Client', clientSchema);
module.exports = Client;
