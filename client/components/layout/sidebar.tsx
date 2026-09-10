"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bus, Compass, Bookmark, PackageSearch, Wallet } from "lucide-react";
import styles from "./sideBar.module.css";
import { useLang } from "@/context/LanguageContext";
import { useLoading } from "@/contexts/LoadingContext";

type Props = { sidebarOpen: boolean; setSidebarOpen: (v: boolean) => void };

export default function Sidebar({ sidebarOpen, setSidebarOpen }: Props) {
  const pathname = usePathname();
  const { t } = useLang();
  const { showLoading } = useLoading();
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    setIsAuth(!!localStorage.getItem("token"));
  }, []);

  const publicMenu = [
    { labelKey: "home" as const, icon: Home, href: "/", loadingKey: "loading_dashboard" as const },
    { labelKey: "voyages" as const, icon: Bus, href: "/voyages", loadingKey: "loading_trips" as const },
    { labelKey: "explorer" as const, icon: Compass, href: "/explorer", loadingKey: "loading_explorer" as const },
  ];

  const privateMenu = [
    { labelKey: "reservations" as const, icon: Bookmark,      href: "/reservations", loadingKey: "loading_tickets" as const },
    { labelKey: "wallet"       as const, icon: Wallet,        href: "/wallet",       loadingKey: "loading_balance" as const },
    { labelKey: "expedition"   as const, icon: PackageSearch, href: "/expedition",   loadingKey: "loading_shipments" as const },
  ];

  const renderItem = (item: typeof publicMenu[0] | typeof privateMenu[0]) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;
    const label = t(item.labelKey);

    const handleClick = () => {
      setSidebarOpen(false);
      if (pathname !== item.href) showLoading(t(item.loadingKey));
    };

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={handleClick}
        className={`${styles.item} ${isActive ? styles.active : ""}`}
      >
        <Icon size={20} />
        {sidebarOpen && <span className={styles.label}>{label}</span>}
      </Link>
    );
  };

  return (
    <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.closed}`}>
      <nav className={styles.menu}>
        {publicMenu.map(renderItem)}
        {isAuth && privateMenu.map(renderItem)}
      </nav>
    </aside>
  );
}
