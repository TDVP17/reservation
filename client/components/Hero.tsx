"use client";

import { useLang } from "@/context/LanguageContext";

export default function Hero() {
  const { t } = useLang();

  return (
    <section className="bg-background py-4">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <h1 className="text-xl md:text-3xl font-extrabold text-foreground">
          {t("hero_title")}
        </h1>
        <p className="mt-3 text-muted-foreground text-lg">
          {t("hero_subtitle")}
        </p>
      </div>
    </section>
  );
}
