import express from 'express';
import { sendNotificationEmail } from '../utils/email.js';

const router = express.Router();

// Exemple de route pour créer une réservation et envoyer un e-mail
router.post('/api/reservations', async (req, res) => {
  try {
    const { clientEmail, clientName, travelDetails } = req.body;

    // 1. Logique de sauvegarde en base de données (MongoDB/PostgreSQL...)
    // const newReservation = await saveToDatabase(...);

    // 2. Déclenchement de l'e-mail via le backend
    await sendNotificationEmail(
      clientEmail,
      "Confirmation de votre réservation EasyTicket",
      `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Bonjour ${clientName},</h2>
          <p>Votre réservation a bien été prise en compte avec succès !</p>
          <p><strong>Détails :</strong> ${travelDetails}</p>
          <br/>
          <p>Merci d'utiliser notre plateforme.</p>
        </div>
      `
    );

    res.status(200).json({ message: "Réservation créée et e-mail envoyé avec succès !" });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors du traitement." });
  }
});

export default router;