"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import api from "@/lib/api";
import { useLang } from "@/context/LanguageContext";

type Notif = { _id: string; title: string; body: string; createdAt: string };

export default function NotificationBell() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await api.get("/admin/notifications");
      setNotifications(res.data.notifications);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  // Rafraîchit périodiquement l'historique (ex: autre session admin active).
  useEffect(() => {
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 min-w-11 min-h-11 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-black transition-colors"
      >
        <Bell size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-[110%] w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100]">
          <div className="p-4 border-b border-gray-100">
            <p className="font-black text-gray-800 text-sm">{t("notif_title")}</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-10">{t("notif_empty")}</p>
            ) : notifications.map(n => (
              <div key={n._id} className="p-4 border-b border-gray-50 last:border-0">
                <p className="font-bold text-sm text-gray-800">{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                <p className="text-[10px] text-gray-300 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
