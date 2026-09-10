//lib/client.service.ts
"use client";

import api from "./api";

export const loginClient = async (data: { email: string; password: string; }) => {
  const res = await api.post("/clients/login", data);

  // CRUCIAL : On enregistre les nouvelles données
  if (res.data.authToken) {
    localStorage.setItem("token", res.data.authToken);
    localStorage.setItem("client", JSON.stringify(res.data.client));
    if (res.data.client?.preferredLang === "fr" || res.data.client?.preferredLang === "en") {
      localStorage.setItem("lang", res.data.client.preferredLang);
    }
  }

  return res.data;
};

export const loginWithGoogle = async (credential: string) => {
  const res = await api.post("/clients/google", { credential });

  if (res.data.authToken) {
    localStorage.setItem("token", res.data.authToken);
    localStorage.setItem("client", JSON.stringify(res.data.client));
    if (res.data.client?.preferredLang === "fr" || res.data.client?.preferredLang === "en") {
      localStorage.setItem("lang", res.data.client.preferredLang);
    }
  }

  return res.data;
};

export const createClient = async (data: {
  name: string;
  email: string;
  password: string;
}) => {
  const res = await api.post("/clients", data);
  return res.data;
};


export const getMonProfil = async () => {
  const res = await api.get("/clients/me");
  return res.data;
};

export const logoutClient = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("client");
  localStorage.removeItem("client_vault");
};
