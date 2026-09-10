//route reservations
const express = require("express");
const ReservationController = require("../controllers/reservationController");
const Client = require("../models/client");
const Agence = require("../models/agence");
const clientAuth = require("../middelwares/authentification")(Client);
const agenceAuth = require("../middelwares/authentification")(Agence);


const router = new express.Router();

router.post("/reservations/guest", ReservationController.creerReservationGuest);
router.post("/reservations", clientAuth, ReservationController.creerReservation);
router.get("/reservations/me", clientAuth, ReservationController.getMyReservations);
router.get("/reservations/agence", agenceAuth, ReservationController.getReservationsByAgence);
router.get("/reservations/ma-liste-passagers", agenceAuth, ReservationController.getPassagersParVoyage);
router.post("/reservations/agence/sur-place", agenceAuth, ReservationController.creerReservationSurPlace);
router.patch("/reservations/:id/cancel", clientAuth, ReservationController.cancelReservation);
router.patch("/reservations/:id/valider-code", agenceAuth, ReservationController.validerCodeBillet);

module.exports = router;