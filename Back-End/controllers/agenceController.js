//controllers agence
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const Agence = require('../models/agence');
const AgenceBalance = require('../models/agenceBalance');
const AgenceWithdrawal = require('../models/agenceWithdrawal');
const Voyage = require('../models/voyage');
const Reservation = require('../models/reservation');
const { sendVerificationEmail } = require('../utils/mailer');
const { uploadImage } = require('../services/cloudinaryService');
const { debiterAgence } = require('../services/balanceService');

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

exports.getAgenceBalance = async (req, res) => {
  try {
    const balance = await AgenceBalance.findOne({ agence: req.user._id });
    res.json(balance || { amount: 0 });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération du solde" });
  }
};

// Résumé financier de l'agence (chiffre d'affaires) — protégé par financialAuth
exports.getRevenueSummary = async (req, res) => {
  try {
    const agenceId = req.user._id;

    const voyages = await Voyage.find({ agence: agenceId }).select('_id');
    const voyageIds = voyages.map(v => v._id);

    // Ventilé par mode de paiement : l'espèce encaissée sur place ne doit
    // jamais transiter par le portefeuille numérique (AgenceBalance, plus bas)
    // — elle reste une ligne de chiffre d'affaires distincte pour la
    // réconciliation physique/caisse.
    const ticketAgg = await Reservation.aggregate([
      { $match: { voyage: { $in: voyageIds }, status: "Confirmé" } },
      { $group: { _id: "$paymentMethod", total: { $sum: "$montantBillets" } } },
    ]);
    const onlineTicketRevenue = ticketAgg.find(g => g._id !== "CASH")?.total || 0;
    const cashTicketRevenue   = ticketAgg.find(g => g._id === "CASH")?.total || 0;
    const ticketRevenue = onlineTicketRevenue + cashTicketRevenue;

    const balance = await AgenceBalance.findOne({ agence: agenceId });
    const parcelEarnings = balance?.amount || 0;

    res.json({
      ticketRevenue,
      onlineTicketRevenue,
      cashTicketRevenue,
      parcelEarnings,
      totalRevenue: ticketRevenue + parcelEarnings,
    });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors du calcul du chiffre d'affaires" });
  }
};

// Vérifier le PIN financier et délivrer un jeton temporaire (15 min)
exports.verifyFinancialPin = async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: "PIN requis" });

    if (!req.user.financialAccessPin)
      return res.status(400).json({ error: "Aucun PIN financier configuré. Rendez-vous dans Paramètres." });

    const isMatch = await bcrypt.compare(pin, req.user.financialAccessPin);
    if (!isMatch)
      return res.status(401).json({ error: "PIN invalide" });

    const financialToken = jwt.sign(
      { _id: req.user._id.toString(), scope: "financial" },
      process.env.JWT_SECRET || "foo",
      { expiresIn: "15m" }
    );

    res.json({ financialToken, expiresIn: 900 });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la vérification du PIN" });
  }
};

// Demande de retrait — protégé par financialAuth. Débit atomique du solde
// (aucune intégration de virement réel : la demande est enregistrée PENDING
// pour traitement manuel par la plateforme, le solde étant déjà sécurisé).
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, phone, accountName, network } = req.body;
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ error: "Montant invalide" });
    }
    if (!phone || !accountName || !network) {
      return res.status(400).json({ error: "Numéro, nom du titulaire et réseau requis" });
    }

    const updatedBalance = await debiterAgence(req.user._id, numericAmount);
    if (!updatedBalance) {
      return res.status(400).json({ error: "Solde insuffisant" });
    }

    const withdrawal = await AgenceWithdrawal.create({
      agence: req.user._id,
      amount: numericAmount,
      phone,
      accountName,
      network,
    });

    res.status(201).json({ withdrawal, balance: updatedBalance.amount });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la demande de retrait" });
  }
};

// Historique des retraits de l'agence — protégé par financialAuth
exports.getMyWithdrawals = async (req, res) => {
  try {
    const withdrawals = await AgenceWithdrawal.find({ agence: req.user._id }).sort({ createdAt: -1 });
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des retraits" });
  }
};


exports.createAgence = async (req, res) => {
  try {
    const { name, email, telephone, numRegistre, ville, password } = req.body;

    // Fichier en mémoire (Vercel) → converti en base64
    let documentProuveAgence = null;
    if (req.file) {
      const b64 = req.file.buffer.toString('base64');
      const mime = req.file.mimetype;
      documentProuveAgence = `data:${mime};base64,${b64}`;
    }

    if (!name || !email || !telephone || !numRegistre || !ville || !password) {
      return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    const agence = new Agence({
      name, email, telephone, numRegistre, ville,
      documentProuveAgence,
      password,
      status: "En attente"
    });

    // 1. Sauvegarde de l'agence
    await agence.save();

    // 2. ✅ ON CRÉE LA BALANCE ICI (DANS LA FONCTION ASYNC)
    const balance = new AgenceBalance({
      agence: agence._id,
      amount: 0
    });
    await balance.save();

    res.status(201).json({ message: "Agence créée avec succès !" });

  } catch (err) {
    console.error("Erreur save agence:", err);

    if (err.code === 11000) {
      if (err.keyPattern?.name && err.keyPattern?.ville) {
        return res.status(409).json({ error: "Une agence avec ce nom existe déjà dans cette ville." });
      }
      return res.status(409).json({ error: "Cette adresse email est déjà utilisée par une autre agence." });
    }
    if (err.name === 'ValidationError') {
      const firstError = Object.values(err.errors)[0]?.message || 'Champs invalides.';
      return res.status(400).json({ error: firstError });
    }

    res.status(500).json({ error: "Une erreur est survenue lors de la création du compte. Veuillez réessayer." });
  }
};

// Valider la création d'une agence
exports.validateAgence = async (req, res) => {
  try {
    const agenceId = req.params.id;
    const agence = await Agence.findById(agenceId);

    if (!agence) {
      return res.status(404).json({ error: 'Agence non trouvée.' });
    }

    agence.status = 'Validé';
    await agence.save();

    return res.json({ message: 'Agence validée avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la validation de l\'agence:', error);
    return res.status(500).json({ error: 'Erreur lors de la validation de l\'agence.', details: error.message });
  }
};


exports.rejectAgence = async (req, res) => {
  try {
    const agenceId = req.params.id;
    const agence = await Agence.findById(agenceId);

    if (!agence) {
      return res.status(404).json({ error: 'Agence non trouvée.' });
    }

    agence.status = 'Rejeté';
    await agence.save();

    return res.json({ message: 'Agence rejetée avec succès.' });
  } catch (error) {
    console.error('Erreur lors du rejet de l\'agence:', error);
    return res.status(500).json({ error: 'Erreur lors du rejet de l\'agence.', details: error.message });
  }
};

exports.getAllPendingAgences = async (req, res) => {
  try {
    const pendingAgences = await Agence.find({ status: 'En attente' });
    
    res.json(pendingAgences);
  } catch (error) {
    console.error('Erreur lors de la récupération des agences en attente:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des agences en attente.', details: error.message });
  }
};

exports.loginAgence = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Email et mot de passe requis."
    });
  }

  try {
    const agence = await Agence.findUser(email, password);

    if (!agence) {
      return res.status(401).json({
        error: "Identifiants invalides."
      });
    }

   
    if (agence.status !== "Validé") {
      return res.status(403).json({
        error:
          "Votre compte est en attente de validation par l’administrateur."
      });
    }

    if (agence.isBanned) {
      return res.status(403).json({
        error: "BANNED",
        message: agence.banReason
          ? `Votre compte a été suspendu : ${agence.banReason}. Contactez le support pour toute question.`
          : "Votre compte a été définitivement suspendu suite à une violation de nos règles. Contactez le support pour toute question."
      });
    }

    const authToken =
      await agence.generateAuthTokenAndSaveUser();

    return res.json({
      message: "Connexion réussie",
      agence,
      authToken
    });
  } catch (e) {
    return res.status(401).json({
      error: "Identifiants invalides."
    });
  }
};

// Mettre à jour les informations d'une agence (champs non critiques uniquement —
// email/téléphone/mot de passe passent obligatoirement par sendVerificationCode/verifyCodeAndUpdate)
exports.updateAgence = async (req, res) => {
  const { email, telephone, password, ...safeUpdates } = req.body;
  const updates = Object.keys(safeUpdates);

  try {
    const agence = await Agence.findById(req.user._id);
    if (!agence) {
      return res.status(404).send({ error: 'Agence non trouvée.' });
    }

    updates.forEach(update => agence[update] = safeUpdates[update]);
    await agence.save();
    res.send(agence);
  } catch (e) {
    console.error('Erreur lors de la mise à jour de l\'agence:', e);
    res.status(500).send({ error: 'Erreur lors de la mise à jour de l\'agence.', details: e.message });
  }
};

// Profil réel de l'agence connectée
exports.getMyProfile = async (req, res) => {
  try {
    const agence = await Agence.findById(req.user._id);
    if (!agence) return res.status(404).json({ error: 'Agence non trouvée.' });
    res.json({ agence });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du profil.' });
  }
};

// Upload / mise à jour du logo de l'agence
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fichier requis.' });
    const url = await uploadImage(req.file.buffer, 'agency-logos');
    const agence = await Agence.findById(req.user._id);
    agence.logo = url;
    await agence.save();
    res.json({ message: 'Logo mis à jour.', logo: url });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'upload du logo." });
  }
};

// Envoyer un code de vérification (email / téléphone / mot de passe / demande de reset PIN)
exports.sendVerificationCode = async (req, res) => {
  const { action, target } = req.body;

  if (!action || !target) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  try {
    const agence = await Agence.findById(req.user._id);
    if (!agence) return res.status(404).json({ error: "Agence introuvable" });

    const code = generateOtp();
    agence.verifyCode = await bcrypt.hash(code, 10);
    agence.verifyCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    agence.verifyTarget = target;
    agence.verifyAction = action;
    await agence.save();

    // Toujours envoyé à l'email ACTUEL de l'agence (jamais la nouvelle valeur en attente)
    const result = await sendVerificationEmail(agence.email, code);

    const devCode = result?.devCode;
    res.json({ message: "Code envoyé", ...(devCode ? { devCode } : {}) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'envoi du code" });
  }
};

// Vérifier le code et appliquer la modification (ou la demande de reset PIN)
exports.verifyCodeAndUpdate = async (req, res) => {
  const { code, newPassword } = req.body;

  if (!code) return res.status(400).json({ error: "Code requis" });

  try {
    const agence = await Agence.findById(req.user._id);
    if (!agence) return res.status(404).json({ error: "Agence introuvable" });

    if (
      !agence.verifyCode ||
      !agence.verifyCodeExpires ||
      agence.verifyCodeExpires < new Date() ||
      !(await bcrypt.compare(code, agence.verifyCode))
    ) {
      return res.status(400).json({ error: "Code invalide ou expiré" });
    }

    const action = agence.verifyAction;
    const target = agence.verifyTarget;

    if (action === "email") {
      const existing = await Agence.findOne({ email: target, _id: { $ne: agence._id } });
      if (existing) {
        return res.status(409).json({ error: "Cet email est déjà utilisé par une autre agence." });
      }
    }

    if (action === "phone")   agence.telephone = target;
    if (action === "email")   agence.email = target;
    if (action === "password") {
      if (!newPassword) return res.status(400).json({ error: "Nouveau mot de passe requis" });
      agence.password = newPassword;
    }
    if (action === "pin_reset_request") {
      agence.pinResetRequested = true;
      agence.pinResetRequestedAt = new Date();
    }

    agence.verifyCode = undefined;
    agence.verifyCodeExpires = undefined;
    agence.verifyTarget = undefined;
    agence.verifyAction = undefined;

    let authToken;
    if (action === "email" || action === "password") {
      // Invalide les autres sessions actives et en émet une nouvelle pour celle-ci
      agence.authTokens = [];
      authToken = await agence.generateAuthTokenAndSaveUser();
    } else {
      await agence.save();
    }

    res.json({
      message: "Mise à jour réussie",
      agence,
      ...(authToken ? { authToken } : {}),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Cet email est déjà utilisé par une autre agence." });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
};

// Voir toutes les agences
exports.getAllAgence = async (req, res) => {
  try {
    const agences = await Agence.find({});
    res.send(agences);
  } catch (error) {
    console.error('Erreur lors de la récupération des agences:', error);
    res.status(500).send({ error: 'Erreur lors de la récupération des agences.', details: error.message });
  }
};

// Déconnexion d'une agence
exports.logoutAgence = async (req, res) => {
  try {
    if (!req.user || !req.user.authTokens || !req.authToken) {
      return res.status(400).json({ error: 'Déconnexion échouée' });
    }

    req.user.authTokens = req.user.authTokens.filter(authToken =>
      authToken.authToken !== req.authToken
    );

    await req.user.save();
    return res.json({ message: 'Déconnexion réussie.' });
  } catch (error) {
    console.error('Erreur lors de la déconnexion :', error);
    return res.status(500).json({ error: 'Erreur lors de la déconnexion.', details: error.message });
  }
};

// Suppression d'une agence
exports.deleteAgence = async (req, res) => {
  try {
    const agenceId = req.params.id;
    if (agenceId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }
    const agence = await Agence.findByIdAndDelete(agenceId);
    if (!agence) {
      return res.status(404).send({ error: 'Agence non trouvée.' });
    }
    res.send({ message: 'Agence supprimée avec succès.' });
  } catch (error) {
    res.status(500).send({ error: 'Erreur lors de la suppression de l\'agence.', details: error.message });
  }
};
