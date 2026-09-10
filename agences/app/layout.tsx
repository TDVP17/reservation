//agences/app/layout.tsx
"use client"; // Obligatoire pour utiliser usePathname

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SWRConfig } from "swr";
import { Toaster } from "react-hot-toast";
// @ts-ignore: allow side-effect CSS import without explicit .d.ts
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { requireAgence } from "@/lib/agenceGuard";
import { logoutAgence } from "@/lib/auth";
import { fetcher } from "@/lib/swr";

// Backstop : si l'onglet reste ouvert sans activité, on force une reconnexion.
const IDLE_LOGOUT_MS = 30 * 60 * 1000; // 30 minutes

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Liste des routes où la Sidebar ne doit JAMAIS apparaître
  // Vérifie bien que tes URLs correspondent à ces noms
  const noSidebarRoutes = ["/auth/login", "/auth/register", "/welcome", "/", "/suspended"];

  // Si l'URL actuelle est dans la liste, on cache la sidebar
  const hideSidebar = noSidebarRoutes.includes(pathname);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Bloque le scroll du corps de page pendant que le tiroir mobile est ouvert.
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  useEffect(() => {
    const saved = localStorage.getItem("agenceSidebarCollapsed");
    if (saved === "true") setSidebarCollapsed(true);
  }, []);

  // Exige une session active sur toute page du tableau de bord (redirige sinon).
  useEffect(() => {
    if (!hideSidebar) requireAgence();
  }, [hideSidebar, pathname]);

  // Ferme la session à la fermeture réelle de l'onglet/navigateur (pas lors
  // d'une navigation interne à l'app, qui ne déclenche pas pagehide).
  useEffect(() => {
    const handlePageHide = () => {
      const token = localStorage.getItem("token");
      if (token && process.env.NEXT_PUBLIC_API_URL) {
        try {
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/agences/logout`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            keepalive: true,
          });
        } catch {}
      }
      logoutAgence();
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  // Backstop : déconnexion après 30 min d'inactivité sur le tableau de bord.
  useEffect(() => {
    if (hideSidebar) return;
    let idleTimer: ReturnType<typeof setTimeout>;
    const doLogout = () => {
      logoutAgence();
      window.location.href = "/auth/login";
    };
    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(doLogout, IDLE_LOGOUT_MS);
    };
    resetIdle();
    const events = ["mousemove", "keydown", "click", "touchstart"];
    events.forEach(ev => window.addEventListener(ev, resetIdle));
    return () => {
      clearTimeout(idleTimer);
      events.forEach(ev => window.removeEventListener(ev, resetIdle));
    };
  }, [hideSidebar]);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("agenceSidebarCollapsed", String(next));
      return next;
    });
  };

  return (
    <html lang="fr">
      <body>
        <Toaster position="top-center" toastOptions={{ duration: 5000 }} />
        <SWRConfig
          value={{
            fetcher,
            revalidateOnFocus: true,
            dedupingInterval: 10000,
            refreshInterval: 30000,
          }}
        >
          <LanguageProvider>
            <LoadingProvider>
              <div className="flex min-h-screen">
                {/* On affiche la Sidebar seulement si hideSidebar est faux */}
                {!hideSidebar && (
                  <Sidebar
                    open={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={toggleSidebarCollapsed}
                  />
                )}

                <main className={`flex-1 flex flex-col bg-gray-50 min-w-0 transition-[margin] duration-200 ${
                  hideSidebar ? "w-full" : sidebarCollapsed ? "md:ml-20" : "md:ml-50"
                }`}>
                  {!hideSidebar && <Topbar onMenuClick={() => setSidebarOpen(o => !o)} />}
                  {children}
                </main>
              </div>
            </LoadingProvider>
          </LanguageProvider>
        </SWRConfig>
      </body>
    </html>
  );
}