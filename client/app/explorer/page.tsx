"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { io as socketIO, Socket } from "socket.io-client";
import {
  MapPin, Cloud, BookOpen, X, Bus, Clock,
  ThumbsUp, Lightbulb, Eye, ChevronRight,
  Navigation, CheckCircle2, CalendarClock, Radio,
} from "lucide-react";
import { CITIES, City, getCityByName, distanceKm } from "@/lib/cityGuide";
import { getAllVoyages, Voyage } from "@/lib/voyage.service";
import { getMyReservations } from "@/lib/reservation.service";
import PageLoader from "@/components/ui/PageLoader";
import { useLang } from "@/context/LanguageContext";
import { useLocation } from "@/context/LocationContext";

const ExplorerMap = dynamic(() => import("@/components/explorer/ExplorerMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-2xl">
      <p className="text-slate-400 font-bold animate-pulse">…</p>
    </div>
  ),
});

type Tab = "carte" | "meteo" | "guide";

type WeatherData = {
  temp: number;
  feels: number;
  desc: string;
  icon: string;
  humidity: number;
  wind: number;
};

type Reservation = {
  _id: string;
  voyage: Voyage;
  nbPlaces: number;
  status: string;
};

function useElapsed(departedAt: string | undefined) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!departedAt) { setElapsed(0); return; }
    const update = () => setElapsed(Math.floor((Date.now() - new Date(departedAt).getTime()) / 1000));
    update();
    ref.current = setInterval(update, 10000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [departedAt]);
  return elapsed;
}

function fmt(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h${m.toString().padStart(2,"0")}min` : `${m} min`;
}

type BusPosition = { lat: number; lng: number; updatedAt: string };

export default function ExplorerPage() {
  const { t, lang } = useLang();
  const { city, coords, status, setCity, requestLocation } = useLocation();
  const [tab, setTab]               = useState<Tab>("carte");
  const [voyages, setVoyages]       = useState<Voyage[]>([]);
  const [nextRes, setNextRes]       = useState<Reservation | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [selected, setSelected]         = useState<City | null>(null);
  const [routeVoyages, setRouteVoyages] = useState<Voyage[] | null>(null);
  const [panel, setPanel]               = useState<"city" | "route" | null>(null);
  const [weather, setWeather]       = useState<Record<string, WeatherData>>({});
  const [loadingW, setLoadingW]     = useState<string | null>(null);
  const [busPosition, setBusPosition] = useState<BusPosition | null>(null);

  const elapsed = useElapsed(nextRes?.voyage?.departedAt);

  // Position initiale connue (persistée côté serveur) dès que la réservation active charge
  useEffect(() => {
    const last = nextRes?.voyage?.lastPosition;
    if (last?.latitude != null && last?.longitude != null) {
      setBusPosition({ lat: last.latitude, lng: last.longitude, updatedAt: last.updatedAt });
    } else {
      setBusPosition(null);
    }
  }, [nextRes?.voyage?._id]);

  // Suivi en direct du bus via socket.io pendant que le trajet est en route
  useEffect(() => {
    const voyageId = nextRes?.voyage?._id;
    if (!voyageId || nextRes?.voyage?.status !== "en_route") return;

    const socket = socketIO(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4004", {
      transports: ["websocket"],
    });
    socket.emit("join-voyage", voyageId);
    socket.on("bus-position", ({ latitude, longitude, updatedAt }: { latitude: number; longitude: number; updatedAt: string }) => {
      setBusPosition({ lat: latitude, lng: longitude, updatedAt });
    });

    return () => { socket.disconnect(); };
  }, [nextRes?.voyage?._id, nextRes?.voyage?.status]);

  // Coordonnées du trajet actif (résolues via les villes connues)
  const departCity = nextRes?.voyage?.depart ? getCityByName(nextRes.voyage.depart) : undefined;
  const destCity = nextRes?.voyage?.destination ? getCityByName(nextRes.voyage.destination) : undefined;

  let progressPct: number | null = null;
  let remainingKm: number | null = null;
  let etaMinutes: number | null = null;

  if (busPosition && departCity && destCity) {
    const totalKm = distanceKm({ lat: departCity.lat, lng: departCity.lng }, { lat: destCity.lat, lng: destCity.lng });
    remainingKm = distanceKm(busPosition, { lat: destCity.lat, lng: destCity.lng });
    const traveledKm = Math.max(0, totalKm - remainingKm);
    progressPct = totalKm > 0 ? Math.min(97, (traveledKm / totalKm) * 100) : 0;

    const elapsedHours = elapsed / 3600;
    const speedKmH = elapsedHours > 0.05 && traveledKm > 1 ? traveledKm / elapsedHours : 60;
    etaMinutes = speedKmH > 0 ? (remainingKm / speedKmH) * 60 : null;
  }

  useEffect(() => {
    getAllVoyages()
      .then(setVoyages)
      .catch(() => {})
      .finally(() => setPageLoading(false));

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      getMyReservations()
        .then((data: any[]) => {
          const active = data
            .filter(r => r.voyage && r.status !== "cancelled")
            .sort((a, b) => new Date(a.voyage.date).getTime() - new Date(b.voyage.date).getTime());
          setNextRes(active[0] ?? null);
        })
        .catch(() => {});
    }
  }, []);

  const fetchWeather = useCallback(async (cityName: string) => {
    if (weather[cityName] || loadingW === cityName) return;
    const key = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
    if (!key) return;
    setLoadingW(cityName);
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${cityName},CM&appid=${key}&units=metric&lang=${lang}`
      );
      if (!res.ok) return;
      const d = await res.json();
      setWeather(w => ({
        ...w,
        [cityName]: {
          temp: Math.round(d.main.temp),
          feels: Math.round(d.main.feels_like),
          desc: d.weather[0].description,
          icon: d.weather[0].icon,
          humidity: d.main.humidity,
          wind: Math.round(d.wind.speed * 3.6),
        },
      }));
    } catch { /* ignore */ }
    finally { setLoadingW(null); }
  }, [weather, loadingW, lang]);

  const handleCityClick = (city: City) => {
    setSelected(city);
    setPanel("city");
    fetchWeather(city.name);
  };

  const handleRouteClick = (rv: Voyage[]) => {
    setRouteVoyages(rv);
    setPanel("route");
  };

  const cityVoyages = selected
    ? voyages.filter(v => v.destination.toLowerCase() === selected.name.toLowerCase())
    : [];

  const departureVoyages = city
    ? voyages.filter(v => v.depart?.trim().toLowerCase() === city.toLowerCase())
    : voyages;

  const tabs = [
    { key: "carte" as Tab,  label: t("tab_map"),     icon: <MapPin size={16} /> },
    { key: "meteo" as Tab,  label: t("tab_weather"), icon: <Cloud size={16} /> },
    { key: "guide" as Tab,  label: t("tab_guide"),   icon: <BookOpen size={16} /> },
  ];

  if (pageLoading) return <PageLoader message={t("loading_explorer")} />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 py-5">
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">{t("explorer_title")}</h1>
        <p className="text-sm text-slate-400 mt-1">{t("explorer_subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 pt-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-black text-sm transition-all
              ${tab === t.key ? "bg-blue-600 text-white shadow-md" : "bg-white text-slate-500 border border-slate-200 hover:border-blue-300"}`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ═══ CARTE ═══ */}
      {tab === "carte" && (
        <div className="p-4 flex flex-col lg:flex-row gap-4">
          {/* Carte */}
          <div className="flex-1 w-full rounded-2xl overflow-hidden shadow-md h-[40vh] min-h-[250px] sm:h-72 lg:h-[360px]">
            <ExplorerMap
              voyages={voyages}
              selectedCity={selected}
              onCityClick={handleCityClick}
              onRouteClick={handleRouteClick}
              userPosition={coords}
              activeTrip={
                nextRes?.voyage?.status === "en_route"
                  ? {
                      from: departCity ? [departCity.lat, departCity.lng] : null,
                      to: destCity ? [destCity.lat, destCity.lng] : null,
                      bus: busPosition,
                    }
                  : null
              }
            />
          </div>

          {/* Panel latéral */}
          {panel === "city" && selected ? (
            <div className="lg:w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-md overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white relative">
                <button onClick={() => { setSelected(null); setPanel(null); }} className="absolute top-3 right-3 min-w-11 min-h-11 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30"><X size={16} /></button>
                <p className="text-xs font-bold opacity-70 uppercase tracking-widest">{selected.region}</p>
                <h2 className="text-2xl font-black mt-1">{selected.name}</h2>
                <p className="text-xs opacity-80 mt-2 leading-relaxed">{selected.description}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Météo */}
                {weather[selected.name] ? (
                  <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3">
                    <img src={`https://openweathermap.org/img/wn/${weather[selected.name].icon}@2x.png`} alt="météo" className="w-12 h-12" />
                    <div>
                      <p className="font-black text-2xl text-blue-700">{weather[selected.name].temp}°C</p>
                      <p className="text-xs text-slate-500 capitalize">{weather[selected.name].desc}</p>
                      <p className="text-xs text-slate-400">{t("weather_feels_label")} {weather[selected.name].feels}°C · {t("weather_wind_label")} {weather[selected.name].wind} km/h</p>
                    </div>
                  </div>
                ) : loadingW === selected.name ? (
                  <div className="bg-blue-50 rounded-xl p-3 text-center text-sm text-blue-400 animate-pulse">{t("weather_loading")}</div>
                ) : null}
                {/* Voyages */}
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t("voyages_to")} {selected.name} ({cityVoyages.length})</p>
                  {cityVoyages.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-3">{t("no_voyage_city")}</p>
                  ) : cityVoyages.slice(0, 5).map(v => (
                    <a key={v._id} href={`/voyages/${v._id}`} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 rounded-xl transition-colors group mb-2">
                      <div className="flex items-center gap-2">
                        <Bus size={14} className="text-blue-500" />
                        <div>
                          <p className="font-bold text-slate-700 text-xs">{v.depart} → {v.destination}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={9} />{v.heure} · {v.placesRestantes} pl.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-blue-600 font-black text-xs">{v.prix} FCFA</span>
                        <ChevronRight size={12} className="text-slate-300 group-hover:text-blue-400" />
                      </div>
                    </a>
                  ))}
                </div>
                {/* Guide rapide */}
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t("to_see")}</p>
                  <div className="flex flex-wrap gap-1">
                    {selected.toSee.slice(0, 3).map(s => <span key={s} className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full">{s}</span>)}
                  </div>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1"><Clock size={11} />{selected.travelTime}</div>
              </div>
            </div>

          ) : panel === "route" && routeVoyages ? (
            <div className="lg:w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-md overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-5 text-white relative">
                <button onClick={() => setPanel(null)} className="absolute top-3 right-3 min-w-11 min-h-11 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30"><X size={16} /></button>
                <p className="text-xs font-bold opacity-70 uppercase tracking-widest">{t("route_label")}</p>
                <h2 className="text-xl font-black mt-1">{routeVoyages[0].depart} → {routeVoyages[0].destination}</h2>
                <p className="text-xs opacity-80 mt-1">{routeVoyages.length} {routeVoyages.length > 1 ? t("trips_count_plural") : t("trips_count")}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {routeVoyages.map(v => (
                  <a key={v._id} href={`/voyages/${v._id}`} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 rounded-xl transition-colors group">
                    <div className="flex items-center gap-2">
                      <Bus size={14} className="text-blue-500" />
                      <div>
                        <p className="font-bold text-slate-700 text-xs">{v.typeBus}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={9} />{v.heure} · {v.placesRestantes} pl.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-blue-600 font-black text-xs">{v.prix} FCFA</span>
                      <ChevronRight size={12} className="text-slate-300 group-hover:text-blue-400" />
                    </div>
                  </a>
                ))}
              </div>
            </div>

          ) : (
            <div className="lg:w-80 bg-white rounded-2xl shadow-md flex flex-col overflow-hidden">
              {nextRes ? (
                <>
                  {/* Header statut */}
                  {nextRes.voyage.status === "en_route" ? (
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 text-white">
                      <div className="flex items-center gap-2 mb-1">
                        <Navigation size={16} className="animate-pulse" />
                        <p className="text-xs font-bold uppercase tracking-widest opacity-80">{t("in_transit")}</p>
                      </div>
                      <h2 className="text-lg font-black">{nextRes.voyage.depart || "?"} → {nextRes.voyage.destination}</h2>
                      <p className="text-xs opacity-75 mt-0.5">{t("departed_since")} {fmt(elapsed)}</p>
                    </div>
                  ) : nextRes.voyage.status === "arrived" ? (
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 size={16} />
                        <p className="text-xs font-bold uppercase tracking-widest opacity-80">{t("arrived")}</p>
                      </div>
                      <h2 className="text-lg font-black">{nextRes.voyage.destination}</h2>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-4 text-white">
                      <div className="flex items-center gap-2 mb-1">
                        <CalendarClock size={16} />
                        <p className="text-xs font-bold uppercase tracking-widest opacity-80">{t("next_trip")}</p>
                      </div>
                      <h2 className="text-lg font-black">{nextRes.voyage.depart || "?"} → {nextRes.voyage.destination}</h2>
                      <p className="text-xs opacity-75 mt-0.5">{t("departure_at")} {nextRes.voyage.heure}</p>
                    </div>
                  )}

                  {/* Barre de progression si en route */}
                  {nextRes.voyage.status === "en_route" && (
                    <div className="px-4 pt-3 pb-1">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>{nextRes.voyage.depart || t("region_depart")}</span>
                        <span>{nextRes.voyage.destination}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-1000"
                          style={{ width: `${progressPct !== null ? progressPct : Math.min(95, (elapsed / 14400) * 100)}%` }}
                        />
                      </div>
                      {progressPct !== null ? (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-[10px] text-red-600 font-black flex items-center justify-center gap-1">
                            <Radio size={10} className="animate-pulse" /> {t("live_position")}
                          </p>
                          <p className="text-[10px] text-slate-400 text-center">
                            {etaMinutes !== null ? `${t("eta_label")} ~${Math.round(etaMinutes)} min · ` : ""}
                            {remainingKm !== null ? `${Math.round(remainingKm)} ${t("km_remaining")}` : ""}
                          </p>
                          {busPosition && (
                            <p className="text-[9px] text-slate-300 text-center">
                              {t("last_update")} {fmt(Math.max(0, Math.floor((Date.now() - new Date(busPosition.updatedAt).getTime()) / 1000)))}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-1 text-center">{t("estimated_progress")}</p>
                      )}
                    </div>
                  )}

                  {/* Détails */}
                  <div className="p-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600"><Clock size={14} />{nextRes.voyage.heure} — {new Date(nextRes.voyage.date).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { day: "numeric", month: "long" })}</div>
                    <div className="flex items-center gap-2 text-slate-600"><Bus size={14} />{nextRes.voyage.typeBus} · {nextRes.nbPlaces} {t("seat_word")}{nextRes.nbPlaces > 1 ? "s" : ""}</div>
                    <a href="/reservations" className="mt-2 flex items-center gap-1 text-xs font-black text-blue-600 hover:underline">
                      {t("see_reservations")} <ChevronRight size={12} />
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-4 text-white">
                    <p className="text-xs font-bold opacity-60 uppercase tracking-widest">{t("available_voyages_count")}</p>
                    <h2 className="text-lg font-black mt-0.5">{departureVoyages.length} {departureVoyages.length > 1 ? t("trips_count_plural") : t("trips_count")}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <select
                        value={city ?? ""}
                        onChange={e => setCity(e.target.value || null)}
                        className="text-xs font-bold rounded-lg px-2 py-1 bg-white/10 border border-white/20 text-white"
                      >
                        <option value="" className="text-slate-800">{t("all_cities")}</option>
                        {CITIES.map(c => (
                          <option key={c.name} value={c.name} className="text-slate-800">{c.name}</option>
                        ))}
                      </select>
                      {(status === "denied" || status === "unsupported") && !city && (
                        <button onClick={requestLocation} className="text-xs font-black underline opacity-90">
                          {t("detect_location")}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[300px]">
                    {departureVoyages.length === 0 ? (
                      <div className="text-center py-6 text-sm text-slate-400">
                        {t("no_trip_for_city")} {city} ·{" "}
                        <button onClick={() => setCity(null)} className="font-black text-blue-600 hover:underline">
                          {t("see_all_trips")}
                        </button>
                      </div>
                    ) : departureVoyages.map(v => (
                      <a key={v._id} href={`/voyages/${v._id}`} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 rounded-xl transition-colors group">
                        <div className="flex items-center gap-2">
                          <Bus size={13} className="text-blue-500 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-slate-700 text-xs">{v.depart ? `${v.depart} → ` : ""}{v.destination}</p>
                            <p className="text-[10px] text-slate-400">{v.heure} · {v.typeBus}</p>
                          </div>
                        </div>
                        <span className="text-blue-600 font-black text-xs">{v.prix.toLocaleString()} F</span>
                      </a>
                    ))}
                  </div>
                </>
              )}
              {/* Légende */}
              <div className="border-t border-slate-100 p-3 space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t("map_legend")}</p>
                <span className="flex items-center gap-2 text-xs text-slate-500"><span className="w-6 h-1 rounded bg-blue-500 inline-block"></span>{t("legend_classic")}</span>
                <span className="flex items-center gap-2 text-xs text-slate-500"><span className="w-6 h-1 rounded bg-purple-500 inline-block"></span>{t("legend_vip")}</span>
                <span className="flex items-center gap-2 text-xs text-slate-500"><span className="w-6 h-1 rounded bg-amber-500 inline-block"></span>{t("legend_super_vip")}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ MÉTÉO ═══ */}
      {tab === "meteo" && (
        <div className="p-4">
          {!process.env.NEXT_PUBLIC_OPENWEATHER_KEY ? (
            <div className="max-w-md mx-auto mt-8 bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-center space-y-3">
              <Cloud size={40} className="text-amber-400 mx-auto" />
              <p className="font-black text-amber-700">{t("weather_unavailable")}</p>
              <p className="text-sm text-amber-600">
                {t("weather_setup_sub_prefix")}{" "}
                <a href="https://openweathermap.org" target="_blank" className="underline font-bold">openweathermap.org</a>{" "}
                {t("weather_setup_sub_suffix")}
              </p>
              <code className="block bg-amber-100 rounded-xl px-4 py-2 text-sm font-mono text-amber-800">
                NEXT_PUBLIC_OPENWEATHER_KEY={t("weather_setup_key_placeholder")}
              </code>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {CITIES.map(city => (
                <WeatherCard
                  key={city.name}
                  city={city}
                  data={weather[city.name]}
                  loading={loadingW === city.name}
                  onLoad={() => fetchWeather(city.name)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ GUIDE ═══ */}
      {tab === "guide" && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CITIES.map(city => {
            const count = voyages.filter(v => v.destination.toLowerCase() === city.name.toLowerCase()).length;
            return (
              <div key={city.name} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-4 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{city.region}</p>
                      <h3 className="text-xl font-black">{city.name}</h3>
                    </div>
                    {count > 0 && (
                      <span className="bg-white/20 text-white text-[10px] font-black px-2 py-1 rounded-full">
                        {count} {count > 1 ? t("voyage_count_plural") : t("voyage_count_singular")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs opacity-80 mt-2 leading-relaxed">{city.description}</p>
                </div>

                <div className="p-4 space-y-3">
                  {/* À voir */}
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                      <Eye size={10} /> {t("to_see")}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {city.toSee.map(s => (
                        <span key={s} className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>

                  {/* Conseils */}
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                      <Lightbulb size={10} /> {t("tips")}
                    </p>
                    <ul className="space-y-1">
                      {city.tips.map(tip => (
                        <li key={tip} className="text-[11px] text-slate-600 flex items-start gap-1">
                          <ThumbsUp size={9} className="text-blue-400 mt-0.5 flex-shrink-0" />{tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Trajet */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={10} /> {city.travelTime}
                    </span>
                    {count > 0 && (
                      <a
                        href={`/voyages?q=${city.name}`}
                        className="text-[10px] font-black text-blue-600 hover:underline flex items-center gap-0.5"
                      >
                        {t("see_voyages")} <ChevronRight size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Carte météo individuelle ── */
function WeatherCard({ city, data, loading, onLoad }: {
  city: City;
  data?: WeatherData;
  loading: boolean;
  onLoad: () => void;
}) {
  const { t } = useLang();
  useEffect(() => { onLoad(); }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col items-center text-center gap-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{city.region}</p>
      <p className="font-black text-slate-700">{city.name}</p>
      {loading ? (
        <p className="text-xs text-slate-300 animate-pulse mt-2">…</p>
      ) : data ? (
        <>
          <img src={`https://openweathermap.org/img/wn/${data.icon}@2x.png`} alt="" className="w-12 h-12" />
          <p className="text-2xl font-black text-blue-600">{data.temp}°C</p>
          <p className="text-[11px] text-slate-500 capitalize">{data.desc}</p>
          <div className="flex gap-3 text-[10px] text-slate-400 mt-1">
            <span>💧 {data.humidity}%</span>
            <span>💨 {data.wind} km/h</span>
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-300 mt-2">{t("weather_not_available")}</p>
      )}
    </div>
  );
}
