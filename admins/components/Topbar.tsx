"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, ExternalLink, Users, Building2 } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import NotificationBell from "@/components/NotificationBell";

type Props = {
  onMenuClick: () => void;
};

export default function Topbar({ onMenuClick }: Props) {
  const { t } = useLang();
  const [switchOpen, setSwitchOpen] = useState(false);
  const switchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (switchRef.current && !switchRef.current.contains(e.target as Node)) setSwitchOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
      <button
        onClick={onMenuClick}
        aria-label={t("topbar_menu_toggle")}
        className="md:hidden p-2.5 min-w-11 min-h-11 flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <Menu size={20} />
      </button>

      <div className="ml-auto flex items-center gap-2">
      <NotificationBell />
      <div className="relative" ref={switchRef}>
        <button
          onClick={() => setSwitchOpen(o => !o)}
          className="flex items-center gap-2 px-4 py-2.5 min-h-11 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-bold"
        >
          <ExternalLink size={15} /> <span className="hidden sm:inline">{t("topbar_view_client")}</span>
        </button>

        {switchOpen && (
          <div className="absolute right-0 mt-2 w-64 max-w-[90vw] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <a
              href="https://easyticket-lime.vercel.app"
              className="flex items-center gap-3 px-4 py-3 min-h-11 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Users size={16} className="text-blue-600 flex-shrink-0" /> {t("topbar_view_client")}
            </a>
            <a
              href="https://easyticket-lime.vercel.app/agence"
              className="flex items-center gap-3 px-4 py-3 min-h-11 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
            >
              <Building2 size={16} className="text-blue-600 flex-shrink-0" /> {t("topbar_view_agence")}
            </a>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
