const Payment     = require("../models/payment");
const Reservation = require("../models/reservation");
const Shipment    = require("../models/shipment");
const Balance     = require("../models/clientBlance");
const Client      = require("../models/client");
const { fapshiInitiatePayment, fapshiGetStatus } = require("../services/fapshiService");
const { koraInitiatePayment }                    = require("../services/koraService");
const { crediterAgence }                         = require("../services/balanceService");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Incitation à recharger son portefeuille EasyTicket : payer un billet
// directement depuis le solde du portefeuille coûte moitié moins cher en
// frais de service que les autres moyens de paiement (mobile money/carte).
const WALLET_FRAIS_DISCOUNT_PCT = 0.5;

// ─── Crédite le wallet après un vrai paiement ─────────────────────────────────
async function crediterWallet(clientId, amount) {
  let bal = await Balance.findOne({ client: clientId });
  if (!bal) bal = new Balance({ client: clientId, amount: 0 });
  bal.amount += Number(amount);
  await bal.save();
}

// ─── Confirme la réservation liée quand un paiement réussit ───────────────────
async function confirmReservation(reservationId) {
  if (!reservationId) return;
  await Reservation.findByIdAndUpdate(reservationId, { status: "Confirmé" });
}

// ─── Confirme le paiement d'une expédition ────────────────────────────────────
async function confirmShipmentPayment(shipmentId, paymentId) {
  if (!shipmentId) return;
  const shipment = await Shipment.findById(shipmentId);
  if (!shipment || shipment.paymentStatus === "PAID") return;
  shipment.paymentStatus = "PAID";
  shipment.paymentId     = paymentId;
  await shipment.save();
  await crediterAgence(shipment.agence, shipment.prixExpedition);
}

// ─── Paiement direct depuis le wallet ────────────────────────────────────────
exports.payWithWallet = async (req, res) => {
  try {
    const { reservationId } = req.body;
    const clientId = req.user._id;

    const reservation = await Reservation.findById(reservationId);
    if (!reservation)         return res.status(404).json({ error: "Réservation introuvable" });
    if (reservation.client?.toString() !== clientId.toString())
                              return res.status(403).json({ error: "Accès refusé" });
    if (reservation.status === "Confirmé")
                              return res.status(400).json({ error: "Déjà confirmée" });

    // Frais de service réduits de 50% pour un paiement par portefeuille.
    const fraisSiteWallet = Math.ceil(reservation.fraisSite * (1 - WALLET_FRAIS_DISCOUNT_PCT));
    const amount = reservation.montantBillets + fraisSiteWallet;

    let bal = await Balance.findOne({ client: clientId });
    if (!bal || bal.amount < amount)
      return res.status(400).json({ error: "Solde insuffisant", solde: bal?.amount ?? 0 });

    bal.amount -= amount;
    await bal.save();

    await Payment.create({
      client:      clientId,
      reservation: reservationId,
      amount,
      method:      "WALLET",
      status:      "SUCCESS",
      reference:   `WALLET-${Date.now()}`,
    });

    // La réservation reflète le montant réellement débité (reçu/manifeste
    // agence cohérents) — la part agence (montantBillets) ne change pas,
    // seule la commission plateforme (fraisSite) est réduite.
    reservation.fraisSite    = fraisSiteWallet;
    reservation.montantTotal = amount;
    reservation.status       = "Confirmé";
    await reservation.save();

    res.json({ success: true, soldeRestant: bal.amount, montantPaye: amount, fraisSite: fraisSiteWallet });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Historique paiements du client ──────────────────────────────────────────
exports.getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ client: req.user._id })
      .populate("reservation", "voyage fullName placesReservees")
      .sort({ createdAt: -1 });
    res.status(200).json(payments);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// ─── Initier paiement Mobile Money (Fapshi → Orange ou MTN) ──────────────────
// Body : { reservationId | shipmentId, amount, phone }
exports.initiatePayment = async (req, res) => {
  try {
    if (!process.env.FAPSHI_API_USER || !process.env.FAPSHI_API_KEY) {
      return res.status(503).json({ error: "GATEWAY_NOT_CONFIGURED" });
    }

    const { reservationId, shipmentId, amount, phone } = req.body;

    if (!reservationId && !shipmentId)
      return res.status(400).json({ error: "reservationId ou shipmentId requis" });
    if (!amount || Number(amount) < 100)
      return res.status(400).json({ error: "Montant minimum : 100 FCFA" });

    const client = await Client.findById(req.user._id);
    const reference = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const payment = await Payment.create({
      client:      req.user._id,
      reservation: reservationId || null,
      shipment:    shipmentId || null,
      amount:      Number(amount),
      method:      "MOBILE_MONEY",
      status:      "PENDING",
      phone:       phone || client?.phone,
      reference,
    });

    const fapshiData = await fapshiInitiatePayment({
      amount:      Number(amount),
      email:       client?.email || "",
      externalId:  payment._id.toString(),
      redirectUrl: shipmentId
        ? `${FRONTEND_URL}/expedition/${shipmentId}?payment=success`
        : `${FRONTEND_URL}/reservations?payment=success`,
    });

    // Stocker le transId Fapshi pour vérification ultérieure
    payment.transId = fapshiData.transId;
    await payment.save();

    res.status(201).json({
      paymentId:  payment._id,
      paymentUrl: fapshiData.link,
      transId:    fapshiData.transId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Initier paiement carte (Kora → Visa / Mastercard) ───────────────────────
// Body : { reservationId | shipmentId, amount }
exports.initiateCardPayment = async (req, res) => {
  try {
    if (!process.env.KORA_SECRET_KEY) {
      return res.status(503).json({ error: "GATEWAY_NOT_CONFIGURED" });
    }

    const { reservationId, shipmentId, amount } = req.body;

    if (!reservationId && !shipmentId)
      return res.status(400).json({ error: "reservationId ou shipmentId requis" });
    if (!amount || Number(amount) < 100)
      return res.status(400).json({ error: "Montant minimum : 100 FCFA" });

    const client    = await Client.findById(req.user._id);
    const reference = `CARD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const payment = await Payment.create({
      client:      req.user._id,
      reservation: reservationId || null,
      shipment:    shipmentId || null,
      amount:      Number(amount),
      method:      "CARD",
      status:      "PENDING",
      reference,
    });

    const koraData = await koraInitiatePayment({
      amount:          Number(amount),
      reference,
      customerName:    client?.name  || "Client",
      customerEmail:   client?.email || "",
      redirectUrl:     shipmentId
        ? `${FRONTEND_URL}/expedition/${shipmentId}?payment=success`
        : `${FRONTEND_URL}/reservations?payment=success`,
      notificationUrl: `${process.env.APP_URL}/payments/kora-webhook`,
    });

    res.status(201).json({
      paymentId:   payment._id,
      checkoutUrl: koraData.checkout_url,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Vérifier statut d'un paiement (polling frontend) ────────────────────────
exports.checkPaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) return res.status(404).json({ error: "Paiement introuvable" });
    if (payment.client.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Accès refusé" });

    // Si encore en attente et Mobile Money → vérifier chez Fapshi
    if (payment.method === "MOBILE_MONEY" && payment.status === "PENDING" && payment.transId) {
      const fapshiData = await fapshiGetStatus(payment.transId);
      if (fapshiData.status === "SUCCESSFUL") {
        payment.status = "SUCCESS";
        await payment.save();
        if (payment.shipment) {
          await confirmShipmentPayment(payment.shipment, payment._id);
        } else {
          await confirmReservation(payment.reservation);
        }
      } else if (fapshiData.status === "FAILED") {
        payment.status = "FAILED";
        await payment.save();
      }
    }

    res.json({ status: payment.status, amount: payment.amount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Webhook Fapshi (Orange Money / MTN MoMo) ────────────────────────────────
// Configurer dans le dashboard Fapshi : POST /payments/fapshi-webhook
exports.fapshiWebhook = async (req, res) => {
  try {
    // Fapshi envoie : { event, data: { transId, externalId, status, amount } }
    const { data } = req.body;
    if (!data) return res.status(200).json({ received: true });

    const payment = await Payment.findById(data.externalId);
    if (!payment || payment.status !== "PENDING")
      return res.status(200).json({ received: true });

    const success = ["SUCCESSFUL", "SUCCESS"].includes(String(data.status).toUpperCase());
    payment.status = success ? "SUCCESS" : "FAILED";
    if (data.transId) payment.transId = data.transId;
    await payment.save();

    if (success) {
      if (payment.shipment) {
        await confirmShipmentPayment(payment.shipment, payment._id);
      } else {
        await confirmReservation(payment.reservation);
        await crediterWallet(payment.client, payment.amount);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    res.status(200).json({ received: true });
  }
};

// ─── Webhook Kora (Visa / Mastercard) ────────────────────────────────────────
exports.koraWebhook = async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(200).json({ received: true });

    const payment = await Payment.findOne({ reference: data.reference });
    if (!payment || payment.status !== "PENDING")
      return res.status(200).json({ received: true });

    const success = ["success", "successful"].includes(String(data.status).toLowerCase());
    payment.status = success ? "SUCCESS" : "FAILED";
    await payment.save();

    if (success) {
      if (payment.shipment) {
        await confirmShipmentPayment(payment.shipment, payment._id);
      } else {
        await confirmReservation(payment.reservation);
        await crediterWallet(payment.client, payment.amount);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    res.status(200).json({ received: true });
  }
};
