//controllers voyages
const mongoose = require('mongoose');
const Voyage = require('../models/voyage');
const Reservation = require('../models/reservation');
const { notifyPassengersOfVoyage } = require('./notificationController');

exports.getVoyagesByAgence = async (req, res) => {
    try {
        // Vérification critique du middleware d'authentification
        if (!req.user || !req.user._id) {
            console.error("ERREUR: req.user est absent. Le middleware auth a-t-il échoué ?");
            return res.status(401).json({ error: "Utilisateur non authentifié ou token invalide" });
        }

        const agenceId = req.user._id;
        // Vue liste : on exclut imageBus (peut être un data-URI base64 volumineux)
        // et on ne peuple plus l'agence en entier — l'appelant est déjà cette agence.
        const voyages = await Voyage.find({ agence: agenceId })
                                    .select('-imageBus')
                                    .sort({ createdAt: -1 });

        res.status(200).json(voyages);
    } catch (error) {
        console.error("Erreur technique getVoyagesByAgence:", error);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
};

exports.reserverVoyage = async (req, res) => {
  try {
    const { voyageId, places } = req.body;

    const voyage = await Voyage.findById(voyageId);

    if (!voyage) {
      return res.status(404).json({ message: "Voyage introuvable" });
    }

    if (voyage.placesRestantes < places) {
      return res.status(400).json({ message: "Places insuffisantes" });
    }

    voyage.placesRestantes -= places;
    await voyage.save();

    res.status(200).json({
      message: "Réservation confirmée",
      placesRestantes: voyage.placesRestantes,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



exports.createVoyage = async (req, res) => { 
    try {
        console.log("Corps de la requête (Body) :", req.body);
        if (!req.user) {
            return res.status(401).json({ error: "Session expirée, reconnectez-vous." });
        }

        const { destination, depart, date, heure, placesTotal, mat, prix, typeBus } = req.body;

        const voyage = new Voyage({
            depart: depart || "",
            destination,
            date,
            heure,
            placesTotal: Number(placesTotal),
            placesRestantes: Number(placesTotal),
            mat,
            prix: Number(prix),
            typeBus: typeBus || 'Classique',
            imageBus: req.body.imageBus || (req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` : null),
            agence: req.user._id
        });

        await voyage.save(); 
        res.status(201).send(voyage);
    } catch (e) {
        res.status(400).send({ error: e.message });
    }
};




exports.updateVoyage = async (req, res) => {
    try {
        const id = req.params.id;
        const updates = { ...req.body };

        if (req.file) {
            const b64 = req.file.buffer.toString('base64');
            updates.imageBus = `data:${req.file.mimetype};base64,${b64}`;
        }

        const voyage = await Voyage.findById(id);
        if (!voyage) return res.status(404).send({ error: 'Voyage non trouvé' });

        if (voyage.agence.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Accès refusé' });
        }

        Object.assign(voyage, updates);
        await voyage.save();
        res.send(voyage);
    } catch (e) {
        console.error("Erreur updateVoyage:", e);
        res.status(500).send({ error: "Erreur lors de la mise à jour" });
    }
};

// Récupérer les passagers d'un voyage spécifique
exports.getPassagersByVoyage = async (req, res) => {
    try {
        const { voyageId } = req.params;
        
        // On cherche les réservations de ce voyage et on "remplit" (populate) les infos du client
        const reservations = await Reservation.find({ voyage: voyageId })
            .populate('client', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json(reservations);
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la récupération des passagers" });
    }
};

// controllers/voyageController.js
exports.getAllVoyages = async (req, res) => {
    try {
        // Un voyage complet ne doit plus apparaître dans le catalogue client.
        const voyages = await Voyage.find({ placesRestantes: { $gt: 0 } })
            .sort({ createdAt: -1 });
        return res.status(200).json(voyages);
    } catch (error) {
        console.error("Erreur getAllVoyages:", error);
        res.status(500).json({ error: 'Erreur lors de la récupération.' });
    }
};

// Voir les voyages de l'utilisateur connecté
// 🔥 Récupérer UN voyage par ID
exports.getVoyageById = async (req, res) => {
  try {
    const voyage = await Voyage.findById(req.params.id);

    if (!voyage) {
      return res.status(404).json({ error: "Voyage introuvable" });
    }

    res.json(voyage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};


exports.updateStatus = async (req, res) => {
  try {
    const voyage = await Voyage.findById(req.params.id);
    if (!voyage) return res.status(404).json({ error: 'Voyage non trouvé' });
    if (voyage.agence.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Accès refusé' });

    const { action } = req.body; // 'depart' | 'arrive'
    if (action === 'depart') {
      voyage.status = 'en_route';
      voyage.departedAt = new Date();
      voyage.arrivedAt = null;
    } else if (action === 'arrive') {
      voyage.status = 'arrived';
      voyage.arrivedAt = new Date();
    } else {
      return res.status(400).json({ error: 'Action invalide' });
    }
    await voyage.save();

    if (action === 'depart') {
      const io = req.app.get('io');
      const title = 'Départ imminent';
      const body = `Votre bus (${voyage.depart ? voyage.depart + ' → ' : ''}${voyage.destination}) vient de partir. Bon voyage !`;
      notifyPassengersOfVoyage(voyage, { title, body, type: 'DEPARTURE', senderId: voyage.agence }, io).catch(() => {});
    }

    res.json(voyage);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.deleteVoyage = async (req, res) => {
    try {
        const voyage = await Voyage.findById(req.params.id);
        if (!voyage) return res.status(404).send({ error: 'Voyage non trouvé.' });

        if (voyage.agence.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Accès refusé' });
        }

        await voyage.deleteOne();
        res.send({ message: 'Voyage supprimé avec succès.' });
    } catch (error) {
        res.status(500).send({ error: 'Erreur lors de la suppression du voyage.' });
    }
};


