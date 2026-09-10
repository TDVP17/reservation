const AgenceBalance = require("../models/agenceBalance");

// ─── Crédite le solde d'une agence (ex: part expédition d'un paiement colis) ──
async function crediterAgence(agenceId, amount) {
  if (!agenceId || !amount) return;
  let bal = await AgenceBalance.findOne({ agence: agenceId });
  if (!bal) bal = new AgenceBalance({ agence: agenceId, amount: 0 });
  bal.amount += Number(amount);
  await bal.save();
}

// ─── Débite le solde d'une agence (retrait) de façon atomique ──
// Le filtre amount >= montant empêche toute course (deux retraits simultanés)
// de mettre le solde en négatif : si le solde est insuffisant au moment de la
// mise à jour, aucun document ne matche et null est retourné.
async function debiterAgence(agenceId, amount) {
  return AgenceBalance.findOneAndUpdate(
    { agence: agenceId, amount: { $gte: amount } },
    { $inc: { amount: -amount } },
    { new: true }
  );
}

module.exports = { crediterAgence, debiterAgence };

