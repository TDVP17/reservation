// agences/lib/auth.ts
"use client";

import api from "./api";

export const loginAgence = async (data: { email: string; password: string; }) => {
  const res = await api.post("/agences/login", data);
  
  // IL FAUT ENREGISTRER SOUS LE NOM "token"
  // car c'est ce que lib/api.ts cherche
  if (res.data.authToken) {
    localStorage.setItem("token", res.data.authToken);
    localStorage.setItem("agence", JSON.stringify(res.data.agence));
    if (res.data.agence?.preferredLang === "fr" || res.data.agence?.preferredLang === "en") {
      localStorage.setItem("lang", res.data.agence.preferredLang);
    }
  }
  return res.data;
};

export const createAgence = async (formData: FormData) => {
  const res = await api.post("/agences", formData);
  return res.data;
};

export const logoutAgence = () => {
  // On nettoie les infos de l'agence
  localStorage.removeItem("token");
  localStorage.removeItem("agence");
  document.cookie = "agenceToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
};