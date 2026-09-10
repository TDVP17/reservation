"use client";

import { useEffect, useRef, useState } from "react";
import { getMyReservations } from "@/lib/reservation.service";
import { getMesExpeditions } from "@/lib/shipment.service";
import ReservationCard from "@/components/reservation/reservationCard";
import {
  Loader2, Ticket, Package, Download, Check,
  Calendar, Filter, Phone, User, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useLang } from "@/context/LanguageContext";
import { domToPng } from "modern-screenshot";

// ─── Types ──────────────────────────────────────────────────────────────────
type Tab    = "voyages" | "colis";
type Filter = "all" | "month" | "3months" | "custom";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function inRange(date: string, filter: Filter, from: string, to: string): boolean {
  const d = new Date(date);
  const now = new Date();
  if (filter === "month")  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (filter === "3months") return d >= new Date(now.getFullYear(), now.getMonth() - 2, 1);
  if (filter === "custom" && from && to) return d >= new Date(from) && d <= new Date(to + "T23:59:59");
  return true;
}

// ─── Composant Reçu Colis ────────────────────────────────────────────────────
function ColisReceiptCard({ colis }: { colis: any }) {
  const { t, lang }           = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const [dl, setDl]           = useState(false);
  const [ok, setOk]           = useState(false);

  const handleDownload = async () => {
    if (!ref.current) return;
    setDl(true);
    try {
      const url = await domToPng(ref.current, { scale: 3, backgroundColor: "#ffffff" });
      const a   = document.createElement("a");
      a.href = url;
      a.download = `Recu-Colis-${colis.codeClient}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setOk(true); setTimeout(() => setOk(false), 3000);
    } catch { alert(t("download_error")); }
    finally { setDl(false); }
  };

  const STATUS_COLORS: Record<string, string> = {
    "En attente":                      "bg-amber-100 text-amber-700",
    "Reçu en agence de départ":        "bg-purple-100 text-purple-700",
    "En transit":                      "bg-orange-100 text-orange-700",
    "Arrivé en agence de destination": "bg-blue-100 text-blue-700",
    "Collecté":                        "bg-green-100 text-green-700",
    "Annulé":                          "bg-red-100 text-red-600",
  };

  const SHIPMENT_STATUS_LABEL: Record<string, string> = {
    "En attente":                      t("ship_status_pending"),
    "Reçu en agence de départ":        t("ship_status_received_origin"),
    "En transit":                      t("ship_status_in_transit"),
    "Arrivé en agence de destination": t("ship_status_arrived_destination"),
    "Collecté":                        t("ship_status_collected"),
    "Annulé":                          t("ship_status_cancelled"),
  };

  return (
    <div className="flex flex-col items-center mb-8 px-4">
      {/* ── REÇU ── */}
      <div ref={ref}
        className="w-full max-w-[420px] bg-white rounded-[1.8rem] border-2 border-slate-100 overflow-hidden shadow-xl">

        {/* Header */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Package size={15} className="text-blue-600" />
            <span className="text-[11px] font-black uppercase text-slate-700">{t("recu_expedition")}</span>
          </div>
          <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${STATUS_COLORS[colis.status] || "bg-slate-100 text-slate-600"}`}>
            {SHIPMENT_STATUS_LABEL[colis.status] || colis.status}
          </span>
        </div>

        {/* Corps */}
        <div className="p-5 space-y-4">

          {/* Trajet */}
          <div className="flex items-center justify-between gap-2 bg-blue-50 rounded-2xl px-4 py-3">
            <div className="text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase">{t("departure")}</p>
              <p className="text-sm font-black text-slate-800 uppercase">{colis.villeDepart || colis.regionDepart}</p>
              <p className="text-[9px] text-slate-400">{colis.regionDepart}</p>
            </div>
            <ArrowRight size={16} className="text-blue-400 flex-shrink-0" />
            <div className="text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase">{t("arrivee_label")}</p>
              <p className="text-sm font-black text-slate-800 uppercase">{colis.villeDestination || colis.regionDestination}</p>
              <p className="text-[9px] text-slate-400">{colis.regionDestination}</p>
            </div>
          </div>

          {/* Expéditeur → Destinataire */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1 mb-1">
                <User size={8} /> {t("expediteur_section")}
              </p>
              <p className="text-xs font-black text-slate-800 truncate">{colis.nomExpediteur || "—"}</p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Phone size={9} />{colis.telephoneExpediteur || "—"}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1 mb-1">
                <User size={8} /> {t("destinataire_section")}
              </p>
              <p className="text-xs font-black text-slate-800 truncate">{colis.nomDestinataire || "—"}</p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Phone size={9} />{colis.telephoneDestinataire || "—"}
              </p>
            </div>
          </div>

          {/* Détails colis */}
          <div className="space-y-1.5">
            {[
              [t("recap_contenu"),  colis.contenu],
              [t("valeur_label"),   `${Number(colis.valeur).toLocaleString()} FCFA`],
              [t("transport_label"), `${Number(colis.prixExpedition).toLocaleString()} FCFA`],
              [t("frais_label"),    t("inclus_label")],
            ].map(([k, v]: any) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-slate-400 font-bold">{k}</span>
                <span className="font-black text-slate-800">{v}</span>
              </div>
            ))}
          </div>

          {/* Ligne montant total plateforme */}
          <div className="flex justify-between bg-slate-900 text-white rounded-2xl px-4 py-3">
            <span className="text-[10px] font-black uppercase">{t("total_paye")}</span>
            <span className="font-black">{Number(colis.montantTotal).toLocaleString()} FCFA</span>
          </div>

          {/* Codes */}
          <div className="space-y-1">
            {[
              { label: t("code_client"), code: colis.codeClient,  color: "text-blue-600" },
              { label: t("code_agence"), code: colis.codeAgence,  color: "text-purple-600" },
            ].map(({ label, code, color }) => (
              <div key={code} className="flex justify-between text-xs">
                <span className="text-slate-400 font-bold">{label}</span>
                <span className={`font-black tracking-widest ${color}`}>{code}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer date */}
        <div className="bg-blue-600 py-2 text-center">
          <p className="text-[10px] font-black text-white uppercase tracking-widest">
            {new Date(colis.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { day:"2-digit", month:"long", year:"numeric" })}
          </p>
        </div>
      </div>

      {/* ── Boutons ── */}
      <div className="mt-4 flex flex-col items-center gap-3 w-full max-w-[420px]">
        <button onClick={handleDownload} disabled={dl}
          className={`w-full flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-md ${
            ok ? "bg-emerald-500 text-white" : "bg-blue-600 text-white active:scale-95"
          } disabled:opacity-50`}>
          {dl ? <Loader2 size={14} className="animate-spin" /> : ok ? <Check size={14} /> : <Download size={14} />}
          {dl ? t("telechargement") : ok ? t("telecharge") : t("telecharger_recu")}
        </button>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function MyReservationsPage() {
  const { t } = useLang();

  const [tab, setTab]               = useState<Tab>("voyages");
  const [reservations, setRes]      = useState<any[]>([]);
  const [expeditions, setExp]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  const [filter, setFilter]         = useState<Filter>("all");
  const [fromDate, setFromDate]     = useState("");
  const [toDate, setToDate]         = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [r, e] = await Promise.all([getMyReservations(), getMesExpeditions()]);
        setRes(r); setExp(e);
      } catch {} finally { setLoading(false); }
    };
    load();
  }, []);

  const filteredRes = reservations.filter(r => inRange(r.createdAt, filter, fromDate, toDate));
  const filteredExp = expeditions.filter(e => inRange(e.createdAt, filter, fromDate, toDate));
  const current     = tab === "voyages" ? filteredRes : filteredExp;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("loading_tickets")}</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 dark:text-slate-100">

      {/* Titre */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 uppercase italic tracking-tighter">
            {t("documents_title")}
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {t("documents_sub")}
          </p>
        </div>
      </div>

      {/* ── Onglets ── */}
      <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl p-1.5 mb-6">
        <button
          onClick={() => setTab("voyages")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${
            tab === "voyages" ? "bg-white dark:bg-slate-700 shadow text-blue-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Ticket size={16} /> {t("tab_tickets")}
          <span className={`text-xs px-2 py-0.5 rounded-full font-black ${tab === "voyages" ? "bg-blue-100 text-blue-600" : "bg-slate-200 dark:bg-slate-600 text-slate-500"}`}>
            {reservations.length}
          </span>
        </button>
        <button
          onClick={() => setTab("colis")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${
            tab === "colis" ? "bg-white dark:bg-slate-700 shadow text-blue-600" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Package size={16} /> {t("tab_colis")}
          <span className={`text-xs px-2 py-0.5 rounded-full font-black ${tab === "colis" ? "bg-blue-100 text-blue-600" : "bg-slate-200 dark:bg-slate-600 text-slate-500"}`}>
            {expeditions.length}
          </span>
        </button>
      </div>

      {/* ── Filtres date ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 mb-6">
        <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5 mb-3">
          <Filter size={11} /> {t("filter_title")}
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all",     label: t("filter_all") },
            { key: "month",   label: t("filter_month") },
            { key: "3months", label: t("filter_3months") },
            { key: "custom",  label: t("filter_custom") },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key as Filter)}
              className={`px-4 py-2 rounded-xl font-black text-xs transition-all active:scale-95 ${
                filter === key ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Date range custom */}
        {filter === "custom" && (
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[140px]">
              <Calendar size={14} className="text-slate-400 flex-shrink-0" />
              <input type="date"
                className="flex-1 bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <span className="text-slate-400 font-bold text-sm">→</span>
            <div className="flex items-center gap-2 flex-1 min-w-[140px]">
              <Calendar size={14} className="text-slate-400 flex-shrink-0" />
              <input type="date"
                className="flex-1 bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* ── Compteur résultats ── */}
      {filter !== "all" && (
        <p className="text-xs font-bold text-slate-400 mb-4">
          {current.length} {current.length > 1 ? t("results_count_plural") : t("results_count")} {current.length > 1 ? t("found_plural") : t("found")}
        </p>
      )}

      {/* ── Contenu ── */}
      {tab === "voyages" && (
        filteredRes.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {filteredRes.map(r => (
              <ReservationCard key={r._id} reservation={r} onUpdate={() => getMyReservations().then(setRes)} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Ticket size={40} className="mx-auto text-slate-200 mb-3" />}
            title={filter !== "all" ? t("no_ticket_period") : t("no_reservation")}
            sub={filter !== "all" ? t("try_other_period") : t("no_reservation_sub")}
            cta={filter === "all" ? <Link href="/voyages" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">{t("see_voyages_btn")}</Link> : null}
          />
        )
      )}

      {tab === "colis" && (
        filteredExp.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {filteredExp.map(c => <ColisReceiptCard key={c._id} colis={c} />)}
          </div>
        ) : (
          <EmptyState
            icon={<Package size={40} className="mx-auto text-slate-200 mb-3" />}
            title={filter !== "all" ? t("no_colis_period") : t("no_expedition")}
            sub={filter !== "all" ? t("try_other_period") : t("no_expedition_sub")}
            cta={filter === "all" ? <Link href="/expedition" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">{t("send_colis_btn")}</Link> : null}
          />
        )
      )}
    </div>
  );
}

function EmptyState({ icon, title, sub, cta }: { icon: React.ReactNode; title: string; sub: string; cta?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon}
      <h2 className="text-xl font-black text-slate-700 dark:text-slate-200 mb-2">{title}</h2>
      <p className="text-slate-400 text-sm max-w-xs mb-8">{sub}</p>
      {cta}
    </div>
  );
}
