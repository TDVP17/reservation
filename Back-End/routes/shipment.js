const express  = require("express");
const multer   = require("multer");
const Shipment = require("../controllers/shipmentController");
const Client   = require("../models/client");
const Agence   = require("../models/agence");
const clientAuth  = require("../middelwares/authentification")(Client);
const agenceAuth  = require("../middelwares/authentification")(Agence);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = new express.Router();

// ── Public ─────────────────────────────────────────────────────────────────
router.get("/shipments/regions",         Shipment.getRegions);
router.get("/shipments/quote",           Shipment.getQuote);
router.get("/shipments/track/:code",     Shipment.trackByCode);

// ── Agence auth ────────────────────────────────────────────────────────────
router.get("/shipments/agence/dashboard", agenceAuth, Shipment.agenceShipmentDashboard);
router.post("/shipments/receive",         agenceAuth, Shipment.receiveAtAgency);
router.patch("/shipments/:id/depart",     agenceAuth, Shipment.departFromAgency);
router.post("/shipments/:id/arrive",      agenceAuth, Shipment.arriveAtDestinationAgency);
router.post("/shipments/:id/collect",     agenceAuth, Shipment.collectAtDestinationAgency);

// ── Client auth ────────────────────────────────────────────────────────────
router.post("/shipments",                clientAuth, upload.single("image"), Shipment.creerExpedition);
router.get("/shipments/me",              clientAuth, Shipment.getMesExpeditions);
router.get("/shipments/:id",             clientAuth, Shipment.getExpeditionById);
router.post("/shipments/:id/payer-wallet",  clientAuth, Shipment.payerExpeditionWallet);

module.exports = router;
