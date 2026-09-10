//lib/voyage.service
"use client";
import api from "./api";

export type Voyage = {
  typeBus: "Classique" | "VIP" | "Super VIP";
  _id: string;
  depart: string;
  destination: string;
  date: string;
  heure: string;
  placesTotal: number;
  placesRestantes: number;
  mat: string;
  prix: number;
  imageBus: string;
  status?: "scheduled" | "en_route" | "arrived";
  departedAt?: string;
  arrivedAt?: string;
  lastPosition?: { latitude: number; longitude: number; updatedAt: string } | null;
};

// Fonction pour récupérer l'URL complète de l'image
// lib/voyage.service.ts

// L'URL de ton backend Express
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// Image par défaut utilisée quand l'agence n'a fourni aucune photo de bus.
export const DEFAULT_BUS_IMAGE = "/images/bus.avif";

export const getImageUrl = (path: string | undefined) => {
  if (!path) return DEFAULT_BUS_IMAGE;
  if (path.startsWith('data:')) return path;
  if (path.startsWith('http')) return path;
  const cleanPath = path.replace(/\\/g, '/').replace(/^public\//, '').replace(/^\//, '');
  return `${API_URL}/${cleanPath}`;
};
export const getAllVoyages = async (): Promise<Voyage[]> => {
  const res = await api.get("/voyages/all");
  return res.data;
};

export const getVoyageById = async (id: string): Promise<Voyage> => {
  const res = await api.get(`/voyages/${id}`);
  return res.data;
};