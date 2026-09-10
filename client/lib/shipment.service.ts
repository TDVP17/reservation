import api from "./api";

export const getQuote = async (valeur: number, regionDepart: string, regionDestination: string) => {
  const res = await api.get("/shipments/quote", { params: { valeur, regionDepart, regionDestination } });
  return res.data as { prixExpedition: number; fraisPlateforme: number; montantTotal: number };
};

export const createShipment = async (data: FormData) => {
  const res = await api.post("/shipments", data, { headers: { "Content-Type": "multipart/form-data" } });
  return res.data;
};

export const getMesExpeditions = async () => {
  const res = await api.get("/shipments/me");
  return res.data;
};

export const getExpeditionById = async (id: string) => {
  const res = await api.get(`/shipments/${id}`);
  return res.data;
};

export const trackByCode = async (code: string) => {
  const res = await api.get(`/shipments/track/${code}`);
  return res.data;
};

export const getRegions = async (): Promise<string[]> => {
  const res = await api.get("/shipments/regions");
  return res.data;
};
