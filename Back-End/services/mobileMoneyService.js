// ============================================================
//  MOBILE MONEY SERVICE — Orange Money & MTN MoMo (Cameroun)
//  Remplacez les valeurs "VOTRE_..." par vos vrais credentials
// ============================================================
const axios = require("axios");

// ─────────────────────────────────────────────
//  ORANGE MONEY CAMEROUN
//  Obtenez vos credentials sur : https://developer.orange.com
//  Produit : "Orange Money Web Pay - Cameroon"
// ─────────────────────────────────────────────
const ORANGE_CONFIG = {
  CLIENT_ID:     process.env.ORANGE_CLIENT_ID     || "VOTRE_ORANGE_CLIENT_ID",
  CLIENT_SECRET: process.env.ORANGE_CLIENT_SECRET || "VOTRE_ORANGE_CLIENT_SECRET",
  MERCHANT_KEY:  process.env.ORANGE_MERCHANT_KEY  || "VOTRE_ORANGE_MERCHANT_KEY",
  BASE_URL:      "https://api.orange.com/orange-money-webpay/cm/v1",
  CURRENCY:      "XAF",
};


// ─────────────────────────────────────────────
//  MTN MOBILE MONEY CAMEROUN
//  Obtenez vos credentials sur : https://momodeveloper.mtn.com
//  Produit : "Collection" (pour recevoir des paiements)
// ─────────────────────────────────────────────
const MTN_CONFIG = {
  SUBSCRIPTION_KEY: process.env.MTN_SUBSCRIPTION_KEY || "VOTRE_MTN_SUBSCRIPTION_KEY",
  API_USER:         process.env.MTN_API_USER         || "VOTRE_MTN_API_USER",
  API_KEY:          process.env.MTN_API_KEY          || "VOTRE_MTN_API_KEY",
  BASE_URL:         "https://proxy.momoapi.mtn.com/collection",
  ENVIRONMENT:      process.env.MTN_ENVIRONMENT      || "sandbox", // "sandbox" ou "mtncameroon"
  CURRENCY:         "XAF",
};

// ══════════════════════════════════════════════
//  ORANGE MONEY — Initier un paiement
// ══════════════════════════════════════════════
async function orangeInitiatePayment({ phone, amount, reference }) {
  // ÉTAPE 1 : Obtenir le token d'accès
  const tokenRes = await axios.post(
    "https://api.orange.com/oauth/v3/token",
    "grant_type=client_credentials",
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      auth: { username: ORANGE_CONFIG.CLIENT_ID, password: ORANGE_CONFIG.CLIENT_SECRET },
    }
  );
  const accessToken = tokenRes.data.access_token;

  // ÉTAPE 2 : Créer la session de paiement
  const sessionRes = await axios.post(
    `${ORANGE_CONFIG.BASE_URL}/webpayment`,
    {
      merchant_key:    ORANGE_CONFIG.MERCHANT_KEY,
      currency:        ORANGE_CONFIG.CURRENCY,
      order_id:        reference,
      amount:          String(amount),
      return_url:      process.env.APP_URL + "/payment/success",
      cancel_url:      process.env.APP_URL + "/payment/cancel",
      notif_url:       process.env.APP_URL + "/payments/webhook",
      lang:            "fr",
      reference:       reference,
    },
    { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
  );

  // Retourne l'URL de paiement (redirige le client) ou le statut
  return {
    paymentUrl: sessionRes.data.payment_url,
    payToken:   sessionRes.data.pay_token,
  };
}

// ══════════════════════════════════════════════
//  MTN MOMO — Initier un paiement (Request to Pay)
// ══════════════════════════════════════════════
async function mtnInitiatePayment({ phone, amount, reference }) {
  // ÉTAPE 1 : Obtenir le token Bearer
  const tokenRes = await axios.post(
    `${MTN_CONFIG.BASE_URL}/token/`,
    {},
    {
      headers: {
        "Ocp-Apim-Subscription-Key": MTN_CONFIG.SUBSCRIPTION_KEY,
        "X-Target-Environment":      MTN_CONFIG.ENVIRONMENT,
      },
      auth: { username: MTN_CONFIG.API_USER, password: MTN_CONFIG.API_KEY },
    }
  );
  const accessToken = tokenRes.data.access_token;

  // ÉTAPE 2 : Envoyer la demande de paiement (USSD push vers le client)
  await axios.post(
    `${MTN_CONFIG.BASE_URL}/v1_0/requesttopay`,
    {
      amount:          String(amount),
      currency:        MTN_CONFIG.CURRENCY,
      externalId:      reference,
      payer: {
        partyIdType: "MSISDN",
        partyId:     phone.replace(/\s/g, ""), // ex : "237657554893"
      },
      payerMessage: "Recharge EasyTicket",
      payeeNote:    `Recharge ${amount} FCFA`,
    },
    {
      headers: {
        Authorization:               `Bearer ${accessToken}`,
        "X-Reference-Id":            reference,
        "X-Target-Environment":      MTN_CONFIG.ENVIRONMENT,
        "Ocp-Apim-Subscription-Key": MTN_CONFIG.SUBSCRIPTION_KEY,
        "Content-Type":              "application/json",
      },
    }
  );

  // La confirmation arrive via webhook POST /payments/webhook
  return { reference };
}

// ══════════════════════════════════════════════
//  MTN MOMO — Vérifier le statut d'un paiement
// ══════════════════════════════════════════════
async function mtnCheckStatus(reference) {
  const tokenRes = await axios.post(
    `${MTN_CONFIG.BASE_URL}/token/`,
    {},
    {
      headers: {
        "Ocp-Apim-Subscription-Key": MTN_CONFIG.SUBSCRIPTION_KEY,
        "X-Target-Environment":      MTN_CONFIG.ENVIRONMENT,
      },
      auth: { username: MTN_CONFIG.API_USER, password: MTN_CONFIG.API_KEY },
    }
  );

  const statusRes = await axios.get(
    `${MTN_CONFIG.BASE_URL}/v1_0/requesttopay/${reference}`,
    {
      headers: {
        Authorization:               `Bearer ${tokenRes.data.access_token}`,
        "X-Target-Environment":      MTN_CONFIG.ENVIRONMENT,
        "Ocp-Apim-Subscription-Key": MTN_CONFIG.SUBSCRIPTION_KEY,
      },
    }
  );

  // statusRes.data.status : "PENDING" | "SUCCESSFUL" | "FAILED"
  return statusRes.data.status;
}

// ══════════════════════════════════════════════
//  EXPORT
// ══════════════════════════════════════════════
module.exports = { orangeInitiatePayment, mtnInitiatePayment, mtnCheckStatus };
