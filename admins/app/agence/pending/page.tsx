"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Building2, Check, FileCheck, Loader2 } from "lucide-react";
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

export default function PendingAgencesPage() {
  const { t } = useLang();
  const [agences, setAgences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    try {
      const res = await api.get("/admin/agences");
      setAgences(res.data.filter((a: any) => a.status !== "Validé"));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleValidate = async (id: string) => {
    await api.patch(`/admin/validate-agence/${id}`);
    fetchPending();
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen md:ml-45">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="p-8 bg-[#F4F7FE] min-h-screen md:ml-45">
      <h1 className="text-3xl font-black text-gray-900 mb-2">{t("pending_agencies_title")}</h1>
      <p className="text-gray-500 font-medium mb-8">{agences.length} {t("pending_agencies_count_label")}</p>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_agency")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_email")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_city")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_document")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {agences.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-16 text-center text-gray-400 font-medium">
                  {t("no_pending_agencies")}
                </td>
              </tr>
            ) : agences.map((agence: any) => (
              <tr key={agence._id} className="hover:bg-gray-50/50 transition-all">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                      <Building2 size={20} />
                    </div>
                    <span className="font-bold text-gray-900">{agence.name}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-gray-500 font-medium">{agence.email}</td>
                <td className="px-8 py-5 text-gray-500 font-medium">{agence.ville || "—"}</td>
                <td className="px-8 py-5">
                  {agence.documentProuveAgence ? (
                    <button
                      onClick={() => openBase64Doc(agence.documentProuveAgence)}
                      className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1"
                    >
                      <FileCheck size={14} /> {t("view_doc_short")}
                    </button>
                  ) : (
                    <span className="text-gray-400 text-xs italic">{t("none_label")}</span>
                  )}
                </td>
                <td className="px-8 py-5">
                  <button
                    onClick={() => handleValidate(agence._id)}
                    className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-600 transition-colors"
                  >
                    <Check size={14} /> {t("approve_btn")}
                  </button>
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
