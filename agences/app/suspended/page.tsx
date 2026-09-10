"use client";

import { useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export default function SuspendedPage() {
  const { t } = useLang();
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage(localStorage.getItem("suspend_message") || "");
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Ban size={32} />
        </div>
        <h1 className="text-xl font-black text-gray-900 mb-2">{t("suspend_title")}</h1>
        <p className="text-sm text-gray-500 mb-6">
          {message || t("suspend_message_default")}
        </p>
        <a
          href="https://easyticket-lime.vercel.app"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
        >
          {t("suspend_back_home")}
        </a>
      </div>
    </div>
  );
}
