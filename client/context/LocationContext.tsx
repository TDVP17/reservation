"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { findNearestCity } from "@/lib/cityGuide";

type LocationStatus = "idle" | "prompting" | "granted" | "denied" | "unsupported";

type Coords = { lat: number; lng: number };

type ContextType = {
  city: string | null;
  coords: Coords | null;
  status: LocationStatus;
  isManual: boolean;
  requestLocation: () => void;
  setCity: (name: string | null) => void;
};

const LocationContext = createContext<ContextType>({
  city: null,
  coords: null,
  status: "idle",
  isManual: false,
  requestLocation: () => {},
  setCity: () => {},
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [city, setCityState] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [isManual, setIsManual] = useState(false);
  const [status, setStatus] = useState<LocationStatus>("idle");

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }

    setStatus("prompting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = findNearestCity(pos.coords.latitude, pos.coords.longitude);
        setCityState(nearest.name);
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsManual(false);
        setStatus("granted");
        localStorage.setItem("userCity", nearest.name);
        localStorage.setItem("userCityManual", "false");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  useEffect(() => {
    const savedCity = localStorage.getItem("userCity");
    if (savedCity) {
      setCityState(savedCity);
      setIsManual(localStorage.getItem("userCityManual") === "true");
      setStatus("granted");
      return;
    }
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCity = useCallback((name: string | null) => {
    setCityState(name);
    setIsManual(true);
    if (name) {
      localStorage.setItem("userCity", name);
      localStorage.setItem("userCityManual", "true");
    } else {
      localStorage.removeItem("userCity");
      localStorage.removeItem("userCityManual");
    }
  }, []);

  return (
    <LocationContext.Provider value={{ city, coords, status, isManual, requestLocation, setCity }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useLocation = () => useContext(LocationContext);
