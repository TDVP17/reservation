"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, Mail, User, Lock, FileCheck, Phone, MapPin, ClipboardList, ArrowLeft } from "lucide-react";
import { createAgence } from "@/lib/auth";
import { useLang } from "@/context/LanguageContext";

export default function RegisterAgence() {
  const { t } = useLang();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // --- NOUVEAUX CHAMPS AJOUTÉS ---
  const [telephone, setTelephone] = useState("");
  const [numRegistre, setNumRegistre] = useState("");
  const [ville, setVille] = useState("");
  
  const [documentProuveAgence, setDocumentProuveAgence] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    document?: string;
    telephone?: string;
    numRegistre?: string;
    ville?: string;
  }>({});

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const errors: any = {};

    if (!name.trim()) errors.name = t("error_name_required");
    if (!email.trim()) {
      errors.email = t("error_email_required");
    } else if (!validateEmail(email)) {
      errors.email = t("error_email_invalid");
    }

    // Validations des nouveaux champs
    if (!telephone.trim()) errors.telephone = t("error_phone_required");
    if (!numRegistre.trim()) errors.numRegistre = t("error_registry_required");
    if (!ville.trim()) errors.ville = t("error_city_required");

    if (!documentProuveAgence) {
      errors.document = t("error_document_required");
    } else if (documentProuveAgence.size > 4 * 1024 * 1024) {
      errors.document = t("error_document_too_large");
    }

    if (!password) {
      errors.password = t("error_password_required");
    } else if (!validatePassword(password)) {
      errors.password = t("error_password_weak");
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("password", password);
      
      // AJOUT AU FORMDATA
      formData.append("telephone", telephone);
      formData.append("numRegistre", numRegistre);
      formData.append("ville", ville);
      
      if (documentProuveAgence) {
        // Note: Vérifie si ton backend attend bien la clé "documentProuveAgence" ou plutôt juste "document"
        formData.append("documentProuveAgence", documentProuveAgence);
      }

      await createAgence(formData);
      window.location.href = "/auth/login?success=1";
    } catch (err: any) {
      console.error("Détails complets du plantage de l'inscription :", err);
      
      // Extraction intelligente du message d'erreur de l'API
      const messageErreur = 
        err?.response?.data?.message || 
        err?.response?.data?.error || 
        err?.message ||
        t("error_register_generic");
        
      setError(messageErreur);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F5F7FA]">
      <div className="hidden md:flex md:w-1/2 relative" style={{ backgroundImage: "url('/images/bus.avif')", backgroundSize: "cover", backgroundPosition: "center" }}>
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

          <h1 className="text-3xl font-bold text-[#245BCF] mb-2">{t("auth_register_title")}</h1>
          <p className="text-sm text-gray-500 mb-6">{t("auth_register_subtitle")}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* CHAMP NOM */}
            <div className="space-y-1">
              <div className="relative">
                <User className={`absolute left-3 top-1/2 -translate-y-1/2 ${fieldErrors.name ? 'text-red-400' : 'text-gray-400'}`} size={18} />
                <Input className={`pl-10 h-12 rounded-xl ${fieldErrors.name ? 'border-red-500 ring-red-100' : ''}`} placeholder={t("placeholder_agency_name")} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              {fieldErrors.name && <p className="text-xs text-red-500 ml-1 font-medium">{fieldErrors.name}</p>}
            </div>

            {/* CHAMP EMAIL */}
            <div className="space-y-1">
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 ${fieldErrors.email ? 'text-red-400' : 'text-gray-400'}`} size={18} />
                <Input type="text" className={`pl-10 h-12 rounded-xl ${fieldErrors.email ? 'border-red-500 ring-red-100' : ''}`} placeholder={t("auth_email_placeholder")} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {fieldErrors.email && <p className="text-xs text-red-500 ml-1 font-medium">{fieldErrors.email}</p>}
            </div>

            {/* CHAMPS TÉLÉPHONE & VILLE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                    <div className="relative">
                        <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 ${fieldErrors.telephone ? 'text-red-400' : 'text-gray-400'}`} size={18} />
                        <Input className={`pl-10 h-12 rounded-xl ${fieldErrors.telephone ? 'border-red-500 ring-red-100' : ''}`} placeholder={t("placeholder_phone")} value={telephone} onChange={(e) => setTelephone(e.target.value)} />
                    </div>
                    {fieldErrors.telephone && <p className="text-xs text-red-500 ml-1 font-medium">{fieldErrors.telephone}</p>}
                </div>
                <div className="space-y-1">
                    <div className="relative">
                        <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 ${fieldErrors.ville ? 'text-red-400' : 'text-gray-400'}`} size={18} />
                        <Input className={`pl-10 h-12 rounded-xl ${fieldErrors.ville ? 'border-red-500 ring-red-100' : ''}`} placeholder={t("placeholder_city")} value={ville} onChange={(e) => setVille(e.target.value)} />
                    </div>
                    {fieldErrors.ville && <p className="text-xs text-red-500 ml-1 font-medium">{fieldErrors.ville}</p>}
                </div>
            </div>

            {/* CHAMP REGISTRE DE COMMERCE */}
            <div className="space-y-1">
              <div className="relative">
                <ClipboardList className={`absolute left-3 top-1/2 -translate-y-1/2 ${fieldErrors.numRegistre ? 'text-red-400' : 'text-gray-400'}`} size={18} />
                <Input className={`pl-10 h-12 rounded-xl ${fieldErrors.numRegistre ? 'border-red-500 ring-red-100' : ''}`} placeholder={t("placeholder_registry_number")} value={numRegistre} onChange={(e) => setNumRegistre(e.target.value)} />
              </div>
              {fieldErrors.numRegistre && <p className="text-xs text-red-500 ml-1 font-medium">{fieldErrors.numRegistre}</p>}
            </div>

            {/* CHAMP DOCUMENT JUSTIFICATIF */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 ml-1">{t("label_document_proof")}</label>
              <div className="relative">
                <FileCheck className={`absolute left-3 top-1/2 -translate-y-1/2 ${fieldErrors.document ? 'text-red-400' : 'text-gray-400'}`} size={18} />
                <Input 
                  type="file" 
                  accept="image/*,.pdf"
                  className={`pl-10 h-12 rounded-xl pt-2 ${fieldErrors.document ? 'border-red-500 ring-red-100' : ''}`} 
                  onChange={(e) => setDocumentProuveAgence(e.target.files?.[0] || null)} 
                />
              </div>
              {fieldErrors.document && <p className="text-xs text-red-500 ml-1 font-medium">{fieldErrors.document}</p>}
            </div>

            {/* CHAMP MOT DE PASSE */}
            <div className="space-y-1">
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 ${fieldErrors.password ? 'text-red-400' : 'text-gray-400'}`} size={18} />
                <Input type={showPassword ? "text" : "password"} className={`pl-10 pr-10 h-12 rounded-xl ${fieldErrors.password ? 'border-red-500 ring-red-100' : ''}`} placeholder={t("auth_password_placeholder")} value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 min-w-11 min-h-11 flex items-center justify-center text-gray-400">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-xs text-red-500 ml-1 leading-tight font-medium">{fieldErrors.password}</p>}
            </div>

            {/* BLOC D'ERREUR SERVEUR / API */}
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl text-center font-semibold whitespace-pre-line shadow-sm">{error}</p>}

            <Button disabled={loading} className="w-full h-12 bg-gradient-to-r from-[#245BCF] to-blue-500 text-white rounded-xl shadow-md transition-all active:scale-95">
              {loading ? <Loader2 size={18} className="animate-spin" /> : t("auth_register_btn")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}