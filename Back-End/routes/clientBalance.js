//routes/balances
const express = require("express");
const balanceController = require("../controllers/balanceController");
const Client = require("../models/client");
const auth = require("../middelwares/authentification")(Client);

const router = new express.Router();

router.get("/balance/me", auth, balanceController.getMyBalance);
router.get("/balance/wallet", auth, balanceController.getMyWallet);

module.exports = router;
