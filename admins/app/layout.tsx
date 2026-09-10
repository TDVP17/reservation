"use client";

import { Inter } from "next/font/google"; // Utilisation d'une police moderne
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { requireAdmin } from "@/lib/adminGuard";
import { LanguageProvider } from "@/context/LanguageContext";

const inter = Inter({ subsets: ["latin"] });

const noSidebarRoutes = ["/", "/auth/login", "/auth/logout"];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideSidebar = noSidebarRoutes.includes(pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!hideSidebar) requireAdmin();
  }, [hideSidebar, pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <html lang="fr">
      <body className={`${inter.className} bg-[#F8FAFC] text-gray-900`}>
        <LanguageProvider>
          <div className="flex min-h-screen">
            {!hideSidebar && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
            <main className="flex-1 flex flex-col min-w-0">
              {!hideSidebar && <Topbar onMenuClick={() => setSidebarOpen(o => !o)} />}
              {children}
            </main>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}