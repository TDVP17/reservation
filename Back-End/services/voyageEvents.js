const Notification = require("../models/notification");

// Diffuse le nouveau nombre de places restantes à quiconque suit ce voyage
// (page de réservation client, tableau de bord agence) via la room socket déjà
// utilisée pour la position du bus — pas de nouveau canal à créer.
function emitSeatsUpdated(io, voyageId, placesRestantes) {
  if (io) io.to(`voyage-${voyageId}`).emit("seats-updated", { voyageId: voyageId.toString(), placesRestantes });
}

// À appeler juste après toute décrémentation de places. Émet la mise à jour
// temps réel et, si le voyage vient de passer à 0 place, notifie l'agence.
async function handleSeatsDecremented(io, voyage) {
  emitSeatsUpdated(io, voyage._id, voyage.placesRestantes);

  if (voyage.placesRestantes <= 0) {
    const title = "Voyage complet";
    const body = `Le voyage ${voyage.depart ? voyage.depart + " → " : ""}${voyage.destination} du ${new Date(voyage.date).toLocaleDateString("fr-FR")} à ${voyage.heure} est désormais complet.`;

    await Notification.create({
      recipientType: "Agence", recipient: voyage.agence,
      senderType: "Agence", sender: voyage.agence,
      title, body, voyage: voyage._id, type: "VOYAGE_FULL",
    });
    if (io) io.to(`agence-${voyage.agence}`).emit("notification", { title, body, voyage: voyage._id, type: "VOYAGE_FULL" });
  }
}

module.exports = { emitSeatsUpdated, handleSeatsDecremented };
