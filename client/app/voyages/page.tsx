"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getAllVoyages, Voyage } from "@/lib/voyage.service";
import VoyageCard from "@/components/voyages/VoyageCard";
import GlobalLoader from "@/components/ui/GlobalLoader";
import { SearchX, Bus, MapPin } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

// 1. On crée un sous-composant pour isoler la logique des SearchParams
function VoyagesList() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.toLowerCase() || "";

  const [voyages, setVoyages]       = useState<Voyage[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [depart, setDepart]         = useState("");

  useEffect(() => {
    getAllVoyages()
      .then(data => setVoyages(data || []))
      .catch(() => setError(t("voyages_load_error")))
      .finally(() => setLoading(false));
    // Rafraîchit quand l'utilisateur revient sur l'onglet
    const onFocus = () => getAllVoyages().then(data => setVoyages(data || [])).catch(() => {});
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Villes de départ uniques
  const departures = [...new Set(voyages.map(v => v.depart).filter(Boolean))].sort();

  const filteredVoyages = voyages.filter(v => {
    const matchQuery  = v.destination.toLowerCase().includes(query) || v.mat.toLowerCase().includes(query);
    const matchDepart = !depart || v.depart === depart;
    return matchQuery && matchDepart;
  });

  if (loading) {
    return <GlobalLoader show message={t("loading_trips")} />;
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-20 px-4 text-center">
        <div className="text-red-500 font-bold bg-red-50 p-4 rounded-2xl inline-block">
          {error}
        </div>
      </div>
    );
  }

  if (voyages.length === 0) {
    return (
      <section className="py-20 bg-white dark:bg-slate-900 min-h-[60vh] flex items-center">
        <div className="container mx-auto flex flex-col items-center text-center px-4">
          <div className="bg-slate-100 p-8 rounded-full mb-6">
            <SearchX size={50} className="text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">{t("no_reservation")}</h2>
          <p className="text-slate-500 max-w-sm mt-3 leading-relaxed">{t("no_reservation_sub")}</p>
        </div>
      </section>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Bus size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t("all_trips")}</h1>
        </div>

        {/* Filtre départ */}
        {departures.length > 0 && (
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-blue-500" />
            <select
              value={depart}
              onChange={e => setDepart(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">{t("all_dates")}</option>
              {departures.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {query && (
        <p className="mb-4 text-sm text-gray-500">
          {t("results_for")} <span className="font-bold text-blue-600">"{query}"</span>
        </p>
      )}

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {filteredVoyages.length > 0 ? (
          filteredVoyages.map((voyage) => (
            <VoyageCard key={voyage._id} voyage={voyage} />
          ))
        ) : (
          <p className="col-span-full text-center py-20 text-slate-500">{t("no_trip_found")}</p>
        )}
      </div>
    </div>
  );
}


export default function VoyagesPage() {
  const { t } = useLang();
  return (
    <Suspense fallback={<GlobalLoader show message={t("loading_trips")} />}>
      <VoyagesList />
    </Suspense>
  );
}
