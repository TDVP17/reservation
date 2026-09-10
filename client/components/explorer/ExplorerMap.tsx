"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
// Sans ce CSS, Leaflet rend une carte cassée (tuiles mal alignées, contrôles
// de zoom non stylés, icônes énormes) — c'est le piège classique de
// react-leaflet + Next.js quand ce fichier n'est importé nulle part.
import "leaflet/dist/leaflet.css";
import { CITIES, City } from "@/lib/cityGuide";
import { Voyage } from "@/lib/voyage.service";
import { useLang } from "@/context/LanguageContext";

// Fix Leaflet icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TYPE_COLORS: Record<string, string> = {
  "Classique":  "#3b82f6",
  "VIP":        "#8b5cf6",
  "Super VIP":  "#f59e0b",
};

function cityCoords(name: string): [number, number] | null {
  const c = CITIES.find(c => c.name.toLowerCase() === name?.toLowerCase());
  return c ? [c.lat, c.lng] : null;
}

function cityIcon(isSelected: boolean) {
  const color = isSelected ? "#1d4ed8" : "#475569";
  const size  = isSelected ? 12 : 8;
  return L.divIcon({
    html: `<div style="width:${size * 2}px;height:${size * 2}px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    iconSize: [size * 2, size * 2],
    iconAnchor: [size, size],
    className: "",
  });
}

function userIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;width:20px;height:20px">
        <div style="position:absolute;inset:0;background:#ef4444;opacity:0.3;border-radius:50%;animation:pulse-ring 1.6s ease-out infinite"></div>
        <div style="position:absolute;top:5px;left:5px;width:10px;height:10px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>
      </div>
      <style>@keyframes pulse-ring{0%{transform:scale(0.6);opacity:0.6}100%{transform:scale(2.4);opacity:0}}</style>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    className: "",
  });
}

function busIcon() {
  return L.divIcon({
    html: `<div style="width:26px;height:26px;background:#dc2626;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🚌</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    className: "",
  });
}

function FlyTo({ city }: { city: City | null }) {
  const map = useMap();
  useEffect(() => {
    if (city) map.flyTo([city.lat, city.lng], 9, { duration: 1 });
  }, [city, map]);
  return null;
}

// Sur mobile, Leaflet se monte parfois avant que la mise en page CSS du
// conteneur ne soit stabilisée (onglet qui vient de s'ouvrir, animation en
// cours, clavier virtuel, rotation d'écran…) — la carte se fige alors sur un
// canvas de hauteur 0 (rectangle gris). On force Leaflet à recalculer sa
// taille juste après le montage, puis à chaque redimensionnement/rotation.
function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 300);
    const t2 = setTimeout(() => map.invalidateSize(), 800);

    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [map]);
  return null;
}

type Route = {
  depart: string;
  destination: string;
  voyages: Voyage[];
};

type ActiveTrip = {
  from: [number, number] | null;
  to: [number, number] | null;
  bus: { lat: number; lng: number } | null;
};

type Props = {
  voyages: Voyage[];
  selectedCity: City | null;
  onCityClick: (city: City) => void;
  onRouteClick: (voyages: Voyage[]) => void;
  userPosition?: { lat: number; lng: number } | null;
  activeTrip?: ActiveTrip | null;
};

export default function ExplorerMap({ voyages, selectedCity, onCityClick, onRouteClick, userPosition, activeTrip }: Props) {
  const { t } = useLang();

  // Grouper les voyages par route unique depart→destination
  const routeMap: Record<string, Route> = {};
  voyages.forEach(v => {
    if (!v.depart || !v.destination) return;
    const key = `${v.depart}→${v.destination}`;
    if (!routeMap[key]) routeMap[key] = { depart: v.depart, destination: v.destination, voyages: [] };
    routeMap[key].voyages.push(v);
  });
  const routes = Object.values(routeMap);

  // Villes avec au moins un voyage (pour marqueur plus visible)
  const activeCities = new Set<string>();
  voyages.forEach(v => { if (v.depart) activeCities.add(v.depart); if (v.destination) activeCities.add(v.destination); });

  return (
    <MapContainer
      center={[4.5, 12.0]}
      zoom={7}
      style={{ height: "100%", width: "100%", minHeight: 250, borderRadius: "16px" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
      />
      <FlyTo city={selectedCity} />
      <MapResizeFix />

      {/* LIGNES DE TRAJETS */}
      {routes.map(route => {
        const from = cityCoords(route.depart);
        const to   = cityCoords(route.destination);
        if (!from || !to) return null;

        // Couleur dominante selon le type de bus le plus fréquent
        const types = route.voyages.map(v => v.typeBus);
        const dominant = types.sort((a,b) => types.filter(t=>t===b).length - types.filter(t=>t===a).length)[0];
        const color = TYPE_COLORS[dominant] || "#3b82f6";
        const weight = Math.min(2 + route.voyages.length * 1.5, 8);

        return (
          <Polyline
            key={`${route.depart}-${route.destination}`}
            positions={[from, to]}
            pathOptions={{ color, weight, opacity: 0.75, dashArray: undefined }}
            eventHandlers={{ click: () => onRouteClick(route.voyages) }}
          >
            <Tooltip sticky>
              <strong>{route.depart} → {route.destination}</strong><br />
              {route.voyages.length} {route.voyages.length > 1 ? t("voyage_count_plural") : t("voyage_count_singular")} {t("available_suffix")}
            </Tooltip>
          </Polyline>
        );
      })}

      {/* TRAJET ACTIF (réservation en cours) */}
      {activeTrip?.from && activeTrip?.to && (
        <Polyline
          positions={[activeTrip.from, activeTrip.to]}
          pathOptions={{ color: "#dc2626", weight: 5, opacity: 0.9, dashArray: "10 8" }}
        />
      )}
      {activeTrip?.bus && (
        <Marker position={[activeTrip.bus.lat, activeTrip.bus.lng]} icon={busIcon()}>
          <Popup>{t("bus_position_label")}</Popup>
        </Marker>
      )}

      {/* MA POSITION */}
      {userPosition && (
        <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon()}>
          <Popup>{t("you_are_here_label")}</Popup>
        </Marker>
      )}

      {/* MARQUEURS VILLES */}
      {CITIES.map(city => {
        const isActive   = activeCities.has(city.name);
        const isSelected = selectedCity?.name === city.name;

        return (
          <Marker
            key={city.name}
            position={[city.lat, city.lng]}
            icon={cityIcon(isSelected || isActive)}
            eventHandlers={{ click: () => onCityClick(city) }}
          >
            <Popup>
              <strong>{city.name}</strong><br />
              <span style={{ fontSize: 12, color: "#64748b" }}>{city.region}</span>
            </Popup>
            <Tooltip direction="top" offset={[0, -10]} permanent>
              <span style={{ fontSize: 11, fontWeight: "bold" }}>{city.name}</span>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
