import api from "./api";

export const loginAdmin = async (data: { email: string; password: string }) => {
  const res = await api.post("/admin/login", data);
  if (typeof window !== "undefined") {
    localStorage.setItem("token", res.data.authToken);
    if (res.data.admin) {
      localStorage.setItem("admin", JSON.stringify(res.data.admin));
      if (res.data.admin.preferredLang === "fr" || res.data.admin.preferredLang === "en") {
        localStorage.setItem("lang", res.data.admin.preferredLang);
      }
    }
  }
  return res.data;
};

export const logoutAdmin = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
  }
};

export const getAdminToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

export const isAdminAuthenticated = (): boolean => {
  return !!getAdminToken();
};

export const getAdminProfile = (): { name: string; email: string } | null => {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem("admin");
  return data ? JSON.parse(data) : null;
};
