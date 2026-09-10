// components/ui/GlobalLoader.tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

type GlobalLoaderProps = {
  /** Contrôle l'affichage/masquage (animé) de l'overlay */
  show: boolean;
  /** Message dynamique affiché sous le spinner */
  message?: string;
};

/**
 * Overlay de chargement standard de l'app (design extrait de la page Solde).
 * `absolute inset-0` — pas `fixed` — pour rester scopé au panneau de
 * contenu (<main> dans app/layout.tsx, qui est `relative`) et ne jamais
 * recouvrir la Sidebar / Navbar / BottomNav.
 */
export default function GlobalLoader({ show, message }: GlobalLoaderProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="global-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={42} className="animate-spin text-[#876aac]" />
            {message && (
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                {message}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
