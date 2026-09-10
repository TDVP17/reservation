import api from "./api";

export const getMyBalance = async () => {
  const res = await api.get("/balance/me");
  return res.data;
};

export const getMyWallet = async () => {
  const res = await api.get("/balance/wallet");
  return res.data;
};
