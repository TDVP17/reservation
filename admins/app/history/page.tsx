"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { ArrowLeft, History, Filter, Calendar, Bus, User } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/context/LanguageContext";

export default function FullHistory() {
  const { t } = useLang();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get("/admin/history");
        console.log("Données reçues :", res.data); // Pour vérifier dans ta console F12
        setHistory(res.data);
      } catch (err) {
        console.error("Erreur historique", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="p-8 bg-[#F4F7FE] min-h-screen font-sans md:ml-45">
      {/* Barre de navigation */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <Link href="/dash" className="flex items-center gap-2 text-blue-600 font-bold hover:gap-3 transition-all">
          <ArrowLeft size={20} /> {t("history_back_to_dashboard")}
        </Link>
        <div className="flex gap-4 flex-wrap">
            <button className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm text-sm font-bold text-gray-600 flex items-center gap-2">
                <Filter size={16}/> {t("history_filter_btn")}
            </button>
            <button className="bg-blue-600 px-4 py-2 rounded-xl text-white shadow-lg text-sm font-bold flex items-center gap-2">
                <Calendar size={16}/> {t("history_export_btn")}
            </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
            <div className="p-3 bg-white rounded-2xl shadow-sm">
                <History className="text-blue-600" size={32} />
            </div>
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t("history_page_title")}</h1>
                <p className="text-gray-500 font-medium">{t("history_page_subtitle")}</p>
            </div>
        </div>

        {/* Liste des activités */}
        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-gray-400 py-10">{t("loading_generic")}</p>
          ) : history && history.length > 0 ? (
            history.map((item, index) => (
              <HistoryItem key={index} item={item} />
            ))
          ) : (
            <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                <p className="text-gray-400 font-bold">{t("no_activity_found")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- LE COMPOSANT QUI REÇOIT TES DONNÉES POSTMAN ---
function HistoryItem({ item }: { item: any }) {
  const { t, lang } = useLang();
  const isAgence = item.type === 'AGENCE';
  // Formate la date reçue de ton Postman (ex: 2026-02-25T11:51:40.993Z)
  const dateDisplay = new Date(item.date).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="flex items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isAgence ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
        {isAgence ? <Bus size={22} /> : <User size={22} />}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <p className="font-bold text-gray-900 text-lg capitalize">{item.name}</p>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{dateDisplay}</span>
        </div>
        <p className="text-sm text-gray-500 font-medium">
          {isAgence ? t("history_item_agency_desc") : t("history_item_client_desc")}
        </p>
      </div>
    </div>
  );
}