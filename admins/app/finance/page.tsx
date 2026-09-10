"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Wallet, TrendingUp, Bus, Users, Loader2 } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export default function FinancePage() {
  const { t } = useLang();
  const [stats, setStats] = useState({ platformRevenue: 0, totalVoyages: 0, totalAgences: 0, totalClients: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/stats")
      .then(res => setStats({
        platformRevenue: res.data.platformRevenue ?? 0,
        totalVoyages: res.data.totalVoyages ?? 0,
        totalAgences: res.data.totalAgences ?? 0,
        totalClients: res.data.totalClients ?? 0,
      }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen md:ml-45">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="p-8 bg-[#F4F7FE] min-h-screen md:ml-45">
      <h1 className="text-3xl font-black text-gray-900 mb-2 flex items-center gap-3">
        <Wallet className="text-blue-600" size={32} /> {t("finance_title")}
      </h1>
      <p className="text-gray-500 font-medium mb-8">{t("finance_subtitle")}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FinanceCard title={t("finance_total_revenue")} value={`${stats.platformRevenue.toLocaleString()} FCFA`} icon={<TrendingUp size={20} />} color="bg-emerald-500" />
        <FinanceCard title={t("finance_trips")} value={stats.totalVoyages} icon={<Bus size={20} />} color="bg-blue-500" />
        <FinanceCard title={t("finance_agencies")} value={stats.totalAgences} icon={<Users size={20} />} color="bg-indigo-500" />
        <FinanceCard title={t("finance_clients")} value={stats.totalClients} icon={<Wallet size={20} />} color="bg-purple-500" />
      </div>
    </div>
  );
}

function FinanceCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
      <div className={`w-10 h-10 ${color} text-white rounded-xl flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-2xl font-black text-gray-900">{value}</p>
    </div>
  );
}
