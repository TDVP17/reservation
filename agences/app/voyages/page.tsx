"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import api from "@/lib/api";
import { io as socketIO, Socket } from "socket.io-client";
import { Plus, Edit, Trash2, MapPin, Clock, Users, RefreshCw, Bus as BusIcon, Play, Flag, CheckCircle, Radio, Banknote, X, Loader2, AlertCircle } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

function OnSiteBookingModal({ voyage, onClose, onBooked }: { voyage: any; onClose: () => void; onBooked: (updated: any) => void }) {
  const { t } = useLang();
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [nbPlaces, setNbPlaces] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const total = (voyage.prix || 0) * nbPlaces;

  const submit = async () => {
    if (!fullName.trim() || !phoneNumber.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await api.post("/reservations/agence/sur-place", {
        voyageId: voyage._id, fullName, phoneNumber, nbPlaces,
      });
      onBooked({ ...voyage, placesRestantes: voyage.placesRestantes - nbPlaces });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || t("onsite_booking_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[1.5rem] w-full max-w-md shadow-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
            <Banknote className="text-emerald-600" size={20} /> {t("onsite_booking_title")}
          </h3>
          <button onClick={onClose} className="p-2 min-w-11 min-h-11 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          {voyage.depart ? `${voyage.depart} → ` : ""}{voyage.destination} · {voyage.heure}
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">{t("full_name_label")}</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">{t("phone_label")}</label>
            <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-xs font-bold text-gray-500 uppercase">{t("seats_count_label")}</span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setNbPlaces(n => Math.max(1, n - 1))}
                className="w-7 h-7 rounded-lg bg-gray-200 hover:bg-gray-300 font-black text-gray-700 flex items-center justify-center">−</button>
              <span className="font-black text-emerald-600 w-4 text-center">{nbPlaces}</span>
              <button type="button" onClick={() => setNbPlaces(n => Math.min(voyage.placesRestantes, n + 1))}
                className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 font-black text-emerald-600 flex items-center justify-center">+</button>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase">{t("onsite_cash_total_label")}</span>
            <span className="text-white font-black">{total.toLocaleString()} FCFA</span>
          </div>

          {error && <p className="text-xs text-red-500 font-bold flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}

          <button
            onClick={submit} disabled={loading || !fullName.trim() || !phoneNumber.trim()}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />}
            {loading ? t("onsite_booking_saving") : t("onsite_booking_confirm_btn")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VoyagesPage() {
  const { t } = useLang();
  const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    scheduled: { label: t("status_scheduled"),  color: "bg-slate-100 text-slate-600" },
    en_route:  { label: t("status_en_route"),   color: "bg-green-100 text-green-700" },
    arrived:   { label: t("status_arrived"),     color: "bg-blue-100 text-blue-700" },
  };
  const { data: voyages = [], isLoading: loading, mutate } = useSWR<any[]>("/voyages/ma-liste");
  const [updating, setUpdating] = useState<string | null>(null);
  const [sharingIds, setSharingIds] = useState<Set<string>>(new Set());
  const [onSiteTarget, setOnSiteTarget] = useState<any>(null);

  const socketRef = useRef<Socket | null>(null);
  const watchIdsRef = useRef<Map<string, number>>(new Map());
  const joinedRoomsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const socket = socketIO(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4004", {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("seats-updated", ({ voyageId, placesRestantes }: { voyageId: string; placesRestantes: number }) => {
      mutate(current => current?.map(v => v._id === voyageId ? { ...v, placesRestantes } : v), { revalidate: false });
    });

    return () => {
      watchIdsRef.current.forEach(watchId => navigator.geolocation.clearWatch(watchId));
      watchIdsRef.current.clear();
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rejoint la room socket de chaque voyage affiché pour recevoir les mises à
  // jour de places en temps réel (réservations en ligne comme sur place).
  useEffect(() => {
    voyages.forEach(v => {
      if (!joinedRoomsRef.current.has(v._id)) {
        socketRef.current?.emit("join-voyage", v._id);
        joinedRoomsRef.current.add(v._id);
      }
    });
  }, [voyages]);

  const stopSharing = (id: string) => {
    const watchId = watchIdsRef.current.get(id);
    if (watchId !== undefined) {
      navigator.geolocation.clearWatch(watchId);
      watchIdsRef.current.delete(id);
    }
    setSharingIds(s => { const next = new Set(s); next.delete(id); return next; });
  };

  // Démarre automatiquement le partage de position au départ — il n'y a plus
  // de bouton manuel, cf. item 3 (le suivi en direct reste la seule source de
  // position réelle, seul son déclenchement change : automatique, pas manuel).
  const startSharing = (id: string) => {
    if (watchIdsRef.current.has(id) || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        socketRef.current?.emit("bus-position-update", {
          voyageId: id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    watchIdsRef.current.set(id, watchId);
    setSharingIds(s => new Set(s).add(id));
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirm_delete_trip"))) return;
    try {
      await api.delete(`/voyages/${id}`);
      mutate(current => current?.filter((x: any) => x._id !== id), { revalidate: false });
    } catch {
      alert(t("delete_error"));
    }
  };

  const handleStatus = async (id: string, action: "depart" | "arrive") => {
    setUpdating(id);
    try {
      const res = await api.patch(`/voyages/${id}/status`, { action });
      mutate(current => current?.map((x: any) => x._id === id ? { ...x, ...res.data } : x), { revalidate: false });
      if (action === "depart") startSharing(id);
      if (action === "arrive") stopSharing(id);
    } catch {
      alert(t("status_update_error"));
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">

      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-gray-30/80 backdrop-blur-md pb-6 pt-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t("voy_title")}</h1>
            <p className="text-gray-500 mt-1">{t("voy_subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => mutate()} className="p-2.5 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-all">
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <Link href="/voyages/new" className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-md gap-2 active:scale-95">
              <Plus size={20} /> {t("voy_new_btn")}
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-4 text-xs font-semibold text-gray-600 uppercase">{t("th_matricule")}</th>
                <th className="px-5 py-4 text-xs font-semibold text-gray-600 uppercase">{t("th_category")}</th>
                <th className="px-5 py-4 text-xs font-semibold text-gray-600 uppercase">{t("th_route")}</th>
                <th className="px-5 py-4 text-xs font-semibold text-gray-600 uppercase">{t("th_departure")}</th>
                <th className="px-5 py-4 text-xs font-semibold text-gray-600 uppercase">{t("th_seats")}</th>
                <th className="px-5 py-4 text-xs font-semibold text-gray-600 uppercase">{t("th_price")}</th>
                <th className="px-5 py-4 text-xs font-semibold text-gray-600 uppercase">{t("th_status")}</th>
                <th className="px-5 py-4 text-xs font-semibold text-gray-600 uppercase text-right">{t("th_actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-20 text-gray-400 italic">{t("loading_trips")}</td></tr>
              ) : voyages.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-20 text-gray-400">{t("no_trip_click")}</td></tr>
              ) : voyages.map((v: any) => {
                const st = STATUS_LABEL[v.status || "scheduled"];
                const busy = updating === v._id;
                const full = v.placesRestantes <= 0;
                return (
                  <tr key={v._id} className="hover:bg-blue-50/30 transition-colors group">

                    {/* Matricule */}
                    <td className="px-5 py-4 font-mono font-bold text-gray-700 text-sm">
                      {v.mat || "—"}
                    </td>

                    {/* Type */}
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase flex items-center gap-1 w-fit ${
                        v.typeBus === 'Super VIP' ? 'bg-purple-100 text-purple-700' :
                        v.typeBus === 'VIP'       ? 'bg-amber-100 text-amber-700'  : 'bg-slate-100 text-slate-700'
                      }`}>
                        <BusIcon size={12} />{v.typeBus || t("classique_default")}
                      </span>
                    </td>

                    {/* Trajet */}
                    <td className="px-5 py-4 font-medium text-gray-800">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin size={14} className="text-blue-500" />
                        {v.depart ? `${v.depart} → ` : ""}{v.destination}
                      </div>
                    </td>

                    {/* Heure */}
                    <td className="px-5 py-4 text-gray-600 text-sm">
                      <div className="flex items-center gap-2"><Clock size={14} className="text-gray-400" />{v.heure}</div>
                    </td>

                    {/* Places */}
                    <td className="px-5 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
                        full ? 'bg-red-100 text-red-700' : v.placesRestantes < 5 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                      }`}>
                        <Users size={12} />{v.placesRestantes}/{v.placesTotal}
                      </span>
                    </td>

                    {/* Prix */}
                    <td className="px-5 py-4 font-bold text-gray-900 text-sm">
                      {(v.prix || 0).toLocaleString()} <span className="text-[10px] text-gray-400">FCFA</span>
                    </td>

                    {/* Statut */}
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${st.color}`}>
                        {st.label}
                      </span>
                      {sharingIds.has(v._id) && (
                        <span className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-red-50 text-red-600">
                          <Radio size={10} className="animate-pulse" /> {t("live_label")}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex justify-end items-center gap-1">

                        {/* Bouton LANCER */}
                        {(!v.status || v.status === 'scheduled') && (
                          <button
                            onClick={() => handleStatus(v._id, 'depart')}
                            disabled={busy}
                            title={t("launch_departure_title")}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                          >
                            <Play size={13} />{busy ? "..." : t("departure_btn")}
                          </button>
                        )}

                        {/* Bouton ARRIVÉE */}
                        {v.status === 'en_route' && (
                          <button
                            onClick={() => handleStatus(v._id, 'arrive')}
                            disabled={busy}
                            title={t("mark_arrived_title")}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                          >
                            <Flag size={13} />{busy ? "..." : t("arrival_btn")}
                          </button>
                        )}

                        {v.status === 'arrived' && (
                          <span className="flex items-center gap-1 text-xs text-blue-500 font-bold px-2">
                            <CheckCircle size={14} /> {t("completed_label")}
                          </span>
                        )}

                        {/* Bouton RÉSERVATION SUR PLACE */}
                        {!full && (
                          <button
                            onClick={() => setOnSiteTarget(v)}
                            title={t("onsite_booking_btn")}
                            className="min-w-11 min-h-11 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                          >
                            <Banknote size={16} />
                          </button>
                        )}

                        <Link href={`/voyages/${v._id}/edit`} className="min-w-11 min-h-11 flex items-center justify-center text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                          <Edit size={16} />
                        </Link>
                        <button onClick={() => handleDelete(v._id)} className="min-w-11 min-h-11 flex items-center justify-center text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {onSiteTarget && (
        <OnSiteBookingModal
          voyage={onSiteTarget}
          onClose={() => setOnSiteTarget(null)}
          onBooked={(updated) => mutate(current => current?.map(x => x._id === updated._id ? updated : x), { revalidate: false })}
        />
      )}
    </div>
  );
}
