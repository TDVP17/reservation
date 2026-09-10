"use client";

import { Mail, LifeBuoy } from "lucide-react";
import FaqAccordion from "@/components/FaqAccordion";
import { faqCategories } from "@/lib/faqData";
import { useLang } from "@/context/LanguageContext";

export default function AgenceHelpPage() {
  const { t, lang } = useLang();

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <LifeBuoy className="text-blue-600" size={28} />
          <h1 className="text-3xl font-black text-gray-900">{t("help_title")}</h1>
        </div>
        <p className="text-gray-500 text-sm mb-8">{t("faq_subtitle")}</p>

        <FaqAccordion
          categories={faqCategories}
          lang={lang}
          searchPlaceholder={t("faq_search_placeholder")}
          noResultsText={t("faq_no_results")}
        />

        <div className="mt-10 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center gap-3">
          <Mail className="text-blue-600 flex-shrink-0" size={18} />
          <a href={`mailto:${t("contact_email")}`} className="text-sm font-bold text-blue-700 hover:text-blue-900">
            {t("contact_email")}
          </a>
        </div>
      </div>
    </div>
  );
}
