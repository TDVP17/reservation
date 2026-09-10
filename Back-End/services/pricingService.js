// ═══════════════════════════════════════════════════════════════════
//  SERVICE DE CALCUL DU PRIX D'EXPÉDITION — 10 Régions du Cameroun
//  Référence de base : Est → Littoral (Bertoua → Douala)
// ═══════════════════════════════════════════════════════════════════

const REGIONS = [
  "Adamaoua",
  "Centre",
  "Est",
  "Extrême-Nord",
  "Littoral",
  "Nord",
  "Nord-Ouest",
  "Ouest",
  "Sud",
  "Sud-Ouest",
];


// Tiers de distance entre régions (0 = même région, 1 = très proche, ..., 5 = très loin)
// Matrice symétrique — référence : Est→Littoral = tier 3
const DISTANCE_TIERS = {
  "Adamaoua":    { "Adamaoua": 0, "Centre": 4, "Est": 3, "Extrême-Nord": 4, "Littoral": 5, "Nord": 2, "Nord-Ouest": 5, "Ouest": 4, "Sud": 5, "Sud-Ouest": 5 },
  "Centre":      { "Adamaoua": 4, "Centre": 0, "Est": 2, "Extrême-Nord": 5, "Littoral": 1, "Nord": 4, "Nord-Ouest": 2, "Ouest": 2, "Sud": 1, "Sud-Ouest": 2 },
  "Est":         { "Adamaoua": 3, "Centre": 2, "Est": 0, "Extrême-Nord": 5, "Littoral": 3, "Nord": 4, "Nord-Ouest": 4, "Ouest": 3, "Sud": 3, "Sud-Ouest": 3 },
  "Extrême-Nord":{ "Adamaoua": 4, "Centre": 5, "Est": 5, "Extrême-Nord": 0, "Littoral": 5, "Nord": 2, "Nord-Ouest": 5, "Ouest": 5, "Sud": 5, "Sud-Ouest": 5 },
  "Littoral":    { "Adamaoua": 5, "Centre": 1, "Est": 3, "Extrême-Nord": 5, "Littoral": 0, "Nord": 5, "Nord-Ouest": 1, "Ouest": 1, "Sud": 2, "Sud-Ouest": 1 },
  "Nord":        { "Adamaoua": 2, "Centre": 4, "Est": 4, "Extrême-Nord": 2, "Littoral": 5, "Nord": 0, "Nord-Ouest": 4, "Ouest": 4, "Sud": 5, "Sud-Ouest": 5 },
  "Nord-Ouest":  { "Adamaoua": 5, "Centre": 2, "Est": 4, "Extrême-Nord": 5, "Littoral": 1, "Nord": 4, "Nord-Ouest": 0, "Ouest": 1, "Sud": 3, "Sud-Ouest": 2 },
  "Ouest":       { "Adamaoua": 4, "Centre": 2, "Est": 3, "Extrême-Nord": 5, "Littoral": 1, "Nord": 4, "Nord-Ouest": 1, "Ouest": 0, "Sud": 2, "Sud-Ouest": 1 },
  "Sud":         { "Adamaoua": 5, "Centre": 1, "Est": 3, "Extrême-Nord": 5, "Littoral": 2, "Nord": 5, "Nord-Ouest": 3, "Ouest": 2, "Sud": 0, "Sud-Ouest": 2 },
  "Sud-Ouest":   { "Adamaoua": 5, "Centre": 2, "Est": 3, "Extrême-Nord": 5, "Littoral": 1, "Nord": 5, "Nord-Ouest": 2, "Ouest": 1, "Sud": 2, "Sud-Ouest": 0 },
};

// Multiplicateurs par tier
const TIER_MULTIPLIERS = { 0: 0.4, 1: 0.6, 2: 0.8, 3: 1.0, 4: 1.3, 5: 1.6 };

// Prix de base (référence tier 3 = Est→Littoral)
function getBasePrix(valeur) {
  if (valeur <= 0)        throw new Error("La valeur doit être supérieure à 0");
  if (valeur > 200000)    throw new Error("Valeur maximale autorisée est de 200 000 FCFA");
  if (valeur <= 8000)     return 2000;
  if (valeur <= 50000)    return 5000;
  if (valeur <= 100000)   return 15000;
  return 40000;
}

/**
 * Calcule le prix d'expédition.
 * @param {number} valeur - Valeur du colis en FCFA
 * @param {string} regionDepart
 * @param {string} regionDestination
 * @returns {{ prixExpedition, fraisPlateforme, montantTotal }}
 */
function calculateShipping(valeur, regionDepart, regionDestination) {
  if (!REGIONS.includes(regionDepart))
    throw new Error(`Région de départ invalide : ${regionDepart}`);
  if (!REGIONS.includes(regionDestination))
    throw new Error(`Région de destination invalide : ${regionDestination}`);

  const basePrix   = getBasePrix(valeur);
  const tier       = DISTANCE_TIERS[regionDepart][regionDestination];
  const multiplier = TIER_MULTIPLIERS[tier];

  const prixExpedition  = Math.ceil(basePrix * multiplier);
  const fraisPlateforme = Math.ceil(prixExpedition * 0.05);
  const montantTotal    = prixExpedition + fraisPlateforme;

  return { prixExpedition, fraisPlateforme, montantTotal };
}

module.exports = { calculateShipping, REGIONS };
