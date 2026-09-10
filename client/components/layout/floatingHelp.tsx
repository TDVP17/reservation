"use client";

import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export default function FloatingHelp() {
  const { t } = useLang();
  return (
    <Link
      href="/help"
      className="fixed bottom-[88px] sm:bottom-6 left-6 z-40 bg-[#245bcf] text-white p-3 rounded-full shadow-lg hover:bg-[#1e4fb3] transition"
      title={t("help_tooltip")}
    >
      <HelpCircle size={22} />
    </Link>
  );
}
