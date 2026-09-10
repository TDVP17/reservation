




"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/sidebar";
import MobileDrawer from "@/components/layout/MobileDrawer";
import BottomNav from "@/components/layout/BottomNav";
import FloatingHelp from "@/components/layout/floatingHelp";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LocationProvider } from "@/context/LocationContext";
import { LoadingProvider, LoadingOverlay } from "@/contexts/LoadingContext";
import { GOOGLE_CLIENT_ID } from "@/lib/config";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAuthPage =
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/register") ||
    pathname.startsWith("/suspended");

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Prevent flash of wrong theme on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t===null&&d))document.documentElement.classList.add('dark');})();`,
          }}
        />
      </head>
      <body>
        <Toaster position="top-center" toastOptions={{ duration: 5000 }} />
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <ThemeProvider>
            <LanguageProvider>
              <LocationProvider>
                <LoadingProvider>
                  {!isAuthPage && (
                    <>
                      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                      <MobileDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                    </>
                  )}

                  <main
                    className={
                      !isAuthPage
                        ? `relative min-h-screen ${
                            sidebarOpen
                              ? "ml-0 sm:ml-[130px] pt-[108px] sm:pt-[64px] pb-[72px] sm:pb-0 transition-all duration-300"
                              : "ml-0 sm:ml-[56px] pt-[108px] sm:pt-[64px] pb-[72px] sm:pb-0 transition-all duration-300"
                          }`
                        : "relative"
                    }
                  >
                    {children}
                    <LoadingOverlay />
                  </main>

                  {!isAuthPage && <BottomNav />}
                  {!isAuthPage && <FloatingHelp />}
                </LoadingProvider>
              </LocationProvider>
            </LanguageProvider>
          </ThemeProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}














