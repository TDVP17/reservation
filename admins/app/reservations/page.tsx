"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Ticket, MapPin, Calendar, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export default function ReservationsPage() {
  const { t, lang } = useLang();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/reservations")
      .then(res => setReservations(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (status: string) => {
    if (status === "confirmée") return <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase w-fit"><CheckCircle size={10} /> {t("status_confirmed")}</span>;
    if (status === "annulée") return <span className="flex items-center gap-1 bg-red-50 text-red-500 px-2 py-1 rounded-lg text-[10px] font-black uppercase w-fit"><XCircle size={10} /> {t("status_cancelled")}</span>;
    return <span className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase w-fit"><Clock size={10} /> {t("status_pending")}</span>;
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen md:ml-45">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="p-8 bg-[#F4F7FE] min-h-screen md:ml-45">
      <h1 className="text-3xl font-black text-gray-900 mb-2 flex items-center gap-3">
        <Ticket className="text-blue-600" size={32} /> {t("reservations_title")}
      </h1>
      <p className="text-gray-500 font-medium mb-8">{reservations.length} {t("reservations_count_label")}</p>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_client")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_destination")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_date")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-8 py-16 text-center text-gray-400 font-medium">
                  {t("no_reservation_found")}
                </td>
              </tr>
            ) : reservations.map((r: any) => (
              <tr key={r._id} className="hover:bg-gray-50/50 transition-all">
                <td className="px-8 py-5 font-bold text-gray-900">{r.client?.name || r.clientName || "—"}</td>
                <td className="px-8 py-5">
                  <span className="flex items-center gap-1 text-gray-500 font-medium text-sm">
                    <MapPin size={14} /> {r.voyage?.destination || r.destination || "—"}
                  </span>
                </td>
                <td className="px-8 py-5">
                  <span className="flex items-center gap-1 text-gray-500 font-medium text-sm">
                    <Calendar size={14} /> {r.voyage?.date ? new Date(r.voyage.date).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR") : "—"}
                  </span>
                </td>
                <td className="px-8 py-5">{statusBadge(r.statut || r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
