"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Building2,
  Truck,
  Users,
  History,
  ArrowLeftCircle,
  LogOut,
} from "lucide-react";
import { getAdminProfile, logoutAdmin } from "@/lib/auth";
import { useLang } from "@/context/LanguageContext";

type Props = {
  open?: boolean;
  onClose?: () => void;
};

export default function Sidebar({ open = false, onClose = () => {} }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useLang();
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    setAdmin(getAdminProfile());
  }, []);

  const navItems = [
    { href: "/dash", label: t("sidebar_agences"), icon: Building2 },
    { href: "/livreurs", label: t("sidebar_livreurs"), icon: Truck },
    { href: "/client", label: t("sidebar_clients"), icon: Users },
    { href: "/history", label: t("sidebar_historique"), icon: History },
  ];

  const handleLogout = () => {
    logoutAdmin();
    router.push("/auth/login");
  };

  return (
    <>
      {/* Backdrop mobile */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}

      <div
        className={`w-50 h-screen bg-white flex flex-col justify-between p-6 fixed left-0 top-0 border-r border-gray-100 z-50 transform transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* TOP */}
        <div className="space-y-8">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#2563eb] text-white flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={18} />
              </div>
              <h2 className="text-lg font-black text-[#0d1c2f] tracking-tight">{t("sidebar_brand")}</h2>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setLang("fr")}
                className={`px-2 py-1 rounded-full text-[10px] font-black transition-colors ${lang === "fr" ? "bg-white text-black shadow-sm" : "text-gray-400"}`}
              >
                FR
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-2 py-1 rounded-full text-[10px] font-black transition-colors ${lang === "en" ? "bg-white text-black shadow-sm" : "text-gray-400"}`}
              >
                EN
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide font-bold">{t("sidebar_section_gestion")}</p>
            <ul className="space-y-1 text-sm text-gray-700">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors min-h-11 ${
                        active
                          ? "bg-[#eff4ff] text-[#2563eb]"
                          : "text-gray-600 hover:bg-gray-50 hover:text-black"
                      }`}
                    >
                      <Icon size={17} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="space-y-4 text-sm text-gray-600">
          <a
            href="https://easyticket-lime.vercel.app"
            className="flex items-center gap-3 hover:text-black cursor-pointer font-bold text-blue-600 px-3 min-h-11"
          >
            <ArrowLeftCircle size={16} /> {t("sidebar_back_to_platform")}
          </a>

          <div className="pt-4 border-t space-y-3 px-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 flex-shrink-0">
                {admin?.name ? admin.name.substring(0, 2).toUpperCase() : "AD"}
              </div>
              <div className="text-xs overflow-hidden">
                <p className="font-bold text-gray-800 truncate">{admin?.name || t("sidebar_admin_default")}</p>
                <p className="text-gray-400 truncate">{admin?.email || ""}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full text-red-500 hover:text-red-700 transition-colors cursor-pointer min-h-11"
            >
              <LogOut size={16} />
              <span className="font-bold">{t("sidebar_logout")}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
