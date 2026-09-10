"use client";

import { useState, useEffect } from "react";
import {
  User, Camera, CheckCircle, AlertCircle,
  Eye, EyeOff, Phone, Mail, Lock, UserCircle,
  Send, ShieldCheck, Ban,
} from "lucide-react";
import { getMonProfil } from "@/lib/client.service";
import PageLoader from "@/components/ui/PageLoader";
import { useLang } from "@/context/LanguageContext";

type Tab = "phone" | "name" | "email" | "password";
type Step = "input" | "code";

const API = process.env.NEXT_PUBLIC_API_URL;
function authHeader() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` };
}

/* Champ lecture seule — affiche la valeur actuelle, non modifiable */
function ReadonlyField({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  const { t } = useLang();
  return (
    <div className="space-y-1">
      <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
        {icon} {label} {t("profile_current_suffix")}
      </label>
      <div className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-500 font-bold flex items-center justify-between">
        <span>{value || "—"}</span>
        <Ban size={14} className="text-slate-300" />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useLang();
  const [user, setUser]       = useState<any>(null);
  const [activeTab, setTab]   = useState<Tab>("phone");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [msg, setMsg]         = useState("");
  const [err, setErr]         = useState("");

  const [fields, setFields]   = useState({ name: "", email: "", phone: "", avatar: "" });
  const [newPhone, setNewPhone]       = useState("");
  const [newEmail, setNewEmail]       = useState("");
  const [newName, setNewName]         = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNew, setShowNew]         = useState(false);

  const [step, setStep]   = useState<Step>("input");
  const [code, setCode]   = useState("");

  useEffect(() => {
    getMonProfil()
      .then(({ client }) => {
        setUser(client);
        setFields({ name: client.name || "", email: client.email || "", phone: client.phone || "", avatar: client.avatar || "" });
        setNewName(client.name || "");
      })
      .catch(() => { window.location.href = "/auth/login"; })
      .finally(() => setPageLoading(false));
  }, []);

  useEffect(() => {
    setStep("input");
    setCode("");
    setMsg("");
    setErr("");
    setNewPhone("");
    setNewEmail("");
    setNewPassword("");
  }, [activeTab]);

  /* ── AVATAR ── */
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 300;
        const ratio = Math.min(MAX / img.width, MAX / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const avatar = canvas.toDataURL("image/jpeg", 0.7);
        setFields(f => ({ ...f, avatar }));
        saveRaw({ avatar });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  /* ── SAVE SANS VÉRIFICATION (nom, avatar) ── */
  const saveRaw = async (payload: Record<string, string>) => {
    setLoading(true); setMsg(""); setErr("");
    try {
      const res = await fetch(`${API}/clients/update/${user._id}`, {
        method: "PATCH", headers: authHeader(), body: JSON.stringify(payload),
      });
      const r = await res.json();
      if (res.ok) {
        window.dispatchEvent(new Event("auth-change"));
        if (payload.name) setFields(f => ({ ...f, name: payload.name }));
        setMsg(t("profile_update_success"));
      } else setErr(r.error || t("profile_error_generic"));
    } catch { setErr(t("profile_error_server")); }
    finally { setLoading(false); }
  };

  /* ── ÉTAPE 1 : envoyer le code ── */
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(""); setErr("");

    if (activeTab === "name") {
      if (!newName.trim()) { setErr(t("profile_error_name_empty")); return; }
      saveRaw({ name: newName.trim() });
      return;
    }

    let target = "";
    let action: Tab = activeTab;

    if (activeTab === "phone")    target = newPhone.trim();
    if (activeTab === "email")    target = newEmail.trim();
    if (activeTab === "password") target = fields.email; // code toujours vers email actuel

    if (!target) { setErr(t("profile_error_value_required")); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/clients/send-verify-code`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({ action, channel: "email", target }),
      });
      const r = await res.json();
      if (res.ok) {
        setStep("code");
        if (r.devCode) {
          setCode(r.devCode);
          setMsg(`${t("profile_dev_mode_code_prefix")} ${r.devCode}`);
        } else {
          setMsg(`${t("profile_code_sent_to")} ${fields.email}`);
        }
      } else setErr(r.error || t("profile_error_send_code"));
    } catch { setErr(t("profile_error_server")); }
    finally { setLoading(false); }
  };

  /* ── ÉTAPE 2 : vérifier le code ── */
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(""); setErr("");
    if (code.length !== 6) { setErr(t("profile_error_code_required")); return; }

    setLoading(true);
    try {
      const body: any = { code };
      if (activeTab === "password") body.newPassword = newPassword;

      const res = await fetch(`${API}/clients/verify-and-update`, {
        method: "POST", headers: authHeader(), body: JSON.stringify(body),
      });
      const r = await res.json();
      if (res.ok) {
        if (r.authToken) localStorage.setItem("token", r.authToken);
        window.dispatchEvent(new Event("auth-change"));
        setMsg(t("profile_update_ok"));
        setStep("input");
        setCode("");
        if (r.client) {
          setUser((u: any) => ({ ...u, ...r.client }));
          setFields(f => ({
            ...f,
            email: r.client.email || f.email,
            phone: r.client.phone || f.phone,
          }));
        }
      } else setErr(r.error || t("profile_error_invalid_code"));
    } catch { setErr(t("profile_error_server")); }
    finally { setLoading(false); }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "phone",    label: t("tab_phone_label"),    icon: <Phone size={16} /> },
    { key: "name",     label: t("tab_name_label"),     icon: <UserCircle size={16} /> },
    { key: "email",    label: t("tab_email_label"),    icon: <Mail size={16} /> },
    { key: "password", label: t("tab_password_label"), icon: <Lock size={16} /> },
  ];

  const hasPhone = !!fields.phone;

  if (pageLoading) return <PageLoader message={t("profile_loading")} />;

  return (
    <div className="max-w-xl mx-auto p-6 mt-8 space-y-6">

      {/* Avatar */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative cursor-pointer" onClick={() => document.getElementById("avatarInput")?.click()}>
          <div className="w-24 h-24 rounded-full border-4 border-blue-100 overflow-hidden bg-slate-100 flex items-center justify-center">
            {fields.avatar
              ? <img src={fields.avatar} className="w-full h-full object-cover" alt="avatar" />
              : <User size={40} className="text-slate-300" />}
          </div>
          <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full border-2 border-white shadow">
            <Camera size={13} />
          </div>
          <input id="avatarInput" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
        </div>
        <p className="font-black text-slate-700 text-lg">{fields.name || "—"}</p>
        <p className="text-xs text-slate-400">{fields.email}</p>
      </div>

      {/* Onglets */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-4 border-b border-slate-100">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTab(tab.key)}
              className={`flex flex-col items-center gap-1 py-4 text-[11px] font-black uppercase tracking-wide transition-all
                ${activeTab === tab.key ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"}`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">

          {/* ══ TÉLÉPHONE ══ */}
          {activeTab === "phone" && (
            <>
              {/* Numéro actuel (lecture seule) */}
              <ReadonlyField label={t("tab_phone_label")} value={fields.phone} icon={<Phone size={12} />} />

              {!hasPhone ? (
                /* Pas encore de numéro → bloqué */
                <div className="flex flex-col items-center gap-3 py-6 px-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-center">
                  <Ban size={32} className="text-amber-400" />
                  <p className="font-black text-amber-700 text-sm">{t("profile_no_phone_title")}</p>
                  <p className="text-xs text-amber-600">
                    {t("profile_no_phone_sub")}
                  </p>
                  {/* Ajout initial sans vérification */}
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      if (!newPhone.trim()) { setErr(t("profile_error_invalid_phone")); return; }
                      saveRaw({ phone: newPhone.trim() });
                      setNewPhone("");
                    }}
                    className="w-full space-y-3 mt-2"
                  >
                    <input
                      type="tel"
                      className="w-full p-3 border-2 border-amber-300 rounded-xl focus:border-amber-500 outline-none font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400"
                      placeholder={t("profile_phone_placeholder")}
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                    />
                    {err && <p className="text-xs text-red-500 font-bold">{err}</p>}
                    {msg && <p className="text-xs text-green-600 font-bold">{msg}</p>}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white p-3 rounded-xl font-black text-sm transition-all disabled:opacity-50"
                    >
                      {loading ? t("profile_saving") : t("profile_add_phone_btn")}
                    </button>
                  </form>
                </div>
              ) : step === "input" ? (
                /* Numéro existant → peut changer */
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Phone size={12} /> {t("profile_new_phone_label")}
                    </label>
                    <input
                      type="tel"
                      className="w-full p-4 border-2 border-blue-300 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400 transition-all"
                      placeholder={t("profile_phone_placeholder")}
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                    />
                    <p className="text-xs text-slate-400">{t("profile_code_will_be_sent_to")} <strong>{fields.email}</strong></p>
                  </div>
                  {msg && <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm font-bold rounded-xl flex items-center gap-2"><CheckCircle size={15} />{msg}</div>}
                  {err && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-xl flex items-center gap-2"><AlertCircle size={15} />{err}</div>}
                  <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading ? t("profile_sending") : <><Send size={16} /> {t("profile_send_code_btn")}</>}
                  </button>
                </form>
              ) : (
                <CodeForm
                  code={code} setCode={setCode}
                  loading={loading} msg={msg} err={err}
                  hint={`${t("profile_code_sent_to")} ${fields.email}`}
                  onSubmit={handleVerifyCode}
                  onBack={() => { setStep("input"); setCode(""); setMsg(""); setErr(""); }}
                />
              )}
            </>
          )}

          {/* ══ NOM ══ */}
          {activeTab === "name" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <ReadonlyField label={t("tab_name_label")} value={fields.name} icon={<UserCircle size={12} />} />
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <UserCircle size={12} /> {t("profile_new_name_label")}
                </label>
                <input
                  type="text"
                  className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400 transition-all"
                  placeholder={t("profile_full_name_placeholder")}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>
              {msg && <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm font-bold rounded-xl flex items-center gap-2"><CheckCircle size={15} />{msg}</div>}
              {err && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-xl flex items-center gap-2"><AlertCircle size={15} />{err}</div>}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? t("profile_saving") : <><CheckCircle size={16} /> {t("profile_save_btn")}</>}
              </button>
            </form>
          )}

          {/* ══ EMAIL ══ */}
          {activeTab === "email" && (
            <>
              <ReadonlyField label={t("tab_email_label")} value={fields.email} icon={<Mail size={12} />} />
              {step === "input" ? (
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Mail size={12} /> {t("profile_new_email_label")}
                    </label>
                    <input
                      type="email"
                      className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400 transition-all"
                      placeholder={t("profile_new_email_placeholder")}
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                    />
                    <p className="text-xs text-slate-400">{t("profile_code_sent_to_current_email")} <strong>{fields.email}</strong></p>
                  </div>
                  {msg && <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm font-bold rounded-xl flex items-center gap-2"><CheckCircle size={15} />{msg}</div>}
                  {err && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-xl flex items-center gap-2"><AlertCircle size={15} />{err}</div>}
                  <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading ? t("profile_sending") : <><Send size={16} /> {t("profile_send_code_btn")}</>}
                  </button>
                </form>
              ) : (
                <CodeForm
                  code={code} setCode={setCode}
                  loading={loading} msg={msg} err={err}
                  hint={`${t("profile_code_sent_to")} ${fields.email}`}
                  onSubmit={handleVerifyCode}
                  onBack={() => { setStep("input"); setCode(""); setMsg(""); setErr(""); }}
                />
              )}
            </>
          )}

          {/* ══ MOT DE PASSE ══ */}
          {activeTab === "password" && (
            <>
              <ReadonlyField label={t("profile_email_associated_label")} value={fields.email} icon={<Mail size={12} />} />
              {step === "input" ? (
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Lock size={12} /> {t("profile_new_password_label")}
                    </label>
                    <div className="relative">
                      <input
                        type={showNew ? "text" : "password"}
                        className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none pr-12 transition-all font-bold"
                        placeholder={t("profile_new_password_label")}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-0 top-1/2 -translate-y-1/2 min-w-11 min-h-11 flex items-center justify-center text-slate-400">
                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">{t("profile_code_will_be_sent_to")} <strong>{fields.email}</strong></p>
                  </div>
                  {msg && <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm font-bold rounded-xl flex items-center gap-2"><CheckCircle size={15} />{msg}</div>}
                  {err && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-xl flex items-center gap-2"><AlertCircle size={15} />{err}</div>}
                  <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading ? t("profile_sending") : <><Send size={16} /> {t("profile_send_code_btn")}</>}
                  </button>
                </form>
              ) : (
                <CodeForm
                  code={code} setCode={setCode}
                  loading={loading} msg={msg} err={err}
                  hint={`${t("profile_code_sent_to")} ${fields.email}`}
                  onSubmit={handleVerifyCode}
                  onBack={() => { setStep("input"); setCode(""); setMsg(""); setErr(""); }}
                />
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

/* ── Formulaire de saisie du code ── */
function CodeForm({ code, setCode, loading, msg, err, hint, onSubmit, onBack }: {
  code: string; setCode: (v: string) => void;
  loading: boolean; msg: string; err: string; hint: string;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}) {
  const { t } = useLang();
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
          <ShieldCheck size={28} className="text-blue-600" />
        </div>
        <p className="font-black text-slate-700 text-center">{t("profile_enter_code_title")}</p>
        <p className="text-xs text-slate-400 text-center">{hint}</p>
      </div>

      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        className="w-full p-4 border-2 border-blue-300 rounded-xl text-center text-3xl font-black tracking-[12px] focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
        placeholder="000000"
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
      />

      {msg && <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm font-bold rounded-xl flex items-center gap-2"><CheckCircle size={15} />{msg}</div>}
      {err && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-xl flex items-center gap-2"><AlertCircle size={15} />{err}</div>}

      <button
        type="submit"
        disabled={loading || code.length !== 6}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <ShieldCheck size={16} /> {loading ? t("profile_verifying") : t("profile_confirm_btn")}
      </button>

      <button type="button" onClick={onBack} className="w-full text-slate-400 text-sm py-2 hover:text-slate-600 transition-colors">
        {t("profile_edit_value_btn")}
      </button>
    </form>
  );
}
