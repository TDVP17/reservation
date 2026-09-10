import { isAdminAuthenticated } from "./auth";

export const requireAdmin = (redirectTo = "/auth/login"): boolean => {
  if (typeof window === "undefined") return false;
  if (!isAdminAuthenticated()) {
    window.location.replace(redirectTo);
    return false;
  }
  return true;
};
