"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAllVoyages, getVoyageById, getImageUrl, Voyage } from "@/lib/voyage.service";
import VoyageCard from "@/components/voyages/VoyageCard";
import GuestReservationModal from "@/components/reservation/GuestReservationModal";
import GuestTicketModal from "@/components/reservation/GuestTicketModal";
import { Loader2, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useLang } from "@/context/LanguageContext";

export default function VoyageWatchPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t } = useLang();

  const [selectedVoyage, setSelectedVoyage] = useState<Voyage | null>(null);
  const [suggestions, setSuggestions]       = useState<Voyage[]>([]);
  const [loading, setLoading]               = useState(true);
  const [showGuestForm, setShowGuestForm]   = useState(false);
  const [guestTicket, setGuestTicket]       = useState<any>(null);

  const handleReserver = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      router.push(`/voyages/${selectedVoyage!._id}/reserver`);
    } else {
      setShowGuestForm(true);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [current, allVoyages] = await Promise.all([
          getVoyageById(id as string),
          getAllVoyages(),
        ]);
        setSelectedVoyage(current);
        setSuggestions(allVoyages.filter(v => v.destination === current.destination && v._id !== id));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-slate-900">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  if (!selectedVoyage) return <p className="p-10 text-center uppercase font-bold text-slate-400">{t("trip_not_found")}</p>;

  return (
    <div className="h-screen bg-[#f8f9fa] dark:bg-slate-900 overflow-hidden flex flex-col">
      
      {/* HEADER DE NAVIGATION FIXE */}
      <div className="px-3 py-2 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shrink-0">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold text-[9px] uppercase tracking-widest transition-colors"
        >
          <ArrowLeft size={12} /> {t("back_catalog")}
        </button>
      </div>

      {/* CONTENEUR PRINCIPAL */}
      <div className="flex flex-row flex-1 overflow-hidden w-full">
        
        {/* ==========================================================
            SECTION GAUCHE : Fixe / En dur (Ne scrolle pas du tout)
        =========================================================== */}
        <div className="w-[45%] shrink-0 h-full p-2 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 flex flex-col justify-between">
          <div className="w-full flex flex-col">

            {/* Image miniature fixe */}
            <div className="relative w-full h-24 shrink-0 rounded-lg overflow-hidden shadow-sm mb-2">
              <Image
                src={getImageUrl(selectedVoyage.imageBus)}
                alt={selectedVoyage.destination}
                fill
                className="object-cover"
                unoptimized={true}
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                <h1 className="text-xs font-black text-white italic uppercase tracking-tighter leading-none truncate">
                  {selectedVoyage.destination}
                </h1>
              </div>
            </div>

            {/* Infos clés */}
            <div className="grid grid-cols-3 gap-1 mb-2">
              <div className="p-1 bg-slate-50 dark:bg-slate-700 rounded text-center border border-slate-100 dark:border-slate-600">
                <p className="text-[6px] font-black text-slate-400 uppercase">{t("date_label")}</p>
                <p className="font-bold text-slate-800 dark:text-slate-100 text-[9px]">{new Date(selectedVoyage.date).toLocaleDateString()}</p>
              </div>
              <div className="p-1 bg-slate-50 dark:bg-slate-700 rounded text-center border border-slate-100 dark:border-slate-600">
                <p className="text-[6px] font-black text-slate-400 uppercase">{t("hour_label")}</p>
                <p className="font-bold text-slate-800 dark:text-slate-100 text-[9px]">{selectedVoyage.heure}</p>
              </div>
              <div className="p-1 bg-slate-50 dark:bg-slate-700 rounded text-center border border-slate-100 dark:border-slate-600">
                <p className="text-[6px] font-black text-slate-400 uppercase">{t("bus_label")}</p>
                <p className="font-bold text-slate-800 dark:text-slate-100 text-[9px] uppercase truncate">{selectedVoyage.mat}</p>
              </div>
            </div>

            {/* Bloc Prix & Bouton Réserver */}
            <div className="p-2 bg-[#245bcf] rounded-lg text-white flex flex-col gap-1.5 shadow">
              <div>
                <p className="text-[7px] font-black text-blue-200 uppercase leading-none">{t("trip_price")}</p>
                <p className="text-xs font-black tracking-tight italic">
                  {selectedVoyage.prix.toLocaleString()} <span className="text-[8px] italic">FCFA</span>
                </p>
              </div>
              <button
                onClick={handleReserver}
                className="w-full bg-white text-blue-600 py-1.5 rounded font-black text-[9px] uppercase hover:shadow-inner transition-all active:scale-95"
              >
                {t("book")}
              </button>
            </div>
          </div>
        </div>

        {/* ==========================================================
            SECTION DROITE : Seule cette partie possède un scroll vertical
        =========================================================== */}
        <div className="w-[55%] shrink-0 h-full overflow-y-auto bg-[#f8f9fa] dark:bg-slate-900 p-2 custom-scrollbar">
          <div className="w-full">
            <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <span className="w-1 h-3 bg-blue-600 rounded-full"></span>
              {t("suggestions_for_you")}
            </h3>

            <div className="flex flex-col gap-2">
              {suggestions.length > 0 ? (
                suggestions.map((v) => (
                  <div key={v._id} className="w-full transform scale-95 origin-top hover:translate-y-[-2px] transition-all duration-300">
                    <VoyageCard voyage={v} />
                  </div>
                ))
              ) : (
                <div className="p-4 text-center bg-white dark:bg-slate-800 rounded border border-dashed border-slate-200 dark:border-slate-600">
                  <p className="text-[9px] font-bold text-slate-400 uppercase italic">{t("no_other_trip")}</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>

      {/* Modals */}
      {showGuestForm && selectedVoyage && !guestTicket && (
        <GuestReservationModal
          voyage={selectedVoyage}
          onClose={() => setShowGuestForm(false)}
          onSuccess={(ticket) => { setGuestTicket(ticket); setShowGuestForm(false); }}
        />
      )}

      {guestTicket && (
        <GuestTicketModal
          ticket={guestTicket}
          onClose={() => setGuestTicket(null)}
        />
      )}
    </div>
  );
}