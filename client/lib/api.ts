//lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
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
      localStorage.removeItem("client");
      localStorage.setItem("suspend_message", error.response.data.message || "");
      window.location.href = "/suspended";
    }
    return Promise.reject(error);
  }
);

export default api;
