// Script one-shot : remet tous les soldes à 0
// Lancer : node Back-End/scripts/resetBalances.js
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Balance  = require("../models/clientBlance");

(async () => {
  const uri = process.env.LOCAL_DB || process.env.MONGO_URI;
  if (!uri) { console.error("❌  Variable MONGO_URI / LOCAL_DB manquante."); process.exit(1); }

  await mongoose.connect(uri);
  console.log("✅  Connecté à MongoDB");

  const result = await Balance.updateMany({}, { $set: { amount: 0 } });
  console.log(`✅  ${result.modifiedCount} solde(s) remis à zéro.`);

  await mongoose.disconnect();
  console.log("✅  Déconnecté. Opération terminée.");
})();
