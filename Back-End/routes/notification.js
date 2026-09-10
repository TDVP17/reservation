const express = require("express");
const Client = require("../models/client");
const Agence = require("../models/agence");
const Admin = require("../models/admin");
const clientAuth = require("../middelwares/authentification")(Client);
const agenceAuth = require("../middelwares/authentification")(Agence);
const adminAuth = require("../middelwares/authentification")(Admin);
const notificationController = require("../controllers/notificationController");


const router = new express.Router();

// ── Client (destinataire) ──────────────────────────────────────────────────────
router.get("/clients/notifications", clientAuth, notificationController.listMine("Client"));
router.patch("/clients/notifications/read-all", clientAuth, notificationController.markAllRead("Client"));

// ── Agence (destinataire + expéditeur vers les passagers) ─────────────────────
router.get("/agences/notifications", agenceAuth, notificationController.listMine("Agence"));
router.patch("/agences/notifications/read-all", agenceAuth, notificationController.markAllRead("Agence"));
router.post("/agences/notifications/voyage/:voyageId", agenceAuth, notificationController.notifyVoyagePassengers);

// ── Admin (historique des envois + expéditeur vers les agences) ───────────────
router.get("/admin/notifications", adminAuth, notificationController.listMine("sender"));
router.post("/admin/notifications/agence/:agenceId", adminAuth, notificationController.notifyAgence);
router.post("/admin/notifications/broadcast", adminAuth, notificationController.notifyAllAgences);

module.exports = router;
