import toast from "react-hot-toast";

// Affiche une erreur de paiement de façon cohérente (toast) dans toute l'app :
// message dédié "en cours d'intégration" quand la passerelle (Fapshi/Kora)
// n'est pas configurée côté serveur, sinon le vrai message d'erreur.
// Retourne true si c'était le cas "passerelle non configurée", pour que
// l'appelant puisse par ex. refermer le formulaire de paiement au lieu de
// laisser l'utilisateur réessayer une opération vouée à échouer.
export function showPaymentError(err: any, t: (key: any) => string): boolean {
  const code = err?.response?.data?.error;
  if (code === "GATEWAY_NOT_CONFIGURED") {
    toast.error(t("payment_gateway_coming_soon"), { duration: 6000 });
    return true;
  }
  const message = err?.response?.data?.error || err?.response?.data?.message || t("payment_error_generic");
  toast.error(message);
  return false;
}
