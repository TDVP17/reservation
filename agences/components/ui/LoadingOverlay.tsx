// components/ui/LoadingOverlay.tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";

type LoadingOverlayProps = {
  /** Contrôle l'affichage/masquage (animé) de l'overlay */
  show: boolean;
  /** Message dynamique affiché sous le spinner */
  message?: string;
};

/**
 * Overlay de chargement global, réutilisable partout dans l'app :
 * navigation, fetch de données, mutations, etc.
 * Purement présentationnel — ne dépend d'aucun contexte.
 */
export default function LoadingOverlay({
  show,
  message,
}: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-white/50 backdrop-blur-md"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-col items-center gap-5 rounded-3xl border border-white/60 bg-white/70 px-10 py-8 shadow-2xl backdrop-blur-xl"
          >
            {/* Spinner à double anneau */}
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#245BCF] border-r-[#245BCF]" />
            </div>

            {message && (
              <p className="text-sm font-medium tracking-wide text-gray-600">
                {message}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
