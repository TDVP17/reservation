"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  User,
  Lock,
  Globe,
} from "lucide-react";
import { loginClient, createClient } from "@/lib/client.service";
import { useLang } from "@/context/LanguageContext";

const validateEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePassword = (password: string) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export default function AuthCard() {
  const { lang, setLang, t } = useLang();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 🔥 SPINNER BOUTON (REGISTER)
  const [loading, setLoading] = useState(false);

  // 🔥 SPINNER GLOBAL (LOGIN)
  const [loginLoading, setLoginLoading] = useState(false);

  const [error, setError] = useState("");

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || loginLoading) return;

    const errors: any = {};

    if (mode === "register" && !name.trim()) {
      errors.name = t("error_name");
    }

    if (!email.trim()) {
      errors.email = t("error_email_required");
    } else if (!validateEmail(email)) {
      errors.email = t("error_email_invalid");
    }

    if (!password) {
      errors.password = t("error_password_required");
    } else if (mode === "register" && !validatePassword(password)) {
      errors.password = t("error_password_weak");
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setError("");

      if (mode === "login") {
        // 🔥 SPINNER GLOBAL
        setLoginLoading(true);

        const res = await loginClient({ email, password });
        localStorage.setItem("token", res.authToken);
        localStorage.setItem("client", JSON.stringify(res.client));

        await sleep(1200);
        window.location.href = "/";
      } else {
        // 🔥 SPINNER UNIQUEMENT SUR LE BOUTON
        setLoading(true);

        await createClient({ name, email, password });
        await sleep(1000);

        // ✅ NETTOYAGE COMPLET DU FORMULAIRE
        setName("");
        setEmail("");
        setPassword("");
        setFieldErrors({});
        setError("");

        setMode("login");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || t("error_connection"));
    } finally {
      setLoading(false);
      setLoginLoading(false);
    }
  };

  /* ================= SPINNER GLOBAL LOGIN ================= */
  if (loginLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white">
          <Loader2 size={42} className="animate-spin" />
          <p className="text-sm">{t("connecting")}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* BACKGROUND */}
      <div
        className="relative min-h-screen flex items-start justify-center px-4 py-8 overflow-y-auto"
        style={{
          backgroundImage:
            mode === "register"
              ? "url('/images/create.webp')"
              : "url('/images/login.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* OVERLAY */}
        <div className="absolute inset-0 bg-black/35" />

        {/* SÉLECTEUR DE LANGUE EN HAUT À DROITE */}
        <div className="absolute top-4 right-4 z-20">
          <button
            type="button"
            onClick={() => setLang(lang === "fr" ? "en" : "fr")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-lg text-xs font-bold border border-white/20 transition-all shadow-lg"
          >
            <Globe size={14} className="text-blue-400" />
            <span className="uppercase">{lang}</span>
          </button>
        </div>

        {/* FORMULAIRE */}
        <div
          className="
            relative z-10
            w-full max-w-md
            rounded-2xl
            p-5 sm:p-8
            bg-white/10
            backdrop-blur-[20px]
            shadow-2xl
            border border-white/20
            ring-1 ring-white/10
            mt-auto mb-auto
          "
        >
          <h1 className="text-3xl font-bold text-center mb-6 text-white">
            {mode === "login" ? t("login_title") : t("register_title")}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* NOM */}
            {mode === "register" && (
              <>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                    size={18}
                  />
                  <Input
                    className="pl-10 bg-white/10 text-white placeholder:text-white/60 border-white/20"
                    placeholder={t("name_placeholder")}
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-xs text-red-400">
                    {fieldErrors.name}
                  </p>
                )}
              </>
            )}

            {/* EMAIL */}
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                size={18}
              />
              <Input
                className="pl-10 bg-white/10 text-white placeholder:text-white/60 border-white/20"
                type="email"
                placeholder={t("email_placeholder")}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-xs text-red-400">
                {fieldErrors.email}
              </p>
            )}

            {/* MOT DE PASSE */}
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                size={18}
              />
              <Input
                className="pl-10 pr-10 bg-white/10 text-white placeholder:text-white/60 border-white/20"
                type={showPassword ? "text" : "password"}
                placeholder={t("password_placeholder")}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 min-w-11 min-h-11 flex items-center justify-center text-white/50"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {fieldErrors.password && (
              <p className="text-xs text-red-400">
                {fieldErrors.password}
              </p>
            )}

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            {/* BOUTON */}
            <Button
              disabled={loading}
              className="
                w-full h-12
                bg-white/10
                backdrop-blur-xl
                border border-white/30
                text-white
                hover:bg-white/20
                transition
                flex items-center justify-center gap-2
                disabled:opacity-50
              "
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{t("processing")}</span>
                </>
              ) : (
                <span>
                  {mode === "login"
                    ? t("login_btn")
                    : t("register_btn")}
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-white">
            {mode === "login" ? (
              <>
                {t("no_account")}{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="underline font-medium"
                >
                  {t("register_title")}
                </button>
              </>
            ) : (
              <>
                {t("already_account")}{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="underline font-medium"
                >
                  {t("login_btn")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}



