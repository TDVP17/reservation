const crypto    = require("crypto");
const bcrypt    = require("bcryptjs");
const Shipment  = require("../models/shipment");
const Client    = require("../models/client");
const Agence    = require("../models/agence");
const Payment   = require("../models/payment");
const Balance   = require("../models/clientBlance");
const { calculateShipping, REGIONS } = require("../services/pricingService");
const { uploadImage }                 = require("../services/cloudinaryService");
const { sendTripNotification }        = require("../utils/mailer");
const { crediterAgence }              = require("../services/balanceService");

function generateOtp4() {
  return crypto.randomInt(1000, 10000).toString();
}

const OTP_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

// ─── Devis (retourne les deux options : direct 2% et wallet 1.5%) ─────────────
exports.getQuote = async (req, res) => {
  try {
    const { valeur, regionDepart, regionDestination } = req.query;
    const result = calculateShipping(Number(valeur), regionDepart, regionDestination);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ─── Créer une expédition ────────────────────────────────────────────────────
exports.creerExpedition = async (req, res) => {
  try {
    const {
      contenu, valeur,
      nomDestinataire, telephoneDestinataire, emailDestinataire,
      nomExpediteur: nomExpForm, telephoneExpediteur: telExpForm,
      regionDepart, villeDepart, regionDestination, villeDestination,
      agenceId, agenceDestinationId, adresseDepart,
    } = req.body;

    if (Number(valeur) > 200000)
      return res.status(400).json({ error: "Valeur maximale autorisée est de 200 000 FCFA" });

    if (!agenceDestinationId)
      return res.status(400).json({ error: "Agence de destination requise" });
    if (agenceDestinationId === agenceId)
      return res.status(400).json({ error: "L'agence de destination doit être différente de l'agence de départ" });

    const agenceDest = await Agence.findById(agenceDestinationId);
    if (!agenceDest || agenceDest.status !== "Validé")
      return res.status(400).json({ error: "Agence de destination invalide" });

    // Calcul du prix
    const { prixExpedition, fraisPlateforme, montantTotal } =
      calculateShipping(Number(valeur), regionDepart, regionDestination);

    // Upload image si présente
    let imageUrl = "";
    if (req.file) {
      imageUrl = await uploadImage(req.file.buffer, "shipments");
    } else if (req.body.image && req.body.image.startsWith("data:image")) {
      imageUrl = await uploadImage(req.body.image, "shipments");
    }

    const client = await Client.findById(req.user._id);

    const shipment = await Shipment.create({
      image: imageUrl,
      contenu,
      valeur: Number(valeur),
      expediteur:             req.user._id,
      nomExpediteur:          nomExpForm  || client?.name  || "",
      telephoneExpediteur:    telExpForm  || client?.phone || "",
      nomDestinataire:        nomDestinataire,
      telephoneDestinataire:  telephoneDestinataire,
      emailDestinataire:      emailDestinataire || "",
      regionDepart,
      villeDepart:            villeDepart || "",
      regionDestination,
      villeDestination:       villeDestination || "",
      adresseDepart:          adresseDepart || "",
      agence:                 agenceId,
      agenceDestination:      agenceDestinationId,
      prixExpedition,
      fraisPlateforme,
      montantTotal,
    });

    res.status(201).json({ shipment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Mes expéditions (client) ────────────────────────────────────────────────
exports.getMesExpeditions = async (req, res) => {
  try {
    const shipments = await Shipment.find({ expediteur: req.user._id })
      .populate("agence", "name ville")
      .populate("agenceDestination", "name ville")
      .sort({ createdAt: -1 });
    res.json(shipments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Suivre par code ─────────────────────────────────────────────────────────
exports.trackByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const shipment = await Shipment.findOne({
      $or: [{ codeClient: code }, { codeAgence: code }],
    })
      .populate("agence", "name ville telephone")
      .populate("agenceDestination", "name ville telephone")
      .populate("expediteur", "name phone");

    if (!shipment) return res.status(404).json({ error: "Code de suivi invalide" });
    res.json(shipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Détail d'une expédition (propriétaire) ──────────────────────────────────
exports.getExpeditionById = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate("agence", "name ville telephone")
      .populate("agenceDestination", "name ville telephone")
      .populate("expediteur", "name phone");

    if (!shipment) return res.status(404).json({ error: "Expédition introuvable" });
    if (shipment.expediteur._id.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Accès refusé" });

    res.json(shipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Réception en agence de départ (scan QR ou saisie du code à 6 chiffres) ──
exports.receiveAtAgency = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Code requis" });

    const shipment = await Shipment.findOne({ codeAgence: String(code).trim() });
    if (!shipment) return res.status(404).json({ error: "Code introuvable" });
    if (shipment.agence.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Ce colis n'appartient pas à votre agence" });
    if (shipment.status !== "En attente")
      return res.status(400).json({ error: `Ce colis est déjà au statut "${shipment.status}"` });

    shipment.status = "Reçu en agence de départ";
    shipment.receivedAt = new Date();
    await shipment.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`shipment-${shipment._id}`).emit("statut-change", { status: shipment.status, shipmentId: shipment._id });
    }

    res.json({ message: "Colis reçu en agence de départ.", shipment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Marquer le colis en transit (agence de départ) ──────────────────────────
exports.departFromAgency = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ error: "Expédition introuvable" });
    if (shipment.agence.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Ce colis n'appartient pas à votre agence" });
    if (shipment.status !== "Reçu en agence de départ")
      return res.status(400).json({ error: `Ce colis est au statut "${shipment.status}", impossible de le faire partir.` });

    shipment.status = "En transit";
    shipment.departedAt = new Date();
    await shipment.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`shipment-${shipment._id}`).emit("statut-change", { status: shipment.status, shipmentId: shipment._id });
    }

    res.json({ message: "Colis marqué en transit.", shipment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Confirmer l'arrivée en agence de destination ─────────────────────────────
exports.arriveAtDestinationAgency = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id).populate("agenceDestination", "name ville");
    if (!shipment) return res.status(404).json({ error: "Expédition introuvable" });
    if (shipment.agenceDestination._id.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Ce colis n'est pas destiné à votre agence" });
    if (shipment.status !== "En transit")
      return res.status(400).json({ error: `Ce colis est au statut "${shipment.status}", impossible de confirmer l'arrivée.` });

    const otpCode = generateOtp4();
    shipment.otpDestinataire = await bcrypt.hash(otpCode, 10);
    shipment.otpDestinataireExpires = new Date(Date.now() + OTP_VALIDITY_MS);
    shipment.status = "Arrivé en agence de destination";
    shipment.arrivedAt = new Date();
    await shipment.save();

    const agenceName = shipment.agenceDestination?.name || "l'agence";
    let devCode;
    if (shipment.emailDestinataire) {
      await sendTripNotification(shipment.emailDestinataire, {
        subject: "Votre colis est arrivé",
        message: `Votre colis (${shipment.contenu}) est arrivé à ${agenceName}. Présentez ce code au comptoir pour le récupérer : ${otpCode}`,
      });
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) devCode = otpCode;
    } else {
      console.log(`[NOTIFY DEV] Colis ${shipment.codeClient} arrivé à ${agenceName} — code de retrait pour ${shipment.telephoneDestinataire} : ${otpCode}`);
      devCode = otpCode;
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`shipment-${shipment._id}`).emit("statut-change", { status: shipment.status, shipmentId: shipment._id });
    }

    res.json({ message: "Arrivée confirmée, destinataire notifié.", shipment, ...(devCode ? { devCode } : {}) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Confirmer le retrait par le destinataire (OTP) ───────────────────────────
exports.collectAtDestinationAgency = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: "Code de retrait requis" });

    const shipment = await Shipment.findById(req.params.id).select("+otpDestinataire +otpDestinataireExpires");
    if (!shipment) return res.status(404).json({ error: "Expédition introuvable" });
    if (shipment.agenceDestination.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Ce colis n'est pas destiné à votre agence" });
    if (shipment.status !== "Arrivé en agence de destination")
      return res.status(400).json({ error: `Ce colis est au statut "${shipment.status}", impossible de confirmer le retrait.` });
    if (!shipment.otpDestinataire || !shipment.otpDestinataireExpires || shipment.otpDestinataireExpires < new Date())
      return res.status(400).json({ error: "Code expiré" });

    const valid = await bcrypt.compare(String(otp), shipment.otpDestinataire);
    if (!valid) return res.status(400).json({ error: "Code incorrect" });

    shipment.otpDestinataire = null;
    shipment.otpDestinataireExpires = null;
    shipment.status = "Collecté";
    shipment.collectedAt = new Date();
    await shipment.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`shipment-${shipment._id}`).emit("statut-change", { status: shipment.status, shipmentId: shipment._id });
    }

    res.json({ message: "Retrait confirmé.", shipment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Dashboard agence : colis à faire partir / arrivant / à retirer ──────────
exports.agenceShipmentDashboard = async (req, res) => {
  try {
    const [pendingDepart, pendingArrival, pendingCollection] = await Promise.all([
      Shipment.find({ agence: req.user._id, status: "Reçu en agence de départ" })
        .populate("expediteur", "name phone").sort({ createdAt: -1 }),
      Shipment.find({ agenceDestination: req.user._id, status: "En transit" })
        .populate("expediteur", "name phone").sort({ createdAt: -1 }),
      Shipment.find({ agenceDestination: req.user._id, status: "Arrivé en agence de destination" })
        .populate("expediteur", "name phone").sort({ createdAt: -1 }),
    ]);
    res.json({ pendingDepart, pendingArrival, pendingCollection });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Payer une expédition depuis le wallet ───────────────────────────────────
exports.payerExpeditionWallet = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ error: "Expédition introuvable" });
    if (shipment.expediteur.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Accès refusé" });
    if (shipment.paymentStatus === "PAID")
      return res.status(400).json({ error: "Expédition déjà payée" });

    const montant = shipment.montantTotal;

    const balance = await Balance.findOne({ client: req.user._id });
    if (!balance || balance.amount < montant)
      return res.status(400).json({
        error: "Solde insuffisant",
        soldeActuel:  balance?.amount ?? 0,
        montantNecessaire: montant,
      });

    // Déduire du wallet
    balance.amount -= montant;
    await balance.save();

    const payment = await Payment.create({
      client:    req.user._id,
      shipment:  shipment._id,
      amount:    montant,
      method:    "WALLET",
      status:    "SUCCESS",
      reference: `WALLET-COLIS-${Date.now()}`,
    });

    shipment.paymentStatus = "PAID";
    shipment.paymentId     = payment._id;
    await shipment.save();

    // Part de l'agence : prixExpedition (la plateforme garde fraisPlateforme)
    await crediterAgence(shipment.agence, shipment.prixExpedition);

    res.json({ message: "Paiement réussi depuis votre wallet.", shipment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Régions disponibles ─────────────────────────────────────────────────────
exports.getRegions = (_req, res) => res.json(REGIONS);
