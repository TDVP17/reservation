"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  Home,
  Bus,
  Compass,
  Bookmark,
  PackageSearch,
  Wallet,
  Settings,
  LogOut,
  UserCircle,
  HelpCircle,
} from "lucide-react";
import styles from "./MobileDrawer.module.css";
import { useLang } from "@/context/LanguageContext";
import { useLoading } from "@/contexts/LoadingContext";
import { getMonProfil, logoutClient } from "@/lib/client.service";

type Props = { open: boolean; onClose: () => void };

type UserData = { name?: string; email?: string; avatar?: string };

type MenuItem = {
  labelKey: "home" | "voyages" | "explorer" | "reservations" | "wallet" | "expedition";
  icon: typeof Home;
  href: string;
  loadingKey: "loading_dashboard" | "loading_trips" | "loading_explorer" | "loading_tickets" | "loading_balance" | "loading_shipments";
};

export default function MobileDrawer({ open, onClose }: Props) {
  const pathname = usePathname();
  const { t } = useLang();
  const { showLoading } = useLoading();
  const [isAuth, setIsAuth] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const checkAuth = () => setIsAuth(!!localStorage.getItem("token"));
    checkAuth();
    window.addEventListener("auth-change", checkAuth);
    return () => window.removeEventListener("auth-change", checkAuth);
  }, []);

  // Filet de sécurité : ferme le tiroir à tout changement de route (même
  // déclenché autrement que par les liens internes du tiroir).
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!isAuth) {
      setUserData(null);
      return;
    }
    getMonProfil()
      .then(({ client }) => setUserData({ name: client.name, email: client.email, avatar: client.avatar }))
      .catch(() => setUserData(null));
  }, [isAuth]);

  // Bloque le scroll de la page tant que le tiroir est ouvert.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const publicMenu: MenuItem[] = [
    { labelKey: "home", icon: Home, href: "/", loadingKey: "loading_dashboard" },
    { labelKey: "voyages", icon: Bus, href: "/voyages", loadingKey: "loading_trips" },
    { labelKey: "explorer", icon: Compass, href: "/explorer", loadingKey: "loading_explorer" },
  ];

  const privateMenu: MenuItem[] = [
    { labelKey: "reservations", icon: Bookmark, href: "/reservations", loadingKey: "loading_tickets" },
    { labelKey: "wallet", icon: Wallet, href: "/wallet", loadingKey: "loading_balance" },
    { labelKey: "expedition", icon: PackageSearch, href: "/expedition", loadingKey: "loading_shipments" },
  ];

  const handleNav = (item: MenuItem) => {
    onClose();
    if (pathname !== item.href) showLoading(t(item.loadingKey));
  };

  const handleLogout = () => {
    onClose();
    logoutClient();
    window.dispatchEvent(new Event("auth-change"));
    window.location.href = "/";
  };

  return (
    <>
      {open && <div className={styles.backdrop} onClick={onClose} />}

      <aside className={`${styles.drawer} ${open ? styles.open : ""}`}>
        <div className={styles.header}>
          <span className={styles.logo}>EasyTicket</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label={t("close_btn")}>
            <X size={20} />
          </button>
        </div>

        {isAuth ? (
          <Link href="/profile" onClick={onClose} className={styles.userSection}>
            {userData?.avatar ? (
              <img src={userData.avatar} alt="" className={styles.avatar} />
            ) : (
              <UserCircle size={44} className={styles.avatarPlaceholder} />
            )}
            <div className={styles.userInfo}>
              <span className={styles.userName}>{userData?.name || t("user_default")}</span>
              {userData?.email && <span className={styles.userEmail}>{userData.email}</span>}
            </div>
          </Link>
        ) : (
          <Link href="/auth/login" onClick={onClose} className={styles.loginPrompt}>
            <UserCircle size={24} />
          </Link>
        )}

        <nav className={styles.menu}>
          {publicMenu.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => handleNav(item)}
              className={`${styles.item} ${pathname === item.href ? styles.active : ""}`}
            >
              <item.icon size={20} /> <span>{t(item.labelKey)}</span>
            </Link>
          ))}

          {isAuth && (
            <>
              <hr className={styles.divider} />
              {privateMenu.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => handleNav(item)}
                  className={`${styles.item} ${pathname === item.href ? styles.active : ""}`}
                >
                  <item.icon size={20} /> <span>{t(item.labelKey)}</span>
                </Link>
              ))}
              <Link href="/profile" onClick={onClose} className={styles.item}>
                <Settings size={20} /> <span>{t("account_settings")}</span>
              </Link>
            </>
          )}

          <hr className={styles.divider} />
          <Link href="/help" onClick={onClose} className={styles.item}>
            <HelpCircle size={20} /> <span>{t("help")}</span>
          </Link>
        </nav>

        {isAuth && (
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={20} /> <span>{t("logout")}</span>
          </button>
        )}
      </aside>
    </>
  );
}
