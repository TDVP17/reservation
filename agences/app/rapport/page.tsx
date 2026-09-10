"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import {
  FileText, Download, Search, Printer, CheckCircle2, Clock, Navigation, Lock, TrendingUp, Package,
  Eye, KeyRound, Send, AlertCircle, Loader2, Wallet, ArrowDownLeft, History, Banknote, X, User,
} from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import FinancialPinModal from "@/components/FinancialPinModal";

const IDLE_LOCK_MS = 15 * 60 * 1000; // 15 minutes

type RevenueSummary = {
  ticketRevenue: number;
  onlineTicketRevenue: number;
  cashTicketRevenue: number;
  parcelEarnings: number;
  totalRevenue: number;
};

type Withdrawal = {
  _id: string;
  amount: number;
  phone: string;
  accountName: string;
  network: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
};

// ── Lien "PIN oublié ?" — demande de réinitialisation vérifiée par email ──
function ForgotPinFlow({ t }: { t: (k: any) => string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"intro" | "code" | "done">("intro");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("agence");
    if (raw) setEmail(JSON.parse(raw)?.email || "");
  }, []);

  const sendCode = async () => {
    setError(""); setLoading(true);
    try {
      await api.post("/agences/send-verify-code", { action: "pin_reset_request", target: email });
      setStep("code");
    } catch (err: any) {
      setError(err?.response?.data?.error || t("fin_pin_forgot_error"));
    } finally { setLoading(false); }
  };

  const confirmCode = async () => {
    if (code.length !== 6) return;
    setError(""); setLoading(true);
    try {
      await api.post("/agences/verify-and-update", { code });
      setStep("done");
    } catch (err: any) {
      setError(err?.response?.data?.error || t("fin_pin_forgot_error"));
    } finally { setLoading(false); }
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} className="text-xs font-bold text-blue-600 hover:underline">
      {t("fin_pin_forgot_link")}
    </button>
  );

  return (
    <div className="mt-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-left space-y-3 max-w-sm mx-auto">
      <h4 className="font-black text-gray-900 text-sm flex items-center gap-2"><KeyRound size={14} /> {t("fin_pin_forgot_title")}</h4>
      {step === "intro" && (
        <>
          <p className="text-xs text-gray-500">{t("fin_pin_forgot_sub")}</p>
          {error && <p className="text-xs text-red-500 font-bold flex items-center gap-1"><AlertCircle size={11} /> {error}</p>}
          <button onClick={sendCode} disabled={loading} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs disabled:opacity-50">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {t("fin_pin_forgot_send_code")}
          </button>
        </>
      )}
      {step === "code" && (
        <>
          <p className="text-xs text-gray-500">{t("fin_pin_forgot_code_sent")} <strong>{email}</strong></p>
          <input type="text" inputMode="numeric" maxLength={6} value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-center font-black tracking-[0.4em] outline-none focus:ring-2 focus:ring-blue-500/20" />
          {error && <p className="text-xs text-red-500 font-bold flex items-center gap-1"><AlertCircle size={11} /> {error}</p>}
          <button onClick={confirmCode} disabled={loading || code.length !== 6} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs disabled:opacity-50">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} {t("fin_pin_forgot_confirm")}
          </button>
        </>
      )}
      {step === "done" && (
        <p className="text-xs text-emerald-600 font-bold flex items-center gap-2"><CheckCircle2 size={14} /> {t("fin_pin_forgot_success")}</p>
      )}
    </div>
  );
}

type Voyage = {
  _id: string;
  destination: string;
  depart: string;
  date: string;
  heure: string;
  placesTotal: number;
  placesRestantes: number;
  prix: number;
  typeBus: string;
  status?: string;
};

const STATUS_FILTER = ["Tous", "scheduled", "en_route", "arrived"];

function exportCSV(voyages: Voyage[], t: (k: any) => string, lang: string) {
  const STATUS_LABELS: Record<string, string> = {
    scheduled: t("status_scheduled"),
    en_route:  t("status_en_route"),
    arrived:   t("status_arrived"),
  };
  const header = [
    t("rap_csv_date"), t("rap_csv_time"), t("th_departure"), t("destination_label"),
    t("rap_csv_type"), t("rap_csv_seats_sold"), t("rap_csv_seats_total"), t("rap_csv_revenue"), t("rap_csv_status"),
  ];
  const rows = voyages.map(v => {
    const vendus = v.placesTotal - v.placesRestantes;
    return [
      new Date(v.date).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR"),
      v.heure,
      v.depart || "—",
      v.destination,
      v.typeBus,
      vendus,
      v.placesTotal,
      vendus * v.prix,
      STATUS_LABELS[v.status ?? "scheduled"] ?? v.status ?? t("status_scheduled"),
    ];
  });
  const csv = [header, ...rows].map(r => r.join(";")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rapport_voyages_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Détection réseau mobile money à partir du préfixe du numéro
function getNetwork(phone: string) {
  if (phone.length < 3) return null;
  const omPrefixes = ['655','656','657','658','659','690','691','692','693','694','695','696','697','698','699','688','686','685','687','689','640','641','642','643','644','645','646','647','648','649'];
  const momoPrefixes = ['650','651','652','653','654','670','671','672','673','674','675','676','677','678','679','680','681','682','683','684'];
  if (omPrefixes.some(p => phone.startsWith(p))) return { name: "Orange Money", color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-200" };
  if (momoPrefixes.some(p => phone.startsWith(p))) return { name: "MTN MoMo", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" };
  return null;
}

export default function ReportsPage() {
  const { t, lang } = useLang();

  // ── Verrouillage PIN de la page entière (données financières + trajets) ──
  const [showPinModal, setShowPinModal] = useState(false);
  const [financialUnlocked, setFinancialUnlocked] = useState(false);
  const [financialToken, setFinancialToken] = useState<string | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Données chargées uniquement après déverrouillage ──
  const [revenueData, setRevenueData] = useState<RevenueSummary | null>(null);
  const [balance, setBalance] = useState({ amount: 0 });
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [voyages, setVoyages] = useState<Voyage[]>([]);

  // ── Trajets : recherche/filtre/pagination ──
  const [search, setSearch]   = useState("");
  const [statut, setStatut]   = useState("Tous");
  const [page, setPage]       = useState(1);
  const PER_PAGE = 10;

  // ── Modal de retrait ──
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const network = getNetwork(phoneNumber);

  const lockPage = () => {
    setFinancialUnlocked(false);
    setFinancialToken(null);
    setRevenueData(null);
    setBalance({ amount: 0 });
    setWithdrawals([]);
    setVoyages([]);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  };

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(lockPage, IDLE_LOCK_MS);
  };

  // Auto-verrouillage après 15 min d'inactivité, uniquement pendant que la page est déverrouillée
  useEffect(() => {
    if (!financialUnlocked) return;

    resetIdleTimer();
    const events = ["mousemove", "keydown", "click", "touchstart"];
    events.forEach(ev => window.addEventListener(ev, resetIdleTimer));

    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialUnlocked]);

  const refreshFinancialData = async (token: string) => {
    const headers = { "X-Financial-Token": token };
    const [revenueRes, voyagesRes, balanceRes, withdrawalsRes] = await Promise.all([
      api.get("/agences/revenue-summary", { headers }),
      api.get("/voyages/ma-liste"),
      api.get("/portefeuille/mon-solde", { headers }),
      api.get("/portefeuille/mes-transactions", { headers }),
    ]);
    setRevenueData(revenueRes.data);
    setVoyages(voyagesRes.data);
    setBalance(balanceRes.data);
    setWithdrawals(withdrawalsRes.data);
  };

  const handlePinSuccess = async (token: string) => {
    setShowPinModal(false);
    setUnlockLoading(true);
    try {
      await refreshFinancialData(token);
      setFinancialToken(token);
      setFinancialUnlocked(true);
    } catch (err) {
      console.error("Erreur chargement des rapports:", err);
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError("");
    if (!financialToken) return;
    if (Number(amount) > balance.amount) return setWithdrawError(t("wallet_insufficient"));
    if (!network) return setWithdrawError(t("wallet_unrecognized_number"));

    try {
      setWithdrawLoading(true);
      await api.post("/portefeuille/retrait", {
        amount: Number(amount),
        phone: phoneNumber,
        accountName,
        network: network.name,
      }, { headers: { "X-Financial-Token": financialToken } });

      setIsWithdrawModalOpen(false);
      setAmount("");
      setPhoneNumber("");
      setAccountName("");
      await refreshFinancialData(financialToken);
      toast.success(t("wallet_withdraw_success_toast"));
    } catch (err: any) {
      const message = err?.response?.data?.error || t("wallet_withdraw_error");
      setWithdrawError(message);
      toast.error(message);
    } finally {
      setWithdrawLoading(false);
    }
  };

  const filtered = voyages.filter(v => {
    const matchSearch =
      v.destination.toLowerCase().includes(search.toLowerCase()) ||
      (v.depart ?? "").toLowerCase().includes(search.toLowerCase()) ||
      v.date.includes(search);
    const matchStatut = statut === "Tous" || (v.status ?? "scheduled") === statut;
    return matchSearch && matchStatut;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalRevenus = filtered.reduce((a, v) => a + (v.placesTotal - v.placesRestantes) * v.prix, 0);

  const totalWithdrawn = withdrawals.reduce((a, w) => a + (w.status !== "FAILED" ? w.amount : 0), 0);

  const WITHDRAWAL_STATUS_LABEL: Record<string, string> = {
    PENDING:   t("withdrawal_status_pending"),
    COMPLETED: t("withdrawal_status_completed"),
    FAILED:    t("withdrawal_status_failed"),
  };

  // ═══ ÉCRAN VERROUILLÉ — rien d'autre ne s'affiche tant que le PIN n'est pas validé ═══
  if (!financialUnlocked) {
    return (
      <div className="p-8 bg-[#F8FAFC] min-h-screen flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-10 text-center">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-full mb-4 inline-flex">
            <Lock size={26} className="text-blue-600" />
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-1">{t("rap_locked_title")}</h1>
          <p className="text-sm text-gray-400 mb-6">{t("rap_locked_sub")}</p>
          <button
            onClick={() => setShowPinModal(true)}
            disabled={unlockLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] text-white rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 shadow-md"
          >
            {unlockLoading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
            {unlockLoading ? t("loading_ellipsis") : t("rap_unlock_btn")}
          </button>
          <div className="mt-4">
            <ForgotPinFlow t={t} />
          </div>
        </div>
        {showPinModal && (
          <FinancialPinModal onSuccess={handlePinSuccess} onClose={() => setShowPinModal(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 print:hidden gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">{t("rap_title")}</h1>
          <p className="text-gray-500 font-medium">{t("rap_subtitle")}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={lockPage} className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all">
            <Lock size={16} /> {t("fin_widget_lock_btn")}
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all">
            <Printer size={18} /> {t("rap_print_btn")}
          </button>
        </div>
      </div>

      {/* Chiffre d'affaires */}
      <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-blue-200 via-transparent to-blue-100 shadow-md mb-8 print:hidden">
        <div className="bg-white rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          {revenueData && (
            <div className="relative z-10">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-6">
                <TrendingUp size={20} className="text-emerald-600" /> {t("fin_widget_title")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">{t("fin_total_revenue")}</p>
                  <p className="text-2xl font-black text-emerald-900">{revenueData.totalRevenue.toLocaleString()} <span className="text-xs font-bold">FCFA</span></p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1 flex items-center gap-1"><Banknote size={11} /> {t("fin_cash_revenue")}</p>
                  <p className="text-2xl font-black text-amber-900">{revenueData.cashTicketRevenue.toLocaleString()} <span className="text-xs font-bold">FCFA</span></p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1 flex items-center gap-1"><Package size={11} /> {t("fin_parcel_earnings")}</p>
                  <p className="text-2xl font-black text-blue-900">{revenueData.parcelEarnings.toLocaleString()} <span className="text-xs font-bold">FCFA</span></p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Retraits */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 mb-8 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Wallet size={20} className="text-blue-600" /> {t("wallet_title")}
          </h2>
          <button
            onClick={() => setIsWithdrawModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs transition-all active:scale-95"
          >
            <ArrowDownLeft size={16} /> {t("wallet_withdraw_btn")}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-700 to-indigo-900 rounded-2xl p-6 text-white">
            <p className="text-blue-100 font-bold mb-1 uppercase tracking-widest text-[10px]">{t("wallet_balance_available")}</p>
            <p className="text-3xl font-black">{balance.amount.toLocaleString()} <span className="text-sm font-light opacity-80">FCFA</span></p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
            <p className="text-orange-700 font-black mb-1 uppercase tracking-widest text-[10px] flex items-center gap-1"><History size={11} /> {t("wallet_withdrawals_made")}</p>
            <p className="text-3xl font-black text-orange-900">{totalWithdrawn.toLocaleString()} <span className="text-sm font-bold">FCFA</span></p>
          </div>
        </div>

        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Banknote size={14} /> {t("wallet_history_title")}
        </h3>
        {withdrawals.length === 0 ? (
          <p className="text-center text-gray-400 text-xs font-medium py-6 border-2 border-dashed border-gray-100 rounded-3xl">
            {t("wallet_no_withdrawals")}
          </p>
        ) : (
          <div className="space-y-3">
            {withdrawals.map(w => (
              <div key={w._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
                    w.status === "COMPLETED" ? "bg-emerald-100 text-emerald-600" :
                    w.status === "FAILED"    ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                  }`}>
                    {w.status === "COMPLETED" ? <CheckCircle2 size={18} /> : w.status === "FAILED" ? <AlertCircle size={18} /> : <Clock size={18} />}
                  </div>
                  <div>
                    <p className="font-black text-gray-900 text-sm">{w.network} · {w.phone}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{new Date(w.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR")} · {WITHDRAWAL_STATUS_LABEL[w.status]}</p>
                  </div>
                </div>
                <p className="font-black text-gray-900 text-sm">- {w.amount.toLocaleString()} <span className="text-[10px] text-gray-400">FCFA</span></p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Résumé trajets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: t("rap_total_trips"),  val: filtered.length },
          { label: t("rap_tickets_sold"), val: filtered.reduce((a, v) => a + (v.placesTotal - v.placesRestantes), 0) },
          { label: t("rap_en_route"),       val: filtered.filter(v => v.status === "en_route").length },
          { label: t("rap_revenue"),        val: `${totalRevenus.toLocaleString()} F` },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{c.label}</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{c.val}</p>
          </div>
        ))}
      </div>

      {/* Barre d'outils */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-3 items-center print:hidden">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder={t("rap_search_ph")}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTER.map(s => (
            <button
              key={s}
              onClick={() => { setStatut(s); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${statut === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {s === "Tous" ? t("rap_all_filter") : t(s === "scheduled" ? "status_scheduled" : s === "en_route" ? "status_en_route" : "status_arrived")}
            </button>
          ))}
        </div>
        <button
          onClick={() => exportCSV(filtered, t, lang)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all"
        >
          <Download size={14} /> {t("rap_export_csv")}
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("th_date_time")}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("th_route")}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("th_category")}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("th_fill")}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("th_revenue")}</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("th_status")}</th>
                <th className="px-6 py-4 print:hidden"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400">{t("rap_no_result")}</td></tr>
              ) : paginated.map((v, i) => {
                const vendus = v.placesTotal - v.placesRestantes;
                const revenu = vendus * v.prix;
                const pct    = v.placesTotal > 0 ? Math.round((vendus / v.placesTotal) * 100) : 0;
                const st     = v.status ?? "scheduled";
                return (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 text-sm">{new Date(v.date).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR")}</p>
                      <p className="text-xs text-gray-400">{v.heure}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800 text-sm">
                      {v.depart ? <span className="text-gray-500">{v.depart} → </span> : null}{v.destination}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${v.typeBus === "Super VIP" ? "bg-purple-100 text-purple-700" : v.typeBus === "VIP" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                        {v.typeBus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 80 ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-500">{vendus}/{v.placesTotal}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-gray-900 text-sm">
                      {revenu.toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">FCFA</span>
                    </td>
                    <td className="px-6 py-4">
                      {st === "en_route"  && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold"><Navigation size={12} /> {t("status_en_route")}</span>}
                      {st === "arrived"   && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold"><CheckCircle2 size={12} /> {t("status_arrived")}</span>}
                      {st === "scheduled" && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 text-slate-500 text-xs font-bold"><Clock size={12} /> {t("status_scheduled")}</span>}
                    </td>
                    <td className="px-6 py-4 print:hidden">
                      <button onClick={() => exportCSV([v], t, lang)} title={t("rap_export_this_trip")} className="min-w-11 min-h-11 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition">
                        <FileText size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex flex-wrap justify-between items-center gap-3 print:hidden">
          <p className="text-sm text-gray-500">{filtered.length} {filtered.length > 1 ? t("rap_trip_word_plural") : t("rap_trip_word")} · {t("rap_revenue")} : <strong>{totalRevenus.toLocaleString()} FCFA</strong></p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold disabled:opacity-40">{t("rap_prev")}</button>
            <span className="px-4 py-2 text-xs font-black text-gray-600">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold disabled:opacity-40">{t("rap_next")}</button>
          </div>
        </div>
      </div>

      {/* Modal de retrait */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl relative">
            <button
              onClick={() => setIsWithdrawModalOpen(false)}
              className="absolute top-8 right-8 min-w-11 min-h-11 flex items-center justify-center bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>

            <h2 className="text-3xl font-black mb-2 text-gray-900 tracking-tight">{t("wallet_modal_title")}</h2>
            <p className="text-gray-400 text-sm mb-8 font-medium">{t("wallet_modal_sub")}</p>

            <form onSubmit={handleWithdrawRequest} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-2">{t("wallet_amount_label")}</label>
                <input
                  type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder={t("wallet_amount_placeholder")} required
                  className="w-full bg-gray-50 border-2 border-transparent rounded-[1.2rem] p-4 focus:bg-white focus:border-blue-600 outline-none font-black text-xl transition-all"
                />
              </div>

              <div className="relative">
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-2">{t("wallet_phone_label")}</label>
                <input
                  type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="6xx xxx xxx" required
                  className={`w-full bg-gray-50 border-2 rounded-[1.2rem] p-4 pr-20 focus:outline-none font-black text-xl transition-all ${network ? `${network.border} border-2 bg-white` : "border-transparent focus:bg-white focus:border-blue-600"}`}
                />
                {network && (
                  <div className={`absolute right-3 top-[38px] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm ${network.bg} ${network.color} border ${network.border}`}>
                    {network.name === "Orange Money" ? "ORANGE" : "MTN"}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-2">{t("wallet_account_name_label")}</label>
                <div className="relative">
                  <input
                    type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)}
                    placeholder={t("wallet_account_name_ph")} required
                    className="w-full bg-gray-50 border-2 border-transparent rounded-[1.2rem] p-4 pl-12 focus:bg-white focus:border-blue-600 outline-none font-bold"
                  />
                  <User size={18} className="absolute left-4 top-[18px] text-gray-300" />
                </div>
              </div>

              {network && amount && (
                <div className={`p-4 rounded-[1.5rem] border-2 border-dashed ${network.border} ${network.bg}`}>
                  <p className={`text-[10px] font-black uppercase ${network.color} mb-1`}>{t("wallet_summary_title")}</p>
                  <p className="text-sm font-black text-gray-800 leading-tight">
                    {t("wallet_send_to")} {Number(amount).toLocaleString()} FCFA {t("wallet_towards")} <br/>
                    <span className="text-blue-600 uppercase text-xs">{accountName || "..."}</span>
                  </p>
                </div>
              )}

              {withdrawError && (
                <p className="text-xs text-red-500 font-bold flex items-center gap-1"><AlertCircle size={12} /> {withdrawError}</p>
              )}

              <button
                type="submit" disabled={withdrawLoading}
                className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              >
                {withdrawLoading ? <Loader2 className="animate-spin" size={24} /> : t("wallet_confirm_btn")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
