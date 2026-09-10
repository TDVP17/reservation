"use client";

import { useState, Suspense } from "react"; // Ajoute Suspense
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useSearchParams } from 'next/navigation';
import { useLang } from "@/context/LanguageContext";

// 1. On crée un sous-composant pour le formulaire
function ResetPasswordForm() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/clients/reset-password", {
        email,
        code,
        newPassword: password,
      });
      setSuccess(t("reset_success"));
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md w-full space-y-4 p-8 shadow-xl rounded-2xl bg-white">
      <h1 className="text-2xl font-bold text-center">
        {t("reset_password_title")}
      </h1>

      <Input placeholder={t("reset_email_placeholder")} value={email} onChange={e => setEmail(e.target.value)} />
      <Input placeholder={t("reset_code_placeholder")} value={code} onChange={e => setCode(e.target.value)} />
      <Input type="password" placeholder={t("reset_new_password_placeholder")} value={password} onChange={e => setPassword(e.target.value)} />

      {success && <p className="text-green-600 text-center font-medium">{success}</p>}

      <Button type="submit" className="w-full">{t("reset_submit_btn")}</Button>
    </form>
  );
}

// 2. Le composant principal enveloppe le formulaire dans Suspense
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <Suspense fallback={<p>...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}