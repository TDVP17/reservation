"use client";

import { useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { getMonProfil } from "@/lib/client.service";
import { useLang } from "@/context/LanguageContext";

type Step = "request" | "reset";

const validatePassword = (password: string) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);

export default function ForgotPasswordPage() {
  const { t } = useLang();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await api.post("/clients/forgot-password", { email });
      setStep("reset");
      if (res.data.devCode) {
        setCode(res.data.devCode);
        setSuccess(`${t("profile_dev_mode_code_prefix")} ${res.data.devCode}`);
      } else {
        setSuccess(t("forgot_password_sent_generic"));
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || t("forgot_password_send_error"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (code.length !== 6) {
      setError(t("profile_error_code_required"));
      return;
    }
    if (!validatePassword(newPassword)) {
      setError(t("error_password_weak"));
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/clients/reset-password", { email, code, newPassword });

      if (res.data.authToken) {
        localStorage.setItem("token", res.data.authToken);
        try {
          const { client } = await getMonProfil();
          localStorage.setItem("client", JSON.stringify(client));
        } catch {
          // profil non essentiel ici, le token suffit pour rester connecté
        }
      }

      setSuccess(t("password_updated_redirecting"));
      window.location.href = "/";
    } catch (err: any) {
      setError(err?.response?.data?.error || t("code_invalid_or_expired"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center pt-20 px-5 mt-14">
      {step === "request" ? (
        <form
          className="w-full max-w-md bg-card pt-5 px-8 pb-8 rounded-2xl shadow-lg space-y-5"
          onSubmit={handleRequestCode}
        >
          <h1 className="text-3xl font-bold text-center">
            {t("forgot_password_title")}
          </h1>
          <h2 className="text-sm text-center">
            {t("forgot_password_subtitle")}
          </h2>

          <Input
            type="email"
            placeholder={t("email_placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <Button className="w-full" disabled={loading}>
            {loading ? t("profile_sending") : t("profile_send_code_btn")}
          </Button>
        </form>
      ) : (
        <form
          className="w-full max-w-md bg-card pt-5 px-8 pb-8 rounded-2xl shadow-lg space-y-5"
          onSubmit={handleResetPassword}
        >
          <div className="flex flex-col items-center gap-2">
            <ShieldCheck size={32} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-center">
              {t("profile_enter_code_title")}
            </h1>
            <p className="text-sm text-center text-muted-foreground">
              {t("profile_code_sent_to")} {email}
            </p>
          </div>

          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            className="text-center text-2xl tracking-[8px]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
          />

          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder={t("profile_new_password_label")}
              className="pr-10"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 -translate-y-1/2 min-w-11 min-h-11 flex items-center justify-center text-muted-foreground"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <Button className="w-full" disabled={loading || code.length !== 6}>
            {loading ? t("profile_verifying") : t("profile_confirm_btn")}
          </Button>

          <button
            type="button"
            onClick={() => { setStep("request"); setCode(""); setError(""); setSuccess(""); }}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("resend_code_btn")}
          </button>
        </form>
      )}
    </div>
  );
}
