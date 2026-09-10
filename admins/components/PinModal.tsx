"use client";

import { useState } from "react";
import { X, KeyRound, AlertCircle, Loader2 } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

type Props = {
  title: string;
  onConfirm: (pin: string) => Promise<void> | void;
  onClose: () => void;
};

export default function PinModal({ title, onConfirm, onClose }: Props) {
  const { t } = useLang();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setError("");
    if (!/^\d{4,6}$/.test(pin)) {
      setError(t("pin_format_error"));
      return;
    }
    setLoading(true);
    try {
      await onConfirm(pin);
    } catch (err: any) {
      setError(err?.response?.data?.error || t("pin_set_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[1.5rem] w-full max-w-md shadow-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
            <KeyRound className="text-blue-600" size={20} /> {title}
          </h3>
          <button onClick={onClose} className="p-2 min-w-11 min-h-11 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">{t("pin_modal_label")}</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
          className="w-full p-3 border border-gray-200 rounded-xl text-center text-xl font-black tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
          placeholder="••••"
        />
        {error && (
          <p className="text-xs text-red-500 font-bold flex items-center gap-1 mb-4"><AlertCircle size={12} /> {error}</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {t("pin_modal_confirm")}
          </button>
          <button
            onClick={onClose}
            className="px-6 bg-gray-50 text-gray-500 py-3 rounded-xl font-black text-xs uppercase hover:bg-gray-100 transition-all"
          >
            {t("ban_modal_cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
