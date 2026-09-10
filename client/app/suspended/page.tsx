"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ban } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export default function SuspendedPage() {
  const { t } = useLang();
  const [message, setMessage] = useState("");


  useEffect(() => {
    setMessage(localStorage.getItem("suspend_message") || "");
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-md p-8 text-center">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Ban size={32} />
        </div>
        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">{t("suspend_title")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {message || t("suspend_message_default")}
        </p>
        <Link
          href="/"
          className="inline-block bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
        >
          {t("suspend_back_home")}
        </Link>
      </div>
    </div>
  );
}




















