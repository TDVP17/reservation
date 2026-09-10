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
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { useLang } from "@/context/LanguageContext";

type LoadingContextValue = {
  isLoading: boolean;
  message: string;
  /** Affiche l'overlay avec un message donné (ex: "Chargement des voyages...") */
  showLoading: (message?: string) => void;
  /** Masque l'overlay manuellement (ex: à la fin d'un fetch) */
  hideLoading: () => void;
};

// Filet de sécurité : si une navigation/fetch échoue silencieusement sans
// jamais appeler hideLoading(), on ne reste pas bloqué indéfiniment.
const SAFETY_TIMEOUT_MS = 8000;

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(t("loading_ellipsis_short"));
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
    setMessage(msg ?? t("loading_ellipsis_short"));
    setIsLoading(true);
    timeoutRef.current = setTimeout(() => setIsLoading(false), SAFETY_TIMEOUT_MS);
  }, [t]);

  const hideLoading = useCallback(() => {
    clearSafetyTimeout();
    setIsLoading(false);
  }, []);

  // Dès que l'URL change réellement, la nouvelle page est montée : on masque
  // l'overlay même si personne n'a explicitement appelé hideLoading().
  useEffect(() => {
    hideLoading();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => clearSafetyTimeout, []);

  return (
    <LoadingContext.Provider value={{ isLoading, message, showLoading, hideLoading }}>
      {children}
      <LoadingOverlay show={isLoading} message={message} />
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
