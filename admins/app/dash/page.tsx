"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import {
  ShieldCheck,
  Bus,
  Wallet,
  Search,
  CheckCircle2,
  BadgeCheck,
  Clock,
  Phone,
  MapPin,
  ClipboardList,
  FileText,
  Building2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useLang } from "@/context/LanguageContext";

function openBase64Doc(dataUrl: string) {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'application/pdf';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  window.open(URL.createObjectURL(blob), '_blank');
}

function timeAgo(dateStr: string, t: (k: any) => string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t("time_just_now");
  if (diffMin < 60) return t("time_minutes_ago").replace("{n}", String(diffMin));
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t("time_hours_ago").replace("{n}", String(diffH));
  const diffJ = Math.floor(diffH / 24);
  return t("time_days_ago").replace("{n}", String(diffJ));
}

type StatusFilter = "all" | "pending" | "verified";
type ActivityEntry = { type: "AGENCE" | "CLIENT"; name: string; date: string; status?: string };

export default function AdminDashboard() {
  const { t } = useLang();
  const [agences, setAgences] = useState<any[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedAgence, setSelectedAgence] = useState<any>(null); // Pour la modal d'inspection
  const [stats, setStats] = useState({
    totalAgences: 0,
    totalVoyages: 0,
    platformRevenue: 0,
    alertes: 0,
    confirmees: 0
  });

  // --- Recherche / filtre (client-side, sur les données déjà chargées) ---
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // --- RÉCUPÉRATION DES DONNÉES RÉELLES ---
  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setError(false);

    const [agencesRes, statsRes, historyRes] = await Promise.allSettled([
      api.get("/admin/agences"),
      api.get("/admin/stats"),
      api.get("/admin/history"),
    ]);

    if (agencesRes.status === "rejected") {
      console.error("Erreur lors du chargement des agences:", agencesRes.reason);
      setError(true);
      setLoading(false);
      return;
    }

    const dataAgences = agencesRes.value.data.map((a: any) => ({
      ...a,
      isVerified: a.status === "Validé"
    }));
    setAgences(dataAgences);

    if (statsRes.status === "rejected") {
      console.error("Erreur lors du chargement des statistiques globales:", statsRes.reason);
    }
    const statsData = statsRes.status === "fulfilled" ? statsRes.value.data : null;

    setStats({
      totalAgences: statsData?.totalAgences ?? dataAgences.length,
      totalVoyages: statsData?.totalVoyages ?? 0,
      platformRevenue: statsData?.platformRevenue ?? 0,
      alertes: statsData?.alertes ?? dataAgences.filter((a: any) => !a.isVerified).length,
      confirmees: statsData?.confirmees ?? dataAgences.filter((a: any) => a.isVerified).length
    });

    if (historyRes.status === "fulfilled") {
      setActivity(historyRes.value.data.slice(0, 5));
    } else {
      console.error("Erreur lors du chargement de l'historique:", historyRes.reason);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // --- FONCTION POUR VALIDER UNE AGENCE ---
  const handleValidate = async (id: string) => {
    try {
      await api.patch(`/admin/validate-agence/${id}`);

      setAgences((prevAgences: any) =>
        prevAgences.map((agence: any) =>
          agence._id === id ? { ...agence, status: "Validé" } : agence
        )
      );

      setStats(prev => ({
        ...prev,
        alertes: Math.max(0, prev.alertes - 1),
        confirmees: prev.confirmees + 1
      }));

      setSelectedAgence(null);
      alert(t("alert_agency_validated"));

    } catch (error) {
      console.error("Erreur validation:", error);
      alert(t("alert_agency_validate_error"));
    }
  };

  // --- Liste filtrée pour l'affichage (recherche + statut) ---
  const filteredAgences = agences.filter((a: any) => {
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "verified" && a.status === "Validé") ||
      (statusFilter === "pending" && a.status !== "Validé");

    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      (a.name || a.nom || "").toLowerCase().includes(q) ||
      (a.ville || "").toLowerCase().includes(q);

    return matchStatus && matchSearch;
  });

  return (
    <div className="p-4 sm:p-8 bg-[#f8f9ff] min-h-screen font-sans md:ml-45">

      {/* Header Admin */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2563eb] text-white flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0d1c2f] tracking-tight">
              {t("dash_header_title")}
            </h1>
            <p className="text-[#434655] text-sm font-medium">{t("dash_header_subtitle")}</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-[1.5rem] p-6 mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <AlertTriangle size={22} className="flex-shrink-0" />
            <div>
              <p className="font-bold">{t("dash_error_title")}</p>
              <p className="text-sm text-red-600">{t("dash_error_sub")}</p>
            </div>
          </div>
          <button
            onClick={fetchAdminData}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition-colors flex-shrink-0"
          >
            <RefreshCw size={16} /> {t("dash_retry")}
          </button>
        </div>
      ) : (
        <>
          {/* Cartes de métriques */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <StatSkeleton key={i} />)
            ) : (
              <>
                <AdminStatCard title={t("stat_total_agences")} value={stats.totalAgences} icon={<Building2 size={20} />} />
                <AdminStatCard title={t("stat_confirmed_agences")} value={stats.confirmees} icon={<BadgeCheck size={20} />} tone="success" />
                <AdminStatCard title={t("stat_total_trips")} value={stats.totalVoyages} icon={<Bus size={20} />} />
                <AdminStatCard title={t("stat_platform_revenue")} value={`${stats.platformRevenue.toLocaleString()} FCFA`} icon={<Wallet size={20} />} />
                <AdminStatCard title={t("stat_agences_to_validate")} value={stats.alertes} icon={<Clock size={20} />} tone="warning" />
              </>
            )}
          </div>

          {/* Onglets de navigation */}
          <div className="flex overflow-x-auto gap-2 mb-8 pb-1">
            <span className="whitespace-nowrap px-4 py-2 bg-[#6cf8bb]/40 text-[#00714d] rounded-full text-xs font-bold uppercase tracking-wide">
              {t("tab_agences")}
            </span>
            <Link href="/livreurs" className="whitespace-nowrap px-4 py-2 border border-[#c3c6d7] text-[#434655] rounded-full text-xs font-bold uppercase tracking-wide hover:bg-[#eff4ff] transition-colors">
              {t("tab_livreurs")}
            </Link>
            <Link href="/client" className="whitespace-nowrap px-4 py-2 border border-[#c3c6d7] text-[#434655] rounded-full text-xs font-bold uppercase tracking-wide hover:bg-[#eff4ff] transition-colors">
              {t("tab_clients")}
            </Link>
            <Link href="/history" className="whitespace-nowrap px-4 py-2 border border-[#c3c6d7] text-[#434655] rounded-full text-xs font-bold uppercase tracking-wide hover:bg-[#eff4ff] transition-colors">
              {t("tab_logs")}
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Liste des Agences */}
            <div className="lg:col-span-2 bg-white rounded-[1.5rem] p-6 sm:p-8 shadow-sm border border-[#c3c6d7]/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold text-[#0d1c2f] tracking-tight">{t("registry_title")}</h2>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#434655]" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder={t("search_placeholder_generic")}
                      className="w-full sm:w-56 pl-10 pr-4 py-2 bg-white border border-[#c3c6d7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb]"
                    />
                  </div>
                  <div className="flex border border-[#c3c6d7] rounded-lg overflow-hidden">
                    {([
                      { key: "all", label: t("filter_all") },
                      { key: "pending", label: t("filter_pending") },
                      { key: "verified", label: t("filter_verified") },
                    ] as { key: StatusFilter; label: string }[]).map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setStatusFilter(key)}
                        className={`px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                          statusFilter === key ? "bg-[#eff4ff] text-[#0d1c2f]" : "text-[#434655] hover:bg-[#eff4ff]/50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 font-sans">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <AgencyRowSkeleton key={i} />)
                ) : filteredAgences.length === 0 ? (
                  <p className="text-center py-16 text-[#434655] text-sm">
                    {agences.length === 0 ? t("no_agences_registered") : t("no_agences_match_search")}
                  </p>
                ) : filteredAgences.map((agence: any) => (
                  <AgencyRow
                    key={agence._id}
                    agence={agence}
                    onInspect={() => setSelectedAgence(agence)}
                  />
                ))}
              </div>
            </div>

            {/* Dernières Activités */}
            <div className="bg-white rounded-[1.5rem] p-6 sm:p-8 shadow-sm border border-[#c3c6d7]/20">
              <h2 className="text-xl font-bold text-[#0d1c2f] mb-6 tracking-tight">{t("recent_activities_title")}</h2>
              <div className="flex flex-col gap-5 relative before:absolute before:inset-y-0 before:left-[15px] before:w-px before:bg-[#c3c6d7]/50">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <ActivitySkeleton key={i} />)
                ) : activity.length === 0 ? (
                  <p className="text-sm text-[#434655] text-center py-6">{t("no_recent_activity")}</p>
                ) : activity.map((a, i) => (
                  <ActivityItem
                    key={i}
                    text={a.type === "AGENCE" ? `${t("activity_new_agency")} ${a.name}` : `${t("activity_new_client")} ${a.name}`}
                    time={timeAgo(a.date, t)}
                    isAlert={a.type === "AGENCE" && a.status !== "Validé"}
                  />
                ))}
              </div>
              <Link href="/history">
                <button className="w-full mt-8 py-3 text-[#2563eb] border border-[#2563eb]/20 font-bold text-xs uppercase hover:bg-[#2563eb] hover:text-white rounded-xl transition-all">
                  {t("full_history_btn")}
                </button>
              </Link>
            </div>
          </div>
        </>
      )}

      {/* --- MODAL D'INSPECTION --- */}
      {selectedAgence && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[1.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl bg-[#eff4ff] flex items-center justify-center flex-shrink-0">
                  <Building2 className="text-[#2563eb]" size={22} />
                </div>
                <div>
                  <h3 className="font-black text-[#0d1c2f] text-lg leading-tight">{selectedAgence.name || selectedAgence.nom}</h3>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${
                    selectedAgence.status === "Validé" ? "text-[#10b981]" : "text-[#f59e0b]"
                  }`}>
                    {selectedAgence.status === "Validé" ? <><BadgeCheck size={12} /> {t("modal_verified")}</> : <><Clock size={12} /> {t("modal_pending")}</>}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#f8f9ff] p-4 rounded-xl">
                    <p className="text-[10px] font-black text-[#434655] uppercase flex items-center gap-1 mb-1"><Phone size={12}/> {t("modal_phone")}</p>
                    <p className="font-bold text-[#0d1c2f]">{selectedAgence.telephone || "N/A"}</p>
                  </div>
                  <div className="bg-[#f8f9ff] p-4 rounded-xl">
                    <p className="text-[10px] font-black text-[#434655] uppercase flex items-center gap-1 mb-1"><MapPin size={12}/> {t("modal_city")}</p>
                    <p className="font-bold text-[#0d1c2f]">{selectedAgence.ville || "N/A"}</p>
                  </div>
                </div>

                <div className="bg-[#eff4ff] p-4 rounded-xl border border-[#2563eb]/10">
                  <p className="text-[10px] font-black text-[#2563eb] uppercase flex items-center gap-1 mb-1"><ClipboardList size={12}/> {t("modal_registry_number")}</p>
                  <p className="font-black text-[#0d1c2f]">{selectedAgence.numRegistre || t("modal_registry_not_provided")}</p>
                </div>

                <div className="p-4 border-2 border-dashed border-[#c3c6d7]/50 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="text-[#434655] flex-shrink-0" size={22} />
                    <p className="text-xs font-bold text-[#434655] truncate">{t("modal_document_label")}</p>
                  </div>
                  <button
                    onClick={() => openBase64Doc(selectedAgence.documentProuveAgence)}
                    className="bg-[#0d1c2f] text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-[#2563eb] transition-colors flex-shrink-0"
                  >
                    {t("modal_open_doc")}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                {selectedAgence.status !== "Validé" && (
                  <button
                    onClick={() => handleValidate(selectedAgence._id)}
                    className="flex-1 bg-[#2563eb] text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#004ac6] shadow-lg shadow-blue-100 transition-all"
                  >
                    {t("modal_approve_agency")}
                  </button>
                )}
                <button
                  onClick={() => setSelectedAgence(null)}
                  className="px-6 bg-[#f8f9ff] text-[#434655] py-3.5 rounded-xl font-black text-xs uppercase hover:bg-[#eff4ff] transition-all"
                >
                  {t("modal_close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SOUS-COMPOSANTS ---

function AdminStatCard({ title, value, icon, tone }: any) {
  const toneStyles: Record<string, string> = {
    default: "bg-[#eff4ff] text-[#2563eb]",
    success: "bg-[#d1fae5] text-[#065f46]",
    warning: "bg-[#fef3c7] text-[#92400e]",
  };
  const isWarning = tone === "warning";

  return (
    <div className={`p-5 rounded-[1.25rem] shadow-sm border flex flex-col gap-3 ${
      isWarning ? "bg-amber-50 border-amber-300" : "bg-white border-[#c3c6d7]/20"
    }`}>
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toneStyles[tone || "default"]}`}>
          {icon}
        </div>
        <span className="text-xs font-semibold text-[#434655]">{title}</span>
      </div>
      <p className={`text-2xl font-black leading-none ${isWarning ? "text-amber-800" : "text-[#0d1c2f]"}`}>{value}</p>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="p-5 rounded-[1.25rem] shadow-sm border border-[#c3c6d7]/20 bg-white flex flex-col gap-3 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#eff4ff]" />
        <div className="h-3 w-20 rounded bg-[#eff4ff]" />
      </div>
      <div className="h-6 w-14 rounded bg-[#eff4ff]" />
    </div>
  );
}

function AgencyRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-transparent animate-pulse">
      <div className="w-11 h-11 rounded-xl bg-[#eff4ff] flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 rounded bg-[#eff4ff]" />
        <div className="h-2.5 w-1/2 rounded bg-[#eff4ff]" />
      </div>
      <div className="h-8 w-24 rounded-lg bg-[#eff4ff] flex-shrink-0" />
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex gap-3 relative z-10 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-[#eff4ff] flex-shrink-0" />
      <div className="flex flex-col gap-1.5 flex-1 pt-1">
        <div className="h-3 w-3/4 rounded bg-[#eff4ff]" />
        <div className="h-2.5 w-1/4 rounded bg-[#eff4ff]" />
      </div>
    </div>
  );
}

function AgencyRow({ agence, onInspect }: any) {
  const { t } = useLang();
  const initial = agence.name ? agence.name.charAt(0) : (agence.nom ? agence.nom.charAt(0) : "?");
  const isVerified = agence.status === "Validé";

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all group ${
      isVerified ? "border-transparent hover:border-[#c3c6d7]/40 hover:bg-[#f8f9ff]" : "border-amber-300/50 bg-amber-50/40"
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold uppercase flex-shrink-0 ${
          isVerified ? "bg-[#eff4ff] text-[#2563eb]" : "bg-amber-100 text-amber-800"
        }`}>
          {initial}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-[#0d1c2f] truncate">{agence.name || agence.nom || t("agency_no_name")}</p>
            {isVerified ? (
              <BadgeCheck size={15} className="text-[#10b981] flex-shrink-0" />
            ) : (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold tracking-wider flex-shrink-0">{t("badge_pending")}</span>
            )}
          </div>
          <p className="text-[11px] text-[#434655] font-medium truncate">
            {agence.email} • {agence.ville || t("unknown_city")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onInspect}
          className="flex-1 sm:flex-none px-4 py-2 border border-[#c3c6d7] rounded-lg text-xs font-bold text-[#434655] hover:bg-[#eff4ff] transition-colors"
        >
          {t("see_details")}
        </button>
        <button
          onClick={onInspect}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            isVerified
              ? "border border-red-200 text-red-600 hover:bg-red-50"
              : "bg-[#2563eb] text-white hover:bg-[#004ac6] shadow-sm"
          }`}
        >
          {isVerified ? t("agency_row_suspend") : t("verify_action")}
        </button>
      </div>
    </div>
  );
}

function ActivityItem({ text, time, isAlert }: any) {
  return (
    <div className="flex gap-3 relative z-10">
      <div className={`w-8 h-8 rounded-full bg-white border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isAlert ? "border-amber-500" : "border-[#2563eb]"
      }`}>
        {isAlert ? <Clock size={14} className="text-amber-500" /> : <CheckCircle2 size={14} className="text-[#2563eb]" />}
      </div>
      <div className="flex flex-col">
        <p className={`text-sm font-bold ${isAlert ? "text-amber-800" : "text-[#0d1c2f]"}`}>{text}</p>
        <span className="text-[10px] text-[#434655] font-medium mt-0.5">{time}</span>
      </div>
    </div>
  );
}
