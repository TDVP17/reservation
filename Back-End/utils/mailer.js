const axios = require('axios');

function getBrevoApiKey() {
  if (!process.env.BREVO_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Configuration email manquante (BREVO_API_KEY) — impossible d'envoyer l'email.");
    }
    return null;
  }
  return process.env.BREVO_API_KEY;
}

const sender = {
  name: "EasyTicket",
  email: "easyticket237@gmail.com"
};

async function sendVerificationEmail(to, code) {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    console.log(`[EMAIL DEV] Code pour ${to} : ${code}`);
    return { devCode: code };
  }

  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender,
        to: [{ email: to }],
        subject: `${code} — Votre code de vérification EasyTicket`,
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:16px">
            <h2 style="color:#245bcf;margin-bottom:8px">EasyTicket</h2>
            <p style="color:#374151;font-size:15px">Votre code de vérification :</p>
            <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin:20px 0">
              <span style="font-size:40px;font-weight:900;letter-spacing:10px;color:#1d4ed8">${code}</span>
            </div>
            <p style="color:#6b7280;font-size:13px">Ce code expire dans <strong>10 minutes</strong>. Ne le partagez à personne.</p>
          </div>
        `
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error("Erreur API Brevo (sendVerificationEmail):", error.response?.data || error.message);
    throw error;
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Notification libre envoyée par une agence à un passager (retard, changement de quai, etc.)
async function sendTripNotification(to, { subject, message, voyage }) {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    console.log(`[EMAIL DEV] Notification pour ${to} : ${subject} — ${message}`);
    return { devMode: true };
  }

  const dateStr = voyage?.date ? new Date(voyage.date).toLocaleDateString("fr-FR") : "";

  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender,
        to: [{ email: to }],
        subject: `${subject} — EasyTicket`,
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:16px">
            <h2 style="color:#245bcf;margin-bottom:8px">EasyTicket</h2>
            ${voyage ? `
            <div style="background:#f3f4f6;border-radius:12px;padding:16px 20px;margin:16px 0">
              <p style="color:#374151;font-size:13px;margin:0"><strong>Trajet :</strong> ${escapeHtml(voyage.depart ? voyage.depart + " → " : "")}${escapeHtml(voyage.destination || "")}</p>
              <p style="color:#374151;font-size:13px;margin:4px 0 0">${escapeHtml(dateStr)}${voyage.heure ? " à " + escapeHtml(voyage.heure) : ""}</p>
            </div>` : ""}
            <p style="color:#111827;font-size:15px;font-weight:700;margin:16px 0 4px">${escapeHtml(subject)}</p>
            <p style="color:#374151;font-size:14px;white-space:pre-line">${escapeHtml(message)}</p>
          </div>
        `
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error("Erreur API Brevo (sendTripNotification):", error.response?.data || error.message);
    throw error;
  }
}

module.exports = { sendVerificationEmail, sendTripNotification };
