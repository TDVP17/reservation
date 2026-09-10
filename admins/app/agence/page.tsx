"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Check, X, ShieldAlert, Building2, UserCircle, FileCheck } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

function openBase64Doc(dataUrl: string) {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'application/pdf';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  window.open(URL.createObjectURL(blob), '_blank');
}

export default function AdminAgences() {
  const { t } = useLang();
  const [agences, setAgences] = useState([]);

  useEffect(() => {
    fetchAgences();
  }, []);

  const fetchAgences = async () => {
    const res = await api.get("/admin/agences"); // Nouvelle route backend
    setAgences(res.data);
  };

  const handleValidate = async (id: string) => {
    await api.patch(`/admin/validate-agence/${id}`);
    fetchAgences(); // Rafraîchir la liste
  };

  return (
    <div className="p-8 bg-[#F4F7FE] min-h-screen md:ml-45">
      <h1 className="text-3xl font-black text-gray-900 mb-8">{t("validation_partners_title")}</h1>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_agency")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_zone")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_status")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_actions")}</th>
            </tr>
          </thead>


<tbody className="divide-y divide-gray-50">
  {agences.map((agence: any) => (
    <tr key={agence._id} className="hover:bg-gray-50/50 transition-all">
      <td className="px-8 py-5 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
          <Building2 size={20} />
        </div>
        {/* Correction : agence.name (selon ton controller agence) */}
        <span className="font-bold text-gray-900">{agence.name}</span>
      </td>
      
      {/* Correction : agence.ville (selon ton controller agence) */}
      <td className="px-8 py-5 text-gray-500 font-medium">{agence.ville}</td>

      {/* --- NOUVELLE COLONNE : JUSTIFICATIF --- */}
      <td className="px-8 py-5">
        {agence.documentProuveAgence ? (
          <button
            onClick={() => openBase64Doc(agence.documentProuveAgence)}
            className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-2"
          >
            <FileCheck size={16} />
            {t("view_document")}
          </button>
        ) : (
          <span className="text-gray-400 text-xs italic">{t("no_document")}</span>
        )}
      </td>

      <td className="px-8 py-5">
        {/* Correction : agence.status (selon ton controller agence) */}
        {agence.status === "Validé" ? (
          <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">{t("status_verified")}</span>
        ) : (
          <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">{t("status_pending")}</span>
        )}
      </td>

      <td className="px-8 py-5">
        {agence.status !== "Validé" && (
          <button
            onClick={() => handleValidate(agence._id)}
            className="bg-gray-900 text-white p-2 min-w-11 min-h-11 flex items-center justify-center rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <Check size={18} />
          </button>
        )}
      </td>
    </tr>
  ))}
</tbody>
        </table>
        </div>
      </div>
    </div>
  );
}