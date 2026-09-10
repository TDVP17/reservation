// contexts/LoadingContext.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import GlobalLoader from "@/components/ui/GlobalLoader";
import { useLang } from "@/context/LanguageContext";

type LoadingContextValue = {
  isLoading: boolean;
  message: string;
  /** Affiche l'overlay avec un message donné (ex: t("loading_balance")) */
  showLoading: (message?: string) => void;
  /** Masque l'overlay manuellement */
  hideLoading: () => void;
};

// Filet de sécurité : si une navigation échoue silencieusement sans jamais
// déclencher le changement de pathname, on ne reste pas bloqué indéfiniment.
const SAFETY_TIMEOUT_MS = 6000;

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  const clearSafetyTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const showLoading = useCallback((msg?: string) => {
    clearSafetyTimeout();
    setMessage(msg || t("loading"));
    setIsLoading(true);
    timeoutRef.current = setTimeout(() => setIsLoading(false), SAFETY_TIMEOUT_MS);
  }, [t]);

  const hideLoading = useCallback(() => {
    clearSafetyTimeout();
    setIsLoading(false);
  }, []);

  // Ceci ne gère QUE le flash de transition déclenché par un clic dans le
  // menu : dès que l'URL change réellement, on le masque. Les pages qui ont
  // leur propre chargement de données (Solde, Voyages, Expédition, Accueil)
  // gèrent leur overlay indépendamment, avec leur propre état local et le
  // même composant <GlobalLoader />, donc ce hide global ne les court-circuite
  // jamais : les deux se superposent simplement (même rendu visuel) tant que
  // l'un des deux est actif.
  useEffect(() => {
    hideLoading();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => clearSafetyTimeout, []);

  return (
    <LoadingContext.Provider value={{ isLoading, message, showLoading, hideLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error("useLoading doit être utilisé à l'intérieur d'un <LoadingProvider>");
  }
  return ctx;
}

/**
 * Monte le rendu de l'overlay. À placer à l'intérieur de <main> (qui est
 * `relative`) — PAS au même niveau que <LoadingProvider> — pour que le
 * `absolute inset-0` de GlobalLoader reste scopé au panneau de contenu et ne
 * recouvre jamais la Sidebar / Navbar / BottomNav.
 */
export function LoadingOverlay() {
  const { isLoading, message } = useLoading();
  return <GlobalLoader show={isLoading} message={message} />;
}
