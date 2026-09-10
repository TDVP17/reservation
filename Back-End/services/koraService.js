const axios = require("axios");

const BASE_URL = "https://api.korapay.com/merchant/api/v1";

async function koraInitiatePayment({ amount, reference, customerName, customerEmail, redirectUrl, notificationUrl }) {
  const res = await axios.post(
    `${BASE_URL}/charges/initialize`,
    {
      amount,
      currency: "XAF",
      reference,
      customer: { name: customerName, email: customerEmail },
      redirect_url:     redirectUrl,
      notification_url: notificationUrl,
    },
    {
      headers: {
        Authorization:  `Bearer ${process.env.KORA_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  // res.data.data = { checkout_url, reference, ... }
  return res.data.data;
}


module.exports = { koraInitiatePayment };
