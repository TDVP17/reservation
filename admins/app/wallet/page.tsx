"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Wallet, Loader2, TrendingUp } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export default function WalletPage() {
  const { t } = useLang();
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/balances")
      .then(res => setBalances(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total = balances.reduce((acc: number, b: any) => acc + (b.amount || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen md:ml-45">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="p-8 bg-[#F4F7FE] min-h-screen md:ml-45">
      <h1 className="text-3xl font-black text-gray-900 mb-2 flex items-center gap-3">
        <Wallet className="text-blue-600" size={32} /> {t("wallet_title")}
      </h1>
      <p className="text-gray-500 font-medium mb-8">{t("wallet_subtitle")}</p>

      <div className="bg-blue-600 text-white rounded-[2rem] p-8 mb-8 flex items-center justify-between shadow-xl shadow-blue-200">
        <div>
          <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mb-1">{t("wallet_total_volume")}</p>
          <p className="text-4xl font-black">{total.toLocaleString()} FCFA</p>
        </div>
        <TrendingUp size={48} className="opacity-30" />
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_agency")}</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">{t("table_balance")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {balances.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-8 py-16 text-center text-gray-400 font-medium">
                  {t("no_wallet_found")}
                </td>
              </tr>
            ) : balances.map((b: any) => (
              <tr key={b._id} className="hover:bg-gray-50/50 transition-all">
                <td className="px-8 py-5 font-bold text-gray-900">{b.agence?.name || b.agenceName || "—"}</td>
                <td className="px-8 py-5">
                  <span className="text-emerald-600 font-black text-lg">{(b.amount || 0).toLocaleString()} FCFA</span>
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
