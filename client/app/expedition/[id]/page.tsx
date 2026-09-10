"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { io as socketIO, Socket } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import { useLang } from "@/context/LanguageContext";
import {
  Package, Clock, CheckCircle2, Loader2, X, Send,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
type Shipment = {
  _id: string; contenu: string; valeur: number; image: string;
  regionDepart: string; regionDestination: string;
  villeDepart: string; villeDestination: string;
  adresseDepart: string;
  prixExpedition: number; fraisPlateforme: number; montantTotal: number;
  status: string;
  codeClient: string; codeAgence: string;
  arrivedAt: string | null; collectedAt: string | null;
  agence: { name: string; ville: string; telephone: string };
  agenceDestination: { name: string; ville: string; telephone: string };
  expediteur: { name: string; phone: string };
};

const STATUS_STEPS = ["En attente", "Reçu en agence de départ", "En transit", "Arrivé en agence de destination", "Collecté"];
const STATUS_COLORS: Record<string, string> = {
  "En attente":                       "amber",
  "Reçu en agence de départ":         "purple",
  "En transit":                       "orange",
  "Arrivé en agence de destination":  "blue",
  "Collecté":                         "green",
  "Annulé":                           "red",
};

export default function TrackingPage() {
  const { id } = useParams();
  const { t, lang } = useLang();
  const socketRef = useRef<Socket | null>(null);

  const SHIPMENT_STATUS_LABEL: Record<string, string> = {
    "En attente":                      t("ship_status_pending"),
    "Reçu en agence de départ":        t("ship_status_received_origin"),
    "En transit":                      t("ship_status_in_transit"),
    "Arrivé en agence de destination": t("ship_status_arrived_destination"),
    "Collecté":                        t("ship_status_collected"),
    "Annulé":                          t("ship_status_cancelled"),
  };

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading]   = useState(true);

  // Charger l'expédition
  const load = async () => {
    try {
      const res = await api.get(`/shipments/${id}`);
      setShipment(res.data);
    } catch {
      // essayer par code de suivi
      try {
        const res = await api.get(`/shipments/track/${id}`);
        setShipment(res.data);
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  // Socket.io
  useEffect(() => {
    if (!id) return;
    const socket = socketIO(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4004", {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.emit("join-shipment", id);

    socket.on("statut-change", () => { load(); });

    return () => { socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  if (!shipment) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <p className="text-slate-400 font-bold">{t("tracking_not_found")}</p>
    </div>
  );

  const color     = STATUS_COLORS[shipment.status] || "slate";
  const stepIndex = STATUS_STEPS.indexOf(shipment.status);

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header colis */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-6 flex items-center gap-4">
            {shipment.image ? (
              <img src={shipment.image} alt="" className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Package size={28} className="text-blue-600" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-black text-slate-800 dark:text-slate-100">{shipment.contenu}</h1>
              <p className="text-sm text-slate-400">{shipment.valeur.toLocaleString()} FCFA</p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-black bg-${color}-100 text-${color}-700 dark:bg-${color}-900/30 dark:text-${color}-300`}>
              {SHIPMENT_STATUS_LABEL[shipment.status] || shipment.status}
            </span>
          </div>

          {/* Trajet */}
          <div className="px-6 pb-6 flex items-center gap-3">
            <div className="flex-1 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase">{t("region_depart")}</p>
              <p className="font-black text-slate-700 dark:text-slate-200">{shipment.agence?.name}</p>
              <p className="text-xs text-slate-400 truncate">{shipment.villeDepart || shipment.regionDepart}</p>
            </div>
            <div className="flex-shrink-0 text-slate-300">→</div>
            <div className="flex-1 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase">{t("region_destination")}</p>
              <p className="font-black text-slate-700 dark:text-slate-200">{shipment.agenceDestination?.name}</p>
              <p className="text-xs text-slate-400 truncate">{shipment.villeDestination || shipment.regionDestination}</p>
            </div>
          </div>
        </div>

        {/* Timeline statut */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="text-sm font-black text-slate-400 uppercase mb-5 flex items-center gap-2"><Clock size={14} /> {t("tracking_status_label")}</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-700" />
            {STATUS_STEPS.map((s, i) => {
              const done = i <= stepIndex && shipment.status !== "Annulé";
              return (
                <div key={s} className="flex items-center gap-4 mb-5 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 flex-shrink-0 ${
                    done ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"
                  }`}>
                    {done ? <CheckCircle2 size={16} className="text-white" /> : <div className="w-2 h-2 rounded-full bg-slate-400" />}
                  </div>
                  <div>
                    <p className={`font-black text-sm ${done ? "text-slate-800 dark:text-slate-100" : "text-slate-400"}`}>{SHIPMENT_STATUS_LABEL[s]}</p>
                  </div>
                </div>
              );
            })}
            {shipment.status === "Annulé" && (
              <div className="flex items-center gap-4 relative">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center z-10 flex-shrink-0">
                  <X size={14} className="text-red-500" />
                </div>
                <p className="font-black text-sm text-red-500">{t("ship_status_cancelled")}</p>
              </div>
            )}
          </div>

          {shipment.status === "Arrivé en agence de destination" && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl flex items-start gap-3">
              <Send size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                {t("tracking_arrived_notice")} <strong>{shipment.agenceDestination?.name}</strong> ({shipment.agenceDestination?.ville}).
              </p>
            </div>
          )}
          {shipment.status === "Collecté" && shipment.collectedAt && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-2xl flex items-center gap-3">
              <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                {t("tracking_collected_notice")} {new Date(shipment.collectedAt).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "long", year: "numeric" })}.
              </p>
            </div>
          )}
        </div>

        {/* Codes de suivi */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-700 p-6 space-y-3">
          <h2 className="text-sm font-black text-slate-400 uppercase">{t("tracking_your_codes")}</h2>
          {[
            { label: t("code_client"), code: shipment.codeClient, color: "blue" },
            { label: t("code_agence"), code: shipment.codeAgence, color: "purple" },
          ].map(({ label, code, color: c }) => (
            <div key={code} className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">{label}</span>
              <span className={`font-black tracking-widest text-${c}-600 dark:text-${c}-400`}>{code}</span>
            </div>
          ))}
          <div className="pt-2 flex flex-col items-center gap-1">
            <div className="bg-white p-2 rounded-xl border border-slate-100">
              <QRCodeSVG value={shipment.codeAgence} size={96} />
            </div>
            <p className="text-[10px] text-slate-400">{t("tracking_scan_hint")}</p>
          </div>
        </div>

        {/* Prix */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-700 p-6 space-y-2">
          <h2 className="text-sm font-black text-slate-400 uppercase mb-2">{t("tracking_amount_title")}</h2>
          <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>{t("tracking_shipping_label")}</span><span className="font-bold">{shipment.prixExpedition.toLocaleString()} FCFA</span>
          </div>
          <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>{t("tracking_platform_fee_label")}</span><span className="font-bold">+{shipment.fraisPlateforme.toLocaleString()} FCFA</span>
          </div>
          <div className="flex justify-between font-black text-slate-800 dark:text-slate-100 pt-2 border-t border-slate-100 dark:border-slate-700">
            <span>{t("tracking_total_label")}</span><span>{shipment.montantTotal.toLocaleString()} FCFA</span>
          </div>
        </div>

      </div>
    </div>
  );
}
