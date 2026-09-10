"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io as socketIO } from "socket.io-client";
import api from "@/lib/api";
import { createReservation } from "@/lib/reservation.service";
import { getMonProfil } from "@/lib/client.service";
import { showPaymentError } from "@/lib/paymentError";
import {
  Loader2, ArrowLeft, Ticket, Info, Smartphone, CreditCard,
  CheckCircle2, ChevronLeft, AlertCircle, Wallet, Clock, Users,
} from "lucide-react";
import { useLang } from "@/context/LanguageContext";

type Step    = "form" | "wallet_confirm" | "payment" | "waiting" | "confirmed";
type PayStep = "choose" | "mobile_input" | "card_form";

function fmtCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function WalletIncentiveBanner() {
  const { t } = useLang();
  return (
    <div className="flex items-start gap-2.5 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl">
      <span className="text-base flex-shrink-0 leading-none">💡</span>
      <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
        <p className="font-black mb-0.5">{t("wallet_incentive_title")}</p>
        <p>{t("wallet_incentive_body")}</p>
      </div>
    </div>
  );
}

export default function ReservationPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const { t, lang } = useLang();

  // ── Données ──────────────────────────────────────────────────────────────
  const [voyage, setVoyage]       = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [isAuth, setIsAuth]       = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // ── Machine d'états ───────────────────────────────────────────────────────
  const [step, setStep]       = useState<Step>("form");
  const [payStep, setPayStep] = useState<PayStep>("choose");
  const [submitting, setSubmitting] = useState(false);

  // ── Réservation créée ─────────────────────────────────────────────────────
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<{
    montantBillets: number; fraisSite: number; montantTotal: number;
    // Paiement par portefeuille : 50% de réduction sur les frais de service.
    walletFraisSite: number; walletTotal: number;
  } | null>(null);
  // Montant réellement débité (diffère de amounts.montantTotal pour un
  // paiement par portefeuille, grâce à la réduction) — utilisé sur l'écran
  // de confirmation.
  const [paidAmount, setPaidAmount] = useState<number | null>(null);

  // ── Paiement mobile money (polling) ───────────────────────────────────────
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [pollMsg, setPollMsg]       = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Formulaire ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({ fullName: "", phoneNumber: "", places: 1 });

  // ── Paiement mobile ───────────────────────────────────────────────────────
  const [phonePayment, setPhonePayment] = useState("");

  // ── Paiement carte ────────────────────────────────────────────────────────
  const [card, setCard]       = useState({ nom: "", numero: "", mm: "", yy: "", cvv: "" });
  const [cardError, setCardError] = useState("");

  // ── Confirmation ──────────────────────────────────────────────────────────
  const [confirmedMethod, setConfirmedMethod] = useState<"WALLET"|"MOBILE_MONEY"|"CARD"|"">("");

  // ── Calculs temps réel ────────────────────────────────────────────────────
  const montantBillets = voyage ? voyage.prix * form.places : 0;
  const fraisSite      = Math.ceil(montantBillets * 0.05);
  const montantTotal   = montantBillets + fraisSite;
  // Aperçu du montant réduit si le paiement se fait par portefeuille (-50% de frais).
  const walletTotalPreview = montantBillets + Math.ceil(fraisSite * 0.5);

  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const voyageRes = await api.get(`/voyages/${id}`);
        setVoyage(voyageRes.data);
        // Tenter récupération du profil → client connecté
        try {
          const [{ client }, walletRes] = await Promise.all([
            getMonProfil(),
            api.get("/balance/me"),
          ]);
          setIsAuth(true);
          setWalletBalance(walletRes.data?.amount ?? 0);
          setForm(prev => ({
            ...prev,
            fullName:    client.name  || "",
            phoneNumber: client.phone || "",
          }));
        } catch {
          setIsAuth(false); // invité
        }
      } catch {
        // voyage non trouvé
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const socket = socketIO(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4004", {
      transports: ["websocket"],
    });
    socket.emit("join-voyage", id);
    socket.on("seats-updated", ({ voyageId, placesRestantes }: { voyageId: string; placesRestantes: number }) => {
      if (voyageId !== id) return;
      setVoyage((v: any) => v ? { ...v, placesRestantes } : v);
      setForm(f => ({ ...f, places: Math.min(Math.max(placesRestantes, 1), f.places) }));
    });
    return () => { socket.disconnect(); };
  }, [id]);

  // ─── Étape 1 : soumettre le formulaire ────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.fullName || !form.phoneNumber) {
      alert(t("fill_all_fields")); return;
    }
    setSubmitting(true);
    try {
      const data = await createReservation({
        fullName:    form.fullName,
        phoneNumber: form.phoneNumber,
        voyageId:    id as string,
        nbPlaces:    form.places,
      });
      const r = data.reservation;
      setReservationId(r._id);
      const walletFraisSite = Math.ceil(r.fraisSite * 0.5);
      const walletTotal = r.montantBillets + walletFraisSite;
      setAmounts({
        montantBillets: r.montantBillets, fraisSite: r.fraisSite, montantTotal: r.montantTotal,
        walletFraisSite, walletTotal,
      });

      // Routage selon auth + solde wallet (le solde nécessaire est celui du
      // montant réduit, puisque payer par portefeuille coûte moins cher).
      if (isAuth && walletBalance >= walletTotal) {
        setStep("wallet_confirm");
      } else {
        setStep("payment");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || t("reservation_error"));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Paiement wallet ──────────────────────────────────────────────────────
  const payWithWallet = async () => {
    if (!reservationId) return;
    setSubmitting(true);
    try {
      const res = await api.post("/payments/pay-wallet", { reservationId });
      setPaidAmount(res.data.montantPaye);
      setConfirmedMethod("WALLET");
      setStep("confirmed");
    } catch (err: any) {
      alert(err.response?.data?.error || t("wallet_payment_error"));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Polling statut Fapshi ────────────────────────────────────────────────
  const startPolling = (pid: string) => {
    setPollMsg(t("payment_awaiting_confirmation"));
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/payments/status/${pid}`);
        if (res.data.status === "SUCCESS") {
          clearInterval(pollRef.current!);
          setConfirmedMethod("MOBILE_MONEY");
          setStep("confirmed");
        } else if (res.data.status === "FAILED") {
          clearInterval(pollRef.current!);
          setPollMsg(t("payment_failed_retry"));
        }
      } catch { /* ignore */ }
    }, 3000);

    // Timeout 10 min
    setTimeout(() => {
      clearInterval(pollRef.current!);
      setPollMsg(t("payment_timeout_check"));
    }, 600_000);
  };

  // ─── Paiement Mobile Money ────────────────────────────────────────────────
  const payWithFapshi = async () => {
    if (!reservationId || !amounts) return;
    if (!/^6[0-9]{8}$/.test(phonePayment)) {
      alert(t("phone_format_error")); return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/payments/initiate", {
        reservationId,
        amount: amounts.montantTotal,
        phone:  `+237${phonePayment}`,
      });
      setPaymentUrl(res.data.paymentUrl);
      setStep("waiting");
      startPolling(res.data.paymentId);
    } catch (err: any) {
      const wasUnavailable = showPaymentError(err, t);
      if (wasUnavailable) setPayStep("choose");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Paiement carte ───────────────────────────────────────────────────────
  const payWithKora = async () => {
    if (!reservationId || !amounts) return;
    if (!card.nom || !card.numero || !card.mm || !card.yy || !card.cvv) {
      setCardError(t("fill_all_fields")); return;
    }
    const now = new Date();
    const cy = now.getFullYear() % 100, cm = now.getMonth() + 1;
    const ky = parseInt(card.yy, 10),  km = parseInt(card.mm, 10);
    if (ky < cy || (ky === cy && km < cm)) {
      setCardError(t("card_expired_error")); return;
    }
    setCardError("");
    setSubmitting(true);
    try {
      const res = await api.post("/payments/initiate-card", {
        reservationId,
        amount: amounts.montantTotal,
      });
      window.location.href = res.data.checkoutUrl;
    } catch (err: any) {
      const wasUnavailable = showPaymentError(err, t);
      if (wasUnavailable) setPayStep("choose");
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col justify-center items-center h-screen bg-white dark:bg-slate-900">
      <Loader2 className="animate-spin text-[#245bcf]" size={40} />
      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("loading")}</p>
    </div>
  );

  if (!voyage) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <p className="font-bold text-slate-400 uppercase">{t("trip_not_found")}</p>
      <button onClick={() => router.back()} className="text-blue-600 underline text-sm">{t("go_back")}</button>
    </div>
  );

  // ══ ÉCRAN CONFIRMATION ═══════════════════════════════════════════════════
  if (step === "confirmed") return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl overflow-hidden">
        {/* Header vert */}
        <div className="bg-green-500 p-6 flex flex-col items-center gap-2 text-white text-center">
          <CheckCircle2 size={48} className="opacity-90" />
          <h1 className="text-xl font-black">{t("reservation_confirmed_title")}</h1>
          <p className="text-sm opacity-80">{t("payment_received_sub")}</p>
        </div>

        {/* Ticket */}
        <div className="p-6 space-y-4">
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase">{t("reservation_number_label")}</span>
              <span className="font-mono font-black text-slate-800 dark:text-slate-100 text-sm">
                #{reservationId?.slice(-8).toUpperCase()}
              </span>
            </div>
            <div className="h-px bg-slate-100 dark:bg-slate-700" />
            {[
              { icon: <Ticket size={14} />,  label: t("destination"), val: voyage.destination },
              { icon: <Clock  size={14} />,  label: t("region_depart"),      val: `${new Date(voyage.date).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR")} à ${voyage.heure}` },
              { icon: <Users  size={14} />,  label: t("passenger"),    val: form.fullName },
              { icon: <Users  size={14} />,  label: t("places_label"),      val: `${form.places} ${t("place_label")}` },
              {
                icon: <CreditCard size={14} />,
                label: t("amount_paid_label"),
                val: `${(confirmedMethod === "WALLET" ? paidAmount ?? amounts?.montantTotal : amounts?.montantTotal)?.toLocaleString()} FCFA`,
              },
              {
                icon: <Smartphone size={14} />,
                label: t("payment_method_label"),
                val: confirmedMethod === "WALLET" ? t("pay_wallet") : confirmedMethod === "MOBILE_MONEY" ? t("pay_mobile") : t("pay_card"),
              },
            ].map(({ icon, label, val }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-slate-400">{icon} {label}</span>
                <span className="font-black text-slate-800 dark:text-slate-100 text-right max-w-[55%] truncate">{val}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/reservations")}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black text-sm transition"
            >
              {t("my_reservations")}
            </button>
            <button
              onClick={() => router.push("/")}
              className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-black text-sm transition"
            >
              {t("home")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ══ ÉCRAN ATTENTE PAIEMENT MOBILE ═══════════════════════════════════════
  if (step === "waiting") return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl p-6 space-y-5 text-center">
        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto">
          <Loader2 size={32} className="text-orange-500 animate-spin" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">{t("payment_in_progress_title")}</h2>
          <p className="text-sm text-slate-500 mt-1">{pollMsg}</p>
        </div>
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-700 text-left">
          <p className="text-xs font-black text-orange-700 dark:text-orange-300 uppercase mb-2">{t("how_to_proceed_title")}</p>
          {[
            t("mobile_money_step_1"),
            t("mobile_money_step_2"),
            t("mobile_money_step_3"),
            t("mobile_money_step_4"),
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-2 mb-1.5">
              <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
              <p className="text-xs text-orange-700 dark:text-orange-300">{s}</p>
            </div>
          ))}
        </div>
        {paymentUrl && (
          <a href={paymentUrl} target="_blank" rel="noopener noreferrer"
            className="block w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-black text-sm transition">
            {t("open_payment_page_btn")}
          </a>
        )}
        <p className="text-xs text-slate-400">
          {t("amount_label_colon")} <strong>{amounts?.montantTotal.toLocaleString()} FCFA</strong>
        </p>
      </div>
    </div>
  );

  // ══ ÉTAPE WALLET CONFIRM ═════════════════════════════════════════════════
  if (step === "wallet_confirm") return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-slate-900 px-4 py-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={18} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-800 dark:text-slate-100">{t("reservation_ready_title")}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase">{t("choose_payment_method_sub")}</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* Récap */}
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase">{voyage.destination}</p>
              <p className="text-[11px] text-blue-500">{form.places} {t("place_label")} · {t("five_percent_included_label")}</p>
            </div>
            <p className="text-xl font-black text-blue-800 dark:text-blue-200">
              {amounts?.montantTotal.toLocaleString()} <span className="text-[10px] opacity-50">FCFA</span>
            </p>
          </div>

          {/* Option wallet */}
          <button
            onClick={payWithWallet}
            disabled={submitting}
            className="w-full flex items-center gap-4 p-5 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-2xl transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
              {submitting ? <Loader2 size={22} className="text-white animate-spin" /> : <Wallet size={22} className="text-white" />}
            </div>
            <div className="text-left">
              <p className="font-black text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                {t("pay_with_wallet_btn")}
                <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">-50% {t("service_fee_label")}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("balance_label_colon")} <span className="font-black text-emerald-600">{walletBalance.toLocaleString()} FCFA</span>
              </p>
              {amounts && (
                <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 mt-1">
                  {amounts.walletTotal.toLocaleString()} FCFA <span className="font-bold text-slate-400 line-through ml-1">{amounts.montantTotal.toLocaleString()} FCFA</span>
                </p>
              )}
            </div>
            <div className="ml-auto text-emerald-400 group-hover:translate-x-1 transition-transform">→</div>
          </button>

          {/* Séparateur */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
            <span className="text-[10px] font-black text-slate-400 uppercase">{t("or_pay_another_way")}</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
          </div>

          <WalletIncentiveBanner />

          {/* Autres méthodes */}
          <div className="space-y-2">
            <button
              onClick={() => { setPhonePayment(form.phoneNumber.replace(/^\+237/, "")); setStep("payment"); setPayStep("mobile_input"); }}
              className="w-full flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 border border-orange-200 dark:border-orange-700 rounded-2xl transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
                <Smartphone size={18} className="text-white" />
              </div>
              <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{t("pay_mobile")}</p>
              <div className="ml-auto text-orange-400 group-hover:translate-x-1 transition-transform">→</div>
            </button>
            <button
              onClick={() => { setCardError(""); setStep("payment"); setPayStep("card_form"); }}
              className="w-full flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 border border-blue-200 dark:border-blue-700 rounded-2xl transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                <CreditCard size={18} className="text-white" />
              </div>
              <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{t("pay_card")}</p>
              <div className="ml-auto text-blue-400 group-hover:translate-x-1 transition-transform">→</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ══ ÉTAPE PAIEMENT (mobile/carte) ════════════════════════════════════════
  if (step === "payment") return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-slate-900 px-4 py-4 md:p-10 flex flex-col items-center justify-center">
      <div className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 max-h-[85vh] overflow-y-auto">
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <button onClick={() => setStep(isAuth && walletBalance >= (amounts?.montantTotal ?? 0) ? "wallet_confirm" : "form")}
            className="min-w-11 min-h-11 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-black text-slate-800 dark:text-slate-100">{t("payment_title")}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase">{voyage.destination} · {amounts?.montantTotal.toLocaleString()} FCFA</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <WalletIncentiveBanner />

          {/* ── Choix méthode ── */}
          {payStep === "choose" && (
            <div className="space-y-3">
              <button onClick={() => { setPhonePayment(form.phoneNumber.replace(/^\+237/, "")); setPayStep("mobile_input"); }}
                className="w-full flex items-center gap-4 p-5 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 border border-orange-200 dark:border-orange-700 rounded-2xl transition group">
                <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0"><Smartphone size={22} className="text-white" /></div>
                <div className="text-left">
                  <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{t("pay_mobile")}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("mobile_pay_fast_secure_sub")}</p>
                </div>
                <div className="ml-auto text-orange-400 group-hover:translate-x-1 transition-transform">→</div>
              </button>
              <button onClick={() => { setCardError(""); setPayStep("card_form"); }}
                className="w-full flex items-center gap-4 p-5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 border border-blue-200 dark:border-blue-700 rounded-2xl transition group">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0"><CreditCard size={22} className="text-white" /></div>
                <div className="text-left">
                  <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{t("pay_card")}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("card_pay_sub_generic")}</p>
                </div>
                <div className="ml-auto text-blue-400 group-hover:translate-x-1 transition-transform">→</div>
              </button>
            </div>
          )}

          {/* ── Mobile Money ── */}
          {payStep === "mobile_input" && (
            <div className="space-y-3">
              <button onClick={() => setPayStep("choose")} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600">
                <ChevronLeft size={14} /> {t("changer_methode")}
              </button>
              <div className="p-5 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-700 space-y-4">
                <p className="text-sm font-black text-orange-700 dark:text-orange-300 flex items-center gap-2">
                  <Smartphone size={16} /> {t("pay_mobile")}
                </p>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("debit_number_label")}</label>
                  <div className="flex items-center border border-orange-200 dark:border-orange-700 rounded-xl overflow-hidden bg-white dark:bg-slate-700">
                    <span className="px-3 py-3.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-black text-sm select-none border-r border-orange-200">+237</span>
                    <input type="tel" autoFocus
                      className="flex-1 px-3 py-3.5 font-bold text-sm outline-none bg-transparent dark:text-slate-100"
                      value={phonePayment}
                      onChange={e => setPhonePayment(e.target.value.replace(/\D/g, "").slice(0, 9))}
                      placeholder="6XXXXXXXX" maxLength={9} />
                  </div>
                  <p className="text-xs text-slate-400 ml-1">{t("phone_format_hint")}</p>
                </div>
                <button onClick={payWithFapshi}
                  disabled={submitting || !/^6[0-9]{8}$/.test(phonePayment)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition disabled:opacity-50">
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : <><Smartphone size={18} /> {t("send_request_btn")}</>}
                </button>
              </div>
            </div>
          )}

          {/* ── Carte bancaire ── */}
          {payStep === "card_form" && (
            <div className="space-y-3">
              <button onClick={() => setPayStep("choose")} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600">
                <ChevronLeft size={14} /> {t("changer_methode")}
              </button>
              <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-700 space-y-4">
                <p className="text-sm font-black text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <CreditCard size={16} /> {t("pay_card")}
                </p>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("wallet_card_name")}</label>
                  <input className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 rounded-xl px-4 py-3 font-bold text-sm outline-none border border-blue-100 dark:border-blue-800"
                    value={card.nom} onChange={e => setCard(c => ({ ...c, nom: e.target.value }))} placeholder={t("card_name_placeholder_example")} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("wallet_card_number")}</label>
                  <input className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 rounded-xl px-4 py-3 font-bold text-sm outline-none border border-blue-100 dark:border-blue-800 tracking-widest"
                    value={card.numero} onChange={e => setCard(c => ({ ...c, numero: fmtCardNumber(e.target.value) }))}
                    placeholder={t("card_number_placeholder_example")} maxLength={19} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { label: "MM",  key: "mm"  as const, ph: "MM",  max: 2, type: "text" },
                    { label: t("card_yy_label"),  key: "yy"  as const, ph: t("card_yy_label"),  max: 2, type: "text" },
                    { label: "CVV", key: "cvv" as const, ph: "•••", max: 4, type: "password" },
                  ]).map(({ label, key, ph, max, type }) => (
                    <div key={key} className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{label}</label>
                      <input type={type} maxLength={max}
                        className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 rounded-xl px-2 py-3 font-bold text-sm outline-none border border-blue-100 dark:border-blue-800 text-center"
                        value={card[key]}
                        onChange={e => setCard(c => ({ ...c, [key]: e.target.value.replace(/\D/g, "").slice(0, max) }))}
                        placeholder={ph} />
                    </div>
                  ))}
                </div>
                {cardError && (
                  <p className="text-red-500 text-xs font-bold flex items-center gap-1">
                    <AlertCircle size={12} /> {cardError}
                  </p>
                )}
                <button onClick={payWithKora} disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition disabled:opacity-50">
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : <><CreditCard size={18} /> {t("pay_dash_btn")} {amounts?.montantTotal.toLocaleString()} FCFA</>}
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-[9px] font-bold text-slate-300 uppercase flex items-center justify-center gap-2">
            <Info size={12} /> {t("payment_secure_note")}
          </p>
        </div>
      </div>
    </div>
  );

  // ══ FORMULAIRE ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-slate-900 p-4 md:p-10 flex flex-col items-center">
      <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
        <ArrowLeft size={14} /> {t("cancel")}
      </button>

      <div className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase italic">{t("book")}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{voyage.destination}</p>
          </div>
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><Ticket size={24} /></div>
        </div>

        <div className="p-6 space-y-5">
          {/* Info trajet */}
          <div className="p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 space-y-1">
            <p className="text-base font-black text-blue-900 dark:text-blue-200 uppercase italic">
              {voyage.depart ? `${voyage.depart} → ` : ""}{voyage.destination}
            </p>
            <div className="flex justify-between text-xs font-bold text-blue-700/70 dark:text-blue-400">
              <span>{new Date(voyage.date).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR")} · {voyage.heure}</span>
              <span>{voyage.placesRestantes} {t("spots_available")}</span>
            </div>
          </div>

          {/* Badge wallet si connecté */}
          {isAuth && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700">
              <Wallet size={14} className="text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {t("wallet_balance_colon_label")} <strong>{walletBalance.toLocaleString()} FCFA</strong>
                {walletBalance >= walletTotalPreview
                  ? ` ${t("wallet_payment_available_suffix")}`
                  : ` ${t("wallet_insufficient_suffix")} ${walletTotalPreview.toLocaleString()} FCFA)`}
              </span>
            </div>
          )}

          {/* Formulaire */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-3">{t("full_name")}</label>
              <input
                className="w-full bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-2xl px-5 py-3.5 font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                placeholder={t("full_name_placeholder")} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-3">{t("phone")}</label>
              <input
                className="w-full bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-2xl px-5 py-3.5 font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                value={form.phoneNumber}
                onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                placeholder={t("phone_placeholder")} />
            </div>
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 rounded-2xl px-5 py-3.5">
              <span className="text-xs font-bold text-slate-400 uppercase">{t("num_seats")}</span>
              <div className="flex items-center gap-3">
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, places: Math.max(1, f.places - 1) }))}
                  className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-600 font-black text-slate-700 dark:text-slate-200 flex items-center justify-center">−</button>
                <span className="font-black text-blue-600 w-5 text-center">{form.places}</span>
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, places: Math.min(voyage.placesRestantes, f.places + 1) }))}
                  className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 font-black text-blue-600 flex items-center justify-center">+</button>
              </div>
            </div>
          </div>

          {/* Total + bouton */}
          <div className="p-5 bg-slate-900 rounded-[1.5rem] text-white shadow-xl space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>{form.places} × {voyage.prix.toLocaleString()} FCFA</span>
              <span>{montantBillets.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{t("service_fee_label")}</span><span>{t("inclus_label")}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-700 pt-3">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">{t("total_price")}</p>
                <h2 className="text-3xl font-black italic">{montantTotal.toLocaleString()} <span className="text-xs opacity-50">FCFA</span></h2>
              </div>
              <button disabled={submitting} onClick={handleSubmit}
                className="bg-blue-600 px-7 py-4 rounded-xl font-black text-[12px] uppercase hover:bg-blue-500 transition disabled:opacity-50">
                {submitting ? <Loader2 className="animate-spin" size={16} /> : t("confirm")}
              </button>
            </div>
          </div>

          <p className="text-center text-[9px] font-bold text-slate-300 uppercase flex items-center justify-center gap-2">
            <Info size={12} /> {t("payment_methods_footer")}
          </p>
        </div>
      </div>
    </div>
  );
}
