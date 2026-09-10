// agence.js model
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const agenceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
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
  telephone: {
    type: String,
    required: true
  },
  numRegistre: {
    type: String,
    required: true
  },
  ville: {
    type: String,
    required: true
  }
  ,
  documentProuveAgence: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  
  authTokens: [{
    authToken: {
      type: String,
      required: true
    }
  }],
  status: {
    type: String,
    enum: ['En attente', 'Validé', 'Rejeté'],
    default: 'En attente'
  },
  // Hash du PIN d'accès aux données financières (solde du portefeuille)
  financialAccessPin: {
    type: String,
    default: null
  },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: null },
  bannedAt: { type: Date, default: null },
  preferredLang: { type: String, enum: ['fr', 'en'], default: 'fr' },

  logo: { type: String, default: "" },

  // ── Vérification par code (email/téléphone/mot de passe/demande de reset PIN) ──
  verifyCode: { type: String, default: null },
  verifyCodeExpires: { type: Date, default: null },
  verifyTarget: { type: String, default: null },
  verifyAction: { type: String, default: null },

  // ── Demande de réinitialisation du PIN financier (le PIN reste géré par l'admin) ──
  pinResetRequested: { type: Boolean, default: false },
  pinResetRequestedAt: { type: Date, default: null }
}, { timestamps: true });

// Empêche deux agences portant le même nom dans la même ville (insensible à la casse)
agenceSchema.index({ name: 1, ville: 1 }, { unique: true, collation: { locale: "fr", strength: 2 } });

agenceSchema.methods.toJSON = function() {
  const agence = this.toObject();

  delete agence.password;
  delete agence.authTokens;
  delete agence.financialAccessPin;
  delete agence.verifyCode;
  delete agence.verifyCodeExpires;
  delete agence.verifyTarget;
  delete agence.verifyAction;

  return agence;
};

// Middleware pour le hachage du mot de passe avant de sauvegarder
agenceSchema.pre('save', async function(next) {
  // Vérifiez si le mot de passe a été modifié
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Méthode pour générer un jeton d'authentification et sauvegarder l'utilisateur
agenceSchema.methods.generateAuthTokenAndSaveUser = async function() {
  const agence = this;
  // Utilisez une clé secrète stockée dans une variable d'environnement
  const token = jwt.sign({ _id: agence._id.toString() }, 'foo');
  // Vérifiez que authTokens est bien initialisé comme un tableau
  if (!agence.authTokens) {
    agence.authTokens = []
  }
  agence.authTokens.push({ authToken: token });
  await agence.save();
  return token;
};

// Méthode statique pour trouver un utilisateur par email et mot de passe
agenceSchema.statics.findUser = async function(email, password) {
  try {
    const agence = await this.findOne({ email });
    if (!agence) {
      console.error('Utilisateur non trouvé pour l\'email:', email);
      throw new Error('Identifiants invalides');
    }

    const isMatch = await bcrypt.compare(password, agence.password);
    if (!isMatch) {
      console.error('Mot de passe incorrect pour l\'email:', email);
      throw new Error('Identifiants invalides');
    }

    return agence;
  } catch (error) {
    console.error('Erreur lors de la recherche de l\'utilisateur :', error);
    throw error;
  }
};

const Agence = mongoose.model('Agence', agenceSchema);
module.exports = Agence;
