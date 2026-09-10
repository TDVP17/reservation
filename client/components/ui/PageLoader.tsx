"use client";
import { Loader2 } from "lucide-react";

export default function PageLoader({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-slate-100 to-indigo-200 blur-md scale-105" />
      <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/80" />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <Loader2 size={42} className="animate-spin text-blue-600" />
        {message && <p className="text-sm font-bold text-slate-600">{message}</p>}
      </div>
    </div>
  );
}
