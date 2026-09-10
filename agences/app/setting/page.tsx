"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Save,
  ClipboardList,
  ShieldCheck,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  X,
} from "lucide-react";
import { useLang } from "@/context/LanguageContext";

type Agence = {
  _id: string;
  name: string;
  ville: string;
  telephone: string;
  email: string;
  numRegistre: string;
  logo: string;
};

type Action = "email" | "phone" | "password";

// ── Champ critique protégé par vérification par code (email/téléphone/mot de passe) ──
function VerifiedField({
  action, label, icon, currentValue, inputType, t, onDone,
}: {
  action: Action;
  label: string;
  icon: React.ReactNode;
  currentValue: string;
  inputType: string;
  t: (k: any) => string;
  onDone: (agence: Agence) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState<"input" | "code">("input");
  const [value, setValue] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setEditing(false); setStep("input"); setValue(""); setNewPassword(""); setCode(""); setError("");
  };

  const sendCode = async () => {
    setError("");
    if (action === "password") {
      if (!newPassword.trim()) return setError(t("set_new_password_label"));
    } else if (!value.trim()) {
      return setError(label);
    }
    setLoading(true);
    try {
      const target = action === "password" ? currentValue : value.trim();
      await api.post("/agences/send-verify-code", { action, target });
      setStep("code");
    } catch (err: any) {
      setError(err?.response?.data?.error || t("set_send_code_error"));
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    setError("");
    if (code.length !== 6) return setError(t("set_enter_code_title"));
    setLoading(true);
    try {
      const res = await api.post("/agences/verify-and-update", {
        code, ...(action === "password" ? { newPassword } : {}),
      });
      if (res.data.authToken) localStorage.setItem("token", res.data.authToken);
      onDone(res.data.agence);
      reset();
    } catch (err: any) {
      setError(err?.response?.data?.error || t("set_update_error"));
    } finally {
      setLoading(false);
    }
  };

  if (!editing) {
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">{icon}</span>
            <input
              readOnly
              value={action === "password" ? "••••••••" : currentValue}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent rounded-2xl text-sm font-bold text-gray-700 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="px-4 py-3.5 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase hover:bg-blue-600 transition-colors flex-shrink-0"
          >
            {t("set_edit_btn")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{label}</label>
        <button type="button" onClick={reset} className="min-w-11 min-h-11 flex items-center justify-center text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>

      {step === "input" ? (
        <>
          <input
            type={inputType}
            value={action === "password" ? newPassword : value}
            onChange={e => action === "password" ? setNewPassword(e.target.value) : setValue(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {error && <p className="text-xs text-red-500 font-bold flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
          <button
            type="button" onClick={sendCode} disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {loading ? t("set_sending") : t("set_send_code_btn")}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-500">{t("set_code_sent_to")} <strong>{currentValue}</strong></p>
          <input
            type="text" inputMode="numeric" maxLength={6} placeholder="000000"
            value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
            className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl text-center text-lg font-black tracking-[0.5em] outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {error && <p className="text-xs text-red-500 font-bold flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
          <button
            type="button" onClick={confirmCode} disabled={loading || code.length !== 6}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {loading ? t("set_verifying") : t("set_confirm_btn")}
          </button>
        </>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useLang();
  const [agence, setAgence] = useState<Agence | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    api.get("/agences/me")
      .then(r => setAgence(r.data.agence))
      .catch(console.error)
      .finally(() => setPageLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agence) return;
    setLoading(true);
    try {
      const res = await api.patch(`/agences/update/${agence._id}`, { name: agence.name, ville: agence.ville });
      setAgence(res.data);
      localStorage.setItem("agence", JSON.stringify(res.data));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Erreur lors de la mise à jour", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !agence) return;
    setLogoError("");
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await api.post("/agences/logo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setAgence(a => a ? { ...a, logo: res.data.logo } : a);
      const cached = localStorage.getItem("agence");
      if (cached) localStorage.setItem("agence", JSON.stringify({ ...JSON.parse(cached), logo: res.data.logo }));
    } catch (err: any) {
      setLogoError(err?.response?.data?.error || t("set_logo_upload_error"));
    } finally {
      setLogoUploading(false);
    }
  };

  const onVerifiedDone = (updated: Agence) => {
    setAgence(updated);
    localStorage.setItem("agence", JSON.stringify(updated));
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  if (pageLoading || !agence) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Header avec Feedback de succès */}
        <div className="mb-10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t("set_title")}</h1>
            <p className="text-gray-500 font-medium">{t("set_subtitle")}</p>
          </div>

          {showSuccess && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl border border-emerald-100 animate-in fade-in slide-in-from-top-4 duration-300">
              <CheckCircle2 size={18} />
              <span className="text-sm font-bold">{t("set_update_success")}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8">

          {/* Section Profil de l'agence */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-6 mb-10 pb-10 border-b border-gray-50">
              <div className="relative group">
                <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center border-4 border-white shadow-md overflow-hidden transition-all group-hover:shadow-xl">
                  {agence.logo ? (
                    <img src={agence.logo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="text-blue-500" size={40} />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={logoUploading}
                  className="absolute -bottom-1 -right-1 min-w-11 min-h-11 flex items-center justify-center bg-gray-900 text-white rounded-xl shadow-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {logoUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{agence.name}</h2>
                <p className="text-sm text-gray-400 font-medium tracking-wide uppercase">{t("set_agency_identity")}</p>
                {logoError && <p className="text-xs text-red-500 font-bold mt-1">{logoError}</p>}
              </div>
            </div>

            <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

              {/* Nom de l'agence */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t("set_agency_name_label")}</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input
                    type="text"
                    value={agence.name}
                    onChange={(e) => setAgence({ ...agence, name: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Zone / Ville */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t("set_zone_label")}</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input
                    type="text"
                    value={agence.ville}
                    onChange={(e) => setAgence({ ...agence, ville: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Registre de commerce (lecture seule) */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t("set_registre_label")}</label>
                <div className="relative">
                  <ClipboardList className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input
                    readOnly
                    value={agence.numRegistre}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-100 border-transparent rounded-2xl text-sm font-bold text-gray-500 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="md:col-span-2 pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-3 px-10 py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save size={20} />
                  )}
                  {loading ? t("set_saving") : t("set_save_btn")}
                </button>
              </div>
            </form>
          </div>

          {/* Section Contact & Sécurité — champs critiques vérifiés par code */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{t("set_security_title")}</h3>
              </div>
            </div>

            <VerifiedField
              action="phone" label={t("set_phone_label")} icon={<Phone size={18} />}
              currentValue={agence.telephone} inputType="tel" t={t} onDone={onVerifiedDone}
            />
            <VerifiedField
              action="email" label={t("set_email_label")} icon={<Mail size={18} />}
              currentValue={agence.email} inputType="email" t={t} onDone={onVerifiedDone}
            />
            <VerifiedField
              action="password" label={t("set_change_password_btn")} icon={<ShieldCheck size={18} />}
              currentValue={agence.email} inputType="password" t={t} onDone={onVerifiedDone}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
