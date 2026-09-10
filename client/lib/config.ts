// Fallback aligné sur la valeur déjà committée dans Back-End/.env — un
// Client ID OAuth n'est pas un secret (il apparaît publiquement dans l'URL
// de redirection Google), l'exposer ici est donc sans risque. Ce fallback
// permet au bouton "Se connecter avec Google" de fonctionner même sur un
// déploiement où NEXT_PUBLIC_GOOGLE_CLIENT_ID n'a pas été configuré côté
// variables d'environnement (ex: Vercel) — la variable d'env reste
// prioritaire dès qu'elle est définie.
export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "555604829687-grbpe58aen7otidedaog2rtaiuhmhi2g.apps.googleusercontent.com";
