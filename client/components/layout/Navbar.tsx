"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Search, Globe, Check, Bus, Clock, Sun, Moon } from "lucide-react";
import styles from "./Navbar.module.css";
import UserMenu from "@/components/layout/UserMenu";
import NotificationBell from "@/components/layout/NotificationBell";
import { getAllVoyages, Voyage } from "@/lib/voyage.service";
import { useLang } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

type Props = {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
};

export default function Navbar({ sidebarOpen, setSidebarOpen }: Props) {
  const router = useRouter();
  const { lang, setLang, t } = useLang();
  const { theme, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<Voyage[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const [openLang, setOpenLang] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim().length > 0) {
      try {
        const data = await getAllVoyages();
        const filtered = data.filter((v) =>
          v.destination.toLowerCase().startsWith(value.toLowerCase())
        );
        setSuggestions(filtered.slice(0, 5));
        setShowSuggestions(true);
      } catch {
        // ignore
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setShowSuggestions(false);
      router.push(`/voyages?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setOpenLang(false);
      }
      if (
        searchRef.current && !searchRef.current.contains(e.target as Node) &&
        mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const checkAuth = () => setIsAuthenticated(!!localStorage.getItem("token"));
    checkAuth();
    window.addEventListener("auth-change", checkAuth);
    return () => window.removeEventListener("auth-change", checkAuth);
  }, []);

  const suggestionsList = showSuggestions && suggestions.length > 0 ? (
    <div className="absolute top-[110%] left-0 w-full bg-white dark:bg-slate-800 shadow-2xl rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-[100]">
      <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("suggestions")}</p>
      </div>
      {suggestions.map((s) => (
        <div
          key={s._id}
          onClick={() => {
            setSearchTerm(s.destination);
            setShowSuggestions(false);
            router.push(`/voyages/${s._id}`);
          }}
          className="flex items-center justify-between p-4 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-50 dark:border-slate-700 last:border-0 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bus size={16} className="text-blue-600" />
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100 text-sm uppercase">{s.destination}</p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock size={10} /> {t("departure")} {s.heure}
              </p>
            </div>
          </div>
          <p className="text-blue-600 font-black text-xs">{s.prix} FCFA</p>
        </div>
      ))}
      <button
        onClick={handleSearch}
        className="w-full p-3 text-center text-xs font-bold text-slate-400 hover:text-blue-600 bg-slate-50 dark:bg-slate-900 transition-colors"
      >
        {t("search_results")}
      </button>
    </div>
  ) : null;

  return (
    <nav className={styles.navbar}>
      {/* LIGNE 1 */}
      <div className={styles.topRow}>
        <div className={styles.left}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={22} />
          </button>
          <Link href="/" className={styles.logo}>EasyTicket</Link>
        </div>

        <div className={styles.center} ref={searchRef}>
          <form onSubmit={handleSearch} className={styles.searchBox}>
            <input
              placeholder={t("search_placeholder")}
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={() => searchTerm.length > 0 && setShowSuggestions(true)}
            />
            <button type="submit" className={styles.searchBtn}>
              <Search size={18} />
            </button>
            {suggestionsList}
          </form>
        </div>

        <div className={styles.right}>
          {/* Toggle thème */}
          <button
            onClick={toggleTheme}
            className={styles.iconBtn}
            title={theme === "dark" ? t("light_mode") : t("dark_mode")}
            aria-label={theme === "dark" ? t("light_mode") : t("dark_mode")}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Menu langue */}
          <div className={styles.langWrapper} ref={langRef}>
            <button className={styles.iconBtn} onClick={() => setOpenLang(!openLang)}>
              <Globe size={20} />
            </button>
            {openLang && (
              <div className={styles.langDropdown}>
                <button
                  className={`${styles.langItem} ${lang === "fr" ? styles.langActive : ""}`}
                  onClick={() => { setLang("fr"); setOpenLang(false); }}
                >
                  🇫🇷 Français {lang === "fr" && <Check size={14} />}
                </button>
                <button
                  className={`${styles.langItem} ${lang === "en" ? styles.langActive : ""}`}
                  onClick={() => { setLang("en"); setOpenLang(false); }}
                >
                  🇬🇧 English {lang === "en" && <Check size={14} />}
                </button>
              </div>
            )}
          </div>

          {isAuthenticated && <NotificationBell />}
          <UserMenu isAuthenticated={isAuthenticated} />
        </div>
      </div>

      {/* LIGNE 2 MOBILE */}
      <div className={styles.mobileSearch} ref={mobileSearchRef}>
        <form onSubmit={handleSearch} className={styles.searchBox}>
          <input
            placeholder={t("search_placeholder")}
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => searchTerm.length > 0 && setShowSuggestions(true)}
          />
          <button type="submit" className={styles.searchBtn}>
            <Search size={18} />
          </button>
          {suggestionsList}
        </form>
      </div>
    </nav>
  );
}
