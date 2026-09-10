//client/app/agence/page.tsx
"use client";
import { useState, useEffect } from "react";
import { LayoutDashboard, UserPlus, ArrowRight, Building2 } from 'lucide-react';
import Link from 'next/link';
import PageLoader from "@/components/ui/PageLoader";
import { useLang } from "@/context/LanguageContext";

export default function WelcomeAgences() {
  const { t } = useLang();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timeout);
  }, []);

  if (loading) return <PageLoader message={t("agence_welcome_loading")} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">

      {/* Header / Logo Section */}
      <div className="mb-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-xl shadow-blue-200">
          <Building2 className="text-white" size={32} />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          {t("agence_welcome_heading_prefix")} <span className="text-blue-600">{t("agence_welcome_heading_highlight")}</span>
        </h1>
        <p className="mt-3 text-slate-500 text-lg max-w-md mx-auto">
          {t("agence_welcome_subtitle")}
        </p>
      </div>

      {/* Choice Cards Section */}
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">

        {/* Card: Connexion */}
        <div className="group bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>

          <div className="relative z-10">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
              <LayoutDashboard size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{t("agence_partner_card_title")}</h2>
            <p className="text-slate-500 mb-8">
              {t("agence_partner_card_sub")}
            </p>
            <Link  href="https://easyagence.vercel.app/auth/login" className="flex items-center gap-2 font-semibold text-blue-600 group-hover:gap-4 transition-all">
              {t("agence_partner_login_btn")} <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        {/* Card: Inscription */}
        <div className="group bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-sm hover:shadow-xl hover:shadow-blue-900/20 transition-all duration-300 cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>

          <div className="relative z-10">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mb-6">
              <UserPlus size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{t("agence_signup_card_title")}</h2>
            <p className="text-slate-400 mb-8">
              {t("agence_signup_card_sub")}
            </p>
            <Link  href="https://easyagence.vercel.app/auth/register" className="flex items-center gap-2 font-semibold text-white group-hover:gap-4 transition-all">
              {t("agence_signup_btn")} <ArrowRight size={18} />
            </Link>
          </div>
        </div>

      </div>

      {/* Footer Info */}
      <div className="mt-16 text-slate-400 text-sm flex items-center gap-6">
        <div className="flex items-center gap-2 italic">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          {t("agence_servers_ok")}
        </div>
        <span>{t("help_title")} {t("contact_email")}</span>
      </div>

    </div>
  );
}
