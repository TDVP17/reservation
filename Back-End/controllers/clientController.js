//controlleur clients
const crypto  = require('crypto');
const Client  = require('../models/client');
const Balance = require('../models/clientBlance');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { sendVerificationEmail } = require('../utils/mailer');
const { sendVerificationSMS }   = require('../utils/sms');

// Code à 6 chiffres cryptographiquement sûr (remplace Math.random())
function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Création de compte modifiée pour envoyer l'e-mail
exports.createClient = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Tous les champs sont requis" });
  }

  try {
    const client = new Client({ name, email, password });
    await client.save();

    // ── AJOUT : Envoi de l'e-mail au nouveau client ──
    try {
      await sendVerificationEmail(email, "Bienvenue sur EasyTicket ! Votre compte a été créé avec succès.");
    } catch (emailError) {
      console.error("Erreur lors de l'envoi de l'e-mail de bienvenue:", emailError);
      // On laisse passer pour ne pas bloquer la création du compte si l'e-mail échoue
    }

    res.status(201).json({
      message: "Compte créé avec succès",
      client,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.loginClient = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ error: 'Email et mot de passe sont requis.' });
  }

  try {
    const client = await Client.findUser(email, password);
    if (!client) {
      return res.status(401).send({ error: 'Identifiants invalides.' });
    }
    if (client.isBanned) {
      return res.status(403).send({
        error: "BANNED",
        message: client.banReason
          ? `Votre compte a été suspendu : ${client.banReason}. Contactez le support pour toute question.`
          : "Votre compte a été définitivement suspendu suite à une violation de nos règles. Contactez le support pour toute question."
      });
    }
    const authToken = await client.generateAuthTokenAndSaveUser();
    res.send({ message: 'Connexion réussie !', client: { _id: client._id, name: client.name, email: client.email, preferredLang: client.preferredLang }, authToken });
  } catch (e) {
    console.error(e);
    res.status(401).send({ error: 'Identifiants invalides.' });
  }
};

// Connexion / inscription via Google (Google Identity Services ID token)
exports.googleAuth = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: "Jeton Google manquant" });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (e) {
    console.error('Erreur de vérification du jeton Google :', e);
    return res.status(401).json({ error: "Jeton Google invalide" });
  }

  if (!payload || !payload.email_verified) {
    return res.status(401).json({ error: "Email Google non vérifié" });
  }

  try {
    let client = await Client.findOne({ googleId: payload.sub });

    if (!client) {
      client = await Client.findOne({ email: payload.email });
      if (client) {
        // Compte existant créé via email/mot de passe : on lie le compte Google
        client.googleId = payload.sub;
        if (!client.avatar) client.avatar = payload.picture || "";
      } else {
        client = new Client({
          name: payload.name || payload.email,
          email: payload.email,
          avatar: payload.picture || "",
          googleId: payload.sub,
        });
      }
    }

    if (client.isBanned) {
      return res.status(403).json({
        error: "BANNED",
        message: client.banReason
          ? `Votre compte a été suspendu : ${client.banReason}. Contactez le support pour toute question.`
          : "Votre compte a été définitivement suspendu suite à une violation de nos règles. Contactez le support pour toute question."
      });
    }

    const authToken = await client.generateAuthTokenAndSaveUser();
    res.send({
      message: 'Connexion réussie avec Google !',
      client: { _id: client._id, name: client.name, email: client.email, avatar: client.avatar, preferredLang: client.preferredLang },
      authToken,
    });
  } catch (e) {
    console.error('Erreur lors de la connexion Google :', e);
    if (e.code === 11000) {
      return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
    }
    res.status(500).json({ error: "Erreur serveur lors de la connexion Google." });
  }
};

// controllers/clientController.js
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const genericResponse = { message: "Si un compte existe pour cet email, un code a été envoyé." };

  if (!email) {
    return res.status(400).json({ error: "Email requis" });
  }

  try {
    const client = await Client.findOne({ email });
    // Réponse identique que le compte existe ou non (anti-énumération d'emails)
    if (!client) {
      return res.json(genericResponse);
    }

    const code = generateOtp();
    client.resetCode = await bcrypt.hash(code, 10);
    client.resetCodeExpires = Date.now() + 10 * 60 * 1000; // 10 min
    await client.save();

    const result = await sendVerificationEmail(email, code);
    const devCode = result?.devCode;

    res.json({ ...genericResponse, ...(devCode ? { devCode } : {}) });
  } catch (err) {
    console.error('Erreur lors de la demande de réinitialisation :', err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "Email, code et nouveau mot de passe requis" });
  }

  try {
    const client = await Client.findOne({
      email,
      resetCodeExpires: { $gt: Date.now() }
    });

    if (!client || !client.resetCode || !(await bcrypt.compare(code, client.resetCode))) {
      return res.status(400).json({ error: "Code invalide ou expiré" });
    }

    client.password = newPassword;
    client.resetCode = undefined;
    client.resetCodeExpires = undefined;
    // Invalide toutes les sessions actives suite au changement de mot de passe
    client.authTokens = [];

    const authToken = await client.generateAuthTokenAndSaveUser();

    res.json({ message: "Mot de passe mis à jour", authToken });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Erreur lors de la réinitialisation du mot de passe :', err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};


// Mettre à jour les informations d'un client
exports.updateClient = async (req, res) => {
  const { name, email, phone, avatar, oldPassword, newPassword, preferredLang } = req.body;

  try {
    const client = await Client.findById(req.user._id);
    if (!client) return res.status(404).send({ error: 'Client non trouvé.' });

    if (newPassword) {
      if (!oldPassword)
        return res.status(400).send({ error: "L'ancien mot de passe est requis." });
      const isMatch = await bcrypt.compare(oldPassword, client.password);
      if (!isMatch)
        return res.status(401).send({ error: "L'ancien mot de passe est incorrect." });
      client.password = newPassword;
    }

    if (name)   client.name   = name;
    if (email)  client.email  = email;
    if (phone !== undefined)  client.phone  = phone;
    if (avatar !== undefined) client.avatar = avatar;
    if (preferredLang === 'fr' || preferredLang === 'en') client.preferredLang = preferredLang;

    await client.save();
    res.send({
      message: "Profil mis à jour",
      client: { name: client.name, email: client.email, phone: client.phone, avatar: client.avatar, preferredLang: client.preferredLang }
    });
  } catch (e) {
    res.status(500).send({ error: 'Erreur serveur', details: e.message });
  }
};

exports.getMonProfil = async (req, res) => {
  try {
    const client  = await Client.findById(req.user._id).populate("agence");
    if (!client) return res.status(404).json({ error: "Client non trouvé" });
    const balance = await Balance.findOne({ client: req.user._id });
    res.json({ client, balance: balance ? balance.amount : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Voir tous les clients (admin)
exports.getAllClients = async (req, res) => {
  try {
    const clients = await Client.find().populate("agence");
    res.status(200).json(clients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }}
  
// Déconnexion d'un client
exports.logoutClient = async (req, res) => {
    try {
        if (!req.user || !req.user.authTokens || !req.authToken) {
            return res.status(400).json({ error: 'Déconnexion échouée.' });
        }

        req.user.authTokens = req.user.authTokens.filter(authToken => 
            authToken.authToken !== req.authToken
        );

        await req.user.save();
        return res.json({ message: 'Déconnexion réussie.' });
    } catch (error) {
        console.error('Erreur lors de la déconnexion :', error); 
        return res.status(500).json({ error: 'Erreur lors de la déconnexion.' });
    }
};

// Envoyer un code de vérification (phone/email/password)
exports.sendVerificationCode = async (req, res) => {
  const { action, channel, target } = req.body;
  // action: "phone" | "email" | "password"
  // channel: "sms" | "email"
  // target: numéro ou email de destination

  if (!action || !channel || !target) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  try {
    const client = await Client.findById(req.user._id);
    if (!client) return res.status(404).json({ error: "Client introuvable" });

    const code = generateOtp();
    client.verifyCode = await bcrypt.hash(code, 10);
    client.verifyCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    client.verifyTarget = target;
    client.verifyAction = action;
    await client.save();

    let result;
    if (channel === "sms") {
      result = await sendVerificationSMS(target, code, client.email);
    } else {
      // Toujours envoyer à l'email ACTUEL du client (pas la nouvelle valeur)
      result = await sendVerificationEmail(client.email, code);
    }

    // Mode dev : renvoie le code si aucun service configuré
    const devCode = result?.devCode;
    res.json({ message: "Code envoyé", ...(devCode ? { devCode } : {}) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'envoi du code" });
  }
};

// Vérifier le code et appliquer la modification
exports.verifyCodeAndUpdate = async (req, res) => {
  const { code, newPassword } = req.body;

  if (!code) return res.status(400).json({ error: "Code requis" });

  try {
    const client = await Client.findById(req.user._id);
    if (!client) return res.status(404).json({ error: "Client introuvable" });

    if (
      !client.verifyCode ||
      !client.verifyCodeExpires ||
      client.verifyCodeExpires < new Date() ||
      !(await bcrypt.compare(code, client.verifyCode))
    ) {
      return res.status(400).json({ error: "Code invalide ou expiré" });
    }

    const action = client.verifyAction;
    const target = client.verifyTarget;

    if (action === "email") {
      const existing = await Client.findOne({ email: target, _id: { $ne: client._id } });
      if (existing) {
        return res.status(409).json({ error: "Cet email est déjà utilisé par un autre compte." });
      }
    }

    if (action === "phone")    client.phone = target;
    if (action === "email")    client.email = target;
    if (action === "password") {
      if (!newPassword) return res.status(400).json({ error: "Nouveau mot de passe requis" });
      client.password = newPassword;
    }

    client.verifyCode = undefined;
    client.verifyCodeExpires = undefined;
    client.verifyTarget = undefined;
    client.verifyAction = undefined;

    let authToken;
    if (action === "email" || action === "password") {
      // Invalide les autres sessions actives et en émet une nouvelle pour celle-ci
      client.authTokens = [];
      authToken = await client.generateAuthTokenAndSaveUser();
    } else {
      await client.save();
    }

    res.json({
      message: "Mise à jour réussie",
      client: { name: client.name, email: client.email, phone: client.phone },
      ...(authToken ? { authToken } : {}),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Cet email est déjà utilisé par un autre compte." });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Suppression du client connecté
exports.deleteClient = async (req, res) => {
    try {
        const clientId = req.params.id;
        const client = await Client.findByIdAndDelete(clientId);
        if (!client) {
            return res.status(404).send({ error: 'Client non trouvé.' });
        }
        res.send({ message: 'Client supprimé avec succès.' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Erreur lors de la suppression du client.' });
    }
};
