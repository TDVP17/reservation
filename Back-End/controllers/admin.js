//conrollers/admin
const Admin       = require('../models/admin');
const Agence      = require('../models/agence');
const Client      = require('../models/client');
const Voyage      = require('../models/voyage');
const Livreur     = require('../models/livreur');
const Balance     = require('../models/clientBlance');
const Payment     = require('../models/payment');
const Reservation = require('../models/reservation');
const Shipment    = require('../models/shipment');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

// ── Recherche/pagination partagée pour les listes admin (agences/clients/livreurs) ──
// Purement opt-in : si aucun paramètre (search/page/limit) n'est fourni, le
// comportement historique (liste complète) est conservé pour ne rien casser
// chez les appelants existants qui n'ont pas encore été migrés vers la
// pagination. Dès qu'un des trois paramètres est présent, seule la page
// demandée (par défaut les 25 plus récents) est renvoyée.
function buildListQuery(Model, req, searchFields, baseQuery = {}) {
    const hasParams = req.query.search !== undefined || req.query.page !== undefined || req.query.limit !== undefined;
    const query = { ...baseQuery };
    if (req.query.search) {
        const escaped = String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (escaped) {
            const regex = new RegExp(escaped, 'i');
            query.$or = searchFields.map(field => ({ [field]: regex }));
        }
    }
    let cursor = Model.find(query).sort({ createdAt: -1 });
    if (hasParams) {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
        cursor = cursor.skip((page - 1) * limit).limit(limit);
    }
    return cursor;
    
}
// controllers/admin.js
exports.getFullHistory = async (req, res) => {
    try {
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 100));

        const [agences, clients] = await Promise.all([
            Agence.find({}).sort({ createdAt: -1 }).limit(limit),
            Client.find({}).sort({ createdAt: -1 }).limit(limit),
        ]);

        const history = [
            ...agences.map(a => ({
                type: 'AGENCE',
                name: a.name || "Sans nom",
                date: a.createdAt || new Date(),
                status: a.status
            })),
            ...clients.map(c => ({
                type: 'CLIENT',
                name: c.name || "Anonyme",
                date: c.createdAt || new Date()
            }))
        ]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);

        res.status(200).json(history);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
// controllers/admin.js
// Chiffre d'affaires de la PLATEFORME uniquement : la commission système
// (frais de service sur les billets + frais plateforme sur les colis), jamais
// le prix brut des billets/colis qui appartient aux agences. Le CA brut par
// agence reste strictement privé à cette agence (getRevenueSummary côté agence).
exports.getGlobalStats = async (req, res) => {
    try {
        const totalAgences = await Agence.countDocuments();
        const totalVoyages = await Voyage.countDocuments(); // Assure-toi d'importer le modèle Voyage
        const totalClients = await Client.countDocuments();
        const allAgences = await Agence.find().limit(5).sort({ createdAt: -1 });
        const alertes = await Agence.countDocuments({ status: { $ne: 'Validé' } });
        const confirmees = await Agence.countDocuments({ status: 'Validé' });

        const ticketFeesAgg = await Reservation.aggregate([
            { $match: { status: 'Confirmé' } },
            { $group: { _id: null, total: { $sum: '$fraisSite' } } }
        ]);
        const shipmentFeesAgg = await Shipment.aggregate([
            { $match: { paymentStatus: 'PAID' } },
            { $group: { _id: null, total: { $sum: '$fraisPlateforme' } } }
        ]);
        const platformRevenue = (ticketFeesAgg[0]?.total || 0) + (shipmentFeesAgg[0]?.total || 0);

        res.send({
            totalAgences,
            totalVoyages,
            totalClients,
            platformRevenue,
            agences: allAgences,
            alertes,
            confirmees
        });
    } catch (e) {
        res.status(500).send(e);
    }
};

// 1. CRÉATION (Pour Postman)
exports.createAdmin = async (req, res) => {
  const { name, email, password } = req.body;
  
  try {
    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "L'email existe déjà." });
    }

    const admin = new Admin({ name, email, password });
    // Note: generateAuthTokenAndSaveUser fait déjà le .save()
    const authToken = await admin.generateAuthTokenAndSaveUser();
    
    res.status(201).send({ 
      admin: { id: admin._id, name: admin.name, email: admin.email }, 
      authToken 
    });
  } catch (e) {
    console.error("Erreur Backend:", e); // Regarde ton terminal VS Code !
    res.status(400).send({ error: e.message });
  }
};
// 2. CONNEXION (Pour l'interface Espace Admin)
exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findUser(email, password);
    const authToken = await admin.generateAuthTokenAndSaveUser();
    res.send({
        message: 'Connexion réussie !',
        admin: { name: admin.name, email: admin.email, preferredLang: admin.preferredLang },
        authToken
    });
  } catch (e) {
    res.status(401).send({ error: 'Identifiants invalides.' });
  }
};

// 2b. PRÉFÉRENCE DE LANGUE
exports.updateLang = async (req, res) => {
    try {
        const { preferredLang } = req.body;
        if (preferredLang !== 'fr' && preferredLang !== 'en') {
            return res.status(400).json({ error: "Langue invalide (fr ou en attendu)" });
        }
        req.user.preferredLang = preferredLang;
        await req.user.save();
        res.json({ message: "Langue mise à jour", preferredLang: req.user.preferredLang });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// 3. GESTION DES AGENCES (Nouveau)
exports.getAllAgences = async (req, res) => {
    try {
        const agences = await buildListQuery(Agence, req, ['name', 'email', 'telephone']).select('+financialAccessPin');
        const withPinFlag = agences.map(a => {
            const obj = a.toJSON();
            obj.hasFinancialPin = !!a.financialAccessPin;
            return obj;
        });
        res.send(withPinFlag);
    } catch (e) {
        res.status(500).send({ error: "Erreur récupération agences" });
    }
};

exports.validateAgence = async (req, res) => {
    try {
        const agence = await Agence.findById(req.params.id);
        if (!agence) return res.status(404).send({ error: 'Agence non trouvée' });
        
        agence.status = 'Validé';
        await agence.save();
        res.send({ message: "Agence validée avec succès", agence });
    } catch (e) {
        res.status(500).send(e);
    }
};

// 3b. BANNISSEMENT / RÉACTIVATION DES AGENCES
exports.banAgence = async (req, res) => {
    try {
        const { reason } = req.body;
        const agence = await Agence.findByIdAndUpdate(
            req.params.id,
            { isBanned: true, banReason: reason || null, bannedAt: new Date(), authTokens: [] },
            { new: true }
        );
        if (!agence) return res.status(404).json({ error: "Agence introuvable" });
        res.json({ message: "Agence bannie avec succès", agence });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.unbanAgence = async (req, res) => {
    try {
        const agence = await Agence.findByIdAndUpdate(
            req.params.id,
            { isBanned: false, banReason: null, bannedAt: null },
            { new: true }
        );
        if (!agence) return res.status(404).json({ error: "Agence introuvable" });
        res.json({ message: "Agence réactivée avec succès", agence });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// 3c. DÉFINIR / RÉINITIALISER LE PIN FINANCIER D'UNE AGENCE (géré uniquement par l'admin)
exports.setAgencyPin = async (req, res) => {
    try {
        const { pin } = req.body;
        if (!/^\d{4,6}$/.test(pin || "")) {
            return res.status(400).json({ error: "Le PIN doit contenir entre 4 et 6 chiffres" });
        }
        const agence = await Agence.findById(req.params.id);
        if (!agence) return res.status(404).json({ error: "Agence introuvable" });

        agence.financialAccessPin = await bcrypt.hash(pin, 10);
        agence.pinResetRequested = false;
        agence.pinResetRequestedAt = null;
        await agence.save();

        res.json({ message: "PIN financier défini pour cette agence." });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// 4. GESTION DES CLIENTS (Nouveau)
exports.getAllClients = async (req, res) => {
    try {
        const clients = await buildListQuery(Client, req, ['name', 'email', 'phone']);
        res.send(clients);
    } catch (e) {
        res.status(500).send(e);
    }
};

// 4b. BANNISSEMENT / RÉACTIVATION DES CLIENTS
exports.banClient = async (req, res) => {
    try {
        const { reason } = req.body;
        const client = await Client.findByIdAndUpdate(
            req.params.id,
            { isBanned: true, banReason: reason || null, bannedAt: new Date(), authTokens: [] },
            { new: true }
        );
        if (!client) return res.status(404).json({ error: "Client introuvable" });
        res.json({ message: "Client banni avec succès", client });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.unbanClient = async (req, res) => {
    try {
        const client = await Client.findByIdAndUpdate(
            req.params.id,
            { isBanned: false, banReason: null, bannedAt: null },
            { new: true }
        );
        if (!client) return res.status(404).json({ error: "Client introuvable" });
        res.json({ message: "Client réactivé avec succès", client });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// ── GESTION DES LIVREURS ─────────────────────────────────────────────────────

exports.getAllLivreurs = async (req, res) => {
  try {
    const livreurs = await buildListQuery(Livreur, req, ['nom', 'ville', 'telephone']).select("-password -authTokens");
    res.json(livreurs);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createLivreur = async (req, res) => {
  try {
    const { nom, telephone, whatsapp, ville, vehicule, password } = req.body;
    if (!nom || !telephone || !ville || !password)
      return res.status(400).json({ error: "Nom, téléphone, ville et mot de passe requis" });

    const email = `livreur_${Date.now()}@easyticket.cm`;
    const livreur = await Livreur.create({ nom, email, password, telephone, whatsapp: whatsapp || telephone, ville, vehicule: vehicule || "Moto" });
    res.status(201).json({ message: "Livreur créé.", livreur: { _id: livreur._id, nom: livreur.nom, telephone: livreur.telephone, ville: livreur.ville } });
  } catch (e) { res.status(400).json({ error: e.message }); }
};

exports.updateLivreur = async (req, res) => {
  try {
    const { nom, telephone, whatsapp, ville, vehicule, disponible } = req.body;
    const livreur = await Livreur.findByIdAndUpdate(
      req.params.id,
      { ...(nom && { nom }), ...(telephone && { telephone }), ...(whatsapp && { whatsapp }), ...(ville && { ville }), ...(vehicule && { vehicule }), ...(disponible !== undefined && { disponible }) },
      { new: true }
    ).select("-password -authTokens");
    if (!livreur) return res.status(404).json({ error: "Livreur introuvable" });
    res.json(livreur);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteLivreur = async (req, res) => {
  try {
    await Livreur.findByIdAndDelete(req.params.id);
    res.json({ message: "Livreur supprimé." });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── DÉCONNEXION ───────────────────────────────────────────────────────────────

// 5. DÉCONNEXION
exports.resetAllBalances = async (req, res) => {
    try {
        const result = await Balance.updateMany({}, { $set: { amount: 0 } });
        res.json({ message: `${result.modifiedCount} solde(s) remis à zéro.` });
    } catch (e) {
        res.status(500).json({ error: 'Erreur lors du reset des soldes.' });
    }
};

exports.logoutAdmin = async (req, res) => {
    try {
        req.user.authTokens = req.user.authTokens.filter(token => token.authToken !== req.authToken);
        await req.user.save();
        res.send({ message: 'Déconnexion réussie.' });
    } catch (e) {
        res.status(500).send({ error: 'Erreur déconnexion.' });
    }
};