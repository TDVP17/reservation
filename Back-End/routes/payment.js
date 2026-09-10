const express = require("express");
const PaymentController = require("../controllers/paymentController");
const Client = require("../models/client");
const auth = require("../middelwares/authentification")(Client);
const router = new express.Router();


// Clients authentifiés
router.get("/payments/me",                        auth, PaymentController.getMyPayments);
router.post("/payments/initiate",                 auth, PaymentController.initiatePayment);
router.post("/payments/initiate-card",            auth, PaymentController.initiateCardPayment);
router.post("/payments/pay-wallet",               auth, PaymentController.payWithWallet);
router.get("/payments/status/:paymentId",         auth, PaymentController.checkPaymentStatus);

// Webhooks publics (appelés par Fapshi / Kora)
router.post("/payments/fapshi-webhook",  PaymentController.fapshiWebhook);
router.post("/payments/kora-webhook",    PaymentController.koraWebhook);

module.exports = router;
