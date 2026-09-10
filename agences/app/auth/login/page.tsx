
//agences/auth/login/page agence
"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, Mail, Lock, CheckCircle2, ArrowLeft } from "lucide-react";
import { loginAgence } from "@/lib/auth";
import { useLang } from "@/context/LanguageContext";

export default function LoginAgencePage() {
  return (
    <Suspense>
      <LoginAgence />
    </Suspense>
  );
}

function LoginAgence() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("success");

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // État pour les erreurs de champs spécifiques
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // Tes fonctions de validation
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Réinitialisation des erreurs
    const errors: { email?: string; password?: string } = {};
    setError("");

    // VALIDATIONS DES CHAMPS
    if (!email.trim()) {
      errors.email = t("error_email_required");
    } else if (!validateEmail(email)) {
      errors.email = t("error_email_invalid");
    }

    if (!password) {
      errors.password = t("error_password_required");
    } else if (!validatePassword(password)) {
      errors.password = t("error_password_weak");
    }

    // Si on a des erreurs, on arrête tout et on affiche
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({}); // On vide les erreurs si tout est OK
    setLoading(true);

    try {
      const res = await loginAgence({ email, password });

  localStorage.setItem("token", res.authToken); 
  localStorage.setItem("agence", JSON.stringify(res.agence));


      document.cookie = "agenceToken=" + res.authToken + "; path=/;";
      localStorage.setItem("agence", JSON.stringify(res.agence));
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err?.response?.data?.error || t("error_login_generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F5F7FA]">
      <div className="hidden md:flex md:w-1/2 relative" style={{ backgroundImage: "url('/images/1.webp')", backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="absolute inset-0 bg-blue-900/30" />
      </div>

      <div className="flex w-full md:w-1/2 items-center justify-center px-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-blue-100 p-10">

          <a
            href="https://easyticket-lime.vercel.app/agence/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[#245BCF] transition-colors mb-6"
          >
            <ArrowLeft size={16} /> {t("auth_back_home")}
          </a>

          {isSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700">
              <CheckCircle2 size={20} className="text-green-500" />
              <p className="text-sm font-medium">{t("auth_account_created")}</p>
            </div>
          )}

          <h1 className="text-3xl font-bold text-[#245BCF] mb-2">{t("auth_login_title")}</h1>
          <p className="text-sm text-gray-500 mb-6">{t("auth_login_subtitle")}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* CHAMP EMAIL */}
            <div className="space-y-1">
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 ${fieldErrors.email ? 'text-red-400' : 'text-gray-400'}`} size={18} />
                <Input 
                  type="text" 
                  className={`pl-10 h-12 rounded-xl transition-all ${fieldErrors.email ? 'border-red-500 ring-red-100' : ''}`} 
                  placeholder={t("auth_email_placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>
              {fieldErrors.email && <p className="text-xs text-red-500 font-medium ml-1">{fieldErrors.email}</p>}
            </div>

            {/* CHAMP MOT DE PASSE */}
            <div className="space-y-1">
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 ${fieldErrors.password ? 'text-red-400' : 'text-gray-400'}`} size={18} />
                <Input 
                  type={showPassword ? "text" : "password"} 
                  className={`pl-10 pr-10 h-12 rounded-xl transition-all ${fieldErrors.password ? 'border-red-500 ring-red-100' : ''}`} 
                  placeholder={t("auth_password_placeholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 min-w-11 min-h-11 flex items-center justify-center text-gray-400">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-xs text-red-500 font-medium ml-1 leading-tight">{fieldErrors.password}</p>}
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg text-center font-medium">{error}</p>}

            <Button disabled={loading} className="w-full h-12 bg-[#245BCF] text-white rounded-xl shadow-md hover:bg-blue-700 transition">
              {loading ? <Loader2 size={18} className="animate-spin" /> : t("auth_login_btn")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}