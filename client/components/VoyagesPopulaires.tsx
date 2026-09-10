"use client";

import { useEffect, useState } from "react";
import { getAllVoyages, Voyage } from "@/lib/voyage.service";
import VoyageCard from "./voyages/VoyageCard";
import GlobalLoader from "@/components/ui/GlobalLoader";
import { Bus, MapPin } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { useLocation } from "@/context/LocationContext";
import { CITIES } from "@/lib/cityGuide";

export default function VoyagesPopulaires() {
  const { t } = useLang();
  const { city, status, setCity, requestLocation } = useLocation();
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [loading, setLoading] = useState(true);
  // Bascule explicite "ma zone / tous les voyages" — indépendante de la ville
  // détectée/choisie, qui reste mémorisée même quand on bascule sur "tous".
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    getAllVoyages()
      .then(data => setVoyages(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <GlobalLoader show message={t("loading_trips")} />;

  if (!voyages.length) return null;

  const filteredVoyages = city && !showAll
    ? voyages.filter(v => v.depart?.trim().toLowerCase() === city.toLowerCase())
    : voyages;

  const count = filteredVoyages.length;
  const countLabel = count > 1 ? t("trips_count_plural") : t("trips_count");

  return (
    <section className="pt-6 pb-16 bg-white dark:bg-slate-900">
      <div className="px-4 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <Bus size={14} className="text-blue-500" /> {t("available_trips")}
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">
            {count} {countLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          {city && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 text-xs font-black">
              <button
                onClick={() => setShowAll(false)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors ${
                  !showAll ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <MapPin size={12} /> {city}
              </button>
              <button
                onClick={() => setShowAll(true)}
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  showAll ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {t("see_all_trips")}
              </button>
            </div>
          )}

          <select
            value={city ?? ""}
            onChange={e => { setCity(e.target.value || null); setShowAll(false); }}
            className="text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="">{t("all_cities")}</option>
            {CITIES.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
          {(status === "denied" || status === "unsupported") && !city && (
            <>
              <span className="text-xs text-amber-600">{t("location_denied")}</span>
              <button
                onClick={requestLocation}
                className="text-xs font-black text-blue-600 hover:underline"
              >
                {t("detect_location")}
              </button>
            </>
          )}
        </div>

        {filteredVoyages.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">
            {t("no_trip_for_city")} {city} ·{" "}
            <button onClick={() => setShowAll(true)} className="font-black text-blue-600 hover:underline">
              {t("see_all_trips")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredVoyages.map(v => (
              <VoyageCard key={v._id} voyage={v} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
