const Notification = require("../models/notification");
const Voyage = require("../models/voyage");
const Reservation = require("../models/reservation");
const Client = require("../models/client");
const Agence = require("../models/agence");
const { sendTripNotification } = require("../utils/mailer");

// ── Liste des notifications (destinataire connecté, ou historique envoyé pour l'admin) ──
// matchMode: "Client" | "Agence" (destinataire réel) ou "sender" (historique des envois admin)
exports.listMine = (matchMode) => async (req, res) => {
  try {
    const filter = matchMode === "sender"
      ? { senderType: "Admin", sender: req.user._id }
      : { recipientType: matchMode, recipient: req.user._id };

    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
    const unreadCount = matchMode === "sender" ? 0 : notifications.filter(n => !n.read).length;
    res.json({ notifications, unreadCount });

    // Purge paresseuse : les notifications sont éphémères (contrairement aux
    // paiements/retraits, jamais supprimés) — on les efface après 90 jours,
    // en arrière-plan, à l'occasion d'une lecture de ce même destinataire.
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    Notification.deleteMany({ ...filter, createdAt: { $lt: ninetyDaysAgo } }).catch(() => {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.markAllRead = (recipientType) => async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientType, recipient: req.user._id, read: false },
      { read: true }
    );
    res.json({ message: "Notifications marquées comme lues." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── Cœur réutilisable : notifie tous les passagers (compte enregistré,
// réservation confirmée) d'un voyage donné. Utilisé à la fois par la diffusion
// manuelle de l'agence et par les déclencheurs automatiques (ex: départ).
async function notifyPassengersOfVoyage(voyage, { title, body, type, senderId }, io) {
  const reservations = await Reservation.find({
    voyage: voyage._id, status: "Confirmé", client: { $ne: null },
  });
  const clientIds = [...new Set(reservations.map(r => r.client.toString()))];
  if (clientIds.length === 0) return { notifiedCount: 0 };

  const clients = await Client.find({ _id: { $in: clientIds } });

  await Promise.allSettled(clients.map(async client => {
    await Notification.create({
      recipientType: "Client", recipient: client._id,
      senderType: "Agence", sender: senderId,
      title, body, voyage: voyage._id, type,
    });
    if (client.email) {
      sendTripNotification(client.email, { subject: title, message: body, voyage }).catch(() => {});
    }
    if (io) io.to(`client-${client._id}`).emit("notification", { title, body, voyage: voyage._id, type });
  }));

  return { notifiedCount: clients.length };
}
exports.notifyPassengersOfVoyage = notifyPassengersOfVoyage;

// ── Agence → passagers d'un voyage ─────────────────────────────────────────────
exports.notifyVoyagePassengers = async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) return res.status(400).json({ error: "Titre et message requis" });

    const voyage = await Voyage.findById(req.params.voyageId);
    if (!voyage) return res.status(404).json({ error: "Voyage introuvable" });
    if (voyage.agence.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Ce voyage n'appartient pas à votre agence" });

    const io = req.app.get("io");
    const { notifiedCount } = await notifyPassengersOfVoyage(
      voyage, { title, body, type: "AGENCY_BROADCAST", senderId: req.user._id }, io
    );

    if (notifiedCount === 0) {
      return res.json({ message: "Aucun passager avec compte enregistré pour ce voyage.", notifiedCount: 0 });
    }
    res.json({ message: "Notification envoyée.", notifiedCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── Admin → une agence ─────────────────────────────────────────────────────────
exports.notifyAgence = async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) return res.status(400).json({ error: "Titre et message requis" });

    const agence = await Agence.findById(req.params.agenceId);
    if (!agence) return res.status(404).json({ error: "Agence introuvable" });

    await Notification.create({
      recipientType: "Agence", recipient: agence._id,
      senderType: "Admin", sender: req.user._id,
      title, body, type: "ADMIN_BROADCAST",
    });
    sendTripNotification(agence.email, { subject: title, message: body }).catch(() => {});

    const io = req.app.get("io");
    if (io) io.to(`agence-${agence._id}`).emit("notification", { title, body, type: "ADMIN_BROADCAST" });

    res.json({ message: "Notification envoyée à l'agence." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── Admin → toutes les agences validées ────────────────────────────────────────
exports.notifyAllAgences = async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) return res.status(400).json({ error: "Titre et message requis" });

    const agences = await Agence.find({ status: "Validé" });
    const io = req.app.get("io");

    await Promise.allSettled(agences.map(async agence => {
      await Notification.create({
        recipientType: "Agence", recipient: agence._id,
        senderType: "Admin", sender: req.user._id,
        title, body, type: "ADMIN_BROADCAST",
      });
      sendTripNotification(agence.email, { subject: title, message: body }).catch(() => {});
      if (io) io.to(`agence-${agence._id}`).emit("notification", { title, body, type: "ADMIN_BROADCAST" });
    }));

    res.json({ message: "Notification diffusée à toutes les agences.", notifiedCount: agences.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
