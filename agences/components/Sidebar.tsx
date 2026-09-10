//agences/componenents/sidebar.tsx
"use client";

import {
  LayoutDashboard,
  Ship,
  BarChart,
  Users,
  FileText,
  Settings,
  PackageCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import NavLink from "@/components/NavLink";
import { useLang } from "@/context/LanguageContext";

type Props = {
  open?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export default function Sidebar({ open = false, onClose = () => {}, collapsed = false, onToggleCollapse = () => {} }: Props) {
  const [agence, setAgence] = useState<any>(null);
  const { t } = useLang();
  const pathname = usePathname();
  const labelClass = collapsed ? "md:hidden" : "";

  useEffect(() => {
    const data = localStorage.getItem("agence");
    if (data) setAgence(JSON.parse(data));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("agence");
    window.location.href = "https://easyticket-lime.vercel.app/agence";
  };

  const navItemClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors min-h-11 ${
      pathname === href ? "bg-blue-50 text-[#004ac6]" : "text-gray-700 hover:bg-gray-50 hover:text-black"
    }`;

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
        className={`w-50 h-screen bg-white flex flex-col justify-between p-6 fixed left-0 top-0 border-r border-gray-100 z-50 transform transition-all duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 ${collapsed ? "md:w-20" : "md:w-50"}`}
      >
        {/* Bouton collapse (desktop uniquement) */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? t("sidebar_expand") : t("sidebar_collapse")}
          className="hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-blue-600 hover:border-blue-200 absolute -right-3 top-8 z-10"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Bouton fermer (mobile uniquement) */}
        <button
          onClick={onClose}
          title={t("sidebar_close")}
          aria-label={t("sidebar_close")}
          className="md:hidden flex items-center justify-center min-w-11 min-h-11 rounded-full text-gray-400 hover:bg-gray-50 hover:text-gray-700 absolute right-2 top-2 z-10"
        >
          <X size={18} />
        </button>

        {/* TOP */}
        <div className="space-y-8 overflow-hidden">
          <h2 className="text-xl font-black text-[#245BCF] italic uppercase tracking-tighter truncate">
            {collapsed ? (agence?.name?.substring(0, 2)?.toUpperCase() || "AG") : (agence?.name ? `${agence.name} Voyage` : t("agency_default_name"))}
          </h2>
          {/* Home */}
          <div>
            <p className={`text-xs text-gray-400 mb-3 uppercase tracking-wide font-bold whitespace-nowrap ${labelClass}`}>{t("nav_home_section")}</p>
            <ul className="space-y-1 text-sm">
              <li>
                <NavLink href="/dashboard" message={t("load_dashboard")} className={navItemClass("/dashboard")}>
                  <LayoutDashboard size={16} className="flex-shrink-0" />
                  <span className={labelClass}>{t("nav_dashboard")}</span>
                </NavLink>
              </li>
              <li>
                <NavLink href="/anal" message={t("load_analytics")} className={navItemClass("/anal")}>
                  <BarChart size={16} className="flex-shrink-0" />
                  <span className={labelClass}>{t("nav_analytics")}</span>
                </NavLink>
              </li>
              <li>
                <NavLink href="/voyages" message={t("load_voyages")} className={navItemClass("/voyages")}>
                  <Ship size={16} className="flex-shrink-0" />
                  <span className={labelClass}>{t("nav_voyages")}</span>
                </NavLink>
              </li>
              <li>
                <NavLink href="/passagers" message={t("load_passagers")} className={navItemClass("/passagers")}>
                  <Users size={16} className="flex-shrink-0" />
                  <span className={labelClass}>{t("nav_passagers")}</span>
                </NavLink>
              </li>
              <li>
                <NavLink href="/colis" message={t("load_colis")} className={navItemClass("/colis")}>
                  <PackageCheck size={16} className="flex-shrink-0" />
                  <span className={labelClass}>{t("nav_colis")}</span>
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Tools */}
          <div>
            <p className={`text-xs text-gray-400 mb-3 uppercase tracking-wide font-bold whitespace-nowrap ${labelClass}`}>{t("nav_tools_section")}</p>
            <ul className="space-y-1 text-sm">
              <li>
                <NavLink href="/rapport" message={t("load_reports")} className={navItemClass("/rapport")}>
                  <FileText size={16} className="flex-shrink-0" /> <span className={labelClass}>{t("nav_reports")}</span>
                </NavLink>
              </li>
              <li>
                <NavLink href="/setting" message={t("load_settings")} className={navItemClass("/setting")}>
                  <Settings size={16} className="flex-shrink-0" /> <span className={labelClass}>{t("nav_settings")}</span>
                </NavLink>
              </li>
              <li>
                <NavLink href="/help" message={t("load_help")} className={navItemClass("/help")}>
                  <HelpCircle size={16} className="flex-shrink-0" /> <span className={labelClass}>{t("nav_help")}</span>
                </NavLink>
              </li>
            </ul>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="pt-4 border-t space-y-3 overflow-hidden">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 flex-shrink-0">
              {agence?.name ? agence.name.substring(0, 2).toUpperCase() : "..."}
            </div>
            <div className={`text-xs overflow-hidden ${labelClass}`}>
              <p className="font-bold text-gray-800 truncate">
                {agence?.name || t("loading_ellipsis_short")}
              </p>
              <p className="text-gray-400 truncate">
                {agence?.email || "mail@example.com"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title={t("nav_logout")}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer min-h-11"
          >
            <LogOut size={16} className="flex-shrink-0" />
            <span className={`font-bold whitespace-nowrap ${labelClass}`}>{t("nav_logout")}</span>
          </button>
        </div>
      </div>
    </>
  );
}
