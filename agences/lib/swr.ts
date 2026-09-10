import api from "./api";

// Fetcher partagé pour useSWR : réutilise l'instance axios existante (token
// d'auth, redirection 403/BANNED déjà gérés par ses interceptors).
export const fetcher = (url: string) => api.get(url).then(r => r.data);
