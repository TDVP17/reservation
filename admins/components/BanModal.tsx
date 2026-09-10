"use client";

import { useState } from "react";
import { X, Ban } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

type Props = {
  title: string;
  defaultReason?: string;
  confirmLabel: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
};

export default function BanModal({ title, defaultReason = "", confirmLabel, onConfirm, onClose }: Props) {
  const { t } = useLang();
  const [reason, setReason] = useState(defaultReason);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[1.5rem] w-full max-w-md shadow-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
            <Ban className="text-red-600" size={20} /> {title}
          </h3>
          <button onClick={onClose} className="p-2 min-w-11 min-h-11 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">{t("ban_modal_reason_label")}</label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-6"
          placeholder={t("ban_modal_reason_placeholder")}
        />
        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all"
          >
            {confirmLabel}
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
