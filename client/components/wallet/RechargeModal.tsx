"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, AlertCircle, Loader2, Phone, Copy, Send } from "lucide-react";
import api from "@/lib/api";
import { getMonProfil } from "@/lib/client.service";

type Props = { open: boolean; onClose: () => void; onSuccess: () => void; };
type Step = "form" | "ussd" | "waiting" | "success";

const SHORTCUTS = [1000, 2000, 5000, 10000];

export default function RechargeModal({ open, onClose, onSuccess }: Props) {
  const [step, setStep]         = useState<Step>("form");
  const [method, setMethod]     = useState<"ORANGE" | "MTN">("ORANGE");
  const [amount, setAmount]     = useState("");
  const [phone, setPhone]       = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  // données après initiation
  const [ussdCode, setUssdCode]     = useState("");
  const [paymentId, setPaymentId]   = useState("");
  const [txId, setTxId]             = useState("");
  const [copied, setCopied]         = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      getMonProfil().then(({ client }) => {
        if (client.phone) setPhone(client.phone);
      }).catch(() => {});
    } else {
      reset();
    }
  }, [open]);

  const reset = () => {
    setStep("form"); setAmount(""); setError(""); setTxId("");
    setUssdCode(""); setPaymentId(""); setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^6[0-9]{8}$/.test(phone)) { setError("Le numéro doit commencer par 6 et contenir exactement 9 chiffres."); return; }
    if (!amount || Number(amount) < 500) { setError("Montant minimum : 500 FCFA"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/payments/initiate", { amount: Number(amount), method, phone: `+237${phone}` });
      setUssdCode(data.ussdCode);
      setPaymentId(data.paymentId);
      setStep("ussd");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Erreur lors de l'envoi.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(ussdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitTx = async () => {
    if (!txId.trim()) { setError("Entrez l'ID de transaction reçu."); return; }
    setSubmitting(true); setError("");
    try {
      await api.post(`/payments/submit/${paymentId}`, { transactionId: txId });
      setStep("waiting");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Erreur.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative">

        {step !== "waiting" && (
          <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-slate-100 rounded-full hover:bg-slate-200 z-10">
            <X size={18} className="text-slate-500" />
          </button>
        )}

        {/* ── ÉTAPE 1 : Formulaire ── */}
        {step === "form" && (
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div>
              <h2 className="text-2xl font-black text-slate-800">Recharger</h2>
              <p className="text-sm text-slate-400 mt-1">Choisissez la méthode et entrez le montant.</p>
            </div>

            {/* Méthode */}
            <div className="grid grid-cols-2 gap-3">
              {(["ORANGE", "MTN"] as const).map(m => (
                <button key={m} type="button" onClick={() => setMethod(m)}
                  className={`p-4 rounded-2xl border-2 font-black text-sm flex flex-col items-center gap-2 transition-all
                    ${method === m
                      ? m === "ORANGE" ? "border-orange-400 bg-orange-50 text-orange-600" : "border-yellow-400 bg-yellow-50 text-yellow-600"
                      : "border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-black ${m === "ORANGE" ? "bg-orange-500" : "bg-yellow-500"}`}>
                    {m === "ORANGE" ? "OM" : "MTN"}
                  </span>
                  {m === "ORANGE" ? "Orange Money" : "MTN MoMo"}
                </button>
              ))}
            </div>

            {/* Numéro */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                <Phone size={13} /> Numéro Mobile Money
              </label>
              <div className="flex items-center border-2 border-blue-200 focus-within:border-blue-500 rounded-xl overflow-hidden transition-all">
                <span className="px-3 py-4 bg-blue-50 text-blue-700 font-black text-sm select-none border-r border-blue-200">+237</span>
                <input
                  type="tel"
                  className="flex-1 px-3 py-4 outline-none font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-300 bg-transparent"
                  placeholder="6XXXXXXXX"
                  maxLength={9}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                />
              </div>
              <p className="text-xs text-slate-400 ml-1">Commence par 6 — 9 chiffres</p>
            </div>

            {/* Montant */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase">Montant (FCFA)</label>
              <input type="number" min={500}
                className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-xl text-slate-800 placeholder:font-normal placeholder:text-slate-300 transition-all"
                placeholder="Ex : 5 000"
                value={amount} onChange={e => setAmount(e.target.value)} />
              <div className="flex gap-2">
                {SHORTCUTS.map(v => (
                  <button key={v} type="button" onClick={() => setAmount(String(v))}
                    className="flex-1 py-2 text-xs font-black bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl border border-slate-200 transition-all">
                    {v.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-xl flex items-center gap-2"><AlertCircle size={15} />{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Suivant →"}
            </button>
          </form>
        )}

        {/* ── ÉTAPE 2 : Code USSD à composer ── */}
        {step === "ussd" && (
          <div className="p-8 space-y-5">
            <div>
              <h2 className="text-2xl font-black text-slate-800">Composez ce code</h2>
              <p className="text-sm text-slate-400 mt-1">
                Sur le téléphone <span className="font-black text-blue-600">{phone}</span>, composez :
              </p>
            </div>

            {/* Code USSD */}
            <div className={`p-5 rounded-2xl border-2 text-center space-y-3 ${method === "ORANGE" ? "border-orange-300 bg-orange-50" : "border-yellow-300 bg-yellow-50"}`}>
              <p className="text-xs font-black text-slate-500 uppercase">Code à composer</p>
              <p className="font-mono text-2xl font-black text-slate-800 break-all">{ussdCode}</p>
              <button onClick={handleCopy}
                className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline">
                <Copy size={15} /> {copied ? "✓ Copié !" : "Copier le code"}
              </button>
            </div>

            {/* Étapes */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-black text-slate-600 uppercase mb-2">Comment faire :</p>
              {["Ouvrez le composeur téléphonique", `Composez le code ${ussdCode}`, "Appuyez sur Appel / Envoi", "Entrez votre code PIN Mobile Money", "Notez l'ID de transaction reçu par SMS"].map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm text-slate-600">{s}</p>
                </div>
              ))}
            </div>

            {/* ID de transaction */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase">ID de transaction (reçu par SMS)</label>
              <input type="text"
                className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-green-500 outline-none font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-300 transition-all"
                placeholder="Ex : CI24051234567"
                value={txId} onChange={e => setTxId(e.target.value)} />
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-xl flex items-center gap-2"><AlertCircle size={15} />{error}</div>}

            <button onClick={handleSubmitTx} disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="animate-spin" size={20} /> : <><Send size={16} /> Soumettre pour validation</>}
            </button>
          </div>
        )}

        {/* ── ÉTAPE 3 : En attente validation admin ── */}
        {step === "waiting" && (
          <div className="p-10 flex flex-col items-center text-center space-y-5">
            <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
              <Loader2 size={36} className="text-yellow-500 animate-spin" />
            </div>
            <h2 className="text-xl font-black text-slate-800">En attente de validation</h2>
            <p className="text-slate-500 text-sm">
              Votre recharge de <span className="font-black text-blue-600">{Number(amount).toLocaleString()} FCFA</span> est en cours de vérification par l'admin.
            </p>
            <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl">Votre solde sera crédité dès validation. Vous recevrez une confirmation.</p>
            <button onClick={onClose}
              className="w-full bg-slate-800 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all">
              Fermer
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
