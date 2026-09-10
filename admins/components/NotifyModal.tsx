"use client";

import { useState } from "react";
import { X, Bell, Send, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { useLang } from "@/context/LanguageContext";

type Props = {
  title: string;
  endpoint: string;
  onClose: () => void;
};

export default function NotifyModal({ title, endpoint, onClose }: Props) {
  const { t } = useLang();
  const [notifTitle, setNotifTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!notifTitle.trim() || !body.trim()) return;
    setLoading(true); setError("");
    try {
      await api.post(endpoint, { title: notifTitle, body });
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || t("notif_send_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[1.5rem] w-full max-w-md shadow-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
            <Bell className="text-blue-600" size={20} /> {title}
          </h3>
          <button onClick={onClose} className="p-2 min-w-11 min-h-11 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-4 space-y-2">
            <CheckCircle2 className="text-emerald-500 mx-auto" size={36} />
            <p className="font-bold text-gray-800">{t("notif_send_success")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">{t("notif_title_label")}</label>
              <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">{t("notif_body_label")}</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-xs text-red-500 font-bold flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
            <button
              onClick={send} disabled={loading || !notifTitle.trim() || !body.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {loading ? t("notif_sending") : t("notif_send_btn")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
