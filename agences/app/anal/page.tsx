"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Map,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Download
} from "lucide-react";
import { useLang } from "@/context/LanguageContext";

const DAY_KEYS = ["day_sun", "day_mon", "day_tue", "day_wed", "day_thu", "day_fri", "day_sat"] as const;

function identityOf(r: any): string | null {
  if (r.isGuest) return r.phoneNumber || null;
  return r.client?._id || r.phoneNumber || null;
}

export default function AnalyticsPage() {
  const { t } = useLang();
  const { data: voyagesOrigine = [], isLoading: voyagesLoading } = useSWR<any[]>("/voyages/ma-liste");
  const { data: reservationsOrigine = [], isLoading: reservationsLoading } = useSWR<any[]>("/reservations/agence");
  const loading = voyagesLoading || reservationsLoading;
  const [selectedDate, setSelectedDate] = useState("");

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleExportPDF = () => {
    window.print();
  };

  // ── Réservations non annulées (base de toutes les stats réelles) ──
  const nonCancelled = useMemo(
    () => reservationsOrigine.filter((r: any) => r.status !== "Annulé"),
    [reservationsOrigine]
  );

  // ── Snapshot filtré par date (voyages du jour sélectionné, ou tout l'historique) ──
  const snapshot = useMemo(() => {
    const filteredVoyages = selectedDate
      ? voyagesOrigine.filter((v: any) => v.date === selectedDate)
      : voyagesOrigine;

    const statsParDestination: Record<string, number> = {};
    let totalVentes = 0;
    let totalSeats = 0;
    filteredVoyages.forEach((v: any) => {
      const vendus = (v.placesTotal || 0) - (v.placesRestantes || 0);
      statsParDestination[v.destination] = (statsParDestination[v.destination] || 0) + vendus;
      totalVentes += vendus;
      totalSeats  += v.placesTotal || 0;
    });
    const fillRate = totalSeats > 0 ? Math.round((totalVentes / totalSeats) * 100) : 0;

    // ── Nouveaux clients : première réservation JAMAIS effectuée avec cette agence, tombant dans la fenêtre filtrée ──
    const voyageIds = new Set(filteredVoyages.map((v: any) => v._id));
    const earliestByIdentity: Record<string, number> = {};
    nonCancelled.forEach((r: any) => {
      const id = identityOf(r);
      if (!id) return;
      const ts = new Date(r.createdAt).getTime();
      if (earliestByIdentity[id] === undefined || ts < earliestByIdentity[id]) earliestByIdentity[id] = ts;
    });
    const filteredReservations = nonCancelled.filter((r: any) => voyageIds.has(r.voyage?._id));
    const newClientIds = new Set(
      filteredReservations
        .filter((r: any) => {
          const id = identityOf(r);
          return id && new Date(r.createdAt).getTime() === earliestByIdentity[id];
        })
        .map(identityOf)
    );

    return {
      voyages: filteredVoyages,
      statsParDestination,
      totalVentes,
      fillRate,
      newClients: newClientIds.size,
    };
  }, [voyagesOrigine, nonCancelled, selectedDate]);

  // ── Évolution des réservations sur 7 jours (toujours réelle, indépendante du filtre date) ──
  const { evolution, trendPct, trendUp } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const evolution = days.map(d => {
      const count = nonCancelled
        .filter((r: any) => new Date(r.createdAt).toDateString() === d.toDateString())
        .reduce((a: number, r: any) => a + (r.placesReservees || 0), 0);
      return { label: t(DAY_KEYS[d.getDay()]), count };
    });

    const last7Start = days[0];
    const prev7Start = new Date(last7Start);
    prev7Start.setDate(prev7Start.getDate() - 7);
    const endOfToday = new Date(today);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const inRange = (ts: number, start: Date, endExclusive: Date) => ts >= start.getTime() && ts < endExclusive.getTime();
    const thisWeekCount = nonCancelled.filter((r: any) => inRange(new Date(r.createdAt).getTime(), last7Start, endOfToday)).length;
    const lastWeekCount = nonCancelled.filter((r: any) => inRange(new Date(r.createdAt).getTime(), prev7Start, last7Start)).length;

    const trendPct = lastWeekCount > 0
      ? Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100)
      : (thisWeekCount > 0 ? 100 : 0);

    return { evolution, trendPct, trendUp: trendPct >= 0 };
  }, [nonCancelled, t]);

  const maxEvolution = Math.max(1, ...evolution.map(e => e.count));

  return (
    <div className="p-8 bg-[#FBFBFE] min-h-screen">

      {/* Header avec Filtres */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-10 print:hidden gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t("anal_title")}</h1>
          <p className="text-gray-500 font-medium">{t("anal_subtitle")}</p>
        </div>

        <div className="flex items-end flex-wrap gap-3">
          {/* SECTION FILTRER PAR DATE */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              {t("anal_filter_date")}
            </label>
            <div className="relative flex items-center">
              <Filter className="absolute left-3 text-gray-400" size={16} />
              <input
                type="date"
                value={selectedDate}
                onChange={handleFilterChange}
                className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-3 bg-gray-900 rounded-xl text-sm font-bold text-white shadow-lg hover:bg-gray-800 transition-all active:scale-95"
          >
            <Download size={18} /> {t("anal_export_pdf")}
          </button>
        </div>
      </div>

      {/* Titre pour le PDF */}
      <div className="hidden print:block mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">{t("anal_report_title")}</h1>
        <p className="text-gray-500 font-medium uppercase text-xs mt-1">
          {t("anal_period_label")} : {selectedDate || t("anal_full_history")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Graphique de Performance */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 print:shadow-none print:border-gray-200">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-gray-800">{t("anal_evolution_title")}</h2>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold print:hidden ${trendUp ? "text-emerald-500 bg-emerald-50" : "text-rose-500 bg-rose-50"}`}>
              {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {trendPct}%
            </div>
          </div>

          {loading ? (
            <p className="text-center py-16 text-gray-400 text-sm">{t("loading_ellipsis")}</p>
          ) : (
            <div className="flex justify-between items-end h-48 gap-3 mt-6">
              {evolution.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-black text-gray-400">{d.count}</span>
                  <div className="w-full flex items-end justify-center" style={{ height: "120px" }}>
                    <div
                      className="w-full rounded-t-xl bg-blue-500 group-hover:bg-blue-600 transition-all duration-700"
                      style={{ height: `${Math.max((d.count / maxEvolution) * 100, d.count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Destinations */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Map size={20} className="text-blue-600" /> {t("anal_top_destinations")}
          </h2>
          <div className="space-y-6">
            {Object.entries(snapshot.statsParDestination).length > 0 ? (
              Object.entries(snapshot.statsParDestination)
                .sort((a: any, b: any) => b[1] - a[1])
                .slice(0, 5)
                .map(([dest, val]: any) => (
                <div key={dest} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700">{dest}</span>
                    <span className="text-xs font-black text-blue-600">{val} {t("tickets_word")}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                      style={{ width: `${snapshot.totalVentes > 0 ? (val / snapshot.totalVentes) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-10 text-gray-400 text-sm italic">{t("anal_no_data")}</p>
            )}
          </div>
        </div>

        {/* Cartes de métriques */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
            <MiniCard title={t("anal_tickets_sold")} value={loading ? "…" : snapshot.totalVentes} />
            <MiniCard title={t("anal_fill_rate")} value={loading ? "…" : `${snapshot.fillRate}%`} />
            <MiniCard title={t("anal_new_clients")} value={loading ? "…" : snapshot.newClients} />
            <MiniCard title={t("anal_trips_found")} value={loading ? "…" : snapshot.voyages.length} />
        </div>
      </div>
    </div>
  );
}

function MiniCard({ title, value, trend, up }: { title: string; value: any; trend?: string; up?: boolean }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm print:border-gray-200">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
      <div className="flex justify-between items-end">
        <p className="text-xl font-black text-gray-900">{value}</p>
        {trend && (
          <div className={`flex items-center text-xs font-bold print:hidden ${up ? 'text-emerald-500' : 'text-rose-500'}`}>
            {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {trend}
          </div>
        )}
      </div>
    </div>
  );
}
