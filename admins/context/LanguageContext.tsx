"use client";

import { createContext, useContext, useState, useEffect, useLayoutEffect } from "react";
import { translations, Lang, TranslationKey } from "@/lib/i18n";
import api from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

type ContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<ContextType>({
  lang: "fr",
  setLang: () => {},
  t: (key) => translations.fr[key],
});

// useLayoutEffect applique la langue sauvegardée avant le premier paint du
// navigateur (contrairement à useEffect, qui s'exécute après) — évite un
// flash visible dans la mauvaise langue au rechargement complet de la page.
// Sur le serveur, on retombe sur useEffect (useLayoutEffect y est un no-op
// et déclenche un warning React).
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useIsomorphicLayoutEffect(() => {
    const saved = localStorage.getItem("lang") as Lang;
    if (saved === "fr" || saved === "en") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
    if (getAdminToken()) {
      api.patch("/admin/update-lang", { preferredLang: l }).catch(() => {});
    }
  };

  const t = (key: TranslationKey): string => translations[lang][key];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
