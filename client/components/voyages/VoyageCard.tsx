"use client";

import { Voyage, getImageUrl } from "@/lib/voyage.service";
import { Clock, Users, ShieldCheck, Gem, Bus, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLang } from "@/context/LanguageContext";

export default function VoyageCard({ voyage }: { voyage: Voyage }) {
  const router = useRouter();
  const { t, lang } = useLang();

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "short" });

  const imgUrl = getImageUrl(voyage.imageBus);

  const typePill = () => {
    switch (voyage.typeBus) {
      case "Super VIP":
        return <span className="flex items-center gap-0.5 bg-purple-600/90 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase"><Gem size={7} />{t("pill_vip_plus")}</span>;
      case "VIP":
        return <span className="flex items-center gap-0.5 bg-amber-500/90 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase"><ShieldCheck size={7} />{t("legend_vip")}</span>;
      default:
        return <span className="flex items-center gap-0.5 bg-slate-700/80 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase"><Bus size={7} />{t("bus_label")}</span>;
    }
  };

  return (
    <div
      onClick={() => router.push(`/voyages/${voyage._id}`)}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden cursor-pointer group hover:shadow-md transition-all active:scale-[0.97]"
    >
      {/* IMAGE */}
      <div className="relative w-full h-32 overflow-hidden">
        <Image
          src={imgUrl}
          alt={voyage.destination}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />

        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

        <div className="absolute bottom-1.5 left-2 text-white leading-tight">
          {voyage.depart && (
            <p className="text-[8px] font-bold opacity-70 uppercase tracking-wide truncate max-w-[100px]">
              {voyage.depart} →
            </p>
          )}
          <p className="text-xs font-black drop-shadow-sm truncate max-w-[110px]">
            {voyage.destination}
          </p>
        </div>

        <div className="absolute top-1.5 right-1.5 z-10">{typePill()}</div>

        <div className="absolute top-1.5 left-1.5 bg-black/40 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[8px] font-bold">
          {formatDate(voyage.date)}
        </div>
      </div>

      {/* INFO */}
      <div className="p-2.5">
        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mb-2">
          <span className="flex items-center gap-0.5">
            <Clock size={9} />{voyage.heure}
          </span>
          <span className="flex items-center gap-0.5">
            <Users size={9} />{voyage.placesRestantes} {t("seats")}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-700">
          <p className="text-sm font-black text-blue-500 dark:text-blue-400 leading-none">
            {voyage.prix?.toLocaleString()}
            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 ml-0.5">F</span>
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/voyages/${voyage._id}`); }}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-colors"
          >
            {t("book")} <ChevronRight size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}
