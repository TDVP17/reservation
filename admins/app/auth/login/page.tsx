"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "@/lib/auth";
import { ShieldCheck, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export default function AdminLogin() {
  const router = useRouter();
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await loginAdmin({ email, password });

      // On redirige vers le dashboard admin
      router.push("/dash");
    } catch (err: any) {
      setError(t("error_invalid_admin_credentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-blue-900/10 border border-gray-50">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-black text-gray-900">{t("admin_login_title")}</h1>
          <p className="text-gray-400 text-sm font-medium">{t("admin_login_subtitle")}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl text-center">{error}</div>}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t("label_email")}</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder={t("placeholder_admin_email")}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t("label_password")}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : t("submit_login_btn")}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
