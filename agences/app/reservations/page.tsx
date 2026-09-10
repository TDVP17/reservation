"use client";

import useSWR from "swr";
import { Ticket, MapPin, Calendar, Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export default function ReservationsPage() {
  const { t, lang } = useLang();
  const { data: reservations = [], isLoading: loading } = useSWR<any[]>("/reservations/agence");

  const RESA_STATUS_LABEL: Record<string, string> = {
    "confirmée": t("resa_status_confirmed"),
    "annulée":   t("resa_status_cancelled"),
    "en attente": t("resa_status_pending"),
  };

  const statusIcon = (status: string) => {
    if (status === "confirmée") return <CheckCircle size={14} className="text-green-500" />;
    if (status === "annulée")  return <XCircle size={14} className="text-red-500" />;
    return <Clock size={14} className="text-yellow-500" />;
  };

  if (loading) return <div className="p-10 text-center font-bold">{t("loading_generic")}</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-3">
          <Ticket className="text-blue-600" size={32} /> {t("resa_title")}
        </h1>

        {reservations.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl text-center text-gray-400 border-2 border-dashed">
            {t("resa_no_reservation")}
          </div>
        ) : (
          <div className="grid gap-4">
            {reservations.map((r: any) => (
              <div key={r._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0">
                    {r.client?.name?.charAt(0) ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{r.client?.name ?? "—"}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                      <MapPin size={12} className="flex-shrink-0" /> {r.voyage?.destination ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Calendar size={12} />
                      {r.voyage?.date ? new Date(r.voyage.date).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR") : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
                  <div className="flex items-center gap-1 text-gray-600 font-bold">
                    <Users size={14} /> {r.placesReservees} {t("resa_seats_suffix")}
                  </div>
                  <div className="flex items-center gap-1 font-bold capitalize">
                    {statusIcon(r.status)} {RESA_STATUS_LABEL[r.status] || r.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
