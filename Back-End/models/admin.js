// model admin.js
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');

const adminSchema = new mongoose.Schema({
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
    required: true,
    trim: true
    // validate: {
    //   validator: function(v) {
    //     return v.length >= 4;
    //   },
    //   message: props => `${props.value} n'est pas un mot de passe valide!`
    // }
  },
  preferredLang: { type: String, enum: ['fr', 'en'], default: 'fr' },
  authTokens: [{
    authToken: {
      type: String,
      required: true
    }
  }]
});




adminSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10); // Hachage du mot de passe
  }
  next();
});


adminSchema.methods.generateAuthTokenAndSaveUser = async function() {
  const authToken = jwt.sign({ _id: this._id.toString() }, 'foo');
  this.authTokens.push({ authToken: authToken });
  await this.save();
  return authToken;
};


// Méthode statique pour trouver un utilisateur par email et mot de passe
adminSchema.statics.findUser = async function(email, password) {
  try {
    const admin = await this.findOne({ email });
    if (!admin) {
      console.error('Utilisateur non trouvé pour l\'email:', email);
      throw new Error('Identifiants invalides');
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      console.error('Mot de passe incorrect pour l\'email:', email);
      throw new Error('Identifiants invalides');
    }

    return admin;
  } catch (error) {
    console.error('Erreur lors de la recherche de l\'utilisateur :', error);
    throw error;
  }
};


  

adminSchema.methods.updateAdmin = async function(updates) {
  Object.keys(updates).forEach(update => {
    this[update] = updates[update];
  });
  await this.save();
  return this;
};

adminSchema.methods.deleteAdmin = async function() {
  await this.remove();
};

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin ;
