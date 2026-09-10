"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  UserCircle,
  Bookmark,
  Wallet,
  Settings,
  HelpCircle,
  LogOut,
  Camera,
  Trash2,
  Building2,
} from "lucide-react";
import styles from "./UserMenu.module.css";
import { getMonProfil } from "@/lib/client.service";
import { useLang } from "@/context/LanguageContext";

export default function UserMenu({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const { t } = useLang();
  const [openMenu, setOpenMenu] = useState(false);
  const [userData, setUserData] = useState<{ name?: string; avatar?: string; phone?: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const closeMenu = () => setOpenMenu(false);

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated) { setUserData(null); return; }
      try {
        const { client } = await getMonProfil();
        setUserData({ name: client.name, avatar: client.avatar, phone: client.phone });
      } catch {
        setUserData(null);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeMenu();
    };

    loadData();
    window.addEventListener("auth-change", loadData);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("auth-change", loadData);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAuthenticated]);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const saveAvatarToApi = async (avatar: string) => {
    const token = localStorage.getItem("token");
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/update/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ avatar }),
    });
    window.dispatchEvent(new Event("auth-change"));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 300;
        const ratio = Math.min(MAX / img.width, MAX / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        saveAvatarToApi(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t("delete_photo_confirm"))) saveAvatarToApi("");
  };

  const handleLogout = () => {
    closeMenu();
    localStorage.removeItem("token");
    localStorage.removeItem("client");
    localStorage.removeItem("client_vault");
    window.dispatchEvent(new Event("auth-change"));
    window.location.href = "/";
  };

  if (!isAuthenticated) {
    return (
      <Link href="/auth/login" className={styles.iconBtn}>
        <UserCircle size={24} />
      </Link>
    );
  }

  return (
    <div className={styles.wrapper} ref={menuRef}>
      <button className={styles.iconBtn} onClick={() => setOpenMenu(!openMenu)}>
        {userData?.avatar ? (
          <img src={userData.avatar} alt="Profile" className={styles.profileImg} />
        ) : (
          <UserCircle size={24} />
        )}
      </button>

      {openMenu && (
        <div className={styles.dropdown}>
          <div className={styles.userInfo}>
            <div className={styles.avatarContainer}>
              {userData?.avatar && (
                <button className={styles.deletePhotoBtn} onClick={handleRemovePhoto}>
                  <Trash2 size={12} />
                </button>
              )}
              <div onClick={handleAvatarClick} style={{ position: 'relative' }}>
                {userData?.avatar ? (
                  <img src={userData.avatar} className={styles.userAvatar} />
                ) : (
                  <UserCircle size={50} className="text-slate-400" />
                )}
                <div className={styles.cameraOverlay}><Camera size={12} /></div>
              </div>
            </div>
            <input type="file" ref={fileInputRef} className={styles.fileInput} accept="image/*" onChange={handleFileChange} />
            <span className={styles.userName}>{userData?.name || t("user_default")}</span>
            {userData?.phone ? (
              <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 'bold' }}>📞 {userData.phone}</span>
            ) : (
              <Link href="/profile" onClick={closeMenu} style={{ fontSize: '11px', color: '#f97316', fontWeight: 'bold', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px' }}>
                ⚠️ {t("add_phone")}
              </Link>
            )}
          </div>

          <Link href="/reservations" className={styles.dropdownItem} onClick={closeMenu}><Bookmark size={18} /> {t("my_reservations")}</Link>
          <Link href="/wallet" className={styles.dropdownItem} onClick={closeMenu}><Wallet size={18} /> {t("wallet")}</Link>
          <hr />
          <Link href="/profile" className={styles.dropdownItem} onClick={closeMenu}><Settings size={18} /> {t("account_settings")}</Link>
          <Link href="/agence" className={styles.dropdownItem} onClick={closeMenu}><Building2 size={18} /> {t("agencies_page")}</Link>
          <Link href="/help" className={styles.dropdownItem} onClick={closeMenu}><HelpCircle size={18} /> {t("help")}</Link>
          <hr />
          <button className={`${styles.dropdownItem} ${styles.logoutBtn}`} onClick={handleLogout} style={{ color: '#dc2626', fontWeight: 'bold' }}>
            <LogOut size={18} /> <span>{t("logout")}</span>
          </button>
        </div>
      )}
    </div>
  );
}