"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { io as socketIO, Socket } from "socket.io-client";
import api from "@/lib/api";
import { useLang } from "@/context/LanguageContext";

type Notif = { _id: string; title: string; body: string; read: boolean; createdAt: string; voyage?: string | null; type?: string };

export default function NotificationBell() {
  const { t } = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const load = async () => {
    try {
      const res = await api.get("/agences/notifications");
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  // Filet de sécurité : le socket ne survit pas de façon fiable en environnement
  // serverless (Vercel) — un polling régulier garantit l'arrivée des notifications
  // même si la connexion WebSocket ne tient pas.
  useEffect(() => {
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("agence");
    if (!raw) return;
    let agence: any;
    try { agence = JSON.parse(raw); } catch { return; }
    if (!agence?._id) return;

    const socket = socketIO(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4004", {
      transports: ["websocket"],
    });
    socketRef.current = socket;
    socket.emit("join-agence", agence._id);

    socket.on("notification", (n: { title: string; body: string; voyage?: string | null; type?: string }) => {
      setNotifications(prev => [
        { _id: `live-${Date.now()}`, title: n.title, body: n.body, read: false, createdAt: new Date().toISOString(), voyage: n.voyage, type: n.type },
        ...prev,
      ]);
      setUnreadCount(c => c + 1);
    });

    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      api.patch("/agences/notifications/read-all").catch(() => {});
    }
  };

  const handleNotifClick = (n: Notif) => {
    if (n.type === "VOYAGE_FULL" && n.voyage) {
      setOpen(false);
      router.push(`/passagers?voyage=${n.voyage}`);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        className="relative p-2 min-w-11 min-h-11 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-black transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[110%] w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100]">
          <div className="p-4 border-b border-gray-100">
            <p className="font-black text-gray-800 text-sm">{t("notif_title")}</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-10">{t("notif_empty")}</p>
            ) : notifications.map(n => {
              const clickable = n.type === "VOYAGE_FULL" && !!n.voyage;
              return (
                <div
                  key={n._id}
                  onClick={() => handleNotifClick(n)}
                  className={`p-4 border-b border-gray-50 last:border-0 ${!n.read ? "bg-blue-50/50" : ""} ${clickable ? "cursor-pointer hover:bg-blue-50 transition-colors" : ""}`}
                >
                  <p className="font-bold text-sm text-gray-800">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-gray-300 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
