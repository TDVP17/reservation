"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Bus, Compass, Bookmark, Wallet, PackageSearch, LogIn } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { useLoading } from "@/contexts/LoadingContext";

export default function BottomNav() {
  const pathname  = usePathname();
  const { t }     = useLang();
  const { showLoading } = useLoading();
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const check = () => setIsAuth(!!localStorage.getItem("token"));
    check();
    window.addEventListener("auth-change", check);
    return () => window.removeEventListener("auth-change", check);
  }, []);

  const items = isAuth
    ? [
        { href: "/",            icon: Home,          label: t("home"),          loadingMsg: t("loading_dashboard") },
        { href: "/voyages",     icon: Bus,           label: t("voyages"),       loadingMsg: t("loading_trips") },
        { href: "/reservations",icon: Bookmark,      label: t("reservations"),  loadingMsg: t("loading_tickets") },
        { href: "/expedition",  icon: PackageSearch, label: t("expedition"),    loadingMsg: t("loading_shipments") },
        { href: "/wallet",      icon: Wallet,        label: t("wallet"),        loadingMsg: t("loading_balance") },
      ]
    : [
        { href: "/",            icon: Home,          label: t("home"),        loadingMsg: t("loading_dashboard") },
        { href: "/voyages",     icon: Bus,           label: t("voyages"),     loadingMsg: t("loading_trips") },
        { href: "/explorer",    icon: Compass,       label: t("explorer"),    loadingMsg: t("loading_explorer") },
        { href: "/expedition",  icon: PackageSearch, label: t("expedition"),  loadingMsg: t("loading_shipments") },
        { href: "/auth/login",  icon: LogIn,         label: t("login_btn"),   loadingMsg: undefined },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex sm:hidden safe-area-pb">
      {items.map(({ href, icon: Icon, label, loadingMsg }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={() => { if (pathname !== href && loadingMsg) showLoading(loadingMsg); }}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              active
                ? "text-blue-600"
                : "text-slate-400 dark:text-slate-500 active:text-blue-500"
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${active ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}>
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wide truncate max-w-[56px] text-center leading-none">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
