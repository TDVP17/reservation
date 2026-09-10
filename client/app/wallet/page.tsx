"use client";

import { useEffect, useState } from "react";
import { getMyBalance } from "@/lib/balance.service";
import BalanceCard from "@/components/wallet/BalanceCard";
import TransactionModal from "@/components/wallet/TransactionList";
import GlobalLoader from "@/components/ui/GlobalLoader";
import { Loader2, X, CreditCard, Smartphone, ChevronLeft, AlertCircle } from "lucide-react";
import { getMyPayments } from "@/lib/payement.service";
import api from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import { showPaymentError } from "@/lib/paymentError";

type WalletTransaction = {
  id: string; method: "MOBILE_MONEY" | "CARD";
  amount: number; status: "pending" | "success" | "canceled"; createdAt: Date;
};
type PayStep = "choose" | "card_form" | "mobile_form" | "processing";

function isExpiryValid(mm: string, yy: string) {
  if (!mm || !yy || mm.length !== 2 || yy.length !== 2) return false;
  const month = parseInt(mm, 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expYear = 2000 + parseInt(yy, 10);
  return expYear > now.getFullYear() || (expYear === now.getFullYear() && month >= now.getMonth() + 1);
}

export default function WalletPage() {
  const { t } = useLang();
  const [balance, setBalance]   = useState(0);
  const [loading, setLoading]   = useState(true);
  const [openTx, setOpenTx]     = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [payStep, setPayStep]   = useState<PayStep>("choose");
  const [amount, setAmount]     = useState("");
  const [phone, setPhone]       = useState("");
  const [card, setCard]         = useState({ nom: "", numero: "", mm: "", yy: "", cvv: "" });
  const [error, setError]       = useState("");
  const [paying, setPaying]     = useState(false);

  const mapStatus = (s: string) => s === "SUCCESS" ? "success" : s === "FAILED" ? "canceled" : "pending" as const;

  useEffect(() => {
    getMyPayments().then(data =>
      setTransactions(data.map((p: any) => ({
        id: p._id, method: p.method, amount: p.amount,
        status: mapStatus(p.status), createdAt: new Date(p.createdAt),
      })))
    ).catch(() => {});
  }, []);

  useEffect(() => {
    getMyBalance().then(d => setBalance(d?.amount ?? 0)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const close = () => { setShowModal(false); setPayStep("choose"); setError(""); setPhone(""); setAmount(""); setCard({ nom: "", numero: "", mm: "", yy: "", cvv: "" }); };

  const fmtCard = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  // ── Mobile Money ─────────────────────────────────────────────────────────
  const payerMobile = async () => {
    setError("");
    if (!phone.trim())                            return setError(t("enter_payment_number_short_error"));
    if (!amount || Number(amount) < 500)          return setError(t("amount_min_500_error"));
    setPaying(true); setPayStep("processing");
    try {
      const res = await api.post("/payments/initiate", { reservationId: "wallet", amount: Number(amount), phone });
      window.location.href = res.data.paymentUrl;
    } catch (e: any) {
      const wasUnavailable = showPaymentError(e, t);
      if (wasUnavailable) { close(); } else { setPayStep("mobile_form"); }
    }
    finally { setPaying(false); }
  };

  // ── Carte bancaire ────────────────────────────────────────────────────────
  const payerCarte = async () => {
    setError("");
    if (!card.nom.trim())                              return setError(t("card_name_required"));
    if (card.numero.replace(/\s/g,"").length < 16)    return setError(t("card_number_incomplete"));
    if (!isExpiryValid(card.mm, card.yy))             return setError(t("card_expiry_invalid"));
    if (card.cvv.length < 3)                          return setError(t("card_cvv_invalid"));
    if (!amount || Number(amount) < 500)              return setError(t("amount_min_500_error"));
    setPaying(true); setPayStep("processing");
    try {
      const res = await api.post("/payments/initiate-card", { reservationId: "wallet", amount: Number(amount) });
      window.location.href = res.data.checkoutUrl;
    } catch (e: any) {
      const wasUnavailable = showPaymentError(e, t);
      if (wasUnavailable) { close(); } else { setPayStep("card_form"); }
    }
    finally { setPaying(false); }
  };

  if (loading) return <GlobalLoader show message={t("loading_balance")} />;

  return (
    <div className="flex flex-col h-[calc(100vh-136px)] sm:h-[calc(100vh-64px)]">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        <div className="h-full p-0">
          <BalanceCard amount={balance} onRecharge={() => setShowModal(true)} onTransactions={() => setOpenTx(true)} />
        </div>
        <div className="relative hidden lg:block h-full">
          <div className="absolute inset-0 bg-[url('/images/solde.webp')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-l from-white/90 via-white/40 to-transparent" />
        </div>
      </div>

      <TransactionModal open={openTx} onClose={() => setOpenTx(false)} transactions={transactions} />

      {/* ── Modal Recharge ── */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto">

            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-black text-slate-800 dark:text-slate-100">{t("wallet_recharge_title")}</h2>
              <button onClick={close} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">

              {/* Montant (toujours visible sauf processing) */}
              {payStep !== "processing" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("wallet_amount_label")}</label>
                  <input type="number" min="500"
                    className="w-full bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-4 py-3.5 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={amount} onChange={e => setAmount(e.target.value)} placeholder={t("wallet_amount_placeholder_example")} />
                </div>
              )}

              {/* Choix méthode */}
              {payStep === "choose" && (
                <div className="space-y-3">
                  <button onClick={() => { setError(""); setPayStep("card_form"); }}
                    className="w-full flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 border border-blue-200 dark:border-blue-700 rounded-2xl transition">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0"><CreditCard size={18} className="text-white" /></div>
                    <div className="text-left">
                      <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{t("pay_card")}</p>
                      <p className="text-xs text-slate-400">{t("card_bank_sub_short")}</p>
                    </div>
                  </button>
                  <button onClick={() => { setError(""); setPayStep("mobile_form"); }}
                    className="w-full flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 border border-orange-200 dark:border-orange-700 rounded-2xl transition">
                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0"><Smartphone size={18} className="text-white" /></div>
                    <div className="text-left">
                      <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{t("pay_mobile")}</p>
                      <p className="text-xs text-slate-400">{t("mobile_money_sub_short")}</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Formulaire carte */}
              {payStep === "card_form" && (
                <div className="space-y-3">
                  <button onClick={() => setPayStep("choose")} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600">
                    <ChevronLeft size={13} /> {t("changer_methode")}
                  </button>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("wallet_card_name")}</label>
                    <input className="w-full bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={card.nom} onChange={e => setCard(c => ({ ...c, nom: e.target.value }))} placeholder={t("card_name_placeholder_example")} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("wallet_card_number")}</label>
                    <input className="w-full bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 tracking-widest"
                      value={card.numero} onChange={e => setCard(c => ({ ...c, numero: fmtCard(e.target.value) }))}
                      placeholder={t("card_number_placeholder_example")} maxLength={19} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "MM", key: "mm", ph: "MM" },
                      { label: t("card_yy_label"), key: "yy", ph: t("card_yy_label") },
                      { label: "CVV", key: "cvv", ph: "•••", type: "password" },
                    ].map(({ label, key, ph, type }) => (
                      <div key={key} className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{label}</label>
                        <input type={type || "text"} maxLength={key === "cvv" ? 4 : 2}
                          className="w-full bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-center"
                          value={(card as any)[key]}
                          onChange={e => setCard(c => ({ ...c, [key]: e.target.value.replace(/\D/g,"").slice(0, key==="cvv"?4:2) }))}
                          placeholder={ph} />
                      </div>
                    ))}
                  </div>
                  {error && <p className="text-red-500 text-xs flex items-center gap-1 font-bold"><AlertCircle size={12} /> {error}</p>}
                  <button onClick={payerCarte} disabled={paying}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition disabled:opacity-50">
                    {paying ? <Loader2 className="animate-spin" size={16} /> : <><CreditCard size={16} /> {t("wallet_card_pay_btn")} {amount ? `${Number(amount).toLocaleString()} FCFA` : ""}</>}
                  </button>
                </div>
              )}

              {/* Formulaire mobile money */}
              {payStep === "mobile_form" && (
                <div className="space-y-3">
                  <button onClick={() => setPayStep("choose")} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600">
                    <ChevronLeft size={13} /> {t("changer_methode")}
                  </button>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t("numero_paiement")}</label>
                    <input type="tel"
                      className="w-full bg-slate-50 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-4 py-3.5 font-bold text-sm outline-none focus:ring-2 focus:ring-orange-400/30 border border-orange-200 dark:border-orange-700"
                      value={phone} onChange={e => setPhone(e.target.value)} placeholder="6XX XXX XXX" autoFocus />
                    <p className="text-xs text-slate-400 ml-1">{t("numero_paiement_sub")}</p>
                  </div>
                  {error && <p className="text-red-500 text-xs flex items-center gap-1 font-bold"><AlertCircle size={12} /> {error}</p>}
                  <button onClick={payerMobile} disabled={paying}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition disabled:opacity-50">
                    {paying ? <Loader2 className="animate-spin" size={16} /> : <><Smartphone size={16} /> {t("wallet_card_pay_btn")} {amount ? `${Number(amount).toLocaleString()} FCFA` : ""}</>}
                  </button>
                </div>
              )}

              {/* Processing */}
              {payStep === "processing" && (
                <div className="flex flex-col items-center py-8 gap-3">
                  <Loader2 className="animate-spin text-blue-600" size={36} />
                  <p className="font-black text-slate-600 dark:text-slate-300 text-sm">{t("redirect_paiement")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
