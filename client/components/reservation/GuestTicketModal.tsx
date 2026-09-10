"use client";

import { useRef, useState } from "react";
import { Download, Check, Loader2, AlertTriangle, X, ShieldCheck, Clock, Bus, UserPlus } from "lucide-react";
import { domToPng } from "modern-screenshot";
import Link from "next/link";
import { useLang } from "@/context/LanguageContext";

type Props = {
  ticket: {
    _id: string;
    fullName: string;
    phoneNumber: string;
    placesReservees: number;
    status: string;
    createdAt: string;
    codeBillet?: string;
    voyage: {
      _id: string;
      destination: string;
      depart?: string;
      date: string;
      heure: string;
      prix: number;
      mat: string;
      typeBus: string;
    };
  };
  onClose: () => void;
};

export default function GuestTicketModal({ ticket, onClose }: Props) {
  const { t, lang } = useLang();
  const ticketRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded]   = useState(false);

  const handleDownload = async () => {
    if (!ticketRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await domToPng(ticketRef.current, { scale: 3, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Ticket-EasyTicket-${ticket.voyage.destination}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloaded(true);
    } catch {
      alert(t("guest_ticket_gen_error"));
    } finally {
      setDownloading(false);
    }
  };

  const v = ticket.voyage;
  const total = v.prix * ticket.placesReservees;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full sm:max-w-sm sm:my-4">

        {/* Alerte urgente */}
        <div className="bg-red-600 text-white rounded-2xl p-4 mb-4 flex items-start gap-3 shadow-xl shadow-red-900/40">
          <AlertTriangle size={20} className="flex-shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="font-black text-sm uppercase">{t("guest_ticket_urgent_title")}</p>
            <p className="text-xs text-red-200 mt-1">
              {t("guest_ticket_urgent_desc")}
            </p>
          </div>
        </div>

        {/* Ticket */}
        <div ref={ticketRef} className="bg-white rounded-[1.8rem] border-2 border-slate-100 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-blue-600" />
              <span className="text-[11px] font-black uppercase text-slate-700">EasyTicket</span>
            </div>
            <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">{t("resa_badge_pending")}</span>
          </div>

          {/* Corps */}
          <div className="flex">
            <div className="flex-1 min-w-0 p-5 border-r border-dashed border-slate-200">
              <p className="text-[9px] font-black text-blue-500 uppercase mb-1">{t("destination")}</p>
              <h3 className="text-xl font-black text-slate-800 uppercase italic leading-none">{v.destination}</h3>
              {v.depart && <p className="text-xs text-slate-400 mt-1">{t("from_label")} {v.depart}</p>}
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-700">{v.heure}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bus size={13} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-700 uppercase">{v.mat} · {v.typeBus}</span>
                </div>
              </div>
            </div>
            <div className="w-[130px] bg-slate-900 p-5 text-white flex flex-col justify-between">
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase mb-1">{t("passenger")}</p>
                <p className="text-[10px] font-bold uppercase truncate">{ticket.fullName}</p>
                <p className="text-[9px] text-slate-500 mt-1">{ticket.phoneNumber}</p>
                {ticket.codeBillet && (
                  <>
                    <p className="text-[7px] font-black text-slate-500 uppercase mt-2 mb-0.5">{t("ticket_code_label")}</p>
                    <p className="text-[10px] font-mono font-black text-blue-400 tracking-wider truncate">{ticket.codeBillet}</p>
                  </>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 text-center">
                <p className="text-xl font-black text-blue-400">{ticket.placesReservees} <span className="text-[9px] uppercase">{t("seats_abbrev")}</span></p>
                <p className="text-xs font-black mt-1">{total.toLocaleString()} <span className="text-[8px] opacity-50">FCFA</span></p>
              </div>
            </div>
          </div>

          <div className="bg-blue-600 py-2 text-center">
            <p className="text-[10px] font-black text-white uppercase tracking-widest">
              {new Date(v.date).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Bouton télécharger */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={`w-full mt-4 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition shadow-lg ${
            downloaded ? "bg-emerald-500 text-white" : "bg-red-600 hover:bg-red-700 text-white animate-pulse"
          }`}
        >
          {downloading ? <Loader2 size={18} className="animate-spin" /> : downloaded ? <Check size={18} /> : <Download size={18} />}
          {downloading ? t("guest_ticket_generating") : downloaded ? t("guest_ticket_saved") : t("guest_ticket_download_btn")}
        </button>

        {/* Créer un compte */}
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <UserPlus size={15} className="text-blue-600" />
            <p className="text-xs font-black text-blue-700">{t("guest_retrieve_tickets_title")}</p>
          </div>
          <p className="text-[11px] text-blue-600 mb-3">{t("guest_retrieve_tickets_desc")}</p>
          <div className="flex gap-2">
            <Link href="/auth/login" className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-black text-xs text-center hover:bg-blue-700 transition">
              {t("create_account_btn")}
            </Link>
            <button onClick={onClose} className="flex-1 bg-white border border-blue-200 text-blue-600 py-2.5 rounded-xl font-black text-xs hover:bg-blue-50 transition flex items-center justify-center gap-1">
              <X size={12} /> {t("close_btn")}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
