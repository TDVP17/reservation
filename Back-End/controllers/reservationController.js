//controller reservation
const Reservation = require("../models/reservation");
const Voyage = require("../models/voyage");
const Balance = require("../models/clientBlance");
const { handleSeatsDecremented, emitSeatsUpdated } = require("../services/voyageEvents");

const FRAIS_SITE_PCT = 0.05; // 5% de frais de service
const RETENTION_MS = 3 * 24 * 60 * 60 * 1000; // 3 jours

function genCode() {
  return "BIL-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

// Génère et persiste un codeBillet pour les réservations créées avant l'ajout de ce champ
async function ensureCode(reservation) {
  if (!reservation.codeBillet) {
    reservation.codeBillet = genCode();
    await reservation.save();
  }
  return reservation;
}

exports.creerReservation = async (req, res) => {
  try {
    const { voyageId, nbPlaces, fullName, phoneNumber } = req.body;
    const clientId = req.user._id;
    const places = Number(nbPlaces);

    const voyage = await Voyage.findById(voyageId);
    if (!voyage) return res.status(404).json({ message: "Voyage non trouvé" });

    if (voyage.placesRestantes < places)
      return res.status(400).json({ message: "Places insuffisantes" });

    const montantBillets = voyage.prix * places;
    const fraisSite      = Math.ceil(montantBillets * FRAIS_SITE_PCT);
    const montantTotal   = montantBillets + fraisSite;

    voyage.placesRestantes -= places;

    const nouvelleReservation = new Reservation({
      voyage: voyageId,
      client: clientId,
      fullName,
      phoneNumber,
      placesReservees: places,
      montantBillets,
      fraisSite,
      montantTotal,
      status: "En attente",
    });

    await nouvelleReservation.save();
    await voyage.save();
    await handleSeatsDecremented(req.app.get("io"), voyage);

    res.status(201).json({
      message: "Réservation créée, en attente de paiement.",
      reservation: nouvelleReservation,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getReservationsByAgence = async (req, res) => {
  try {
    const voyages = await Voyage.find({ agence: req.user._id }).select('_id');
    const voyageIds = voyages.map(v => v._id);
    const reservations = await Reservation.find({ voyage: { $in: voyageIds } })
      .populate('client', 'name email telephone')
      .populate('voyage', 'destination date heure prix')
      .sort({ createdAt: -1 });
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({ client: req.user._id })
      .populate({ path: 'voyage', populate: { path: 'agence', select: 'name ville telephone' } })
      .sort({ createdAt: -1 });
    await Promise.all(reservations.map(ensureCode));
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPassagersParVoyage = async (req, res) => {
  try {
    // Ne garde que les voyages "actifs" : pas encore arrivés (peu importe la
    // date), ou arrivés depuis moins de 3 jours — les manifestes de voyages
    // terminés depuis plus longtemps sont masqués côté agence pour ne pas
    // encombrer la vue (les réservations elles-mêmes restent en base, donc
    // l'historique du client n'est jamais affecté).
    const cutoff = new Date(Date.now() - RETENTION_MS);
    const voyages = await Voyage.find({
      agence: req.user._id,
      $or: [
        { status: "arrived", arrivedAt: { $gte: cutoff } },
        { status: { $ne: "arrived" }, date: { $gte: cutoff } },
      ],
    }).select('_id');
    const voyageIds = voyages.map(v => v._id);

    const reservations = await Reservation.find({
      voyage: { $in: voyageIds },
      status: { $ne: "Annulé" },
    })
      .populate('client', 'name email phone avatar')
      .populate('voyage', 'destination depart date heure prix mat typeBus placesTotal placesRestantes status')
      .sort({ createdAt: -1 });

    const missingCode = reservations.filter(r => !r.codeBillet);
    if (missingCode.length > 0) {
      await Reservation.bulkWrite(missingCode.map(r => {
        const code = genCode();
        r.codeBillet = code;
        return { updateOne: { filter: { _id: r._id }, update: { codeBillet: code } } };
      }));
    }

    // Grouper par voyage, n'inclure que les voyages avec au moins 1 réservation
    const grouped = {};
    reservations.forEach(r => {
      const vid = r.voyage?._id?.toString();
      if (!vid) return;
      if (!grouped[vid]) {
        grouped[vid] = {
          voyage: r.voyage,
          passagers: [],
          totalPlaces: 0,
          totalRevenus: 0,
        };
      }
      grouped[vid].passagers.push({
        _id: r._id,
        fullName: r.fullName,
        phoneNumber: r.phoneNumber,
        placesReservees: r.placesReservees,
        status: r.status,
        isGuest: r.isGuest,
        guestMobileMoney: r.guestMobileMoney,
        createdAt: r.createdAt,
        client: r.client || null,
        codeBillet: r.codeBillet,
        codeUsed: r.codeUsed,
      });
      grouped[vid].totalPlaces  += r.placesReservees;
      grouped[vid].totalRevenus += (r.voyage?.prix || 0) * r.placesReservees;
    });

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.creerReservationGuest = async (req, res) => {
  try {
    const { voyageId, fullName, phoneNumber, nbPlaces, mobileMoney } = req.body;
    const places = Number(nbPlaces) || 1;

    if (!fullName || !phoneNumber || !mobileMoney)
      return res.status(400).json({ message: "Tous les champs sont requis." });

    const voyage = await Voyage.findById(voyageId);
    if (!voyage) return res.status(404).json({ message: "Voyage introuvable" });
    if (voyage.placesRestantes < places)
      return res.status(400).json({ message: "Places insuffisantes" });

    voyage.placesRestantes -= places;
    await voyage.save();
    await handleSeatsDecremented(req.app.get("io"), voyage);

    const reservation = new Reservation({
      voyage: voyageId,
      client: null,
      fullName,
      phoneNumber,
      placesReservees: places,
      isGuest: true,
      guestMobileMoney: mobileMoney,
      status: "En attente",
    });
    await reservation.save();

    res.status(201).json({
      message: "Réservation enregistrée. Paiement en attente de confirmation.",
      reservation: {
        _id: reservation._id,
        fullName,
        phoneNumber,
        placesReservees: places,
        status: reservation.status,
        createdAt: reservation.createdAt,
        codeBillet: reservation.codeBillet,
        voyage: {
          _id: voyage._id,
          destination: voyage.destination,
          depart: voyage.depart,
          date: voyage.date,
          heure: voyage.heure,
          prix: voyage.prix,
          mat: voyage.mat,
          typeBus: voyage.typeBus,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Réservation sur place, payée en espèces (agence uniquement) ────────────────
// Modelée sur creerReservation (calcul des frais identique) plutôt que sur
// creerReservationGuest, qui ne calcule jamais montantBillets/fraisSite et ne
// passe jamais en "Confirmé" — inadapté à un paiement encaissé immédiatement.
exports.creerReservationSurPlace = async (req, res) => {
  try {
    const { voyageId, fullName, phoneNumber, nbPlaces } = req.body;
    const places = Number(nbPlaces) || 1;

    if (!fullName || !phoneNumber) {
      return res.status(400).json({ message: "Nom et numéro du passager requis." });
    }

    const voyage = await Voyage.findById(voyageId);
    if (!voyage) return res.status(404).json({ message: "Voyage introuvable" });
    if (voyage.agence.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Ce voyage n'appartient pas à votre agence" });
    if (voyage.placesRestantes < places)
      return res.status(400).json({ message: "Places insuffisantes" });

    const montantBillets = voyage.prix * places;
    const fraisSite      = Math.ceil(montantBillets * FRAIS_SITE_PCT);
    const montantTotal   = montantBillets + fraisSite;

    voyage.placesRestantes -= places;
    await voyage.save();
    await handleSeatsDecremented(req.app.get("io"), voyage);

    const reservation = await Reservation.create({
      voyage: voyageId,
      client: null,
      fullName,
      phoneNumber,
      placesReservees: places,
      montantBillets,
      fraisSite,
      montantTotal,
      isGuest: true,
      paymentMethod: "CASH",
      status: "Confirmé", // encaissé immédiatement, pas de confirmation asynchrone à attendre
    });

    res.status(201).json({
      message: "Réservation sur place enregistrée.",
      reservation,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('voyage');
    if (!reservation) return res.status(404).json({ message: "Réservation introuvable" });
    if (!reservation.client || reservation.client.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Accès refusé" });
    if (reservation.status === "Annulé")
      return res.status(400).json({ message: "Déjà annulée" });
    // Règle 1 : un billet non payé n'a rien à rembourser/annuler formellement.
    if (reservation.status !== "Confirmé")
      return res.status(400).json({ message: "Seule une réservation payée peut être annulée." });
    // Règle 2 : un code déjà validé à l'embarquement ne peut plus être annulé,
    // même si le voyage a eu lieu il y a longtemps.
    if (reservation.codeUsed)
      return res.status(400).json({ message: "Ce billet a déjà été utilisé." });

    const voyage = await Voyage.findById(reservation.voyage._id ?? reservation.voyage);
    if (voyage) {
      voyage.placesRestantes += reservation.placesReservees;
      await voyage.save();
      emitSeatsUpdated(req.app.get("io"), voyage._id, voyage.placesRestantes);
    }

    // Remboursement : le montant payé est recrédité sur le portefeuille du client.
    if (reservation.montantTotal > 0) {
      let bal = await Balance.findOne({ client: reservation.client });
      if (!bal) bal = new Balance({ client: reservation.client, amount: 0 });
      bal.amount += reservation.montantTotal;
      await bal.save();
    }

    reservation.status = "Annulé";
    await reservation.save();
    res.json({ message: "Réservation annulée, places restituées et montant remboursé sur votre portefeuille." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Agence : marque le code d'un billet comme validé à l'embarquement ─────────
// Une fois validé, le billet n'est plus annulable par le client (règle 2).
exports.validerCodeBillet = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('voyage');
    if (!reservation) return res.status(404).json({ message: "Réservation introuvable" });
    if (!reservation.voyage || reservation.voyage.agence.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Ce billet n'appartient pas à un voyage de votre agence" });
    if (reservation.status !== "Confirmé")
      return res.status(400).json({ message: "Ce billet n'est pas confirmé" });
    if (reservation.codeUsed)
      return res.status(400).json({ message: "Ce billet a déjà été validé" });

    reservation.codeUsed = true;
    reservation.codeUsedAt = new Date();
    await reservation.save();

    res.json({ message: "Billet validé, passager embarqué.", reservation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

