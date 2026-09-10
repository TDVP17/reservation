"use client";

import useSWR from "swr";
import { Bus, Users, Calendar, ArrowUpRight, MapPin, Clock, Play, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/context/LanguageContext";

function isToday(dateStr?: string) {
  if (!dateStr) return false;
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

function isYesterday(dateStr?: string) {
  if (!dateStr) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return new Date(dateStr).toDateString() === yesterday.toDateString();
}

function computeTrend(today: number, yesterday: number, newLabel: string): { label: string; positive: boolean } | null {
  if (yesterday === 0) {
    return today > 0 ? { label: newLabel, positive: true } : null;
  }
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  return { label: `${pct > 0 ? "+" : ""}${pct}%`, positive: pct >= 0 };
}

export default function DashboardPage() {
  const { t, lang } = useLang();
  const { data: voyages = [], isLoading: voyagesLoading } = useSWR<any[]>("/voyages/ma-liste");
  const { data: reservations = [], isLoading: reservationsLoading } = useSWR<any[]>("/reservations/agence");
  const loading = voyagesLoading || reservationsLoading;

  const voyagesToday    = voyages.filter(v => isToday(v.createdAt));
  const voyagesYesterday = voyages.filter(v => isYesterday(v.createdAt));
  const ticketsToday    = reservations
    .filter(r => r.status !== "Annulé" && isToday(r.createdAt))
    .reduce((a, r) => a + (r.placesReservees || 0), 0);
  const ticketsYesterday = reservations
    .filter(r => r.status !== "Annulé" && isYesterday(r.createdAt))
    .reduce((a, r) => a + (r.placesReservees || 0), 0);
  const dernier      = voyages[0] ?? null;

  // Vrai graphique : taux de remplissage des 7 derniers voyages
  const chartData = [...voyages]
    .slice(0, 7)
    .reverse()
    .map(v => ({
      label: v.destination?.slice(0, 4) ?? "—",
      pct: v.placesTotal > 0 ? Math.round(((v.placesTotal - v.placesRestantes) / v.placesTotal) * 100) : 0,
    }));
  while (chartData.length < 7) chartData.unshift({ label: "—", pct: 0 });

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen font-sans">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900">{t("dash_title")}</h1>
        <p className="text-gray-500 font-medium">{t("dash_subtitle")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard
          title={t("stat_voyages_created")}
          value={loading ? "…" : voyagesToday.length}
          icon={<Bus className="text-blue-600" size={20} />}
          color="bg-blue-50"
          trend={loading ? null : computeTrend(voyagesToday.length, voyagesYesterday.length, t("trend_new"))}
        />
        <StatCard
          title={t("stat_tickets_sold")}
          value={loading ? "…" : ticketsToday}
          icon={<Users className="text-purple-600" size={20} />}
          color="bg-purple-50"
          trend={loading ? null : computeTrend(ticketsToday, ticketsYesterday, t("trend_new"))}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Graphique + dernier voyage */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">{t("chart_fill_title")}</h2>
            <Link href="/voyages" className="text-blue-600 font-bold text-sm flex items-center gap-1">
              {t("see_all")} <ArrowUpRight size={16} />
            </Link>
          </div>

          {loading ? (
            <p className="text-center py-10 text-gray-400 animate-pulse">{t("loading_ellipsis")}</p>
          ) : voyages.length === 0 ? (
            <p className="text-center py-20 text-gray-400">{t("no_voyage_yet")}</p>
          ) : (
            <div className="space-y-8">
              {/* Bar chart réel */}
              <div className="p-6 bg-gray-50 border border-gray-100 rounded-3xl">
                <div className="flex justify-between items-end h-32 gap-3">
                  {chartData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                      <span className="text-[10px] font-black text-gray-400">{d.pct}%</span>
                      <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
                        <div
                          className={`w-full rounded-t-xl transition-all duration-700 ${d.pct > 80 ? "bg-emerald-500" : d.pct > 40 ? "bg-blue-500" : "bg-blue-200"} group-hover:opacity-80`}
                          style={{ height: `${Math.max(d.pct, 4)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 truncate w-full text-center">{d.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4 text-xs text-gray-400 font-bold">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> {t("legend_high")}</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> {t("legend_mid")}</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-200 inline-block" /> {t("legend_low")}</span>
                </div>
              </div>

              {/* Dernier voyage */}
              {dernier && (
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md flex-shrink-0">
                    <img
                      src={dernier.imageBus || "/images/bus.avif"}
                      className="w-full h-full object-cover" alt={t("th_bus")}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-black text-gray-900">{dernier.depart ? `${dernier.depart} → ` : ""}{dernier.destination}</h3>
                      <StatusBadge status={dernier.status} />
                    </div>
                    <div className="flex gap-4 mt-2 text-gray-500 text-sm flex-wrap">
                      <span className="flex items-center gap-1"><Calendar size={14} />{new Date(dernier.date).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR")}</span>
                      <span className="flex items-center gap-1"><Clock size={14} />{dernier.heure}</span>
                      <span className="flex items-center gap-1"><MapPin size={14} />{dernier.typeBus}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="block text-xs font-bold text-gray-400 uppercase">{t("remaining_seats")}</span>
                    <span className="text-3xl font-black text-blue-600">{dernier.placesRestantes}</span>
                    <span className="block text-xs text-gray-400">/ {dernier.placesTotal}</span>
                  </div>
                </div>
              )}

              {/* Voyages en route */}
              {voyages.filter(v => v.status === "en_route").length > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
                  <p className="text-xs font-black text-green-700 uppercase tracking-widest mb-2 flex items-center gap-1"><Play size={12} /> {t("currently_en_route")}</p>
                  {voyages.filter(v => v.status === "en_route").map(v => (
                    <div key={v._id} className="flex items-center justify-between text-sm text-green-800 font-bold">
                      <span>{v.depart ? `${v.depart} → ` : ""}{v.destination} · {v.heure}</span>
                      <span>{v.placesTotal - v.placesRestantes} {t("passengers_suffix")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panneau latéral */}
        <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <div className="bg-blue-500 w-12 h-12 rounded-2xl flex items-center justify-center mb-6"><Bus size={24} /></div>
            <h2 className="text-2xl font-black mb-4 leading-tight">{t("quick_summary")}</h2>
            <div className="space-y-3">
              <div className="bg-blue-500/50 rounded-2xl p-4">
                <p className="text-xs opacity-70 uppercase font-bold tracking-widest">{t("sum_en_route")}</p>
                <p className="text-3xl font-black">{voyages.filter(v => v.status === "en_route").length}</p>
              </div>
              <div className="bg-blue-500/50 rounded-2xl p-4">
                <p className="text-xs opacity-70 uppercase font-bold tracking-widest">{t("sum_scheduled")}</p>
                <p className="text-3xl font-black">{voyages.filter(v => !v.status || v.status === "scheduled").length}</p>
              </div>
              <div className="bg-blue-500/50 rounded-2xl p-4">
                <p className="text-xs opacity-70 uppercase font-bold tracking-widest">{t("sum_completed")}</p>
                <p className="text-3xl font-black">{voyages.filter(v => v.status === "arrived").length}</p>
              </div>
            </div>
          </div>
          <Link href="/rapport" className="relative z-10 mt-6 bg-white text-blue-600 px-6 py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
            {t("see_reports")} <ArrowUpRight size={18} />
          </Link>
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-blue-500 rounded-full opacity-30" />
        </div>
      </div>

    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const { t } = useLang();
  if (status === "en_route") return <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase">{t("status_en_route")}</span>;
  if (status === "arrived")  return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase">{t("status_arrived")}</span>;
  return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase">{t("status_scheduled")}</span>;
}

function StatCard({ title, value, icon, color, trend }: any) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div className={`${color} p-2.5 rounded-lg`}>{icon}</div>
        {trend && (
          <span className={`text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 ${
            trend.positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}>
            <TrendingUp size={12} className={trend.positive ? "" : "rotate-180"} /> {trend.label}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900">{value}</p>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{title}</p>
      </div>
    </div>
  );
}
