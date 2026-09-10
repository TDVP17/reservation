//admins
import axios from 'axios';

// On crée une instance personnalisée d'Axios
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// INTERCEPTEUR : Ajoute automatiquement le token à chaque requête
api.interceptors.request.use((config) => {
  // On récupère le token stocké dans le navigateur (localStorage)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  if (token) {
    // On l'ajoute au header Authorization
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;