// components/reservation/ReservationStatusBadge.tsx
"use client";

import { useLang } from "@/context/LanguageContext";

type Props = {
  status: "En attente" | "Confirmé" | "Annulé";
};

export default function ReservationStatusBadge({ status }: { status: string }) {
  const { t } = useLang();

  const map: Record<string, { label: string; bg: string }> = {
    "En attente": {
      label: t("resa_badge_pending"),
      bg: "bg-amber-100 text-amber-600 border-amber-200",
    },
    "Confirmé": {
      label: t("resa_badge_confirmed"),
      bg: "bg-emerald-100 text-emerald-600 border-emerald-200",
    },
    "Annulé": {
      label: t("resa_badge_cancelled"),
      bg: "bg-red-100 text-red-600 border-red-200",
    },
  };

  // Sécurité au cas où le statut est inconnu
  const current = map[status] || map["En attente"];

  return (
    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${current.bg}`}>
      {current.label}
    </span>
  );
}
