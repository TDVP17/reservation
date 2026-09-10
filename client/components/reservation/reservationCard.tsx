"use client";

import { useRef, useState } from "react";
import { Bus, Clock, ShieldCheck, Download, Loader2, Check, XCircle } from "lucide-react";
import ReservationStatusBadge from "./reservationStatutBadge";
import { cancelReservation } from "@/lib/reservation.service";
import { domToPng } from "modern-screenshot";
import { useLang } from "@/context/LanguageContext";

export default function ReservationCard({ reservation, onUpdate }: { reservation: any; onUpdate?: () => void }) {
  const { t } = useLang();
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSuccess, setIsSuccess]         = useState(false);
  const [cancelling, setCancelling]       = useState(false);

  const voyage = reservation.voyage;

  // Règles d'annulation : un billet non payé ne peut pas être annulé (rien à
  // rembourser), et un billet dont le code a déjà été validé à l'embarquement
  // ne peut plus l'être non plus — dans tous les autres cas (payé, code non
  // utilisé), l'annulation reste possible sans limite de délai.
  const isCancelled = reservation.status === "Annulé";
  const isPaid = reservation.status === "Confirmé";
  const isCodeUsed = !!reservation.codeUsed;
  const canCancel = !isCancelled && isPaid && !isCodeUsed;
  const cancelBlockedReason = !isCancelled && isPaid && isCodeUsed ? t("cancel_blocked_used") : null;

  const handleCancel = async () => {
    if (!confirm(t("cancel_confirm"))) return;
    setCancelling(true);
    try {
      await cancelReservation(reservation._id);
      onUpdate?.();
    } catch (err: any) {
      alert(err?.response?.data?.message || t("cancel_error"));
    } finally {
      setCancelling(false);
    }
  };

  const handleSaveImage = async () => {
    if (!ticketRef.current) return;
    try {
      setIsDownloading(true);
      const dataUrl = await domToPng(ticketRef.current, { scale: 3, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `Ticket-${voyage?.destination || "voyage"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsDownloading(false);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error) {
      setIsDownloading(false);
      alert(t("capture_error"));
    }
  };

  return (
    <div className="flex flex-col items-center mb-4 sm:mb-8 px-2 sm:px-4">
      {/* LE BILLET MINI-DUO */}
      <div
        ref={ticketRef}
        className="w-full max-w-[400px] bg-white dark:bg-slate-800 rounded-2xl sm:rounded-[1.8rem] border-2 border-slate-100 dark:border-slate-700 overflow-hidden shadow-xl relative"
      >
        {/* HEADER AGENCE */}
        <div className="bg-slate-50 dark:bg-slate-900 px-3 sm:px-5 py-2 sm:py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ShieldCheck size={14} className="text-blue-600 sm:hidden" />
            <ShieldCheck size={16} className="text-blue-600 hidden sm:block" />
            <span className="text-[10px] sm:text-[11px] font-black uppercase text-slate-700 truncate max-w-[100px] sm:max-w-[120px]">
              {voyage?.agence?.name || t("agency_fallback")}
            </span>
          </div>
          <ReservationStatusBadge status={reservation.status || "Confirmé"} />
        </div>

        {/* CONTENU EN DEUX COLONNES */}
        <div className="flex">
          {/* COLONNE GAUCHE : INFOS VOYAGE */}
          <div className="flex-1 min-w-0 p-3 sm:p-5 border-r border-dashed border-slate-200 dark:border-slate-600">
            <div className="mb-2 sm:mb-4">
              <p className="text-[8px] sm:text-[9px] font-black text-blue-500 uppercase mb-0.5 sm:mb-1">{t("destination")}</p>
              <h3 className="text-base sm:text-xl font-black text-slate-800 uppercase italic leading-none truncate">
                {voyage?.destination}
              </h3>
            </div>

            <div className="space-y-1.5 sm:space-y-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Clock size={12} className="text-slate-400 sm:hidden" />
                <Clock size={14} className="text-slate-400 hidden sm:block" />
                <span className="text-[11px] sm:text-xs font-bold text-slate-700">{voyage?.heure}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Bus size={12} className="text-slate-400 sm:hidden" />
                <Bus size={14} className="text-slate-400 hidden sm:block" />
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 uppercase">{voyage?.mat}</span>
              </div>
            </div>
          </div>

          {/* COLONNE DROITE : PASSAGER & PRIX */}
          <div className="w-[110px] sm:w-[140px] bg-slate-900 p-3 sm:p-5 text-white flex flex-col justify-between">
            <div>
              <p className="text-[7px] sm:text-[8px] font-black text-slate-500 uppercase mb-0.5 sm:mb-1">{t("passenger")}</p>
              <p className="text-[9px] sm:text-[10px] font-bold uppercase truncate">{reservation.fullName}</p>
              {reservation.codeBillet && (
                <>
                  <p className="text-[6px] sm:text-[7px] font-black text-slate-500 uppercase mt-1.5 sm:mt-2 mb-0.5">{t("ticket_code_label")}</p>
                  <p className="text-[9px] sm:text-[10px] font-mono font-black text-blue-400 tracking-wider truncate">{reservation.codeBillet}</p>
                </>
              )}
            </div>

            <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-white/10 text-center">
              <p className="text-sm sm:text-lg font-black italic text-blue-400 leading-none">
                {reservation.placesReservees} <span className="text-[8px] sm:text-[9px] uppercase">{t("place_label")}</span>
              </p>
              <p className="text-[11px] sm:text-[12px] font-black mt-1">
                {(voyage?.prix * reservation.placesReservees).toLocaleString()} <span className="text-[7px] sm:text-[8px] opacity-50">FCFA</span>
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER DATE */}
        <div className="bg-blue-600 py-1.5 sm:py-2 text-center">
          <p className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest">
            {voyage?.date ? new Date(voyage.date).toLocaleDateString() : "--/--/--"}
          </p>
        </div>
      </div>

      {/* BOUTONS */}
      <div className="mt-3 sm:mt-4 flex items-center gap-2 sm:gap-3">
        <button
          onClick={handleSaveImage}
          disabled={isDownloading}
          className={`flex items-center gap-1.5 sm:gap-2 font-black text-[9px] sm:text-[10px] uppercase tracking-widest px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all shadow-md ${
            isSuccess ? "bg-emerald-500 text-white" : "bg-blue-600 text-white active:scale-95"
          }`}
        >
          {isDownloading ? <Loader2 size={13} className="animate-spin" /> : isSuccess ? <Check size={13} /> : <Download size={13} />}
          {isDownloading ? t("generating") : isSuccess ? t("saved") : t("save_ticket")}
        </button>

        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex items-center gap-1.5 sm:gap-2 font-black text-[9px] sm:text-[10px] uppercase tracking-widest px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50"
          >
            {cancelling ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
            {cancelling ? t("cancelling") : t("cancel")}
          </button>
        )}
      </div>

      {!canCancel && cancelBlockedReason && (
        <p className="mt-2 text-[10px] font-bold text-slate-400 text-center max-w-[280px]">{cancelBlockedReason}</p>
      )}
    </div>
  );
}