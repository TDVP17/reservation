"use client";
import { useState, useEffect } from "react";
import { Mail, LifeBuoy } from "lucide-react";
import PageLoader from "@/components/ui/PageLoader";
import FaqAccordion from "@/components/FaqAccordion";
import { faqCategories } from "@/lib/faqData";
import { useLang } from "@/context/LanguageContext";

export default function HelpPage() {
  const { t, lang } = useLang();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <PageLoader message={t("loading")} />;

  return (
    <div className="max-w-3xl mx-auto p-6 mt-10 dark:text-slate-100">
      <div className="flex items-center gap-3 mb-2">
        <LifeBuoy className="text-blue-600" size={28} />
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">
          {t("help_title")}
        </h1>
      </div>
      <p className="text-slate-500 text-sm mb-8">{t("faq_subtitle")}</p>

      <FaqAccordion
        categories={faqCategories}
        lang={lang}
        searchPlaceholder={t("faq_search_placeholder")}
        noResultsText={t("faq_no_results")}
      />

      {/* Contact email officiel */}
      <div className="mt-10 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center gap-3">
        <Mail className="text-blue-600 flex-shrink-0" size={18} />
        <a href={`mailto:${t("contact_email")}`} className="text-sm font-bold text-blue-700 hover:text-blue-900">
          {t("contact_email")}
        </a>
      </div>
    </div>
  );
}
