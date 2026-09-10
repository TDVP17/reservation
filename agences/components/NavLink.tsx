// components/NavLink.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useLoading } from "@/contexts/LoadingContext";

type NavLinkProps = {
  href: string;
  /** Message affiché dans l'overlay pendant la navigation vers cette page */
  message: string;
  className?: string;
  children: ReactNode;
};

/**
 * Wrapper autour de next/link qui déclenche l'overlay global de chargement
 * avec un message contextuel, sans casser le comportement natif du Link
 * (préchargement, ouverture dans un nouvel onglet via ctrl/cmd+clic, etc.).
 */
export default function NavLink({ href, message, className, children }: NavLinkProps) {
  const pathname = usePathname();
  const { showLoading } = useLoading();

  const handleClick = () => {
    // Déjà sur la page cible : rien à charger.
    if (pathname === href) return;
    showLoading(message);
  };

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
