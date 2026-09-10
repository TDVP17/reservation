"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, ArrowLeftCircle, Menu, X, Bus, Ticket } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import NotificationBell from "@/components/NotificationBell";
import api from "@/lib/api";

type Props = {
  onMenuClick: () => void;
};

type SearchVoyage = { _id: string; destination: string; depart?: string; heure: string };
type SearchBooking = { codeBillet: string; fullName: string; voyageLabel: string };

export default function Topbar({ onMenuClick }: Props) {
  const [agence, setAgence] = useState<any>(null);
  const { lang, setLang, t } = useLang();
  const router = useRouter();

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [voyages, setVoyages] = useState<SearchVoyage[] | null>(null);
  const [bookings, setBookings] = useState<SearchBooking[] | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const data = localStorage.getItem("agence");
    if (data) setAgence(JSON.parse(data));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openSearch = async () => {
    setSearchOpen(true);
    if (voyages !== null) return;
    setSearchLoading(true);
    try {
      const [voyagesRes, passagersRes] = await Promise.all([
        api.get("/voyages/ma-liste"),
        api.get("/reservations/ma-liste-passagers"),
      ]);
      setVoyages(voyagesRes.data);
      const flattened: SearchBooking[] = [];
      for (const group of passagersRes.data) {
        const label = `${group.voyage?.depart ? group.voyage.depart + " → " : ""}${group.voyage?.destination ?? ""}`;
        for (const p of group.passagers) {
          if (p.codeBillet) flattened.push({ codeBillet: p.codeBillet, fullName: p.fullName, voyageLabel: label });
        }
      }
      setBookings(flattened);
    } catch (err) {
      console.error("Erreur recherche globale:", err);
      setVoyages([]);
      setBookings([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
  };

  const q = query.trim().toLowerCase();
  const tripMatches = q
    ? (voyages ?? []).filter(v =>
        v.destination.toLowerCase().includes(q) || (v.depart ?? "").toLowerCase().includes(q)
      ).slice(0, 4)
    : [];
  const bookingMatches = q
    ? (bookings ?? []).filter(b =>
        b.codeBillet.toLowerCase().includes(q) || b.fullName.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const goToVoyages = () => {
    closeSearch();
    router.push("/voyages");
  };

  const goToPassagers = () => {
    closeSearch();
    router.push("/passagers");
  };

  const handleBackToClient = () => {
    window.location.href = "https://easyticket-lime.vercel.app";
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2.5 min-w-11 min-h-11 flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
        >
          <Menu size={20} />
        </button>
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 flex-shrink-0">
          {agence?.name ? agence.name.substring(0, 2).toUpperCase() : "AG"}
        </div>
        <div className="min-w-0">
          <p className="font-black text-[#004ac6] italic uppercase tracking-tighter truncate leading-tight">
            {agence?.name || t("agency_default_name")}
          </p>
          {agence?.ville && (
            <p className="text-xs text-gray-400 font-medium flex items-center gap-1 truncate">
              <MapPin size={12} /> {agence.ville}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setLang("fr")}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-colors ${lang === "fr" ? "bg-white text-black shadow-sm" : "text-gray-400"}`}
          >
            FR
          </button>
          <button
            onClick={() => setLang("en")}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-colors ${lang === "en" ? "bg-white text-black shadow-sm" : "text-gray-400"}`}
          >
            EN
          </button>
        </div>

        <div className="relative" ref={searchRef}>
          {searchOpen ? (
            <div className="flex items-center gap-1 bg-gray-100 rounded-full pl-3 pr-1 py-1">
              <Search size={16} className="text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Escape") closeSearch(); }}
                placeholder={t("search_placeholder")}
                className="bg-transparent outline-none text-sm w-28 sm:w-48"
              />
              <button
                onClick={closeSearch}
                className="p-1.5 min-w-8 min-h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={openSearch}
              className="p-2 min-w-11 min-h-11 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-black transition-colors"
            >
              <Search size={18} />
            </button>
          )}

          {searchOpen && q.length > 0 && (
            <div className="absolute top-[110%] right-0 w-72 bg-white shadow-2xl rounded-2xl border border-gray-100 overflow-hidden z-[100] max-h-96 overflow-y-auto">
              {searchLoading ? (
                <div className="p-4 text-center text-gray-400 text-sm">{t("search_loading")}</div>
              ) : tripMatches.length === 0 && bookingMatches.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">{t("search_no_results")}</div>
              ) : (
                <>
                  {tripMatches.length > 0 && (
                    <div>
                      <p className="px-4 pt-3 pb-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("search_trips_section")}</p>
                      {tripMatches.map(v => (
                        <div
                          key={v._id}
                          onClick={() => { closeSearch(); router.push(`/voyages/${v._id}/edit`); }}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <Bus size={16} className="text-blue-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-gray-800 text-sm truncate">
                              {v.depart ? `${v.depart} → ` : ""}{v.destination}
                            </p>
                            <p className="text-[11px] text-gray-400">{v.heure}</p>
                          </div>
                        </div>
                      ))}
                      <button onClick={goToVoyages} className="w-full text-left px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors">
                        {t("search_view_all_trips")}
                      </button>
                    </div>
                  )}
                  {bookingMatches.length > 0 && (
                    <div className="border-t border-gray-50">
                      <p className="px-4 pt-3 pb-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("search_bookings_section")}</p>
                      {bookingMatches.map(b => (
                        <div
                          key={b.codeBillet}
                          onClick={goToPassagers}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <Ticket size={16} className="text-blue-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-gray-800 text-sm truncate">{b.fullName}</p>
                            <p className="text-[11px] text-blue-600 font-mono truncate">{b.codeBillet} · {b.voyageLabel}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <NotificationBell />

        <button
          onClick={handleBackToClient}
          title={t("nav_back_client")}
          className="p-2 min-w-11 min-h-11 flex items-center justify-center rounded-full text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <ArrowLeftCircle size={18} />
        </button>
      </div>
    </header>
  );
}
