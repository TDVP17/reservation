// lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token") || localStorage.getItem("agenceToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== "undefined" &&
      error.response?.status === 403 &&
      error.response?.data?.error === "BANNED"
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("agenceToken");
      localStorage.removeItem("agence");
      localStorage.setItem("suspend_message", error.response.data.message || "");
      window.location.href = "/suspended";
    }
    return Promise.reject(error);
  }
);

export type Voyage = {
  _id: string;
  destination: string;
  date: string;
  heure: string;
  placesTotal: number;
  placesRestantes: number;
  mat: string;
  prix: number;
  typeBus: "Classique" | "VIP" | "Super VIP"; // Ajout ici
  imageBus: string;
  
};

// Utilise l'instance 'api' au lieu de fetch pour profiter du token automatique
export const validateAgence = async (id: string) => {
  try {
    const response = await api.post(`/api/agences/${id}/validate`);
    return response.data;
  } catch (error) {
    throw new Error("Erreur lors de la validation");
  }
};

export default api;