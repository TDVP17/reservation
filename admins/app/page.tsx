"use client";

import Link from "next/link";
import { ShieldCheck, Building2, ArrowRight } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export default function RootPage() {
  const { t } = useLang();
  return (
    // On utilise flex-col et z-10 pour s'assurer que le contenu est au-dessus de tout
    <div className="relative min-h-screen w-full bg-[#F4F7FE] flex flex-col items-center justify-center p-4">
      
      {/* Background decoration (optionnel, pour vérifier si le clic passe) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">GATEWAY</h1>
          <p className="text-gray-500 font-medium mt-2">{t("gateway_subtitle")}</p>
        </div>

        {/* Bouton Espace Admin */}
        <Link 
          href="/auth/login" 
          className="group block w-full bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-blue-600 shadow-xl shadow-blue-900/5 transition-all active:scale-95 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                <ShieldCheck size={28} />
              </div>
              <div className="text-left">
                <h2 className="font-black text-gray-900 text-lg">{t("gateway_admin_title")}</h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{t("gateway_admin_subtitle")}</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        {/* Bouton Portail Agence */}
        {/* <Link 
          href="/login/agence" 
          className="group block w-full bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-gray-900 shadow-xl shadow-gray-900/5 transition-all active:scale-95 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-gray-200">
                <Building2 size={28} />
              </div>
              <div className="text-left">
                <h2 className="font-black text-gray-900 text-lg">Portail Agence</h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Gestion Voyages</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-gray-300 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
          </div>
        </Link> */}

      </div>
    </div>
  );
}