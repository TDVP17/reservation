export const requireAgence = (redirectTo = "/auth/login"): boolean => {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.replace(redirectTo);
    return false;
  }
  return true;
};
