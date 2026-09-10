"use client";

import { useState } from "react";
import api from "@/lib/api";
import { KeyRound, X, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

type Props = {
  onSuccess: (token: string) => void;
  onClose: () => void;
};

export default function FinancialPinModal({ onSuccess, onClose }: Props) {
  const { t } = useLang();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/agences/verify-financial-pin", { pin });
      onSuccess(res.data.financialToken);
    } catch (err: any) {
      setError(err?.response?.data?.error || t("fin_pin_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 min-w-11 min-h-11 flex items-center justify-center bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
          <X size={18} className="text-gray-400" />
        </button>

        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-5">
          <ShieldCheck size={28} />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-1">{t("fin_pin_title")}</h2>
        <p className="text-sm text-gray-400 mb-6">{t("fin_pin_sub")}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            className="w-full text-center text-2xl tracking-[0.5em] bg-gray-50 border-2 border-transparent rounded-2xl py-4 focus:bg-white focus:border-blue-500 outline-none transition-all"
          />

          {error && (
            <p className="text-xs text-red-500 font-bold flex items-center justify-center gap-1"><AlertCircle size={12} /> {error}</p>
          )}

          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            {loading ? t("fin_pin_verifying") : t("fin_pin_submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
