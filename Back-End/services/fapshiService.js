const axios = require("axios");

const BASE_URL = "https://live.fapshi.com";

function headers() {
  return {
    apiuser: process.env.FAPSHI_API_USER,
    apikey:  process.env.FAPSHI_API_KEY,
    "Content-Type": "application/json",
  };
}


async function fapshiInitiatePayment({ amount, email, externalId, redirectUrl }) {
  const res = await axios.post(
    `${BASE_URL}/initiate-pay`,
    { amount, email, externalId, redirectUrl },
    { headers: headers() }
  );
  // res.data = { transId, link, message, status }
  return res.data;
}

async function fapshiGetStatus(transId) {
  const res = await axios.get(
    `${BASE_URL}/payment-status/${transId}`,
    { headers: headers() }
  );
  // res.data = { transId, status: "SUCCESSFUL" | "FAILED" | "PENDING", ... }
  return res.data;
}

module.exports = { fapshiInitiatePayment, fapshiGetStatus };
