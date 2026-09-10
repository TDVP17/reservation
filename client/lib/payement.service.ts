import api from "./api";

export const getMyPayments = async () => {
  const res = await api.get("/payments/me");
  return res.data;
};

export const initiatePayment = async (data: {
  reservationId: string;
  amount: number;
  phone?: string;
}) => {
  const res = await api.post("/payments/initiate", data);
  return res.data as { paymentId: string; paymentUrl: string; transId: string };
};

export const initiateCardPayment = async (data: {
  reservationId: string;
  amount: number;
}) => {
  const res = await api.post("/payments/initiate-card", data);
  return res.data as { paymentId: string; checkoutUrl: string };
};

export const checkPaymentStatus = async (paymentId: string) => {
  const res = await api.get(`/payments/status/${paymentId}`);
  return res.data as { status: "PENDING" | "SUCCESS" | "FAILED"; amount: number };
};
