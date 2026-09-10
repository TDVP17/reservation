"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useLang } from "@/context/LanguageContext";

export default function ProfilePage() {
  const { t } = useLang();
  const [agence, setAgence] = useState<any>(null);

  const AGENCE_STATUS_LABEL: Record<string, string> = {
    "En attente": t("agence_status_pending"),
    "Validé":     t("agence_status_validated"),
    "Rejeté":     t("agence_status_rejected"),
  };

  useEffect(() => {
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/agences/all`, {
        withCredentials: true,
      })
      .then(res => {
        setAgence(res.data[0]); // adapte selon ton backend
      })
      .catch(() => {});
  }, []);

  if (!agence) {
    return <p>{t("loading_generic")}</p>;
  }

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white p-8 rounded-3xl shadow-lg border">
      <h1 className="text-2xl font-bold mb-6 text-[#245BCF]">
        {t("profile_title")}
      </h1>

      <div className="space-y-4">
        <p><strong>{t("profile_name_label")} :</strong> {agence.name}</p>
        <p><strong>{t("profile_email_label")} :</strong> {agence.email}</p>
        <p><strong>{t("profile_status_label")} :</strong> {AGENCE_STATUS_LABEL[agence.status] || agence.status}</p>
      </div>
    </div>
  );
}
